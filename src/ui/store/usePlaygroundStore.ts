import { create } from 'zustand'

interface PlaygroundStore {
  // File management
  activeFile: string | null
  activeLanguage: 'wire' | 'pulse' | null
  editorValue: string

  // Simulation state
  isRunning: boolean
  speed: number  // 1-100x
  currentCycle: number

  // Actions
  setActiveFile: (filename: string, language: 'wire' | 'pulse', content: string) => void
  updateEditorValue: (value: string) => void
  startSimulation: () => void
  pauseSimulation: () => void
  resetSimulation: () => void
  setSpeed: (speed: number) => void
}

export const usePlaygroundStore = create<PlaygroundStore>((set) => ({
  // Initial state
  activeFile: null,
  activeLanguage: null,
  editorValue: '',
  isRunning: false,
  speed: 1,
  currentCycle: 0,

  // Actions
  setActiveFile: (filename, language, content) =>
    set({ activeFile: filename, activeLanguage: language, editorValue: content }),

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
}))
