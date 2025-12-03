// Visual Editor Types

export type GateType = 'nand' | 'dff' | 'and' | 'or' | 'not' | 'xor' | 'mux'
export type NodeKind = 'input' | 'output' | 'gate' | 'module'

export interface PortDefinition {
  id: string
  name: string
  direction: 'in' | 'out'
  width: number // 1 = single bit, >1 = bus
}

export interface GateDefinition {
  type: GateType
  label: string
  inputs: PortDefinition[]
  outputs: PortDefinition[]
  // For visual representation
  symbol?: string
}

// Gate library - all available gates
export const GATE_LIBRARY: Record<GateType, GateDefinition> = {
  nand: {
    type: 'nand',
    label: 'NAND',
    inputs: [
      { id: 'a', name: 'a', direction: 'in', width: 1 },
      { id: 'b', name: 'b', direction: 'in', width: 1 },
    ],
    outputs: [{ id: 'out', name: 'out', direction: 'out', width: 1 }],
  },
  and: {
    type: 'and',
    label: 'AND',
    inputs: [
      { id: 'a', name: 'a', direction: 'in', width: 1 },
      { id: 'b', name: 'b', direction: 'in', width: 1 },
    ],
    outputs: [{ id: 'out', name: 'out', direction: 'out', width: 1 }],
  },
  or: {
    type: 'or',
    label: 'OR',
    inputs: [
      { id: 'a', name: 'a', direction: 'in', width: 1 },
      { id: 'b', name: 'b', direction: 'in', width: 1 },
    ],
    outputs: [{ id: 'out', name: 'out', direction: 'out', width: 1 }],
  },
  not: {
    type: 'not',
    label: 'NOT',
    inputs: [{ id: 'a', name: 'a', direction: 'in', width: 1 }],
    outputs: [{ id: 'out', name: 'out', direction: 'out', width: 1 }],
  },
  xor: {
    type: 'xor',
    label: 'XOR',
    inputs: [
      { id: 'a', name: 'a', direction: 'in', width: 1 },
      { id: 'b', name: 'b', direction: 'in', width: 1 },
    ],
    outputs: [{ id: 'out', name: 'out', direction: 'out', width: 1 }],
  },
  mux: {
    type: 'mux',
    label: 'MUX',
    inputs: [
      { id: 'sel', name: 'sel', direction: 'in', width: 1 },
      { id: 'a', name: 'a', direction: 'in', width: 1 },
      { id: 'b', name: 'b', direction: 'in', width: 1 },
    ],
    outputs: [{ id: 'out', name: 'out', direction: 'out', width: 1 }],
  },
  dff: {
    type: 'dff',
    label: 'DFF',
    inputs: [
      { id: 'd', name: 'D', direction: 'in', width: 1 },
      { id: 'clk', name: 'CLK', direction: 'in', width: 1 },
    ],
    outputs: [{ id: 'q', name: 'Q', direction: 'out', width: 1 }],
  },
}

// Debug/simulation state for a node
export interface NodeSimState {
  inputValues: Record<string, number>
  outputValues: Record<string, number>
}

// Debug/simulation state for an edge (wire)
export interface EdgeSimState {
  value: number
  transitioning?: boolean // For animation
}
