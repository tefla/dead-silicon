/**
 * Bidirectional sync between Wire AST and Visual Editor graph
 */

import type { Node, Edge } from '@xyflow/react'
import type { Module, Statement, Expr, CallExpr } from '../../wire/ast'
import { lex } from '../../wire/lexer'
import { parse } from '../../wire/parser'
import type { GateType } from './types'

// Layout data stored in sidecar file
export interface LayoutData {
  version: 1
  moduleName: string
  nodes: Record<string, { x: number; y: number }>
}

// Primitives that map directly to visual gates
const PRIMITIVE_GATES: Set<string> = new Set(['nand', 'dff', 'and', 'or', 'not', 'xor', 'mux'])

// Map module calls to gate types (for stdlib)
function getGateType(name: string): GateType | null {
  if (PRIMITIVE_GATES.has(name)) {
    return name as GateType
  }
  return null
}

/**
 * Convert a Wire AST Module to visual nodes and edges
 */
export function astToVisual(
  module: Module,
  layout?: LayoutData
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Track intermediate values for edge routing
  // Maps expression target names to their source node/handle
  const valueSource: Map<string, { nodeId: string; handle: string }> = new Map()

  // Default positions (will be auto-laid-out if no layout provided)
  let nextX = 50
  let nextY = 100
  const getDefaultPosition = () => {
    const pos = { x: nextX, y: nextY }
    nextY += 120
    if (nextY > 500) {
      nextY = 100
      nextX += 200
    }
    return pos
  }

  const getPosition = (nodeId: string) => {
    if (layout?.nodes[nodeId]) {
      return layout.nodes[nodeId]
    }
    return getDefaultPosition()
  }

  // Create input nodes for module inputs
  module.inputs.forEach((input, i) => {
    const nodeId = `input-${input.name}`
    nodes.push({
      id: nodeId,
      type: 'input',
      position: getPosition(nodeId),
      data: {
        name: input.name,
        width: input.width,
        value: 0,
      },
    })
    // Input values are available as sources
    valueSource.set(input.name, { nodeId, handle: 'out' })
  })

  // Create output nodes for module outputs
  module.outputs.forEach((output, i) => {
    const nodeId = `output-${output.name}`
    nodes.push({
      id: nodeId,
      type: 'output',
      position: getPosition(nodeId),
      data: {
        name: output.name,
        width: output.width,
        value: 0,
      },
    })
  })

  // Process each statement to create gate nodes and edges
  let gateCounter = 0
  module.statements.forEach((stmt) => {
    const target = stmt.target
    const expr = stmt.expr

    if (expr.kind === 'call') {
      const callExpr = expr as CallExpr
      const gateType = getGateType(callExpr.name)

      if (gateType) {
        // Create a gate node
        const nodeId = `gate-${target}`
        gateCounter++

        nodes.push({
          id: nodeId,
          type: 'gate',
          position: getPosition(nodeId),
          data: {
            gateType,
            label: target,
          },
        })

        // Create edges from arguments to gate inputs
        const inputHandles = getInputHandles(gateType)
        callExpr.args.forEach((arg, argIndex) => {
          if (argIndex < inputHandles.length) {
            const handle = inputHandles[argIndex]
            const source = resolveExprSource(arg, valueSource)
            if (source) {
              edges.push({
                id: `edge-${source.nodeId}-${nodeId}-${handle}`,
                source: source.nodeId,
                sourceHandle: source.handle,
                target: nodeId,
                targetHandle: handle,
                type: 'signal',
                data: { value: 0 },
              })
            }
          }
        })

        // This gate's output is now available as a source
        valueSource.set(target, { nodeId, handle: 'out' })
      } else {
        // Non-primitive call - treat as a black box module
        // For now, just track it as a value source
        const nodeId = `module-${target}`
        nodes.push({
          id: nodeId,
          type: 'gate', // TODO: Custom module node type
          position: getPosition(nodeId),
          data: {
            gateType: 'and', // Placeholder
            label: `${callExpr.name}:${target}`,
          },
        })
        valueSource.set(target, { nodeId, handle: 'out' })
      }
    } else if (expr.kind === 'ident') {
      // Direct assignment: target = source
      // Just track it as an alias
      const source = valueSource.get(expr.name)
      if (source) {
        valueSource.set(target, source)
      }
    } else if (expr.kind === 'member') {
      // Member access: target = source.field
      // Track the specific output handle
      const objSource = resolveExprSource(expr.object, valueSource)
      if (objSource) {
        valueSource.set(target, { nodeId: objSource.nodeId, handle: expr.field })
      }
    }
  })

  // Connect outputs: find what drives each output
  module.outputs.forEach((output) => {
    const source = valueSource.get(output.name)
    const outputNodeId = `output-${output.name}`
    if (source) {
      edges.push({
        id: `edge-${source.nodeId}-${outputNodeId}`,
        source: source.nodeId,
        sourceHandle: source.handle,
        target: outputNodeId,
        targetHandle: 'in',
        type: 'signal',
        data: { value: 0 },
      })
    }
  })

  return { nodes, edges }
}

/**
 * Get input handle names for a gate type
 */
function getInputHandles(gateType: GateType): string[] {
  switch (gateType) {
    case 'not':
      return ['a']
    case 'nand':
    case 'and':
    case 'or':
    case 'xor':
      return ['a', 'b']
    case 'mux':
      return ['sel', 'a', 'b']
    case 'dff':
      return ['d', 'clk']
    default:
      return ['a', 'b']
  }
}

/**
 * Resolve an expression to its source node and handle
 */
function resolveExprSource(
  expr: Expr,
  valueSource: Map<string, { nodeId: string; handle: string }>
): { nodeId: string; handle: string } | null {
  if (expr.kind === 'ident') {
    return valueSource.get(expr.name) ?? null
  }
  if (expr.kind === 'member') {
    const objSource = resolveExprSource(expr.object, valueSource)
    if (objSource) {
      return { nodeId: objSource.nodeId, handle: expr.field }
    }
  }
  return null
}

/**
 * Convert visual nodes and edges back to Wire AST Module
 */
export function visualToAst(
  nodes: Node[],
  edges: Edge[],
  moduleName: string = 'circuit'
): Module {
  const inputs: { name: string; width: number }[] = []
  const outputs: { name: string; width: number }[] = []
  const statements: Statement[] = []

  // Build edge lookup: target node+handle -> source node+handle
  const edgeMap = new Map<string, { source: string; sourceHandle: string }>()
  edges.forEach((edge) => {
    const key = `${edge.target}:${edge.targetHandle}`
    edgeMap.set(key, {
      source: edge.source,
      sourceHandle: edge.sourceHandle ?? 'out',
    })
  })

  // Node ID to Wire name mapping
  const nodeNames = new Map<string, string>()

  // Process input nodes
  nodes
    .filter((n) => n.type === 'input')
    .forEach((node) => {
      const data = node.data as { name: string; width: number }
      inputs.push({ name: data.name, width: data.width })
      nodeNames.set(node.id, data.name)
    })

  // Process output nodes
  nodes
    .filter((n) => n.type === 'output')
    .forEach((node) => {
      const data = node.data as { name: string; width: number }
      outputs.push({ name: data.name, width: data.width })
    })

  // Process gate nodes - create statements
  nodes
    .filter((n) => n.type === 'gate')
    .forEach((node) => {
      const data = node.data as { gateType: GateType; label: string }
      const target = data.label
      nodeNames.set(node.id, target)

      // Get input handles for this gate type
      const inputHandles = getInputHandles(data.gateType)

      // Build arguments by looking up edges
      const args: Expr[] = inputHandles.map((handle) => {
        const edgeKey = `${node.id}:${handle}`
        const source = edgeMap.get(edgeKey)
        if (source) {
          const sourceName = nodeNames.get(source.source)
          if (sourceName) {
            return { kind: 'ident' as const, name: sourceName }
          }
        }
        // No connection - use placeholder
        return { kind: 'ident' as const, name: '?' }
      })

      statements.push({
        target,
        expr: {
          kind: 'call',
          name: data.gateType,
          args,
        },
      })
    })

  // Process output assignments
  nodes
    .filter((n) => n.type === 'output')
    .forEach((node) => {
      const data = node.data as { name: string }
      const edgeKey = `${node.id}:in`
      const source = edgeMap.get(edgeKey)
      if (source) {
        const sourceName = nodeNames.get(source.source)
        if (sourceName) {
          statements.push({
            target: data.name,
            expr: { kind: 'ident', name: sourceName },
          })
        }
      }
    })

  return {
    name: moduleName,
    inputs,
    outputs,
    statements,
  }
}

/**
 * Generate Wire source code from AST
 */
export function astToWireSource(module: Module): string {
  const lines: string[] = []

  // Module declaration
  const inputPorts = module.inputs
    .map((p) => (p.width > 1 ? `${p.name}:${p.width}` : p.name))
    .join(', ')

  const outputPorts = module.outputs
    .map((p) => (p.width > 1 ? `${p.name}:${p.width}` : p.name))
    .join(', ')

  const outputDecl =
    module.outputs.length > 1 ? `(${outputPorts})` : outputPorts

  lines.push(`module ${module.name}(${inputPorts}) -> ${outputDecl}:`)

  // Statements
  module.statements.forEach((stmt) => {
    const exprStr = exprToString(stmt.expr)
    lines.push(`  ${stmt.target} = ${exprStr}`)
  })

  return lines.join('\n')
}

function exprToString(expr: Expr): string {
  switch (expr.kind) {
    case 'ident':
      return expr.name
    case 'call':
      const args = expr.args.map(exprToString).join(', ')
      return `${expr.name}(${args})`
    case 'member':
      return `${exprToString(expr.object)}.${expr.field}`
    case 'number':
      return expr.value.toString()
    case 'index':
      return `${exprToString(expr.object)}[${expr.index}]`
    case 'slice':
      return `${exprToString(expr.object)}[${expr.start}:${expr.end}]`
    default:
      return '?'
  }
}

/**
 * Parse Wire source and convert to visual
 */
export function wireSourceToVisual(
  source: string,
  layout?: LayoutData
): { nodes: Node[]; edges: Edge[]; module: Module } | { error: string } {
  // First lex the source
  const lexResult = lex(source)
  if (!lexResult.ok) {
    return { error: lexResult.error.message }
  }

  // Then parse the tokens
  const parseResult = parse(lexResult.tokens)
  if (!parseResult.ok) {
    return { error: parseResult.error.message }
  }

  if (parseResult.value.length === 0) {
    return { error: 'No modules found in source' }
  }

  // Use the first module for now
  const module = parseResult.value[0]
  const { nodes, edges } = astToVisual(module, layout)

  return { nodes, edges, module }
}

/**
 * Extract layout data from current visual state
 */
export function extractLayout(nodes: Node[], moduleName: string): LayoutData {
  const nodePositions: Record<string, { x: number; y: number }> = {}

  nodes.forEach((node) => {
    nodePositions[node.id] = {
      x: node.position.x,
      y: node.position.y,
    }
  })

  return {
    version: 1,
    moduleName,
    nodes: nodePositions,
  }
}
