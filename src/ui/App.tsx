import { useState, useCallback } from 'react'
import './styles/globals.css'
import { Playground } from './components/Playground'
import { VisualEditorWithCode } from './visual-editor'
import { KnowledgeBase } from './knowledge-base'
import { usePlaygroundStore } from './store/usePlaygroundStore'

type View = 'playground' | 'visual' | 'knowledge'

export function App() {
  const [view, setView] = useState<View>('visual')
  const setActiveFile = usePlaygroundStore(state => state.setActiveFile)

  // Handle opening examples from knowledge base in playground
  const handleOpenExample = useCallback((code: string, language: 'wire' | 'pulse') => {
    setActiveFile(`example.${language}`, language, code)
    setView('playground')
  }, [setActiveFile])

  return (
    <div className="h-screen w-screen bg-vscode-bg text-vscode-text">
      <header className="h-12 bg-vscode-sidebar border-b border-vscode-border flex items-center px-4">
        <h1 className="text-lg font-semibold">Dead Silicon</h1>
        <div className="ml-4 flex gap-2">
          <button
            onClick={() => setView('visual')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              view === 'visual'
                ? 'bg-vscode-accent text-white'
                : 'bg-vscode-input text-vscode-text hover:bg-vscode-hover'
            }`}
          >
            Visual Editor
          </button>
          <button
            onClick={() => setView('playground')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              view === 'playground'
                ? 'bg-vscode-accent text-white'
                : 'bg-vscode-input text-vscode-text hover:bg-vscode-hover'
            }`}
          >
            Playground
          </button>
          <button
            onClick={() => setView('knowledge')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              view === 'knowledge'
                ? 'bg-vscode-accent text-white'
                : 'bg-vscode-input text-vscode-text hover:bg-vscode-hover'
            }`}
          >
            Knowledge Base
          </button>
        </div>
      </header>
      <div className="h-[calc(100vh-3rem)]">
        {view === 'visual' && <VisualEditorWithCode />}
        {view === 'playground' && <Playground />}
        {view === 'knowledge' && <KnowledgeBase onOpenExample={handleOpenExample} />}
      </div>
    </div>
  )
}
