// Tests for puzzle definitions and progression
import { describe, it, expect } from 'vitest'
import { puzzles, puzzlesByPhase, getPuzzlesForPhase, isPuzzleSolved, isPhaseComplete } from './puzzles'
import { phases, getPhase, getNextPhase, getCrewLogsForPhase } from './phases'

describe('Puzzle Definitions', () => {
  describe('puzzle structure', () => {
    it('should have all required puzzle properties', () => {
      for (const [id, puzzle] of Object.entries(puzzles)) {
        expect(puzzle.id).toBe(id)
        expect(puzzle.name).toBeTruthy()
        expect(puzzle.file).toBeTruthy()
        expect(puzzle.language).toMatch(/wire|pulse/)
        expect(puzzle.phase).toBeGreaterThanOrEqual(1)
        expect(puzzle.phase).toBeLessThanOrEqual(6)
        expect(puzzle.system).toBeTruthy()
        expect(puzzle.description).toBeTruthy()
        expect(puzzle.diagnostic).toBeTruthy()
        expect(puzzle.diagnosticFixed).toBeTruthy()
        expect(puzzle.hint).toBeTruthy()
        expect(puzzle.validation).toBeTruthy()
      }
    })

    it('should have 5 puzzles total', () => {
      expect(Object.keys(puzzles).length).toBe(5)
    })
  })

  describe('puzzlesByPhase', () => {
    it('should have puzzles organized by phase', () => {
      expect(puzzlesByPhase[1].length).toBe(2)  // O2 sensor, CO2 scrubber
      expect(puzzlesByPhase[2].length).toBe(2)  // Solar, Battery
      expect(puzzlesByPhase[3].length).toBe(1)  // Flash
    })

    it('should return correct puzzles for phase 1', () => {
      const phase1 = getPuzzlesForPhase(1)
      expect(phase1.map(p => p.id)).toContain('o2_sensor')
      expect(phase1.map(p => p.id)).toContain('co2_scrubber')
    })

    it('should return correct puzzles for phase 2', () => {
      const phase2 = getPuzzlesForPhase(2)
      expect(phase2.map(p => p.id)).toContain('solar_ctrl')
      expect(phase2.map(p => p.id)).toContain('battery_mon')
    })
  })

  describe('isPuzzleSolved', () => {
    it('should return true for solved puzzle', () => {
      const solved = new Set(['o2_sensor'])
      expect(isPuzzleSolved('o2_sensor', solved)).toBe(true)
    })

    it('should return false for unsolved puzzle', () => {
      const solved = new Set(['o2_sensor'])
      expect(isPuzzleSolved('co2_scrubber', solved)).toBe(false)
    })

    it('should return false for empty set', () => {
      const solved = new Set<string>()
      expect(isPuzzleSolved('o2_sensor', solved)).toBe(false)
    })
  })

  describe('isPhaseComplete', () => {
    it('should return true when all phase puzzles are solved', () => {
      const solved = new Set(['o2_sensor', 'co2_scrubber'])
      expect(isPhaseComplete(1, solved)).toBe(true)
    })

    it('should return false when some puzzles are missing', () => {
      const solved = new Set(['o2_sensor'])
      expect(isPhaseComplete(1, solved)).toBe(false)
    })

    it('should return false when no puzzles are solved', () => {
      const solved = new Set<string>()
      expect(isPhaseComplete(1, solved)).toBe(false)
    })

    it('should work for phase 2', () => {
      const solved = new Set(['solar_ctrl', 'battery_mon'])
      expect(isPhaseComplete(2, solved)).toBe(true)
    })
  })
})

describe('Phase Definitions', () => {
  describe('phase structure', () => {
    it('should have all 6 phases defined', () => {
      expect(Object.keys(phases).length).toBe(6)
    })

    it('should have required properties for each phase', () => {
      for (const phase of Object.values(phases)) {
        expect(phase.id).toBeGreaterThanOrEqual(1)
        expect(phase.id).toBeLessThanOrEqual(6)
        expect(phase.name).toBeTruthy()
        expect(phase.title).toBeTruthy()
        expect(phase.description).toBeTruthy()
        expect(phase.storyIntro).toBeTruthy()
        expect(phase.storyComplete).toBeTruthy()
      }
    })
  })

  describe('getPhase', () => {
    it('should return correct phase', () => {
      expect(getPhase(1).name).toBe('IMMEDIATE')
      expect(getPhase(2).name).toBe('STABILIZE')
      expect(getPhase(3).name).toBe('UNDERSTAND')
    })
  })

  describe('getNextPhase', () => {
    it('should return next phase', () => {
      expect(getNextPhase(1)).toBe(2)
      expect(getNextPhase(2)).toBe(3)
      expect(getNextPhase(5)).toBe(6)
    })

    it('should return null for final phase', () => {
      expect(getNextPhase(6)).toBe(null)
    })
  })

  describe('getCrewLogsForPhase', () => {
    it('should return logs up to phase', () => {
      const phase3Logs = getCrewLogsForPhase(3)
      expect(phase3Logs.length).toBeGreaterThan(0)
      expect(phase3Logs.every(log => log.phase <= 3)).toBe(true)
    })

    it('should include early logs in later phases', () => {
      const phase1Logs = getCrewLogsForPhase(1)
      const phase3Logs = getCrewLogsForPhase(3)
      expect(phase3Logs.length).toBeGreaterThanOrEqual(phase1Logs.length)
    })
  })
})

describe('Narrative Content', () => {
  it('phase 1 intro should mention oxygen and survival', () => {
    const phase1 = getPhase(1)
    expect(phase1.storyIntro.toLowerCase()).toContain('o2')
  })

  it('phase 1 complete should mention life support restored', () => {
    const phase1 = getPhase(1)
    expect(phase1.storyComplete.toLowerCase()).toContain('life support')
  })

  it('phase 3 should reveal the mystery', () => {
    const phase3 = getPhase(3)
    expect(phase3.storyComplete.toLowerCase()).toContain('crash')
  })
})
