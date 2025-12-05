// Game state store for Dead Silicon
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Phase, ConsoleMessage } from './types'
import { puzzles, isPhaseComplete } from './puzzles'
import { phases, getNextPhase } from './phases'

interface GameStore {
  // Game progress
  currentPhase: Phase
  solvedPuzzles: string[]  // Array for serialization (converted to Set internally)
  unlockedFiles: string[]  // Array for serialization
  hintsShown: Record<string, number>  // puzzle id -> hint level
  narrativeFlags: string[]  // story beats shown
  gameStarted: boolean

  // Survival stats
  o2Level: number
  powerLevel: number

  // Console state
  consoleMessages: ConsoleMessage[]
  commandHistory: string[]

  // Active file
  activeFile: string | null
  editorContent: string

  // Actions - Game progress
  startGame: () => void
  resetGame: () => void
  solvePuzzle: (puzzleId: string) => void
  unlockFile: (filename: string) => void
  advancePhase: () => void
  showHint: (puzzleId: string) => void
  setNarrativeFlag: (flag: string) => void

  // Actions - Console
  addConsoleMessage: (type: ConsoleMessage['type'], text: string) => void
  addCommandToHistory: (command: string) => void
  clearConsole: () => void

  // Actions - Editor
  setActiveFile: (filename: string, content: string) => void
  updateEditorContent: (content: string) => void

  // Computed helpers (not state, just helpers)
  isPuzzleSolved: (puzzleId: string) => boolean
  isFileUnlocked: (filename: string) => boolean
  canAdvancePhase: () => boolean
}

// Initial files available
const INITIAL_FILES = [
  'lifesup/o2_sensor.wire',
  'lifesup/co2_scrubber.wire',
]

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentPhase: 1,
      solvedPuzzles: [],
      unlockedFiles: [...INITIAL_FILES],
      hintsShown: {},
      narrativeFlags: [],
      gameStarted: false,
      o2Level: 47,  // Shows the "broken" sensor reading initially
      powerLevel: 62,
      consoleMessages: [],
      commandHistory: [],
      activeFile: null,
      editorContent: '',

      // Game progress actions
      startGame: () => {
        const state = get()
        if (state.gameStarted) return

        set({ gameStarted: true })

        // Show intro narrative
        const intro = phases[1].storyIntro
        get().addConsoleMessage('narrative', intro)
      },

      resetGame: () => set({
        currentPhase: 1,
        solvedPuzzles: [],
        unlockedFiles: [...INITIAL_FILES],
        hintsShown: {},
        narrativeFlags: [],
        gameStarted: false,
        o2Level: 47,
        powerLevel: 62,
        consoleMessages: [],
        commandHistory: [],
        activeFile: null,
        editorContent: '',
      }),

      solvePuzzle: (puzzleId) => {
        const state = get()
        if (state.solvedPuzzles.includes(puzzleId)) return

        const puzzle = puzzles[puzzleId]
        if (!puzzle) return

        const newSolvedPuzzles = [...state.solvedPuzzles, puzzleId]
        set({ solvedPuzzles: newSolvedPuzzles })

        // Show success message
        get().addConsoleMessage('success', `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                        REPAIR SUCCESSFUL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${puzzle.name.toUpperCase()}: FIXED

${puzzle.diagnosticFixed}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)

        // Update survival stats based on puzzle
        if (puzzleId === 'o2_sensor') {
          set({ o2Level: 94 })
        }
        if (puzzleId === 'solar_ctrl') {
          set({ powerLevel: 85 })
        }

        // Check if phase is complete
        const solvedSet = new Set(newSolvedPuzzles)
        if (isPhaseComplete(state.currentPhase, solvedSet)) {
          const phase = phases[state.currentPhase]
          get().addConsoleMessage('narrative', phase.storyComplete)

          // Auto-advance to next phase
          const nextPhase = getNextPhase(state.currentPhase)
          if (nextPhase) {
            // Unlock new files for next phase
            const nextPhaseData = phases[nextPhase]
            const newFiles: string[] = []
            if (nextPhase === 2) {
              newFiles.push('power/solar_ctrl.wire', 'power/battery_mon.wire')
            } else if (nextPhase === 3) {
              newFiles.push('storage/flash_ctrl.wire')
            }

            set({
              currentPhase: nextPhase,
              unlockedFiles: [...state.unlockedFiles, ...newFiles],
            })

            // Show next phase intro after a beat
            setTimeout(() => {
              get().addConsoleMessage('narrative', nextPhaseData.storyIntro)
            }, 1000)
          }
        }
      },

      unlockFile: (filename) => {
        const state = get()
        if (!state.unlockedFiles.includes(filename)) {
          set({ unlockedFiles: [...state.unlockedFiles, filename] })
        }
      },

      advancePhase: () => {
        const state = get()
        const nextPhase = getNextPhase(state.currentPhase)
        if (nextPhase) {
          set({ currentPhase: nextPhase })
        }
      },

      showHint: (puzzleId) => {
        const state = get()
        const currentHintLevel = state.hintsShown[puzzleId] || 0
        const puzzle = puzzles[puzzleId]

        if (!puzzle) return

        // For now, just show one hint level
        if (currentHintLevel === 0) {
          set({
            hintsShown: { ...state.hintsShown, [puzzleId]: 1 }
          })
          get().addConsoleMessage('system', `
━━━ HINT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${puzzle.hint}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
        }
      },

      setNarrativeFlag: (flag) => {
        const state = get()
        if (!state.narrativeFlags.includes(flag)) {
          set({ narrativeFlags: [...state.narrativeFlags, flag] })
        }
      },

      // Console actions
      addConsoleMessage: (type, text) => {
        set((state) => ({
          consoleMessages: [
            ...state.consoleMessages,
            { type, text, timestamp: new Date() }
          ]
        }))
      },

      addCommandToHistory: (command) => {
        set((state) => ({
          commandHistory: [...state.commandHistory, command]
        }))
      },

      clearConsole: () => {
        set({ consoleMessages: [] })
      },

      // Editor actions
      setActiveFile: (filename, content) => {
        set({ activeFile: filename, editorContent: content })
      },

      updateEditorContent: (content) => {
        set({ editorContent: content })
      },

      // Helpers
      isPuzzleSolved: (puzzleId) => {
        return get().solvedPuzzles.includes(puzzleId)
      },

      isFileUnlocked: (filename) => {
        return get().unlockedFiles.includes(filename)
      },

      canAdvancePhase: () => {
        const state = get()
        const solvedSet = new Set(state.solvedPuzzles)
        return isPhaseComplete(state.currentPhase, solvedSet)
      },
    }),
    {
      name: 'dead-silicon-save',
      partialize: (state) => ({
        currentPhase: state.currentPhase,
        solvedPuzzles: state.solvedPuzzles,
        unlockedFiles: state.unlockedFiles,
        hintsShown: state.hintsShown,
        narrativeFlags: state.narrativeFlags,
        gameStarted: state.gameStarted,
        o2Level: state.o2Level,
        powerLevel: state.powerLevel,
      })
    }
  )
)
