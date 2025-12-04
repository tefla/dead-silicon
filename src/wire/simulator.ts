// Wire Gate Simulator
// Simulates compiled Wire circuits

import type { CompiledModule, Node } from './compiler'

export interface SimulatorState {
  values: Map<string, number>       // Current wire values
  prevClock: Map<string, number>    // Previous clock values (for edge detection)
  dffState: Map<string, number>     // DFF internal state
  ramState: Map<string, Uint8Array> // RAM contents (node id -> memory array)
  romData: Map<string, Uint8Array>  // ROM contents (node id -> data array)
  subSimulators: Map<string, ISimulator> // Persistent sub-module simulators (node id -> simulator)
}

export interface ISimulator {
  setInput(name: string, value: number): void
  getOutput(name: string): number
  getWire(name: string): number
  loadRom(data: Uint8Array | number[], nodeId?: string): void
  readRam(addr: number, nodeId?: string): number
  writeRam(addr: number, value: number, nodeId?: string): void
  step(): void
  run(cycles: number): void
  reset(): void
  getAllWires(): Map<string, number>
}

export class InterpreterSimulator implements ISimulator {
  private module: CompiledModule
  private modules: Map<string, CompiledModule>
  private state: SimulatorState

  constructor(module: CompiledModule, modules: Map<string, CompiledModule> = new Map()) {
    this.module = module
    this.modules = modules
    this.modules.set(module.name, module)

    this.state = {
      values: new Map(),
      prevClock: new Map(),
      dffState: new Map(),
      ramState: new Map(),
      romData: new Map(),
      subSimulators: new Map(),
    }

    // Initialize all wires to 0 (skip member access wires which are resolved via aliases)
    for (const [name] of module.wires) {
      if (!name.includes('.')) {
        this.state.values.set(name, 0)
      }
    }

    // Initialize RAM and ROM for each node
    for (const node of module.nodes) {
      if (node.type === 'ram' && node.addrWidth) {
        const size = 1 << node.addrWidth
        this.state.ramState.set(node.id, new Uint8Array(size))
      }
      if (node.type === 'rom' && node.addrWidth) {
        const size = 1 << node.addrWidth
        // ROM starts empty, can be loaded later
        this.state.romData.set(node.id, new Uint8Array(size))
      }
    }
  }

  // Set an input value
  setInput(name: string, value: number): void {
    this.state.values.set(name, value)
  }

  // Get an output value
  getOutput(name: string): number {
    return this.state.values.get(name) ?? 0
  }

  // Get any wire value
  getWire(name: string): number {
    return this.resolveWire(name)
  }

  // Load data into ROM (by finding ROM nodes)
  loadRom(data: Uint8Array | number[], nodeId?: string): void {
    const dataArray = data instanceof Uint8Array ? data : new Uint8Array(data)

    if (nodeId) {
      const rom = this.state.romData.get(nodeId)
      if (rom) {
        rom.set(dataArray.slice(0, rom.length))
      }
    } else {
      // Load into all ROM nodes
      for (const [id, rom] of this.state.romData) {
        rom.set(dataArray.slice(0, rom.length))
      }
    }
  }

  // Read from RAM
  readRam(addr: number, nodeId?: string): number {
    if (nodeId) {
      const ram = this.state.ramState.get(nodeId)
      return ram && addr < ram.length ? ram[addr] : 0
    }
    // Read from first RAM node
    for (const [, ram] of this.state.ramState) {
      return addr < ram.length ? ram[addr] : 0
    }
    return 0
  }

  // Write to RAM directly (for initialization)
  writeRam(addr: number, value: number, nodeId?: string): void {
    if (nodeId) {
      const ram = this.state.ramState.get(nodeId)
      if (ram && addr < ram.length) {
        ram[addr] = value & 0xFF
      }
    } else {
      // Write to first RAM node
      for (const [, ram] of this.state.ramState) {
        if (addr < ram.length) {
          ram[addr] = value & 0xFF
        }
        break
      }
    }
  }

  // Perform one simulation step
  step(): void {
    // Process nodes in order (assumes topological sort for combinational)
    // For a proper simulation, we'd need to sort, but for now process all nodes
    // multiple times until stable (simple fixed-point iteration)

    const maxIterations = 100
    for (let i = 0; i < maxIterations; i++) {
      const oldValues = new Map(this.state.values)
      this.evaluateNodes()

      // Check for stability (excluding DFF outputs which change on clock edges)
      let stable = true
      for (const [name, value] of this.state.values) {
        if (oldValues.get(name) !== value) {
          // Check if this is a DFF output - those are allowed to change
          const isDffOutput = this.module.nodes.some(
            n => n.type === 'dff' && n.outputs.includes(name)
          )
          if (!isDffOutput) {
            stable = false
            break
          }
        }
      }

      if (stable) break
    }
  }

  // Run for multiple cycles (useful for sequential circuits)
  run(cycles: number): void {
    for (let i = 0; i < cycles; i++) {
      this.step()
    }
  }

  private evaluateNodes(): void {
    for (const node of this.module.nodes) {
      this.evaluateNode(node)
    }
  }

  private evaluateNode(node: Node): void {
    switch (node.type) {
      case 'input':
        // Inputs are set externally
        break

      case 'output':
        // Outputs just read from their input wire
        if (node.inputs.length > 0) {
          const value = this.resolveWire(node.inputs[0])
          this.state.values.set(node.inputs[0], value)
        }
        break

      case 'const':
        if (node.constValue !== undefined && node.outputs.length > 0) {
          this.state.values.set(node.outputs[0], node.constValue)
        }
        break

      case 'nand':
        this.evaluateNand(node)
        break

      case 'dff':
        this.evaluateDff(node)
        break

      case 'module':
        this.evaluateModuleInstance(node)
        break

      case 'index':
        this.evaluateIndex(node)
        break

      case 'slice':
        this.evaluateSlice(node)
        break

      case 'concat':
        this.evaluateConcat(node)
        break

      case 'ram':
        this.evaluateRam(node)
        break

      case 'rom':
        this.evaluateRom(node)
        break
    }
  }

  private evaluateNand(node: Node): void {
    if (node.inputs.length !== 2 || node.outputs.length !== 1) return

    const a = this.resolveWire(node.inputs[0])
    const b = this.resolveWire(node.inputs[1])

    // Multi-bit NAND: bitwise NOT of AND
    const width = node.width
    const mask = width >= 32 ? 0xFFFFFFFF : (1 << width) - 1
    const result = (~(a & b)) & mask

    this.state.values.set(node.outputs[0], result)
  }

  private evaluateIndex(node: Node): void {
    if (node.inputs.length !== 1 || node.outputs.length !== 1) return
    if (node.bitIndex === undefined) return

    const value = this.resolveWire(node.inputs[0])
    const bit = (value >> node.bitIndex) & 1
    this.state.values.set(node.outputs[0], bit)
  }

  private evaluateSlice(node: Node): void {
    if (node.inputs.length !== 1 || node.outputs.length !== 1) return
    if (node.sliceStart === undefined || node.sliceEnd === undefined) return

    const value = this.resolveWire(node.inputs[0])
    const width = node.sliceEnd - node.sliceStart + 1
    const mask = (1 << width) - 1
    const result = (value >> node.sliceStart) & mask
    this.state.values.set(node.outputs[0], result)
  }

  private evaluateConcat(node: Node): void {
    if (node.inputs.length < 2 || node.outputs.length !== 1) return
    if (!node.inputWidths) return

    // Concatenate: first input is high bits, last input is low bits
    let result = 0
    let shift = 0

    // Process from last (low bits) to first (high bits)
    for (let i = node.inputs.length - 1; i >= 0; i--) {
      const value = this.resolveWire(node.inputs[i])
      const width = node.inputWidths[i]
      const mask = (1 << width) - 1
      result |= (value & mask) << shift
      shift += width
    }

    this.state.values.set(node.outputs[0], result)
  }

  private evaluateRam(node: Node): void {
    // ram(addr, data, write, clk) -> out:8
    if (node.inputs.length !== 4 || node.outputs.length !== 1) return

    const addr = this.resolveWire(node.inputs[0])
    const data = this.resolveWire(node.inputs[1])
    const write = this.resolveWire(node.inputs[2])
    const clk = this.resolveWire(node.inputs[3])
    const prevClk = this.state.prevClock.get(node.id) ?? 0

    const ram = this.state.ramState.get(node.id)
    if (!ram) return

    // Write on rising clock edge when write is high
    if (prevClk === 0 && clk === 1 && write === 1) {
      if (addr < ram.length) {
        ram[addr] = data & 0xFF
      }
    }

    // Update previous clock
    this.state.prevClock.set(node.id, clk)

    // Output is always the value at the address (async read)
    const output = addr < ram.length ? ram[addr] : 0
    this.state.values.set(node.outputs[0], output)
  }

  private evaluateRom(node: Node): void {
    // rom(addr) -> out:8
    if (node.inputs.length !== 1 || node.outputs.length !== 1) return

    const addr = this.resolveWire(node.inputs[0])
    const rom = this.state.romData.get(node.id)

    const output = rom && addr < rom.length ? rom[addr] : 0
    this.state.values.set(node.outputs[0], output)
  }

  private evaluateDff(node: Node): void {
    if (node.inputs.length !== 2 || node.outputs.length !== 1) return

    const d = this.resolveWire(node.inputs[0])
    const clk = this.resolveWire(node.inputs[1])
    const prevClk = this.state.prevClock.get(node.id) ?? 0

    // Rising edge detection
    if (prevClk === 0 && clk === 1) {
      // Latch the D input
      this.state.dffState.set(node.id, d)
    }

    // Update previous clock
    this.state.prevClock.set(node.id, clk)

    // Output is the latched value
    const output = this.state.dffState.get(node.id) ?? 0
    this.state.values.set(node.outputs[0], output)
  }

  private evaluateModuleInstance(node: Node): void {
    if (!node.moduleName) return

    const subModule = this.modules.get(node.moduleName)
    if (!subModule) {
      // Unknown module - treat as black box with 0 output
      for (const out of node.outputs) {
        this.state.values.set(out, 0)
      }
      return
    }

    // Get or create a persistent sub-simulator for this module instance
    let subSim = this.state.subSimulators.get(node.id)
    if (!subSim) {
      subSim = new InterpreterSimulator(subModule, this.modules)
      this.state.subSimulators.set(node.id, subSim)
    }

    // Set inputs
    for (let i = 0; i < node.inputs.length && i < subModule.inputs.length; i++) {
      const value = this.resolveWire(node.inputs[i])
      subSim.setInput(subModule.inputs[i].name, value)
    }

    // Run simulation
    subSim.step()

    // Get outputs - set both the direct output wire and field-based access
    const baseOutput = node.outputs[0]
    for (let i = 0; i < subModule.outputs.length; i++) {
      const outputName = subModule.outputs[i].name
      const value = subSim.getOutput(outputName)

      // Set the field-based wire: "baseOutput.fieldName"
      this.state.values.set(`${baseOutput}.${outputName}`, value)

      // Also set direct output wire (first output for single-output modules)
      if (i < node.outputs.length) {
        this.state.values.set(node.outputs[i], value)
      }
    }
  }

  // Debug helper
  logAlias(name: string) {
  }

  // Resolve a wire value, handling aliases, member access and indexing
  private resolveWire(name: string): number {
    // Follow aliases first (with cycle detection)
    let resolvedName = name
    const seen = new Set<string>()
    while (this.module.aliases.has(resolvedName) && !seen.has(resolvedName)) {
      seen.add(resolvedName)
      resolvedName = this.module.aliases.get(resolvedName)!
    }

    // Check for direct value
    const direct = this.state.values.get(resolvedName)
    if (direct !== undefined) return direct

    // Handle member access: "wire.field"
    if (resolvedName.includes('.')) {
      const dotIndex = resolvedName.indexOf('.')
      const base = resolvedName.slice(0, dotIndex)
      const field = resolvedName.slice(dotIndex + 1)

      // Try direct lookup first
      const directValue = this.state.values.get(resolvedName)
      if (directValue !== undefined) return directValue

      // Resolve alias on base, then look up base.field
      let resolvedBase = base
      const baseSeen = new Set<string>()
      while (this.module.aliases.has(resolvedBase) && !baseSeen.has(resolvedBase)) {
        baseSeen.add(resolvedBase)
        resolvedBase = this.module.aliases.get(resolvedBase)!
      }

      const resolvedMember = `${resolvedBase}.${field}`
      return this.state.values.get(resolvedMember) ?? 0
    }

    // Handle indexing: "wire[0]"
    const indexMatch = resolvedName.match(/^(.+)\[(\d+)\]$/)
    if (indexMatch) {
      const [, base, indexStr] = indexMatch
      const baseValue = this.resolveWire(base)
      const index = parseInt(indexStr, 10)
      return (baseValue >> index) & 1
    }

    // Handle slicing: "wire[0:3]"
    const sliceMatch = resolvedName.match(/^(.+)\[(\d+):(\d+)\]$/)
    if (sliceMatch) {
      const [, base, startStr, endStr] = sliceMatch
      const baseValue = this.resolveWire(base)
      const start = parseInt(startStr, 10)
      const end = parseInt(endStr, 10)
      const mask = (1 << (end - start + 1)) - 1
      return (baseValue >> start) & mask
    }

    return 0
  }

  // Get all wire values (for debugging)
  getAllWires(): Map<string, number> {
    return new Map(this.state.values)
  }

  // Reset simulation state
  reset(): void {
    this.state.values.clear()
    this.state.prevClock.clear()
    this.state.dffState.clear()

    // Reset RAM contents
    for (const [, ram] of this.state.ramState) {
      ram.fill(0)
    }

    // Reset all sub-simulators
    for (const [, subSim] of this.state.subSimulators) {
      subSim.reset()
    }

    for (const [name] of this.module.wires) {
      if (!name.includes('.')) {
        this.state.values.set(name, 0)
      }
    }
  }
}

// Export alias for backward compatibility
export const Simulator = InterpreterSimulator

// Convenience function to compile and create a simulator
import { lex } from './lexer'
import { parse } from './parser'
import { compile, resetNodeCounter } from './compiler'
import { TypedArraySimulator } from './simulator-typed'
import { JITSimulator } from './simulator-jit'
import { LevelizedSimulator } from './simulator-levelized'
import { JIT2Simulator } from './simulator-jit2'

export type SimulatorStrategy = 'interpreter' | 'typed-array' | 'jit' | 'levelized' | 'jit2'

export type SimulateResult =
  | { ok: true; simulator: ISimulator; modules: Map<string, CompiledModule> }
  | { ok: false; error: string }

export function createSimulator(
  source: string,
  mainModule?: string,
  strategy: SimulatorStrategy = 'interpreter'
): SimulateResult {
  resetNodeCounter()

  const lexResult = lex(source)
  if (!lexResult.ok) {
    return { ok: false, error: `Lex error: ${lexResult.error.message} ` }
  }

  const parseResult = parse(lexResult.tokens)
  if (!parseResult.ok) {
    return { ok: false, error: `Parse error: ${parseResult.error.message} ` }
  }

  const compileResult = compile(parseResult.value)
  if (!compileResult.ok) {
    return { ok: false, error: `Compile error: ${compileResult.error.message} ` }
  }

  // Find the main module
  const modules = compileResult.modules
  let main: CompiledModule | undefined

  if (mainModule) {
    main = modules.get(mainModule)
  } else {
    // Use the last defined module as main
    for (const mod of modules.values()) {
      main = mod
    }
  }

  if (!main) {
    return { ok: false, error: 'No modules found' }
  }

  let simulator: ISimulator
  switch (strategy) {
    case 'interpreter':
      simulator = new InterpreterSimulator(main, modules)
      break
    case 'typed-array':
      simulator = new TypedArraySimulator(main, modules)
      break
    case 'jit':
      simulator = new JITSimulator(main, modules)
      break
    case 'levelized':
      simulator = new LevelizedSimulator(main, modules)
      break
    case 'jit2':
      simulator = new JIT2Simulator(main, modules)
      break
    default:
      return { ok: false, error: `Unknown strategy: ${strategy} ` }
  }

  return {
    ok: true,
    simulator,
    modules,
  }
}
