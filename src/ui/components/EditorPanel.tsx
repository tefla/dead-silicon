import { usePlaygroundStore } from '../store/usePlaygroundStore'
import { MonacoEditor } from '../monaco/MonacoEditor'
import { Suspense } from 'react'

export function EditorPanel() {
  const { activeFile, editorValue, activeLanguage, updateEditorValue } = usePlaygroundStore()

  if (!activeFile || !activeLanguage) {
    return (
      <div className="h-full flex items-center justify-center text-vscode-muted">
        <div className="text-center">
          <p className="mb-2">No file selected</p>
          <p className="text-sm">Select a file from the sidebar to begin</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-10 bg-vscode-sidebar border-b border-vscode-border flex items-center px-4 gap-2">
        <span className="text-sm">{activeFile}</span>
        <span className="text-xs text-vscode-muted px-2 py-0.5 bg-vscode-border/30 rounded">
          {activeLanguage}
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        <Suspense
          fallback={
            <div className="h-full flex items-center justify-center text-vscode-muted">
              Loading editor...
            </div>
          }
        >
          <MonacoEditor
            value={editorValue}
            language={activeLanguage}
            onChange={updateEditorValue}
          />
        </Suspense>
      </div>
    </div>
  )
}
