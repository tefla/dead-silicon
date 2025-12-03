import './styles/globals.css'
import { Playground } from './components/Playground'

export function App() {
  return (
    <div className="h-screen w-screen bg-vscode-bg text-vscode-text">
      <header className="h-12 bg-vscode-sidebar border-b border-vscode-border flex items-center px-4">
        <h1 className="text-lg font-semibold">Dead Silicon</h1>
        <div className="ml-4 flex gap-2">
          <button className="px-3 py-1 text-sm bg-vscode-accent text-white rounded">
            Playground
          </button>
        </div>
      </header>
      <div className="h-[calc(100vh-3rem)]">
        <Playground />
      </div>
    </div>
  )
}
