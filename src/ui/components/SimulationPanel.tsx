import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react'
import { usePlaygroundStore } from '../store/usePlaygroundStore'
import { useSimulation } from '../simulation/useSimulation'
import { WaveformDisplay } from './WaveformDisplay'
import { LEDDisplay } from './LEDDisplay'

export function SimulationPanel() {
  const {
    isRunning,
    speed,
    currentCycle,
    simulationError,
    activeLanguage,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    setSpeed,
  } = usePlaygroundStore()

  const { step, reset } = useSimulation()

  const handleRun = () => startSimulation()
  const handlePause = () => pauseSimulation()
  const handleStep = () => {
    pauseSimulation()
    step()
  }
  const handleReset = () => {
    pauseSimulation()
    reset()
    resetSimulation()
  }

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSpeed(Number(e.target.value))
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-vscode-border">
        <h3 className="text-sm font-semibold mb-3">Simulation</h3>

        {/* Status */}
        <div className="text-xs text-vscode-muted mb-3">
          Cycle: {currentCycle}
        </div>

        {/* Controls */}
        <div className="flex gap-2 mb-4">
          <button
            className="p-2 hover:bg-vscode-border/30 rounded disabled:opacity-50"
            title="Run"
            onClick={handleRun}
            disabled={isRunning || !activeLanguage}
          >
            <Play size={16} />
          </button>
          <button
            className="p-2 hover:bg-vscode-border/30 rounded disabled:opacity-50"
            title="Pause"
            onClick={handlePause}
            disabled={!isRunning}
          >
            <Pause size={16} />
          </button>
          <button
            className="p-2 hover:bg-vscode-border/30 rounded disabled:opacity-50"
            title="Step"
            onClick={handleStep}
            disabled={!activeLanguage || isRunning}
          >
            <SkipForward size={16} />
          </button>
          <button
            className="p-2 hover:bg-vscode-border/30 rounded disabled:opacity-50"
            title="Reset"
            onClick={handleReset}
            disabled={!activeLanguage}
          >
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
            value={speed}
            onChange={handleSpeedChange}
            className="flex-1"
          />
          <span className="w-8 text-right">{speed}x</span>
        </div>

        {/* Error Display */}
        {simulationError && (
          <div className="mt-3 p-2 bg-red-900/20 border border-red-700 text-red-400 text-xs rounded">
            {simulationError}
          </div>
        )}
      </div>

      {/* Waveform Display */}
      <div className="flex-1 p-4 overflow-auto">
        {activeLanguage === 'wire' && (
          <>
            <WaveformDisplay />
            <LEDDisplay />
          </>
        )}

        {!activeLanguage && (
          <div className="text-center text-vscode-muted text-sm mt-8">
            Select a file to begin simulation
          </div>
        )}
      </div>
    </div>
  )
}
