import { type DragEvent } from 'react'
import { GATE_LIBRARY, type GateType } from './types'

interface ComponentPaletteProps {
  onDragStart?: (type: string, gateType?: GateType) => void
}

interface PaletteItemProps {
  type: 'input' | 'output' | 'gate'
  gateType?: GateType
  label: string
  color: string
}

function PaletteItem({ type, gateType, label, color }: PaletteItemProps) {
  const onDragStart = (event: DragEvent) => {
    event.dataTransfer.setData('application/reactflow-type', type)
    if (gateType) {
      event.dataTransfer.setData('application/reactflow-gatetype', gateType)
    }
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`
        px-3 py-2 rounded border-2 cursor-grab
        bg-slate-800 hover:bg-slate-700
        transition-colors duration-150
        ${color}
      `}
    >
      <span className="text-xs font-mono font-bold">{label}</span>
    </div>
  )
}

export function ComponentPalette({ onDragStart }: ComponentPaletteProps) {
  return (
    <div className="bg-slate-900 border-r border-slate-700 p-3 w-48 flex flex-col gap-4">
      {/* I/O Section */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          I/O
        </h3>
        <div className="flex flex-col gap-2">
          <PaletteItem
            type="input"
            label="INPUT"
            color="border-amber-600 text-amber-400"
          />
          <PaletteItem
            type="output"
            label="OUTPUT"
            color="border-purple-600 text-purple-400"
          />
        </div>
      </div>

      {/* Primitives Section */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Primitives
        </h3>
        <div className="flex flex-col gap-2">
          <PaletteItem
            type="gate"
            gateType="nand"
            label="NAND"
            color="border-cyan-600 text-cyan-400"
          />
          <PaletteItem
            type="gate"
            gateType="dff"
            label="DFF"
            color="border-cyan-600 text-cyan-400"
          />
        </div>
      </div>

      {/* Logic Gates Section */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Logic Gates
        </h3>
        <div className="flex flex-col gap-2">
          <PaletteItem
            type="gate"
            gateType="not"
            label="NOT"
            color="border-slate-500 text-slate-300"
          />
          <PaletteItem
            type="gate"
            gateType="and"
            label="AND"
            color="border-slate-500 text-slate-300"
          />
          <PaletteItem
            type="gate"
            gateType="or"
            label="OR"
            color="border-slate-500 text-slate-300"
          />
          <PaletteItem
            type="gate"
            gateType="xor"
            label="XOR"
            color="border-slate-500 text-slate-300"
          />
          <PaletteItem
            type="gate"
            gateType="mux"
            label="MUX"
            color="border-slate-500 text-slate-300"
          />
        </div>
      </div>

      {/* Help text */}
      <div className="mt-auto text-xs text-slate-500">
        Drag components onto the canvas to build circuits
      </div>
    </div>
  )
}
