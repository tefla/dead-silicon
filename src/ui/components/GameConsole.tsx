import { useEffect, useRef, useState, useCallback } from 'react'
import { useCPUSimulation } from '../../game/useCPUSimulation'

export function GameConsole() {
  const [input, setInput] = useState('')
  const [outputLines, setOutputLines] = useState<string[]>([])
  const currentLineRef = useRef('')
  const consoleRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [, forceUpdate] = useState(0) // Force re-render on line updates

  // Handle character output from CPU - use ref to avoid stale closures
  const handleOutput = useCallback((char: string) => {
    if (char === '\n') {
      // Complete the current line and add to output
      const line = currentLineRef.current
      currentLineRef.current = ''
      setOutputLines(prev => [...prev, line])
    } else if (char === '\r') {
      // Ignore carriage returns
    } else {
      // Append character to current line
      currentLineRef.current += char
      forceUpdate(n => n + 1) // Trigger re-render to show current line
    }
  }, [])

  // CPU simulation hook
  const cpu = useCPUSimulation({
    onOutput: handleOutput,
    autoStart: true,
    cyclesPerFrame: 500,
  })

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [outputLines])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      // Send input to CPU with newline
      cpu.sendInput(input + '\n')
      setInput('')
    } else {
      // Empty enter - just send newline
      cpu.sendInput('\n')
    }
  }

  // Click anywhere to focus input
  const handleClick = () => {
    inputRef.current?.focus()
  }

  return (
    <div
      className="flex flex-col h-full bg-black font-mono text-sm"
      onClick={handleClick}
    >
      <div className="text-xs font-semibold px-4 py-2 bg-gray-900 border-b border-gray-700 text-green-400 uppercase tracking-wide flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${cpu.isRunning ? 'bg-green-400 animate-pulse' : cpu.isHalted ? 'bg-red-400' : 'bg-yellow-400'}`} />
        {cpu.isHalted ? 'CPU Halted' : cpu.isRunning ? 'Diagnostic Console' : 'Initializing...'}
        {cpu.error && <span className="text-red-400 ml-2">Error: {cpu.error}</span>}
      </div>

      {/* Output area */}
      <div
        ref={consoleRef}
        className="flex-1 overflow-y-auto p-4 whitespace-pre-wrap text-green-400"
      >
        {outputLines.map((line, i) => (
          <div key={i}>{line || '\u00A0'}</div>
        ))}
        {currentLineRef.current && <div>{currentLineRef.current}</div>}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t border-gray-700 p-2 flex items-center gap-2 bg-gray-900">
        <span className="text-green-400">{'>'}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={cpu.isHalted ? 'CPU halted - press Reset' : 'Type command...'}
          className="flex-1 bg-transparent border-none outline-none text-green-300"
          spellCheck={false}
          disabled={cpu.isHalted}
        />
        {cpu.isHalted && (
          <button
            type="button"
            onClick={() => cpu.reset()}
            className="px-2 py-1 bg-gray-700 text-green-400 text-xs rounded hover:bg-gray-600"
          >
            Reset
          </button>
        )}
      </form>
    </div>
  )
}
