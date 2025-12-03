import { memo } from 'react'
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

interface SignalEdgeData {
  value?: number
  animating?: boolean
}

function SignalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps) {
  const edgeData = data as SignalEdgeData | undefined
  const value = edgeData?.value ?? 0
  const isHigh = value === 1
  const animating = edgeData?.animating ?? false

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  })

  return (
    <>
      {/* Glow effect for high signals */}
      {isHigh && (
        <BaseEdge
          id={`${id}-glow`}
          path={edgePath}
          style={{
            stroke: '#22c55e',
            strokeWidth: 6,
            filter: 'blur(4px)',
            opacity: 0.5,
          }}
        />
      )}

      {/* Main wire */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: isHigh ? '#22c55e' : selected ? '#94a3b8' : '#475569',
          strokeWidth: isHigh ? 3 : 2,
          transition: 'stroke 0.1s, stroke-width 0.1s',
        }}
      />

      {/* Animated pulse for signal propagation */}
      {animating && (
        <circle r="4" fill="#22c55e" filter="url(#glow)">
          <animateMotion dur="0.3s" repeatCount="1" path={edgePath} />
        </circle>
      )}

      {/* Value label on the wire */}
      <foreignObject
        x={labelX - 10}
        y={labelY - 10}
        width={20}
        height={20}
        className="pointer-events-none overflow-visible"
      >
        <div
          className={`
            w-5 h-5 rounded-full flex items-center justify-center
            text-[10px] font-mono font-bold
            ${isHigh
              ? 'bg-green-500 text-white'
              : 'bg-slate-700 text-slate-400 border border-slate-600'
            }
          `}
        >
          {value}
        </div>
      </foreignObject>
    </>
  )
}

export default memo(SignalEdge)
