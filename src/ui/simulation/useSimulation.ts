// Simulation hook with RAF loop for Wire circuits

import { useEffect, useRef } from 'react'
import { usePlaygroundStore } from '../store/usePlaygroundStore'
import { createSimulator, Simulator } from '../../wire/simulator'
import type { WaveformSnapshot } from './types'
import { MAX_WAVEFORM_CYCLES } from './types'

export function useSimulation() {
  const {
    activeLanguage,
    editorValue,
    isRunning,
    speed,
    currentCycle,
    setCurrentCycle,
    setWireValues,
    addWaveformSnapshot,
    clearWaveform,
    setSimulationError,
  } = usePlaygroundStore()

  const simulatorRef = useRef<Simulator | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const clockStateRef = useRef(0)

  // Initialize simulator when editor value changes
  useEffect(() => {
    if (activeLanguage !== 'wire') {
      simulatorRef.current = null
      return
    }

    // Try to compile and create simulator
    const result = createSimulator(editorValue)
    if (result.ok) {
      simulatorRef.current = result.simulator
      clockStateRef.current = 0
      setSimulationError(null)

      // Initialize with clock low
      result.simulator.setInput('clk', 0)
      result.simulator.step()

      // Capture initial state
      const values = result.simulator.getAllWires()
      setWireValues(values)
      clearWaveform()
    } else {
      simulatorRef.current = null
      setSimulationError(result.error)
    }
  }, [editorValue, activeLanguage, setWireValues, clearWaveform, setSimulationError])

  // RAF animation loop
  useEffect(() => {
    if (!isRunning || activeLanguage !== 'wire' || !simulatorRef.current) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      return
    }

    const simulator = simulatorRef.current

    const animate = () => {
      // Execute multiple steps per frame based on speed
      const stepsPerFrame = Math.max(1, Math.floor(speed / 10))

      for (let i = 0; i < stepsPerFrame; i++) {
        // Toggle clock
        clockStateRef.current = clockStateRef.current === 0 ? 1 : 0
        simulator.setInput('clk', clockStateRef.current)

        // Step simulation
        simulator.step()

        // Capture waveform snapshot on rising edge
        if (clockStateRef.current === 1) {
          const values = simulator.getAllWires()
          const snapshot: WaveformSnapshot = {
            cycle: currentCycle,
            signals: new Map(values),
          }
          addWaveformSnapshot(snapshot)
          setWireValues(values)
          setCurrentCycle(currentCycle + 1)
        }
      }

      rafIdRef.current = requestAnimationFrame(animate)
    }

    rafIdRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [isRunning, activeLanguage, speed, currentCycle, setCurrentCycle, setWireValues, addWaveformSnapshot])

  // Step function (single clock cycle)
  const step = () => {
    if (activeLanguage !== 'wire' || !simulatorRef.current) return

    const simulator = simulatorRef.current

    // Toggle clock low
    clockStateRef.current = 0
    simulator.setInput('clk', 0)
    simulator.step()

    // Toggle clock high
    clockStateRef.current = 1
    simulator.setInput('clk', 1)
    simulator.step()

    // Capture state
    const values = simulator.getAllWires()
    const snapshot: WaveformSnapshot = {
      cycle: currentCycle,
      signals: new Map(values),
    }
    addWaveformSnapshot(snapshot)
    setWireValues(values)
    setCurrentCycle(currentCycle + 1)
  }

  // Reset function
  const reset = () => {
    if (activeLanguage !== 'wire' || !simulatorRef.current) return

    const simulator = simulatorRef.current
    simulator.reset()
    clockStateRef.current = 0
    simulator.setInput('clk', 0)
    simulator.step()

    const values = simulator.getAllWires()
    setWireValues(values)
    setCurrentCycle(0)
    clearWaveform()
  }

  return {
    step,
    reset,
  }
}
