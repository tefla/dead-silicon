import type { NodeTypes } from '@xyflow/react'
import GateNode from './GateNode'
import InputNode from './InputNode'
import OutputNode from './OutputNode'

// Cast to any to avoid strict type checking with custom props
export const nodeTypes: NodeTypes = {
  gate: GateNode as any,
  input: InputNode as any,
  output: OutputNode as any,
}

export { GateNode, InputNode, OutputNode }
