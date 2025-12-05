import { useEffect, useRef, useState, useCallback } from 'react'
import { useGameStore } from '../../game/useGameStore'
import { executeCommand } from '../../game/commands'
import { validatePuzzle } from '../../game/validator'
import { gameFiles } from '../../game/files'

export function GameConsole() {
  const [input, setInput] = useState('')
  const [historyIndex, setHistoryIndex] = useState(-1)
  const consoleRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    consoleMessages,
    commandHistory,
    currentPhase,
    solvedPuzzles,
    unlockedFiles,
    addConsoleMessage,
    addCommandToHistory,
    setActiveFile,
    updateEditorContent,
    showHint,
    solvePuzzle,
    editorContent,
    activeFile,
  } = useGameStore()

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [consoleMessages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleFlash = useCallback((filename: string) => {
    const file = gameFiles[filename]
    if (!file || !file.puzzleId) {
      addConsoleMessage('error', `Cannot flash: ${filename}`)
      return
    }

    // Get the current editor content for this file
    const code = activeFile === filename ? editorContent : file.content

    // Validate the fix
    const result = validatePuzzle(file.puzzleId, code)

    if (result.success) {
      addConsoleMessage('success', `
Compiling ${filename}... OK
Flashing to EEPROM... OK
System reboot in 3... 2... 1...
`)
      // Mark puzzle as solved
      setTimeout(() => {
        solvePuzzle(file.puzzleId!)
      }, 500)
    } else {
      addConsoleMessage('error', `
Compiling ${filename}... FAIL

${result.message}
${result.details ? '\n' + result.details : ''}

The fix was not successful. Check your changes and try again.
`)
    }
  }, [activeFile, editorContent, addConsoleMessage, solvePuzzle])

  const handleCommand = useCallback((cmd: string) => {
    // Add to history
    addCommandToHistory(cmd)

    // Echo command
    addConsoleMessage('input', `> ${cmd}`)

    // Execute command
    const result = executeCommand(cmd, currentPhase, solvedPuzzles, unlockedFiles)

    // Handle actions
    if (result.action === 'open_file' && result.actionPayload) {
      const file = gameFiles[result.actionPayload]
      if (file) {
        setActiveFile(result.actionPayload, file.content)
        addConsoleMessage('system', result.output)
      }
    } else if (result.action === 'show_hint' && result.actionPayload) {
      showHint(result.actionPayload)
    } else if (result.action === 'flash' && result.actionPayload) {
      handleFlash(result.actionPayload)
    } else if (result.output) {
      addConsoleMessage(result.type, result.output)
    }
  }, [currentPhase, solvedPuzzles, unlockedFiles, addCommandToHistory, addConsoleMessage, setActiveFile, showHint, handleFlash])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      handleCommand(input.trim())
      setInput('')
      setHistoryIndex(-1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '')
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setInput('')
      }
    }
  }

  // Get color class for message type
  const getMessageClass = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-400'
      case 'success': return 'text-green-400'
      case 'warning': return 'text-yellow-400'
      case 'narrative': return 'text-cyan-300'
      case 'input': return 'text-vscode-muted'
      default: return 'text-vscode-text'
    }
  }

  return (
    <div
      className="flex flex-col h-full bg-black font-mono text-sm"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="text-xs font-semibold px-4 py-2 bg-gray-900 border-b border-gray-700 text-green-400 uppercase tracking-wide flex items-center gap-2">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        Diagnostic Console
      </div>

      {/* Output area */}
      <div
        ref={consoleRef}
        className="flex-1 overflow-y-auto p-4 whitespace-pre-wrap"
      >
        {consoleMessages.length === 0 ? (
          <div className="text-green-400">
            CYGNUS-7 DIAGNOSTIC TERMINAL
            {'\n'}Type 'help' for commands.
          </div>
        ) : (
          consoleMessages.map((msg, i) => (
            <div key={i} className={getMessageClass(msg.type)}>
              {msg.text}
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t border-gray-700 p-2 flex items-center gap-2 bg-gray-900">
        <span className="text-green-400">{'>'}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type command..."
          className="flex-1 bg-transparent border-none outline-none text-green-300"
          spellCheck={false}
        />
      </form>
    </div>
  )
}
