// Simulation hook with RAF loop for Wire circuits and Pulse CPU

import { useEffect, useRef } from 'react'
import { usePlaygroundStore } from '../store/usePlaygroundStore'
import { createSimulator, Simulator } from '../../wire/simulator'
import { assemble } from '../../pulse/assembler'
import { CPU, SimpleIO } from '../../fpga/cpu'
import { createMemory } from '../../fpga/memory'
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
    appendTerminalOutput,
    clearTerminal,
    terminalInputQueue,
    clearInputQueue,
  } = usePlaygroundStore()

  const simulatorRef = useRef<Simulator | null>(null)
  const cpuRef = useRef<CPU | null>(null)
  const ioRef = useRef<SimpleIO | null>(null)
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

  // Initialize Pulse CPU when editor value changes
  useEffect(() => {
    if (activeLanguage !== 'pulse') {
      cpuRef.current = null
      ioRef.current = null
      return
    }

    // Try to assemble and create CPU
    const result = assemble(editorValue)
    if (result.ok) {
      const memory = createMemory()
      const io = new SimpleIO()

      // Load program into memory
      for (let i = 0; i < result.program.binary.length; i++) {
        memory[result.program.origin + i] = result.program.binary[i]
      }

      const cpu = new CPU(memory, io)
      cpu.reset()

      cpuRef.current = cpu
      ioRef.current = io
      setSimulationError(null)
      clearTerminal()

      // Print initial boot message (CPU should output this as it runs)
    } else {
      cpuRef.current = null
      ioRef.current = null
      setSimulationError(result.error.message)
    }
  }, [editorValue, activeLanguage, setSimulationError, clearTerminal])

  // Handle terminal input queue for Pulse CPU
  useEffect(() => {
    if (activeLanguage !== 'pulse' || !ioRef.current || terminalInputQueue.length === 0) {
      return
    }

    const io = ioRef.current
    // Push all queued input to CPU serial RX
    for (const char of terminalInputQueue) {
      io.serialIn.push(char.charCodeAt(0))
    }
    // Clear the queue after processing
    clearInputQueue()
  }, [activeLanguage, terminalInputQueue, clearInputQueue])

  // RAF animation loop (for both Wire and Pulse)
  useEffect(() => {
    if (!isRunning) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      return
    }

    const animate = () => {
      if (activeLanguage === 'wire' && simulatorRef.current) {
        // Wire simulation
        const simulator = simulatorRef.current
        const stepsPerFrame = Math.max(1, Math.floor(speed / 10))

        for (let i = 0; i < stepsPerFrame; i++) {
          clockStateRef.current = clockStateRef.current === 0 ? 1 : 0
          simulator.setInput('clk', clockStateRef.current)
          simulator.step()

          const values = simulator.getAllWires()
          addWaveformSnapshot({
            cycle: currentCycle,
            signals: new Map(values),
          })
          setWireValues(values)

          if (clockStateRef.current === 1) {
            setCurrentCycle(currentCycle + 1)
          }
        }
      } else if (activeLanguage === 'pulse' && cpuRef.current && ioRef.current) {
        // Pulse CPU simulation
        const cpu = cpuRef.current
        const io = ioRef.current
        const stepsPerFrame = Math.max(1, Math.floor(speed / 2))

        for (let i = 0; i < stepsPerFrame; i++) {
          if (!cpu.state.halted) {
            cpu.step()
            setCurrentCycle(cpu.state.cycles)

            // Check for serial output
            while (io.serialOut.length > 0) {
              const char = io.serialOut.shift()!
              appendTerminalOutput(String.fromCharCode(char))
            }
          }
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
  }, [isRunning, activeLanguage, speed, currentCycle, setCurrentCycle, setWireValues, addWaveformSnapshot, appendTerminalOutput])

  // Step function (single step)
  const step = () => {
    if (activeLanguage === 'wire' && simulatorRef.current) {
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
    } else if (activeLanguage === 'pulse' && cpuRef.current && ioRef.current) {
      const cpu = cpuRef.current
      const io = ioRef.current

      if (!cpu.state.halted) {
        cpu.step()
        setCurrentCycle(cpu.state.cycles)

        // Check for serial output
        while (io.serialOut.length > 0) {
          const char = io.serialOut.shift()!
          appendTerminalOutput(String.fromCharCode(char))
        }
      }
    }
  }

  // Reset function
  const reset = () => {
    if (activeLanguage === 'wire' && simulatorRef.current) {
      const simulator = simulatorRef.current
      simulator.reset()
      clockStateRef.current = 0
      simulator.setInput('clk', 0)
      simulator.step()

      const values = simulator.getAllWires()
      setWireValues(values)
      setCurrentCycle(0)
      clearWaveform()
    } else if (activeLanguage === 'pulse' && cpuRef.current && ioRef.current) {
      const cpu = cpuRef.current
      const io = ioRef.current

      cpu.reset()
      io.serialOut = []
      io.serialIn = []
      setCurrentCycle(0)
      clearTerminal()
    }
  }

  return {
    step,
    reset,
  }
}
