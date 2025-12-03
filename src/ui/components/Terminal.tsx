import { useEffect, useRef, useState } from 'react'
import { usePlaygroundStore } from '../store/usePlaygroundStore'

export function Terminal() {
  const { terminalOutput, sendInput } = usePlaygroundStore()
  const [input, setInput] = useState('')
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalOutput])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      sendInput(input + '\n')
      setInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  return (
    <div className="flex flex-col h-full bg-vscode-bg font-mono text-sm">
      <div className="text-xs font-semibold px-4 py-2 bg-vscode-sidebar border-b border-vscode-border text-vscode-muted uppercase tracking-wide">
        Terminal
      </div>

      {/* Output area */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 text-vscode-text whitespace-pre-wrap"
      >
        {terminalOutput || 'Waiting for simulation...'}
      </div>

      {/* Input area */}
      <div className="border-t border-vscode-border p-2 flex items-center gap-2">
        <span className="text-vscode-accent">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type command..."
          className="flex-1 bg-transparent border-none outline-none text-vscode-text"
        />
      </div>
    </div>
  )
}
