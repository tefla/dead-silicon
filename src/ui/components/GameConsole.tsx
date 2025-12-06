import { useEffect, useRef, useState, useCallback } from 'react'
import { useCPUSimulation } from '../../game/useCPUSimulation'
import { useGameStore } from '../../game/useGameStore'
import { validatePuzzle } from '../../game/validator'
import { gameFiles } from '../../game/files'

export function GameConsole() {
  const [input, setInput] = useState('')
  const [outputLines, setOutputLines] = useState<string[]>([])
  const currentLineRef = useRef('')
  const consoleRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [, forceUpdate] = useState(0)

  const {
    activeFile,
    editorContent,
    solvePuzzle,
  } = useGameStore()

  // Add a line to output
  const addLine = useCallback((text: string) => {
    setOutputLines(prev => [...prev, text])
  }, [])

  // Handle character output from CPU
  const handleOutput = useCallback((char: string) => {
    if (char === '\n') {
      const line = currentLineRef.current
      currentLineRef.current = ''
      setOutputLines(prev => [...prev, line])
    } else if (char === '\r') {
      // Ignore carriage returns
    } else {
      currentLineRef.current += char
      forceUpdate(n => n + 1)
    }
  }, [])

  // CPU simulation hook
  const cpu = useCPUSimulation({
    onOutput: handleOutput,
    autoStart: true,
    cyclesPerFrame: 500,
  })

  // Handle flash command - intercept and validate with editor content
  const handleFlash = useCallback((filename: string) => {
    const file = gameFiles[filename]
    if (!file) {
      addLine(`flash: file not found: ${filename}`)
      addLine('$')
      return
    }

    if (!file.puzzleId) {
      addLine(`flash: ${filename} is not a flashable circuit`)
      addLine('$')
      return
    }

    // Get the current editor content for this file
    const code = activeFile === filename ? editorContent : file.content

    addLine(`Compiling ${filename}...`)

    // Validate the fix using WASM simulator
    const result = validatePuzzle(file.puzzleId, code)

    if (result.success) {
      addLine('OK')
      addLine('Flashing to EEPROM... OK')
      addLine('System reboot in 3... 2... 1...')
      addLine('')
      addLine('Circuit repaired successfully!')
      addLine('$')
      // Mark puzzle as solved
      setTimeout(() => {
        solvePuzzle(file.puzzleId!)
      }, 500)
    } else {
      addLine('FAIL')
      addLine('')
      addLine(result.message)
      if (result.details) {
        addLine(result.details)
      }
      addLine('')
      addLine('The fix was not successful. Check your changes.')
      addLine('$')
    }
  }, [activeFile, editorContent, addLine, solvePuzzle])

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
    const cmd = input.trim()

    if (cmd) {
      // Check if this is a flash command - intercept it
      if (cmd.startsWith('flash ') || cmd === 'flash') {
        const filename = cmd.slice(6).trim()
        // Echo the command
        addLine(`> ${cmd}`)
        if (!filename) {
          addLine('Usage: flash <filename>')
          addLine('$')
        } else {
          handleFlash(filename)
        }
        setInput('')
        return
      }

      // All other commands go to CPU
      cpu.sendInput(cmd + '\n')
      setInput('')
    } else {
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
