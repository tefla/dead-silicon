import { usePlaygroundStore } from '../store/usePlaygroundStore'

export function LEDDisplay() {
  const { wireValues } = usePlaygroundStore()

  // Find LED signal (look for 'led', 'out', or 'q')
  const ledSignals = Array.from(wireValues.keys()).filter(name => {
    const lower = name.toLowerCase()
    return lower === 'led' || lower === 'out' || lower === 'q'
  })

  if (ledSignals.length === 0) {
    return null
  }

  return (
    <div className="mt-6">
      <div className="text-xs text-vscode-muted mb-3">LED Output</div>
      <div className="flex gap-3 flex-wrap">
        {ledSignals.map(signal => {
          const value = wireValues.get(signal) ?? 0
          const isOn = value !== 0

          return (
            <div key={signal} className="flex flex-col items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full transition-all duration-150 ${
                  isOn
                    ? 'bg-green-500 shadow-lg shadow-green-500/50'
                    : 'bg-gray-700 border border-gray-600'
                }`}
                title={`${signal}: ${value}`}
              />
              <span className="text-xs text-vscode-muted">{signal}</span>
              <span className="text-xs font-mono">{value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
