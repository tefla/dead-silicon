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
  const currentCycleRef = useRef(0)

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
      currentCycleRef.current = 0
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
    console.log('[ASSEMBLE] First 50 chars of editorValue:', editorValue.substring(0, 50))
    const result = assemble(editorValue)
    if (result.ok) {
      console.log('[ASSEMBLE] Origin:', '0x' + result.program.origin.toString(16), 'Binary length:', result.program.binary.length)
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
      currentCycleRef.current = 0
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
    console.log('[Input Queue] Processing', terminalInputQueue.length, 'characters:', terminalInputQueue.join(''))
    for (const char of terminalInputQueue) {
      io.serialIn.push(char.charCodeAt(0))
    }
    console.log('[Input Queue] serialIn now has', io.serialIn.length, 'bytes')
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
            cycle: currentCycleRef.current,
            signals: new Map(values),
          })
          setWireValues(values)

          if (clockStateRef.current === 1) {
            currentCycleRef.current++
            setCurrentCycle(currentCycleRef.current)
          }
        }
      } else if (activeLanguage === 'pulse' && cpuRef.current && ioRef.current) {
        // Pulse CPU simulation
        const cpu = cpuRef.current
        const io = ioRef.current
        // Run more instructions per frame for Pulse since it has tight polling loops
        const stepsPerFrame = Math.max(100, Math.floor(speed * 50))

        for (let i = 0; i < stepsPerFrame; i++) {
          if (!cpu.state.halted) {
            cpu.step()
            currentCycleRef.current = cpu.state.cycles
            setCurrentCycle(currentCycleRef.current)

            // Check for serial output
            while (io.serialOut.length > 0) {
              const char = io.serialOut.shift()!
              appendTerminalOutput(String.fromCharCode(char))
            }
          } else {
            // CPU halted - log once with full state
            if (i === 0) {
              console.log('[Pulse CPU] HALTED at cycle', cpu.state.cycles)
              console.log('  PC:', '0x' + cpu.state.PC.toString(16).padStart(4, '0'))
              console.log('  SP:', '0x' + cpu.state.SP.toString(16).padStart(2, '0'))
              console.log('  A:', '0x' + cpu.state.A.toString(16).padStart(2, '0'))
              console.log('  serialIn queue:', io.serialIn.length, 'bytes')
            }
            break
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
  }, [isRunning, activeLanguage, speed, setCurrentCycle, setWireValues, addWaveformSnapshot, appendTerminalOutput])

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
        cycle: currentCycleRef.current,
        signals: new Map(values),
      })

      // Toggle clock high and capture
      clockStateRef.current = 1
      simulator.setInput('clk', 1)
      simulator.step()

      values = simulator.getAllWires()
      addWaveformSnapshot({
        cycle: currentCycleRef.current,
        signals: new Map(values),
      })
      setWireValues(values)
      currentCycleRef.current++
      setCurrentCycle(currentCycleRef.current)
    } else if (activeLanguage === 'pulse' && cpuRef.current && ioRef.current) {
      const cpu = cpuRef.current
      const io = ioRef.current

      if (!cpu.state.halted) {
        cpu.step()
        currentCycleRef.current = cpu.state.cycles
        setCurrentCycle(currentCycleRef.current)

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
      currentCycleRef.current = 0
      setCurrentCycle(0)
      clearWaveform()
    } else if (activeLanguage === 'pulse' && cpuRef.current && ioRef.current) {
      const cpu = cpuRef.current
      const io = ioRef.current

      cpu.reset()
      io.serialOut = []
      io.serialIn = []
      currentCycleRef.current = 0
      setCurrentCycle(0)
      clearTerminal()
    }
  }

  return {
    step,
    reset,
  }
}
