import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { type GateType, GATE_LIBRARY, type NodeSimState } from '../types'

interface GateNodeData {
  gateType: GateType
  label?: string
  simState?: NodeSimState
}

interface GateNodeProps {
  data: GateNodeData
  selected?: boolean
}

function GateNode({ data, selected }: GateNodeProps) {
  const nodeData = data
  const gateDef = GATE_LIBRARY[nodeData.gateType]
  if (!gateDef) return null

  const simState = nodeData.simState

  return (
    <div
      className={`
        relative bg-slate-800 border-2 rounded-lg min-w-[80px]
        ${selected ? 'border-cyan-400 shadow-lg shadow-cyan-400/20' : 'border-slate-600'}
        transition-all duration-150
      `}
    >
      {/* Header */}
      <div className="bg-slate-700 px-3 py-1 rounded-t-md border-b border-slate-600">
        <span className="text-xs font-mono font-bold text-cyan-400">
          {nodeData.label || gateDef.label}
        </span>
      </div>

      {/* Body with ports */}
      <div className="px-2 py-2 flex justify-between gap-4">
        {/* Input ports */}
        <div className="flex flex-col gap-1">
          {gateDef.inputs.map((port, idx) => {
            const value = simState?.inputValues[port.id]
            return (
              <div key={port.id} className="flex items-center gap-1 relative">
                <Handle
                  type="target"
                  position={Position.Left}
                  id={port.id}
                  className={`
                    !w-3 !h-3 !border-2 !rounded-sm
                    ${value === 1 ? '!bg-green-400 !border-green-300' : '!bg-slate-600 !border-slate-500'}
                    transition-colors duration-100
                  `}
                  style={{ top: 'auto', position: 'relative', transform: 'none' }}
                />
                <span className="text-[10px] font-mono text-slate-400">
                  {port.name}
                </span>
                {value !== undefined && (
                  <span
                    className={`text-[9px] font-mono font-bold ${value === 1 ? 'text-green-400' : 'text-slate-500'}`}
                  >
                    {value}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Output ports */}
        <div className="flex flex-col gap-1">
          {gateDef.outputs.map((port) => {
            const value = simState?.outputValues[port.id]
            return (
              <div key={port.id} className="flex items-center gap-1 relative justify-end">
                {value !== undefined && (
                  <span
                    className={`text-[9px] font-mono font-bold ${value === 1 ? 'text-green-400' : 'text-slate-500'}`}
                  >
                    {value}
                  </span>
                )}
                <span className="text-[10px] font-mono text-slate-400">
                  {port.name}
                </span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={port.id}
                  className={`
                    !w-3 !h-3 !border-2 !rounded-sm
                    ${value === 1 ? '!bg-green-400 !border-green-300' : '!bg-slate-600 !border-slate-500'}
                    transition-colors duration-100
                  `}
                  style={{ top: 'auto', position: 'relative', transform: 'none' }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default memo(GateNode)
