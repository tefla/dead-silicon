import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'

interface OutputNodeData {
  name: string
  width: number
  value?: number
}

interface OutputNodeProps {
  data: OutputNodeData
  selected?: boolean
}

function OutputNode({ data, selected }: OutputNodeProps) {
  const nodeData = data
  const value = nodeData.value ?? 0
  const isHigh = value === 1

  return (
    <div
      className={`
        relative bg-slate-800 border-2 rounded-lg
        ${selected ? 'border-purple-400 shadow-lg shadow-purple-400/20' : 'border-slate-600'}
        transition-all duration-150
      `}
    >
      {/* Header */}
      <div className="bg-purple-900/50 px-3 py-1 rounded-t-md border-b border-slate-600">
        <span className="text-xs font-mono font-bold text-purple-400">OUTPUT</span>
      </div>

      {/* Body */}
      <div className="px-3 py-2 flex items-center gap-2">
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className={`
            !w-3 !h-3 !border-2 !rounded-sm
            ${isHigh ? '!bg-green-400 !border-green-300' : '!bg-slate-600 !border-slate-500'}
            transition-colors duration-100
          `}
        />

        <span className="text-sm font-mono text-slate-300">{nodeData.name}</span>

        {/* Value indicator */}
        <div
          className={`
            w-8 h-8 rounded border-2 font-mono font-bold text-sm
            flex items-center justify-center
            transition-all duration-100
            ${isHigh
              ? 'bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/30'
              : 'bg-slate-700 border-slate-500 text-slate-400'
            }
          `}
        >
          {value}
        </div>
      </div>
    </div>
  )
}

export default memo(OutputNode)
