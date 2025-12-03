import { useState } from 'react'
import './styles/globals.css'
import { Playground } from './components/Playground'
import { VisualEditorWithCode } from './visual-editor'

type View = 'playground' | 'visual'

export function App() {
  const [view, setView] = useState<View>('visual')

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
        </div>
      </header>
      <div className="h-[calc(100vh-3rem)]">
        {view === 'visual' ? <VisualEditorWithCode /> : <Playground />}
      </div>
    </div>
  )
}
