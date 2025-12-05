// Tests for game terminal commands
import { describe, it, expect } from 'vitest'
import { executeCommand } from './commands'

describe('Game Commands', () => {
  const defaultState = {
    currentPhase: 1 as const,
    solvedPuzzles: [] as string[],
    unlockedFiles: ['lifesup/o2_sensor.wire', 'lifesup/co2_scrubber.wire']
  }

  describe('help command', () => {
    it('should return help text', () => {
      const result = executeCommand('help', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.type).toBe('system')
      expect(result.output).toContain('DIAGNOSTIC TERMINAL COMMANDS')
      expect(result.output).toContain('status')
      expect(result.output).toContain('diag')
      expect(result.output).toContain('flash')
    })
  })

  describe('status command', () => {
    it('should show system status', () => {
      const result = executeCommand('status', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.type).toBe('system')
      expect(result.output).toContain('CYGNUS-7 SYSTEM STATUS')
      expect(result.output).toContain('IMMEDIATE')
      expect(result.output).toContain('LIFE SUPPORT')
    })

    it('should show solved systems as OK', () => {
      const solvedState = {
        ...defaultState,
        solvedPuzzles: ['o2_sensor', 'co2_scrubber']
      }
      const result = executeCommand('status', solvedState.currentPhase, solvedState.solvedPuzzles, solvedState.unlockedFiles)
      expect(result.output).toContain('OK')
    })
  })

  describe('diag command', () => {
    it('should show diagnostics for lifesup system', () => {
      const result = executeCommand('diag lifesup', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.type).toBe('warning')
      expect(result.output).toContain('LIFE SUPPORT DIAGNOSTICS')
      expect(result.output).toContain('O2 SENSOR')
    })

    it('should show error for missing argument', () => {
      const result = executeCommand('diag', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.type).toBe('error')
      expect(result.output).toContain('Usage')
    })

    it('should show error for unknown system', () => {
      const result = executeCommand('diag unknown', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.type).toBe('error')
      expect(result.output).toContain('Unknown system')
    })

    it('should show offline for locked systems', () => {
      const result = executeCommand('diag nav', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.output).toContain('OFFLINE')
    })

    it('should show fixed diagnostic when puzzle is solved', () => {
      const solvedState = {
        ...defaultState,
        solvedPuzzles: ['o2_sensor']
      }
      const result = executeCommand('diag lifesup', solvedState.currentPhase, solvedState.solvedPuzzles, solvedState.unlockedFiles)
      expect(result.output).toContain('OK')
    })
  })

  describe('flash command', () => {
    it('should trigger flash action for valid file', () => {
      const result = executeCommand('flash lifesup/o2_sensor.wire', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.action).toBe('flash')
      expect(result.actionPayload).toBe('lifesup/o2_sensor.wire')
    })

    it('should show error for missing argument', () => {
      const result = executeCommand('flash', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.type).toBe('error')
      expect(result.output).toContain('Usage')
    })

    it('should show error for unknown file', () => {
      const result = executeCommand('flash nonexistent.wire', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.type).toBe('error')
      expect(result.output).toContain('not found')
    })
  })

  describe('hint command', () => {
    it('should trigger hint action', () => {
      const result = executeCommand('hint', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.action).toBe('show_hint')
      expect(result.actionPayload).toBe('o2_sensor')  // First unsolved puzzle
    })

    it('should trigger hint for specific puzzle', () => {
      const result = executeCommand('hint co2_scrubber', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.action).toBe('show_hint')
      expect(result.actionPayload).toBe('co2_scrubber')
    })

    it('should show message when all puzzles solved', () => {
      const solvedState = {
        ...defaultState,
        solvedPuzzles: ['o2_sensor', 'co2_scrubber']
      }
      const result = executeCommand('hint', solvedState.currentPhase, solvedState.solvedPuzzles, solvedState.unlockedFiles)
      expect(result.output).toContain('solved')
    })
  })

  describe('open command', () => {
    it('should trigger open_file action for unlocked file', () => {
      const result = executeCommand('open lifesup/o2_sensor.wire', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.action).toBe('open_file')
      expect(result.actionPayload).toBe('lifesup/o2_sensor.wire')
    })

    it('should show error for locked file', () => {
      const result = executeCommand('open power/solar_ctrl.wire', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.type).toBe('error')
      expect(result.output).toContain('locked')
    })

    it('should show error for missing argument', () => {
      const result = executeCommand('open', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.type).toBe('error')
      expect(result.output).toContain('Usage')
    })
  })

  describe('ls command', () => {
    it('should list all systems', () => {
      const result = executeCommand('ls', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.type).toBe('system')
      expect(result.output).toContain('lifesup')
      expect(result.output).toContain('power')
    })

    it('should list files in system', () => {
      const result = executeCommand('ls lifesup', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.output).toContain('o2_sensor.wire')
      expect(result.output).toContain('co2_scrubber.wire')
    })

    it('should show locked status for locked files', () => {
      const result = executeCommand('ls power', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.output).toContain('[locked]')
    })

    it('should show error for unknown directory', () => {
      const result = executeCommand('ls unknown', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.type).toBe('error')
      expect(result.output).toContain('not found')
    })
  })

  describe('cat command', () => {
    it('should show file contents for unlocked file', () => {
      const result = executeCommand('cat lifesup/o2_sensor.wire', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.type).toBe('system')
      expect(result.output).toContain('module')
    })

    it('should show error for locked file', () => {
      const result = executeCommand('cat power/solar_ctrl.wire', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.type).toBe('error')
      expect(result.output).toContain('locked')
    })
  })

  describe('unknown command', () => {
    it('should show error for unknown command', () => {
      const result = executeCommand('foobar', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.type).toBe('error')
      expect(result.output).toContain('Unknown command')
      expect(result.output).toContain('help')
    })
  })

  describe('clear command', () => {
    it('should return empty output', () => {
      const result = executeCommand('clear', defaultState.currentPhase, defaultState.solvedPuzzles, defaultState.unlockedFiles)
      expect(result.output).toBe('')
    })
  })
})
