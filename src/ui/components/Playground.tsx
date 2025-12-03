import { FileBrowser } from './FileBrowser'
import { EditorPanel } from './EditorPanel'
import { SimulationPanel } from './SimulationPanel'

export function Playground() {
  return (
    <div className="h-full grid grid-cols-[250px_1fr_400px] gap-0">
      {/* File Browser */}
      <div className="border-r border-vscode-border bg-vscode-sidebar overflow-y-auto">
        <FileBrowser />
      </div>

      {/* Editor */}
      <div className="bg-vscode-editor">
        <EditorPanel />
      </div>

      {/* Simulation Panel */}
      <div className="border-l border-vscode-border bg-vscode-panel overflow-y-auto">
        <SimulationPanel />
      </div>
    </div>
  )
}
