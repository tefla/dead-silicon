import { usePlaygroundStore } from '../store/usePlaygroundStore'

export function WaveformDisplay() {
  const { waveformHistory, wireValues } = usePlaygroundStore()

  if (waveformHistory.length === 0) {
    return (
      <div className="text-xs text-vscode-muted mb-4">
        No waveform data yet. Click Step or Run to begin simulation.
      </div>
    )
  }

  // Get all signal names from the most recent snapshot
  const signalNames = Array.from(wireValues.keys()).filter(name => !name.includes('.'))
  signalNames.sort()

  // Render waveform for each signal
  const renderWaveform = (signalName: string) => {
    // Take last N cycles from history
    const maxCycles = 50
    const startIdx = Math.max(0, waveformHistory.length - maxCycles)
    const recentHistory = waveformHistory.slice(startIdx)

    let waveform = ''
    for (const snapshot of recentHistory) {
      const value = snapshot.signals.get(signalName) ?? 0
      waveform += value ? '▓' : '░'
    }

    return waveform
  }

  // Show only important signals (clk, led, and outputs)
  const importantSignals = signalNames.filter(name => {
    const lower = name.toLowerCase()
    return lower.includes('clk') ||
           lower.includes('led') ||
           lower.includes('out') ||
           lower === 'q' ||
           lower.includes('count')
  }).slice(0, 10) // Limit to 10 signals

  return (
    <div className="mb-6">
      <div className="text-xs text-vscode-muted mb-2">Waveforms (last {waveformHistory.length} cycles)</div>
      <div className="font-mono text-xs space-y-1">
        {importantSignals.length > 0 ? (
          importantSignals.map(signal => (
            <div key={signal} className="flex items-center gap-2">
              <span className="text-vscode-muted w-16 truncate" title={signal}>
                {signal}:
              </span>
              <span className="waveform tracking-tight">{renderWaveform(signal)}</span>
              <span className="text-vscode-muted ml-2">
                {wireValues.get(signal) ?? 0}
              </span>
            </div>
          ))
        ) : (
          <div className="text-vscode-muted">No signals to display</div>
        )}
      </div>
    </div>
  )
}
