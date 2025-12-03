export function FileBrowser() {
  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold mb-4 text-vscode-muted uppercase">Playground</h2>
      <div className="space-y-1">
        <div className="text-sm hover:bg-vscode-border/30 px-2 py-1 rounded cursor-pointer">
          📄 Blinker
        </div>
        <div className="text-sm hover:bg-vscode-border/30 px-2 py-1 rounded cursor-pointer">
          📄 Counter
        </div>
        <div className="text-sm hover:bg-vscode-border/30 px-2 py-1 rounded cursor-pointer">
          📄 ALU
        </div>
      </div>
    </div>
  )
}
