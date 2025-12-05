import { useCallback, useEffect, useRef } from 'react'
import { useGameStore } from '../../game/useGameStore'
import { gameFiles } from '../../game/files'
import { puzzles } from '../../game/puzzles'
import { quickCheckPuzzle } from '../../game/validator'
import { AlertCircle, Check, FileCode, Zap } from 'lucide-react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

export function GameEditor() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const {
    activeFile,
    editorContent,
    updateEditorContent,
    solvedPuzzles,
  } = useGameStore()

  const file = activeFile ? gameFiles[activeFile] : null
  const puzzle = file?.puzzleId ? puzzles[file.puzzleId] : null
  const isSolved = puzzle ? solvedPuzzles.includes(puzzle.id) : false

  // Check if current code appears correct (for real-time feedback)
  const appearsCorrect = puzzle && !isSolved
    ? quickCheckPuzzle(puzzle.id, editorContent)
    : false

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor
  }, [])

  const handleChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      updateEditorContent(value)
    }
  }, [updateEditorContent])

  // Update editor when file changes
  useEffect(() => {
    if (editorRef.current && file) {
      // Only update if content is different (prevents cursor jump)
      const currentValue = editorRef.current.getValue()
      if (currentValue !== file.content && editorContent === '') {
        editorRef.current.setValue(file.content)
      }
    }
  }, [file, editorContent])

  if (!activeFile || !file) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-vscode-bg text-vscode-muted">
        <FileCode size={48} className="mb-4 opacity-30" />
        <p className="text-sm">Select a file to begin repairs</p>
        <p className="text-xs mt-2 opacity-50">Type 'open &lt;filename&gt;' in the console</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-vscode-bg">
      {/* File header */}
      <div className="px-4 py-2 bg-vscode-sidebar border-b border-vscode-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode size={14} className="text-blue-400" />
          <span className="text-sm font-medium text-vscode-text">{activeFile}</span>
          {puzzle && (
            isSolved ? (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded flex items-center gap-1">
                <Check size={10} />
                FIXED
              </span>
            ) : appearsCorrect ? (
              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded flex items-center gap-1">
                <Zap size={10} />
                READY TO FLASH
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded flex items-center gap-1">
                <AlertCircle size={10} />
                DAMAGED
              </span>
            )
          )}
        </div>

        {puzzle && !isSolved && (
          <div className="text-xs text-vscode-muted">
            Type 'flash {activeFile}' to test your fix
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language="rust"  // Wire syntax is similar to Rust
          theme="vs-dark"
          value={editorContent || file.content}
          onChange={handleChange}
          onMount={handleEditorMount}
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            automaticLayout: true,
            readOnly: isSolved,  // Can't edit fixed files
            renderLineHighlight: 'all',
            bracketPairColorization: { enabled: true },
            guides: {
              indentation: true,
              bracketPairs: true,
            },
          }}
        />
      </div>

      {/* Footer with hints */}
      {puzzle && !isSolved && (
        <div className="px-4 py-2 bg-yellow-500/10 border-t border-yellow-500/30 text-xs text-yellow-300">
          <strong>Hint:</strong> Look for the DAMAGE comment in the code. The fix is usually simple!
          Type 'hint' in the console for more help.
        </div>
      )}

      {isSolved && (
        <div className="px-4 py-2 bg-green-500/10 border-t border-green-500/30 text-xs text-green-300">
          This circuit has been repaired and is functioning normally.
        </div>
      )}
    </div>
  )
}
