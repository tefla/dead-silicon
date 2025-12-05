// Puzzle validation for Dead Silicon
// Checks if a player's code fix is correct

import { createSimulator, type ISimulator } from '../wire'
import { puzzles } from './puzzles'
import type { Puzzle, TestCase } from './types'

export interface ValidationResult {
  success: boolean
  message: string
  details?: string
}

/**
 * Validate a player's code fix for a puzzle
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

  // First, do a basic syntax check - try to compile
  const sim = createSimulator(playerCode)

  // For pattern-based validation, check patterns first
  // This allows validation to work even if the code uses stdlib modules
  // that aren't defined as primitives
  if (puzzle.validation.type === 'pattern') {
    // Even with pattern validation, we want valid syntax
    if (!sim.ok && !playerCode.trim()) {
      return {
        success: false,
        message: 'Empty code',
        details: 'Please provide code to validate'
      }
    }
    return validateCodePatterns(puzzle, playerCode)
  }

  // For output-based tests, we need successful compilation
  if (!sim.ok) {
    return {
      success: false,
      message: 'Compilation failed',
      details: sim.error || 'Unknown error'
    }
  }

  // Run validation based on puzzle type
  if (puzzle.validation.type === 'output' && puzzle.validation.testCases) {
    return validateOutputTests(puzzle, sim.simulator, puzzle.validation.testCases)
  }

  // Default: check if code compiles without the known bug patterns
  return validateCodePatterns(puzzle, playerCode)
}

/**
 * Run test cases against the compiled circuit
 */
function validateOutputTests(
  puzzle: Puzzle,
  simulator: ISimulator,
  testCases: TestCase[]
): ValidationResult {
  // Run each test case
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i]
    const cycles = testCase.cycles || 5

    // Reset simulator
    simulator.reset()

    // Set inputs
    for (const [name, value] of Object.entries(testCase.inputs)) {
      simulator.setInput(name, value)
    }

    // Run for specified cycles
    for (let c = 0; c < cycles; c++) {
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
    message: 'All tests passed!'
  }
}

/**
 * Check for known bug patterns in the code
 * Simpler validation for puzzles that are harder to test
 */
function validateCodePatterns(
  puzzle: Puzzle,
  code: string
): ValidationResult {
  // Puzzle-specific pattern checks
  switch (puzzle.id) {
    case 'o2_sensor':
      // Check for [0:7] instead of [0:6]
      if (code.includes('[0:7]') && !code.includes('[0:6]')) {
        return { success: true, message: 'Bit slice corrected!' }
      }
      if (code.includes('[0:6]')) {
        return {
          success: false,
          message: 'Bit slice still truncating high bit',
          details: 'The slice [0:6] only captures 7 bits. Try [0:7] for all 8 bits.'
        }
      }
      break

    case 'co2_scrubber':
      // Check for inverted comparison
      if (code.includes('not(diff[7])') || code.includes('not( diff[7] )')) {
        return { success: true, message: 'Comparison logic fixed!' }
      }
      // Also accept direct use of carry flag for >= comparison
      if (code.includes('.cout') && !code.includes('= diff[7]')) {
        return { success: true, message: 'Comparison logic fixed!' }
      }
      break

    case 'solar_ctrl':
      // Check for carry-in = 1
      if (code.includes('not8(threshold), 1)') || code.includes('not8(threshold),1)')) {
        return { success: true, message: 'Subtraction carry fixed!' }
      }
      if (code.includes('not8(threshold), 0)') || code.includes('not8(threshold),0)')) {
        return {
          success: false,
          message: 'Carry-in still incorrect',
          details: 'Two\'s complement subtraction needs carry-in = 1'
        }
      }
      break

    case 'battery_mon':
      // Check for second delay stage
      if (code.includes('dff8(stage1,') || code.includes('dff8( stage1,')) {
        return { success: true, message: 'ADC timing fixed!' }
      }
      break

    case 'flash_ctrl':
      // Check for second delay stage
      if (code.includes('dff(read_delay1,') || code.includes('dff( read_delay1,')) {
        return { success: true, message: 'Flash timing fixed!' }
      }
      break
  }

  // Default: check if compiles without major errors
  const sim = createSimulator(code)
  if (sim.ok) {
    return {
      success: false,
      message: 'Code compiles but fix not detected',
      details: 'Check the damaged section marked in comments'
    }
  }

  return {
    success: false,
    message: 'Syntax error in code',
    details: sim.error
  }
}

/**
 * Quick check if a puzzle appears to be solved
 * Used for UI feedback before full validation
 */
export function quickCheckPuzzle(puzzleId: string, code: string): boolean {
  const puzzle = puzzles[puzzleId]
  if (!puzzle) return false

  switch (puzzleId) {
    case 'o2_sensor':
      return code.includes('[0:7]') && !code.includes('[0:6]')

    case 'co2_scrubber':
      return code.includes('not(diff[7])')

    case 'solar_ctrl':
      return /not8\(threshold\),\s*1\)/.test(code)

    case 'battery_mon':
      return /stage2\s*=\s*dff8\(stage1/.test(code)

    case 'flash_ctrl':
      return /read_delay2\s*=\s*dff\(read_delay1/.test(code)

    default:
      return false
  }
}
