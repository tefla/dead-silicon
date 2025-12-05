// Game types for Dead Silicon

export type Phase = 1 | 2 | 3 | 4 | 5 | 6

export interface Puzzle {
  id: string
  name: string
  file: string
  language: 'wire' | 'pulse'
  phase: Phase
  system: string
  description: string
  diagnostic: string  // What "diag" shows when broken
  diagnosticFixed: string  // What "diag" shows when fixed
  hint: string  // Hint for stuck players
  validation: PuzzleValidation
}

export interface PuzzleValidation {
  type: 'output' | 'behavior' | 'code'
  // For output validation: specific test cases
  testCases?: TestCase[]
  // For code validation: patterns to check
  requiredPattern?: string
  forbiddenPattern?: string
}

export interface TestCase {
  inputs: Record<string, number>
  expectedOutputs: Record<string, number>
  cycles?: number
}

export interface GamePhase {
  id: Phase
  name: string
  title: string
  description: string
  survivalTime: string  // e.g., "4 hours"
  systems: string[]
  puzzles: string[]  // puzzle IDs
  storyIntro: string
  storyComplete: string
}

export interface CrewLog {
  id: number
  timestamp: string
  content: string
  phase: Phase  // When this log becomes readable
}

export interface GameState {
  currentPhase: Phase
  solvedPuzzles: Set<string>
  unlockedFiles: Set<string>
  o2Level: number  // 0-100
  powerLevel: number  // 0-100
  timeRemaining: string
  hints: Record<string, number>  // puzzle id -> hint level shown
  narrativeFlags: Set<string>  // story beats that have been shown
}

export interface ConsoleMessage {
  type: 'system' | 'error' | 'success' | 'warning' | 'narrative' | 'input'
  text: string
  timestamp?: Date
}
