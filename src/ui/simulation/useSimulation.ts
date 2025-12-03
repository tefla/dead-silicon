// Simulation hook with RAF loop for Wire circuits

import { useEffect, useRef } from 'react'
import { usePlaygroundStore } from '../store/usePlaygroundStore'
import { createSimulator, Simulator } from '../../wire/simulator'
import type { WaveformSnapshot } from './types'
import { MAX_WAVEFORM_CYCLES } from './types'

// Import Wire stdlib modules
import gatesWire from '../../assets/wire/gates.wire?raw'
import arithmeticWire from '../../assets/wire/arithmetic.wire?raw'
import registersWire from '../../assets/wire/registers.wire?raw'

// Combined stdlib to prepend to user code
const WIRE_STDLIB = gatesWire + '\n' + arithmeticWire + '\n' + registersWire + '\n'

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
    // Prepend stdlib to user code so modules like not, and, adder4, etc. are available
    const sourceWithStdlib = WIRE_STDLIB + editorValue
    const result = createSimulator(sourceWithStdlib)
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

        // Capture waveform snapshot on BOTH clock edges
        // This allows us to see the clock toggling in the waveform display
        const values = simulator.getAllWires()
        const snapshot: WaveformSnapshot = {
          cycle: currentCycle,
          signals: new Map(values),
        }
        addWaveformSnapshot(snapshot)
        setWireValues(values)

        // Only increment cycle counter on rising edge (one full cycle = low + high)
        if (clockStateRef.current === 1) {
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

  // Step function (single clock cycle = low + high)
  const step = () => {
    if (activeLanguage !== 'wire' || !simulatorRef.current) return

    const simulator = simulatorRef.current

    // Toggle clock low and capture
    clockStateRef.current = 0
    simulator.setInput('clk', 0)
    simulator.step()

    let values = simulator.getAllWires()
    addWaveformSnapshot({
      cycle: currentCycle,
      signals: new Map(values),
    })

    // Toggle clock high and capture
    clockStateRef.current = 1
    simulator.setInput('clk', 1)
    simulator.step()

    values = simulator.getAllWires()
    addWaveformSnapshot({
      cycle: currentCycle,
      signals: new Map(values),
    })
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
