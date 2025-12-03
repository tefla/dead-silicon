import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'

interface InputNodeData {
  name: string
  width: number
  value?: number
  onToggle?: () => void
}

interface InputNodeProps {
  data: InputNodeData
  selected?: boolean
}

function InputNode({ data, selected }: InputNodeProps) {
  const nodeData = data
  const value = nodeData.value ?? 0
  const isHigh = value === 1

  return (
    <div
      className={`
        relative bg-slate-800 border-2 rounded-lg
        ${selected ? 'border-amber-400 shadow-lg shadow-amber-400/20' : 'border-slate-600'}
        transition-all duration-150
      `}
    >
      {/* Header */}
      <div className="bg-amber-900/50 px-3 py-1 rounded-t-md border-b border-slate-600">
        <span className="text-xs font-mono font-bold text-amber-400">INPUT</span>
      </div>

      {/* Body */}
      <div className="px-3 py-2 flex items-center gap-2">
        {/* Toggle button for single-bit inputs */}
        {nodeData.width === 1 && (
          <button
            onClick={nodeData.onToggle}
            className={`
              w-8 h-8 rounded border-2 font-mono font-bold text-sm
              transition-all duration-100 cursor-pointer
              ${isHigh
                ? 'bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/30'
                : 'bg-slate-700 border-slate-500 text-slate-400 hover:border-slate-400'
              }
            `}
          >
            {value}
          </button>
        )}

        <span className="text-sm font-mono text-slate-300">{nodeData.name}</span>

        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className={`
            !w-3 !h-3 !border-2 !rounded-sm
            ${isHigh ? '!bg-green-400 !border-green-300' : '!bg-slate-600 !border-slate-500'}
            transition-colors duration-100
          `}
        />
      </div>
    </div>
  )
}

export default memo(InputNode)
