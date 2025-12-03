import { create } from 'zustand'
import type { WaveformSnapshot } from '../simulation/types'
import { MAX_WAVEFORM_CYCLES } from '../simulation/types'

interface PlaygroundStore {
  // File management
  activeFile: string | null
  activeLanguage: 'wire' | 'pulse' | null
  editorValue: string

  // Simulation state
  isRunning: boolean
  speed: number  // 1-100x
  currentCycle: number
  simulationError: string | null

  // Wire simulation state
  wireValues: Map<string, number>
  waveformHistory: WaveformSnapshot[]

  // Actions
  setActiveFile: (filename: string, language: 'wire' | 'pulse', content: string) => void
  updateEditorValue: (value: string) => void
  startSimulation: () => void
  pauseSimulation: () => void
  resetSimulation: () => void
  setSpeed: (speed: number) => void
  setCurrentCycle: (cycle: number) => void
  setWireValues: (values: Map<string, number>) => void
  addWaveformSnapshot: (snapshot: WaveformSnapshot) => void
  clearWaveform: () => void
  setSimulationError: (error: string | null) => void
}

export const usePlaygroundStore = create<PlaygroundStore>((set) => ({
  // Initial state
  activeFile: null,
  activeLanguage: null,
  editorValue: '',
  isRunning: false,
  speed: 1,
  currentCycle: 0,
  simulationError: null,
  wireValues: new Map(),
  waveformHistory: [],

  // Actions
  setActiveFile: (filename, language, content) =>
    set({
      activeFile: filename,
      activeLanguage: language,
      editorValue: content,
      currentCycle: 0,
      wireValues: new Map(),
      waveformHistory: [],
      simulationError: null,
    }),

  updateEditorValue: (value) =>
    set({ editorValue: value }),

  startSimulation: () =>
    set({ isRunning: true }),

  pauseSimulation: () =>
    set({ isRunning: false }),

  resetSimulation: () =>
    set({ isRunning: false, currentCycle: 0 }),

  setSpeed: (speed) =>
    set({ speed }),

  setCurrentCycle: (cycle) =>
    set({ currentCycle: cycle }),

  setWireValues: (values) =>
    set({ wireValues: values }),

  addWaveformSnapshot: (snapshot) =>
    set((state) => {
      const history = [...state.waveformHistory, snapshot]
      // Keep only last MAX_WAVEFORM_CYCLES
      if (history.length > MAX_WAVEFORM_CYCLES) {
        history.shift()
      }
      return { waveformHistory: history }
    }),

  clearWaveform: () =>
    set({ waveformHistory: [] }),

  setSimulationError: (error) =>
    set({ simulationError: error }),
}))
