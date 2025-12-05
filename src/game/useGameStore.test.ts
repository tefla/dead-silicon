// Tests for game state store
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './useGameStore'

describe('Game Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGameStore.getState().resetGame()
  })

  describe('initial state', () => {
    it('should start at phase 1', () => {
      expect(useGameStore.getState().currentPhase).toBe(1)
    })

    it('should have no solved puzzles', () => {
      expect(useGameStore.getState().solvedPuzzles).toHaveLength(0)
    })

    it('should have initial files unlocked', () => {
      const unlocked = useGameStore.getState().unlockedFiles
      expect(unlocked).toContain('lifesup/o2_sensor.wire')
      expect(unlocked).toContain('lifesup/co2_scrubber.wire')
    })

    it('should have O2 at 47% (broken sensor reading)', () => {
      expect(useGameStore.getState().o2Level).toBe(47)
    })

    it('should not be started', () => {
      expect(useGameStore.getState().gameStarted).toBe(false)
    })
  })

  describe('startGame', () => {
    it('should set gameStarted to true', () => {
      useGameStore.getState().startGame()
      expect(useGameStore.getState().gameStarted).toBe(true)
    })

    it('should add intro message to console', () => {
      useGameStore.getState().startGame()
      const messages = useGameStore.getState().consoleMessages
      expect(messages.length).toBeGreaterThan(0)
      expect(messages[0].type).toBe('narrative')
    })

    it('should only start once', () => {
      useGameStore.getState().startGame()
      const messageCount = useGameStore.getState().consoleMessages.length
      useGameStore.getState().startGame()
      expect(useGameStore.getState().consoleMessages.length).toBe(messageCount)
    })
  })

  describe('resetGame', () => {
    it('should reset all state', () => {
      // Make some changes
      useGameStore.getState().startGame()
      useGameStore.getState().solvePuzzle('o2_sensor')

      // Reset
      useGameStore.getState().resetGame()

      // Verify reset
      expect(useGameStore.getState().currentPhase).toBe(1)
      expect(useGameStore.getState().solvedPuzzles).toHaveLength(0)
      expect(useGameStore.getState().gameStarted).toBe(false)
      expect(useGameStore.getState().consoleMessages).toHaveLength(0)
    })
  })

  describe('solvePuzzle', () => {
    beforeEach(() => {
      useGameStore.getState().startGame()
    })

    it('should add puzzle to solved list', () => {
      useGameStore.getState().solvePuzzle('o2_sensor')
      expect(useGameStore.getState().solvedPuzzles).toContain('o2_sensor')
    })

    it('should update O2 level when O2 sensor is fixed', () => {
      useGameStore.getState().solvePuzzle('o2_sensor')
      expect(useGameStore.getState().o2Level).toBe(94)
    })

    it('should not add duplicate solved puzzles', () => {
      useGameStore.getState().solvePuzzle('o2_sensor')
      useGameStore.getState().solvePuzzle('o2_sensor')
      expect(useGameStore.getState().solvedPuzzles.filter(p => p === 'o2_sensor').length).toBe(1)
    })

    it('should add success message to console', () => {
      const initialCount = useGameStore.getState().consoleMessages.length
      useGameStore.getState().solvePuzzle('o2_sensor')
      expect(useGameStore.getState().consoleMessages.length).toBeGreaterThan(initialCount)
    })

    it('should advance phase when all phase puzzles solved', () => {
      useGameStore.getState().solvePuzzle('o2_sensor')
      useGameStore.getState().solvePuzzle('co2_scrubber')
      expect(useGameStore.getState().currentPhase).toBe(2)
    })

    it('should unlock new files when advancing phase', () => {
      useGameStore.getState().solvePuzzle('o2_sensor')
      useGameStore.getState().solvePuzzle('co2_scrubber')
      expect(useGameStore.getState().unlockedFiles).toContain('power/solar_ctrl.wire')
    })
  })

  describe('showHint', () => {
    it('should track hint level', () => {
      useGameStore.getState().showHint('o2_sensor')
      expect(useGameStore.getState().hintsShown['o2_sensor']).toBe(1)
    })

    it('should add hint message to console', () => {
      useGameStore.getState().showHint('o2_sensor')
      const messages = useGameStore.getState().consoleMessages
      expect(messages.some(m => m.text.includes('HINT'))).toBe(true)
    })
  })

  describe('console management', () => {
    it('should add messages to console', () => {
      useGameStore.getState().addConsoleMessage('system', 'Test message')
      const messages = useGameStore.getState().consoleMessages
      expect(messages[messages.length - 1].text).toBe('Test message')
      expect(messages[messages.length - 1].type).toBe('system')
    })

    it('should track command history', () => {
      useGameStore.getState().addCommandToHistory('help')
      useGameStore.getState().addCommandToHistory('status')
      expect(useGameStore.getState().commandHistory).toEqual(['help', 'status'])
    })

    it('should clear console', () => {
      useGameStore.getState().addConsoleMessage('system', 'Test')
      useGameStore.getState().clearConsole()
      expect(useGameStore.getState().consoleMessages).toHaveLength(0)
    })
  })

  describe('editor management', () => {
    it('should set active file', () => {
      useGameStore.getState().setActiveFile('test.wire', 'module test() -> out: out = 1')
      expect(useGameStore.getState().activeFile).toBe('test.wire')
      expect(useGameStore.getState().editorContent).toContain('module')
    })

    it('should update editor content', () => {
      useGameStore.getState().setActiveFile('test.wire', 'original')
      useGameStore.getState().updateEditorContent('modified')
      expect(useGameStore.getState().editorContent).toBe('modified')
    })
  })

  describe('helper functions', () => {
    it('isPuzzleSolved should work', () => {
      expect(useGameStore.getState().isPuzzleSolved('o2_sensor')).toBe(false)
      useGameStore.getState().solvePuzzle('o2_sensor')
      expect(useGameStore.getState().isPuzzleSolved('o2_sensor')).toBe(true)
    })

    it('isFileUnlocked should work', () => {
      expect(useGameStore.getState().isFileUnlocked('lifesup/o2_sensor.wire')).toBe(true)
      expect(useGameStore.getState().isFileUnlocked('power/solar_ctrl.wire')).toBe(false)
    })

    it('canAdvancePhase should work', () => {
      expect(useGameStore.getState().canAdvancePhase()).toBe(false)
      useGameStore.getState().solvePuzzle('o2_sensor')
      expect(useGameStore.getState().canAdvancePhase()).toBe(false)
      useGameStore.getState().solvePuzzle('co2_scrubber')
      // After solving both, phase advances automatically so we're now in phase 2
      expect(useGameStore.getState().currentPhase).toBe(2)
    })
  })
})
