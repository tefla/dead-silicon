import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSimulation } from './useSimulation'
import { usePlaygroundStore } from '../store/usePlaygroundStore'

// Mock the store
vi.mock('../store/usePlaygroundStore', () => ({
  usePlaygroundStore: vi.fn(),
}))

describe('useSimulation', () => {
  let mockStore: any

  beforeEach(() => {
    mockStore = {
      activeLanguage: 'wire',
      editorValue: 'module test(clk) -> led:\n  led = dff(not(led), clk)',
      isRunning: false,
      speed: 1,
      currentCycle: 0,
      setCurrentCycle: vi.fn(),
      setWireValues: vi.fn(),
      addWaveformSnapshot: vi.fn(),
      clearWaveform: vi.fn(),
      setSimulationError: vi.fn(),
    }
    vi.mocked(usePlaygroundStore).mockReturnValue(mockStore)
  })

  it('should initialize simulator on mount', () => {
    renderHook(() => useSimulation())

    // Should initialize without errors
    expect(mockStore.setSimulationError).toHaveBeenCalledWith(null)
    expect(mockStore.setWireValues).toHaveBeenCalled()
  })

  it('should step simulation and capture clock transitions', () => {
    const { result } = renderHook(() => useSimulation())

    act(() => {
      result.current.step()
    })

    // Should have captured waveform with clock low (0)
    const calls = mockStore.addWaveformSnapshot.mock.calls
    expect(calls.length).toBeGreaterThan(0)

    // Check that clock signal toggles
    const snapshots = calls.map((call: any) => call[0])
    const clockValues = snapshots.map((s: any) => s.signals.get('clk'))

    // Should see both 0 and 1 for clock
    expect(clockValues).toContain(0)
    expect(clockValues).toContain(1)
  })

  it('should reset simulation to initial state', () => {
    mockStore.currentCycle = 10
    const { result } = renderHook(() => useSimulation())

    act(() => {
      result.current.reset()
    })

    expect(mockStore.setCurrentCycle).toHaveBeenCalledWith(0)
    expect(mockStore.clearWaveform).toHaveBeenCalled()
  })

  it('should handle invalid Wire code gracefully', () => {
    mockStore.editorValue = 'invalid syntax!!!'

    renderHook(() => useSimulation())

    expect(mockStore.setSimulationError).toHaveBeenCalled()
    const errorCall = mockStore.setSimulationError.mock.calls.find(
      (call: any) => call[0] !== null
    )
    expect(errorCall).toBeDefined()
  })
})
