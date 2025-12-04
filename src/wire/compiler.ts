// Wire Compiler
// Compiles Wire AST into a simulation-ready gate graph

import type { Module, Statement, Expr, Port } from './ast'

// A wire in the circuit - can be single bit or multi-bit bus
export interface Wire {
  name: string
  width: number
}

// Node types in the gate graph
export type NodeType =
  | 'input'     // External input
  | 'output'    // External output
  | 'nand'      // NAND gate (primitive)
  | 'dff'       // D flip-flop (primitive)
  | 'const'     // Constant value
  | 'module'    // Sub-module instance
  | 'index'     // Bit extraction: wire[n]
  | 'slice'     // Bit slice: wire[start:end]
  | 'concat'    // Concatenation: concat(high, low)
  | 'ram'       // RAM: ram(addr, data, write, clk) -> out
  | 'rom'       // ROM: rom(addr) -> out

export interface Node {
  id: string
  type: NodeType
  inputs: string[]      // Wire names this node reads from
  outputs: string[]     // Wire names this node writes to
  width: number         // Bit width
  moduleName?: string   // For module instances
  constValue?: number   // For constants
  bitIndex?: number     // For index nodes
  sliceStart?: number   // For slice nodes
  sliceEnd?: number     // For slice nodes
  inputWidths?: number[] // For concat nodes - width of each input
  addrWidth?: number    // For RAM/ROM - address bus width
  romData?: number[]    // For ROM - initial data
  outputNames?: string[] // For multi-output modules - field names
}

export interface CompiledModule {
  name: string
  inputs: Wire[]
  outputs: Wire[]
  nodes: Node[]
  wires: Map<string, number>  // Wire name -> width
  aliases: Map<string, string>  // target -> source wire aliases
}

export interface CompileError {
  message: string
  module: string
}

export type CompileResult =
  | { ok: true; modules: Map<string, CompiledModule> }
  | { ok: false; error: CompileError }

let nodeCounter = 0
function genNodeId(prefix: string): string {
  return `${prefix}_${nodeCounter++}`
}

export function compile(modules: Module[]): CompileResult {
  nodeCounter = 0
  const compiled = new Map<string, CompiledModule>()

  for (const mod of modules) {
    const result = compileModule(mod, compiled)
    if (!result.ok) return result
    compiled.set(mod.name, result.value)
  }

  return { ok: true, modules: compiled }
}

function compileModule(mod: Module, modules: Map<string, CompiledModule>): { ok: true; value: CompiledModule } | { ok: false; error: CompileError } {
  const nodes: Node[] = []
  const wires = new Map<string, number>()
  const aliases = new Map<string, string>()

  // Register input wires
  for (const input of mod.inputs) {
    wires.set(input.name, input.width)
    nodes.push({
      id: genNodeId('in'),
      type: 'input',
      inputs: [],
      outputs: [input.name],
      width: input.width,
    })
  }

  // Register output wires (will be connected by statements)
  for (const output of mod.outputs) {
    wires.set(output.name, output.width)
  }

  // Process statements
  for (const stmt of mod.statements) {
    const result = compileStatement(stmt, wires, nodes, aliases, mod.name, modules)
    if (!result.ok) return result
  }

  // Create output nodes
  for (const output of mod.outputs) {
    nodes.push({
      id: genNodeId('out'),
      type: 'output',
      inputs: [output.name],
      outputs: [],
      width: output.width,
    })
  }

  return {
    ok: true,
    value: {
      name: mod.name,
      inputs: mod.inputs.map(p => ({ name: p.name, width: p.width })),
      outputs: mod.outputs.map(p => ({ name: p.name, width: p.width })),
      nodes,
      wires,
      aliases,
    },
  }
}

function compileStatement(
  stmt: Statement,
  wires: Map<string, number>,
  nodes: Node[],
  aliases: Map<string, string>,
  moduleName: string,
  modules: Map<string, CompiledModule>
): { ok: true } | { ok: false; error: CompileError } {
  const { target, expr } = stmt

  // Compile the expression
  const result = compileExpr(expr, wires, nodes, moduleName, aliases, modules)
  if (!result.ok) return result

  const { wire: sourceWire, width } = result.value

  // If source and target are different, create an alias
  // DON'T register the target as a wire - it's just an alias!
  if (sourceWire !== target) {
    aliases.set(target, sourceWire)
  } else {
    // Only register as a wire if target === source (no alias needed)
    if (!wires.has(target)) {
      wires.set(target, width)
    }
  }

  return { ok: true }
}

interface ExprResult {
  wire: string    // The wire holding the result
  width: number   // Bit width
}

function compileExpr(
  expr: Expr,
  wires: Map<string, number>,
  nodes: Node[],
  moduleName: string,
  aliases?: Map<string, string>,
  modules?: Map<string, CompiledModule>
): { ok: true; value: ExprResult } | { ok: false; error: CompileError } {

  switch (expr.kind) {
    case 'ident': {
      // Follow aliases to find the actual wire and get its width
      let resolvedName = expr.name
      if (aliases) {
        const seen = new Set<string>()
        while (aliases.has(resolvedName) && !seen.has(resolvedName)) {
          seen.add(resolvedName)
          resolvedName = aliases.get(resolvedName)!
        }
      }
      const width = wires.get(resolvedName) ?? 1
      return { ok: true, value: { wire: expr.name, width } }
    }

    case 'number': {
      const wireName = genNodeId('const')
      const width = 1 // Constants default to 1 bit, can be extended later
      wires.set(wireName, width)
      nodes.push({
        id: wireName,
        type: 'const',
        inputs: [],
        outputs: [wireName],
        width,
        constValue: expr.value,
      })
      return { ok: true, value: { wire: wireName, width } }
    }

    case 'call': {
      // Compile arguments first
      const argWires: string[] = []
      for (const arg of expr.args) {
        const result = compileExpr(arg, wires, nodes, moduleName, aliases, modules)
        if (!result.ok) return result
        argWires.push(result.value.wire)
      }

      // Handle primitives
      if (expr.name === 'nand') {
        if (argWires.length !== 2) {
          return { ok: false, error: { message: 'nand requires 2 arguments', module: moduleName } }
        }
        // Get width from first argument
        const width = wires.get(argWires[0]) ?? 1
        const outWire = genNodeId('nand_out')
        wires.set(outWire, width)
        nodes.push({
          id: genNodeId('nand'),
          type: 'nand',
          inputs: argWires,
          outputs: [outWire],
          width,
        })
        return { ok: true, value: { wire: outWire, width } }
      }

      if (expr.name === 'dff') {
        if (argWires.length !== 2) {
          return { ok: false, error: { message: 'dff requires 2 arguments (d, clk)', module: moduleName } }
        }
        const outWire = genNodeId('dff_out')
        wires.set(outWire, 1)
        nodes.push({
          id: genNodeId('dff'),
          type: 'dff',
          inputs: argWires,
          outputs: [outWire],
          width: 1,
        })
        return { ok: true, value: { wire: outWire, width: 1 } }
      }

      if (expr.name === 'concat') {
        if (argWires.length < 2) {
          return { ok: false, error: { message: 'concat requires at least 2 arguments', module: moduleName } }
        }
        // Calculate total width and track input widths
        const inputWidths: number[] = []
        let totalWidth = 0
        for (let i = 0; i < expr.args.length; i++) {
          const argResult = compileExpr(expr.args[i], wires, nodes, moduleName, aliases, modules)
          if (!argResult.ok) return argResult
          inputWidths.push(argResult.value.width)
          totalWidth += argResult.value.width
        }

        const outWire = genNodeId('concat_out')
        wires.set(outWire, totalWidth)
        nodes.push({
          id: genNodeId('concat'),
          type: 'concat',
          inputs: argWires,
          outputs: [outWire],
          width: totalWidth,
          inputWidths,
        })
        return { ok: true, value: { wire: outWire, width: totalWidth } }
      }

      if (expr.name === 'ram') {
        // ram(addr, data, write, clk) -> out:8
        if (argWires.length !== 4) {
          return { ok: false, error: { message: 'ram requires 4 arguments (addr, data, write, clk)', module: moduleName } }
        }
        const addrWidth = wires.get(argWires[0]) ?? 8
        const outWire = genNodeId('ram_out')
        wires.set(outWire, 8)
        nodes.push({
          id: genNodeId('ram'),
          type: 'ram',
          inputs: argWires,
          outputs: [outWire],
          width: 8,
          addrWidth,
        })
        return { ok: true, value: { wire: outWire, width: 8 } }
      }

      if (expr.name === 'rom') {
        // rom(addr) -> out:8
        if (argWires.length !== 1) {
          return { ok: false, error: { message: 'rom requires 1 argument (addr)', module: moduleName } }
        }
        const addrWidth = wires.get(argWires[0]) ?? 8
        const outWire = genNodeId('rom_out')
        wires.set(outWire, 8)
        nodes.push({
          id: genNodeId('rom'),
          type: 'rom',
          inputs: argWires,
          outputs: [outWire],
          width: 8,
          addrWidth,
        })
        return { ok: true, value: { wire: outWire, width: 8 } }
      }

      // Other module calls - create a module instance node
      const outWire = genNodeId(`${expr.name}_out`)

      // Look up the module to get the correct output width
      let outputWidth = 1
      if (modules) {
        const subModule = modules.get(expr.name)
        if (subModule && subModule.outputs.length > 0) {
          outputWidth = subModule.outputs[0].width
        }
      }

      wires.set(outWire, outputWidth)
      nodes.push({
        id: genNodeId(expr.name),
        type: 'module',
        inputs: argWires,
        outputs: [outWire],
        width: outputWidth,
        moduleName: expr.name,
      })
      return { ok: true, value: { wire: outWire, width: outputWidth } }
    }

    case 'member': {
      // For member access like `h.sum`, we need to handle multi-output modules
      const objResult = compileExpr(expr.object, wires, nodes, moduleName, aliases, modules)
      if (!objResult.ok) return objResult

      // Resolve aliases first - objResult.value.wire might be an alias
      let resolvedWire = objResult.value.wire
      if (aliases) {
        const seen = new Set<string>()
        while (aliases.has(resolvedWire) && !seen.has(resolvedWire)) {
          seen.add(resolvedWire)
          resolvedWire = aliases.get(resolvedWire)!
        }
      }

      const memberWire = `${resolvedWire}.${expr.field}`

      // Look up the width from the module definition
      let width = 1 // default

      // Find the node that outputs to the resolved wire
      const sourceNode = nodes.find(n => n.outputs.includes(resolvedWire))
      if (sourceNode && sourceNode.type === 'module' && sourceNode.moduleName && modules) {
        const subModule = modules.get(sourceNode.moduleName)
        if (subModule) {
          // Find the output with the matching field name
          const output = subModule.outputs.find(o => o.name === expr.field)
          if (output) {
            width = output.width
          }
        }
      }

      wires.set(memberWire, width)
      return { ok: true, value: { wire: memberWire, width } }
    }

    case 'index': {
      const objResult = compileExpr(expr.object, wires, nodes, moduleName, aliases, modules)
      if (!objResult.ok) return objResult

      const outWire = genNodeId('index_out')
      wires.set(outWire, 1)
      nodes.push({
        id: genNodeId('index'),
        type: 'index',
        inputs: [objResult.value.wire],
        outputs: [outWire],
        width: 1,
        bitIndex: expr.index,
      })
      return { ok: true, value: { wire: outWire, width: 1 } }
    }

    case 'slice': {
      const objResult = compileExpr(expr.object, wires, nodes, moduleName, aliases, modules)
      if (!objResult.ok) return objResult

      const width = expr.end - expr.start + 1
      const outWire = genNodeId('slice_out')
      wires.set(outWire, width)
      nodes.push({
        id: genNodeId('slice'),
        type: 'slice',
        inputs: [objResult.value.wire],
        outputs: [outWire],
        width,
        sliceStart: expr.start,
        sliceEnd: expr.end,
      })
      return { ok: true, value: { wire: outWire, width } }
    }
  }
}

// Reset counter for testing
export function resetNodeCounter(): void {
  nodeCounter = 0
}
