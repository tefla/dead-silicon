export function EditorPanel() {
  return (
    <div className="h-full flex flex-col">
      <div className="h-10 bg-vscode-sidebar border-b border-vscode-border flex items-center px-4">
        <span className="text-sm">blinker.wire</span>
      </div>
      <div className="flex-1 p-4 font-mono text-sm">
        <div className="text-vscode-muted">
          {`; Simple blinker - toggles on each clock
module simple_blinker(clk) -> led:
  led = dff(not(led), clk)`}
        </div>
      </div>
    </div>
  )
}
