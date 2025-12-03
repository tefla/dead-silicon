import { Editor } from '@monaco-editor/react'
import { useRef } from 'react'
import * as monaco from 'monaco-editor'
import { registerWireLanguage } from './wire-language'
import { registerPulseLanguage } from './pulse-language'
import { registerVSCodeTheme } from './themes'

interface MonacoEditorProps {
  value: string
  language: 'wire' | 'pulse'
  onChange?: (value: string | undefined) => void
}

export function MonacoEditor({ value, language, onChange }: MonacoEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const registeredRef = useRef(false)

  const handleEditorMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor

    // Register languages and theme once
    if (!registeredRef.current) {
      registerWireLanguage()
      registerPulseLanguage()
      registerVSCodeTheme()
      registeredRef.current = true
    }
  }

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      theme="vscode-dark-custom"
      onChange={onChange}
      onMount={handleEditorMount}
      options={{
        fontSize: 14,
        fontFamily: "'Courier New', monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        renderWhitespace: 'selection',
        tabSize: 2,
        lineNumbers: 'on',
        glyphMargin: false,
        folding: false,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 3,
        overviewRulerBorder: false,
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible',
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
      }}
    />
  )
}
