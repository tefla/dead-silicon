// Simulation types for Wire and Pulse

export interface WaveformSnapshot {
  cycle: number
  signals: Map<string, number>
}

export interface SimulationState {
  mode: 'wire' | 'pulse'
  isRunning: boolean
  currentCycle: number
  speed: number // Steps per frame (1-100)

  // Wire-specific
  wireValues: Map<string, number>
  waveformHistory: WaveformSnapshot[]

  // Pulse-specific (for future Phase 5)
  cpuState: CPUState | null
  ledState: number
}

export interface CPUState {
  A: number
  X: number
  Y: number
  SP: number
  PC: number
  flags: {
    Z: boolean
    C: boolean
    I: boolean
  }
}

export const MAX_WAVEFORM_CYCLES = 100
