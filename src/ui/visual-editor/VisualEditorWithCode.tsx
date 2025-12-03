import { useState, useCallback, useRef, Suspense } from 'react'
import { VisualEditor } from './VisualEditor'
import { MonacoEditor } from '../monaco/MonacoEditor'
import { type LayoutData } from './types'
import { GripVertical, Code, Cpu, Eye, EyeOff } from 'lucide-react'

// Default Wire code for a simple NOT gate circuit
const DEFAULT_WIRE_CODE = `; Simple NOT gate (NAND with both inputs tied)
module not_gate(a) -> out:
  out = nand(a, a)
`

// Storage key for layout data
const LAYOUT_STORAGE_KEY = 'dead-silicon-visual-layout'

// Load layout from localStorage
function loadLayout(): LayoutData | undefined {
  try {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.warn('Failed to load layout from localStorage:', e)
  }
  return undefined
}

// Save layout to localStorage
function saveLayout(layout: LayoutData): void {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout))
  } catch (e) {
    console.warn('Failed to save layout to localStorage:', e)
  }
}

export function VisualEditorWithCode() {
  // Wire source code state
  const [wireSource, setWireSource] = useState(DEFAULT_WIRE_CODE)

  // Layout state
  const [layout, setLayout] = useState<LayoutData | undefined>(loadLayout)

  // Track if code was edited (to prevent sync loops)
  const lastCodeChangeRef = useRef<'visual' | 'code' | null>(null)
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Panel visibility
  const [showCode, setShowCode] = useState(true)

  // Split position (percentage for visual editor)
  const [splitPosition, setSplitPosition] = useState(60)
  const isDraggingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle code change from Monaco editor
  const handleCodeChange = useCallback((value: string | undefined) => {
    if (!value) return

    lastCodeChangeRef.current = 'code'

    // Clear any pending sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    // Debounce the sync to visual editor
    syncTimeoutRef.current = setTimeout(() => {
      setWireSource(value)
      lastCodeChangeRef.current = null
    }, 300)
  }, [])

  // Handle source change from visual editor
  const handleVisualSourceChange = useCallback((source: string) => {
    // Only update if the change came from the visual editor
    if (lastCodeChangeRef.current === 'code') return

    lastCodeChangeRef.current = 'visual'
    setWireSource(source)

    // Reset after a short delay
    setTimeout(() => {
      lastCodeChangeRef.current = null
    }, 100)
  }, [])

  // Handle layout change from visual editor
  const handleLayoutChange = useCallback((newLayout: LayoutData) => {
    setLayout(newLayout)
    saveLayout(newLayout)
  }, [])

  // Handle split dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = Math.max(20, Math.min(80, (x / rect.width) * 100))
      setSplitPosition(percentage)
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Toolbar */}
      <div className="h-10 bg-slate-900 border-b border-slate-700 flex items-center px-4 gap-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Cpu size={16} />
          <span className="text-sm font-medium">Visual Wire Editor</span>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setShowCode(!showCode)}
          className={`flex items-center gap-2 px-3 py-1 text-sm rounded transition-colors ${
            showCode
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
          title={showCode ? 'Hide code panel' : 'Show code panel'}
        >
          <Code size={14} />
          {showCode ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      </div>

      {/* Main content */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* Visual Editor */}
        <div
          style={{ width: showCode ? `${splitPosition}%` : '100%' }}
          className="h-full transition-all duration-200"
        >
          <VisualEditor
            wireSource={wireSource}
            onWireSourceChange={handleVisualSourceChange}
            layout={layout}
            onLayoutChange={handleLayoutChange}
          />
        </div>

        {/* Resize handle */}
        {showCode && (
          <div
            className="w-1 bg-slate-700 hover:bg-cyan-500 cursor-col-resize flex items-center justify-center group transition-colors"
            onMouseDown={handleMouseDown}
          >
            <GripVertical
              size={12}
              className="text-slate-500 group-hover:text-cyan-400 transition-colors"
            />
          </div>
        )}

        {/* Code Editor */}
        {showCode && (
          <div
            style={{ width: `${100 - splitPosition}%` }}
            className="h-full flex flex-col bg-vscode-editor"
          >
            {/* Code panel header */}
            <div className="h-10 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2">
              <Code size={14} className="text-slate-400" />
              <span className="text-sm text-slate-300">Wire Code</span>
              <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-700 rounded">
                .wire
              </span>
            </div>

            {/* Monaco editor */}
            <div className="flex-1 overflow-hidden">
              <Suspense
                fallback={
                  <div className="h-full flex items-center justify-center text-slate-500">
                    Loading editor...
                  </div>
                }
              >
                <MonacoEditor
                  value={wireSource}
                  language="wire"
                  onChange={handleCodeChange}
                />
              </Suspense>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
