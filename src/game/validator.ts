// Puzzle validation for Dead Silicon
// Uses WASM simulation to verify player's code fixes

import { createSimulator, type ISimulator } from '../wire'
import { puzzles } from './puzzles'
import type { Puzzle, TestCase } from './types'
import { stdlib } from './stdlib'

export interface ValidationResult {
  success: boolean
  message: string
  details?: string
}

/**
 * Validate a player's code fix for a puzzle using WASM simulation
 */
export function validatePuzzle(
  puzzleId: string,
  playerCode: string
): ValidationResult {
  const puzzle = puzzles[puzzleId]
  if (!puzzle) {
    return {
      success: false,
      message: `Unknown puzzle: ${puzzleId}`
    }
  }

  // Prepend stdlib so puzzle code can use dff8, adder8, etc.
  const fullCode = stdlib + '\n' + playerCode

  // Create simulator with WASM strategy for speed
  const sim = createSimulator(fullCode, undefined, 'wasm')

  if (!sim.ok) {
    return {
      success: false,
      message: 'Compilation failed',
      details: sim.error || 'Unknown error'
    }
  }

  // Run test cases to verify the fix
  if (puzzle.validation.type === 'output' && puzzle.validation.testCases) {
    return validateOutputTests(puzzle, sim.simulator, puzzle.validation.testCases)
  }

  // Fallback for puzzles without test cases
  return {
    success: true,
    message: 'Code compiles successfully'
  }
}

/**
 * Run test cases against the compiled circuit using WASM simulator
 */
function validateOutputTests(
  puzzle: Puzzle,
  simulator: ISimulator,
  testCases: TestCase[]
): ValidationResult {
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i]
    const cycles = testCase.cycles || 5

    // Reset simulator for each test case
    simulator.reset()

    // Set non-clock inputs
    for (const [name, value] of Object.entries(testCase.inputs)) {
      if (name !== 'clk') {
        simulator.setInput(name, value)
      }
    }

    // Run simulation for specified cycles with clock toggling
    // DFFs need rising edges (0->1) to latch data
    for (let c = 0; c < cycles; c++) {
      simulator.setInput('clk', 0)
      simulator.step()
      simulator.setInput('clk', 1)
      simulator.step()
    }

    // Check outputs
    for (const [name, expected] of Object.entries(testCase.expectedOutputs)) {
      const actual = simulator.getOutput(name)
      if (actual !== expected) {
        return {
          success: false,
          message: `Test case ${i + 1} failed`,
          details: `Expected ${name}=${expected}, got ${actual}`
        }
      }
    }
  }

  return {
    success: true,
    message: `All ${testCases.length} tests passed!`
  }
}

/**
 * Quick check if code compiles (for real-time feedback while editing)
 */
export function quickCheck(playerCode: string): { ok: boolean; error?: string } {
  const fullCode = stdlib + '\n' + playerCode
  const sim = createSimulator(fullCode, undefined, 'wasm')
  if (sim.ok) {
    return { ok: true }
  }
  return { ok: false, error: sim.error }
}
