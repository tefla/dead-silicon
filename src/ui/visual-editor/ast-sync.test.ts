import { describe, it, expect } from 'vitest'
import {
  astToVisual,
  visualToAst,
  astToWireSource,
  wireSourceToVisual,
  extractLayout,
} from './ast-sync'
import type { Module } from '../../wire/ast'

describe('AST to Visual conversion', () => {
  it('converts a simple NOT gate module', () => {
    const module: Module = {
      name: 'not',
      inputs: [{ name: 'a', width: 1 }],
      outputs: [{ name: 'out', width: 1 }],
      statements: [
        {
          target: 'out',
          expr: { kind: 'call', name: 'nand', args: [
            { kind: 'ident', name: 'a' },
            { kind: 'ident', name: 'a' },
          ]},
        },
      ],
    }

    const { nodes, edges } = astToVisual(module)

    // Should have: 1 input, 1 output, 1 gate
    expect(nodes).toHaveLength(3)

    const inputNode = nodes.find(n => n.type === 'input')
    expect(inputNode).toBeDefined()
    expect((inputNode?.data as any).name).toBe('a')

    const outputNode = nodes.find(n => n.type === 'output')
    expect(outputNode).toBeDefined()
    expect((outputNode?.data as any).name).toBe('out')

    const gateNode = nodes.find(n => n.type === 'gate')
    expect(gateNode).toBeDefined()
    expect((gateNode?.data as any).gateType).toBe('nand')

    // Should have edges: input->gate (x2), gate->output
    expect(edges.length).toBeGreaterThanOrEqual(2)
  })

  it('converts an AND gate module with intermediate wire', () => {
    const module: Module = {
      name: 'and',
      inputs: [
        { name: 'a', width: 1 },
        { name: 'b', width: 1 },
      ],
      outputs: [{ name: 'out', width: 1 }],
      statements: [
        {
          target: 'n',
          expr: { kind: 'call', name: 'nand', args: [
            { kind: 'ident', name: 'a' },
            { kind: 'ident', name: 'b' },
          ]},
        },
        {
          target: 'out',
          expr: { kind: 'call', name: 'nand', args: [
            { kind: 'ident', name: 'n' },
            { kind: 'ident', name: 'n' },
          ]},
        },
      ],
    }

    const { nodes, edges } = astToVisual(module)

    // Should have: 2 inputs, 1 output, 2 gates
    expect(nodes).toHaveLength(5)

    const gateNodes = nodes.filter(n => n.type === 'gate')
    expect(gateNodes).toHaveLength(2)

    // Should have edges connecting the chain
    expect(edges.length).toBeGreaterThanOrEqual(4)
  })

  it('applies layout data when provided', () => {
    const module: Module = {
      name: 'not',
      inputs: [{ name: 'a', width: 1 }],
      outputs: [{ name: 'out', width: 1 }],
      statements: [
        {
          target: 'out',
          expr: { kind: 'call', name: 'nand', args: [
            { kind: 'ident', name: 'a' },
            { kind: 'ident', name: 'a' },
          ]},
        },
      ],
    }

    const layout = {
      version: 1 as const,
      moduleName: 'not',
      nodes: {
        'input-a': { x: 100, y: 200 },
        'output-out': { x: 500, y: 200 },
        'gate-out': { x: 300, y: 200 },
      },
    }

    const { nodes } = astToVisual(module, layout)

    const inputNode = nodes.find(n => n.id === 'input-a')
    expect(inputNode?.position).toEqual({ x: 100, y: 200 })

    const outputNode = nodes.find(n => n.id === 'output-out')
    expect(outputNode?.position).toEqual({ x: 500, y: 200 })
  })
})

describe('Visual to AST conversion', () => {
  it('converts visual nodes back to AST', () => {
    const nodes = [
      { id: 'input-a', type: 'input', position: { x: 0, y: 0 }, data: { name: 'a', width: 1 } },
      { id: 'gate-n', type: 'gate', position: { x: 100, y: 0 }, data: { gateType: 'nand', label: 'n' } },
      { id: 'output-out', type: 'output', position: { x: 200, y: 0 }, data: { name: 'out', width: 1 } },
    ]

    const edges = [
      { id: 'e1', source: 'input-a', sourceHandle: 'out', target: 'gate-n', targetHandle: 'a', type: 'signal' },
      { id: 'e2', source: 'input-a', sourceHandle: 'out', target: 'gate-n', targetHandle: 'b', type: 'signal' },
      { id: 'e3', source: 'gate-n', sourceHandle: 'out', target: 'output-out', targetHandle: 'in', type: 'signal' },
    ]

    const module = visualToAst(nodes as any, edges as any, 'test')

    expect(module.name).toBe('test')
    expect(module.inputs).toHaveLength(1)
    expect(module.inputs[0].name).toBe('a')
    expect(module.outputs).toHaveLength(1)
    expect(module.outputs[0].name).toBe('out')
    expect(module.statements.length).toBeGreaterThanOrEqual(1)
  })
})

describe('AST to Wire source', () => {
  it('generates valid Wire source code', () => {
    const module: Module = {
      name: 'not',
      inputs: [{ name: 'a', width: 1 }],
      outputs: [{ name: 'out', width: 1 }],
      statements: [
        {
          target: 'n',
          expr: { kind: 'call', name: 'nand', args: [
            { kind: 'ident', name: 'a' },
            { kind: 'ident', name: 'a' },
          ]},
        },
        {
          target: 'out',
          expr: { kind: 'ident', name: 'n' },
        },
      ],
    }

    const source = astToWireSource(module)

    expect(source).toContain('module not(a) -> out:')
    expect(source).toContain('n = nand(a, a)')
    expect(source).toContain('out = n')
  })

  it('handles multi-bit ports', () => {
    const module: Module = {
      name: 'add8',
      inputs: [
        { name: 'a', width: 8 },
        { name: 'b', width: 8 },
      ],
      outputs: [{ name: 'sum', width: 8 }],
      statements: [],
    }

    const source = astToWireSource(module)

    expect(source).toContain('module add8(a:8, b:8) -> sum:8:')
  })
})

describe('Wire source to Visual round-trip', () => {
  it('parses Wire source and converts to visual', () => {
    const source = `
module not(a) -> out:
  out = nand(a, a)
`

    const result = wireSourceToVisual(source)

    if ('error' in result) {
      throw new Error(result.error)
    }

    expect(result.nodes).toHaveLength(3)
    expect(result.edges.length).toBeGreaterThanOrEqual(2)
    expect(result.module.name).toBe('not')
  })
})

describe('Layout extraction', () => {
  it('extracts layout from nodes', () => {
    const nodes = [
      { id: 'input-a', type: 'input', position: { x: 100, y: 200 }, data: {} },
      { id: 'gate-n', type: 'gate', position: { x: 300, y: 200 }, data: {} },
    ]

    const layout = extractLayout(nodes as any, 'test')

    expect(layout.version).toBe(1)
    expect(layout.moduleName).toBe('test')
    expect(layout.nodes['input-a']).toEqual({ x: 100, y: 200 })
    expect(layout.nodes['gate-n']).toEqual({ x: 300, y: 200 })
  })
})
