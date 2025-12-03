import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react'

export function SimulationPanel() {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-vscode-border">
        <h3 className="text-sm font-semibold mb-3">Simulation</h3>

        {/* Controls */}
        <div className="flex gap-2 mb-4">
          <button className="p-2 hover:bg-vscode-border/30 rounded" title="Run">
            <Play size={16} />
          </button>
          <button className="p-2 hover:bg-vscode-border/30 rounded" title="Pause">
            <Pause size={16} />
          </button>
          <button className="p-2 hover:bg-vscode-border/30 rounded" title="Step">
            <SkipForward size={16} />
          </button>
          <button className="p-2 hover:bg-vscode-border/30 rounded" title="Reset">
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-vscode-muted">Speed:</span>
          <input
            type="range"
            min="1"
            max="100"
            defaultValue="1"
            className="flex-1"
          />
          <span>1x</span>
        </div>
      </div>

      {/* Waveform Display */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="text-xs mb-4">
          <div className="mb-1"><span className="text-vscode-muted">CLK:</span> <span className="waveform">▓░▓░▓░▓░▓░</span></div>
          <div className="mb-1"><span className="text-vscode-muted">LED:</span> <span className="waveform">░▓░▓░▓░▓░▓</span></div>
        </div>

        {/* LED Display */}
        <div className="mt-6">
          <div className="text-xs text-vscode-muted mb-2">LED Output</div>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
