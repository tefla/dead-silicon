// CPU Simulation hook for game terminal
// Runs the Wire HDL CPU (cpu_minimal.wire) via WASM simulator with boot.pulse
// Provides serial I/O bridging to React state

import { useEffect, useRef, useCallback } from 'react'
import { createSimulator, type ISimulator } from '../wire/simulator'
import { assemble } from '../pulse/assembler'
import { IO_PORTS, createMemory } from '../wire/memory'

// Import Wire HDL modules
import gatesWire from '../assets/wire/gates.wire?raw'
import arithmeticWire from '../assets/wire/arithmetic.wire?raw'
import registersWire from '../assets/wire/registers.wire?raw'
import register16Wire from '../assets/wire/register16.wire?raw'
import adder16Wire from '../assets/wire/adder16.wire?raw'
import mux8Wire from '../assets/wire/mux8.wire?raw'
import mux16Wire from '../assets/wire/mux16.wire?raw'
import inc16Wire from '../assets/wire/inc16.wire?raw'
import alu8Wire from '../assets/wire/alu8.wire?raw'
import mux4way8Wire from '../assets/wire/mux4way8.wire?raw'
import mux8way8Wire from '../assets/wire/mux8way8.wire?raw'
import decoderWire from '../assets/wire/decoder.wire?raw'
import pcWire from '../assets/wire/pc.wire?raw'
import cpuMinimalWire from '../assets/wire/cpu_minimal.wire?raw'

// Import boot program
import bootSource from '../assets/pulse/boot.pulse?raw'

// Combined Wire HDL modules
const WIRE_MODULES = [
  gatesWire,
  arithmeticWire,
  registersWire,
  register16Wire,
  adder16Wire,
  mux8Wire,
  mux16Wire,
  inc16Wire,
  alu8Wire,
  mux4way8Wire,
  mux8way8Wire,
  decoderWire,
  pcWire,
  cpuMinimalWire,
].join('\n')

// Wrapper module for CPU with exposed ports
const CPU_WRAPPER = `
module game_cpu(clk, reset, data_in:8) -> (addr:16, data_out:8, mem_write, halted):
  cpu = cpu_minimal(clk, reset, data_in)
  addr = cpu.addr
  data_out = cpu.data_out
  mem_write = cpu.mem_write
  halted = cpu.halted
`

interface UseCPUSimulationOptions {
  onOutput?: (char: string) => void
  onBoot?: () => void
  onHalt?: () => void
  autoStart?: boolean
  cyclesPerFrame?: number
}

export function useCPUSimulation(options: UseCPUSimulationOptions = {}) {
  const {
    onOutput,
    onBoot,
    onHalt,
    autoStart = true,
    cyclesPerFrame = 500, // Gate-level sim is slower, use fewer cycles
  } = options

  // Refs to persist across renders
  const simulatorRef = useRef<ISimulator | null>(null)
  const memoryRef = useRef<Uint8Array | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const isRunningRef = useRef(false)
  const outputBufferRef = useRef('')
  const errorRef = useRef<string | null>(null)
  const serialInRef = useRef<number[]>([])
  const cycleCountRef = useRef(0)

  // Initialize WASM simulator with cpu_minimal and boot.pulse
  const initializeCPU = useCallback(() => {
    try {
      // Assemble boot program
      const asmResult = assemble(bootSource)
      if (!asmResult.ok) {
        errorRef.current = `Assembly error: ${asmResult.error.message}`
        console.error('[CPU] Assembly failed:', asmResult.error)
        return false
      }

      // Create WASM simulator
      const wireCode = WIRE_MODULES + '\n' + CPU_WRAPPER
      const simResult = createSimulator(wireCode, 'game_cpu')
      if (!simResult.ok) {
        errorRef.current = `Simulator error: ${simResult.error}`
        console.error('[CPU] Simulator failed:', simResult.error)
        return false
      }

      simulatorRef.current = simResult.simulator

      // Create memory and load boot program
      const memory = createMemory()
      for (let i = 0; i < asmResult.program.binary.length; i++) {
        memory[asmResult.program.origin + i] = asmResult.program.binary[i]
      }
      memoryRef.current = memory

      // Reset CPU
      const sim = simResult.simulator
      sim.setInput('clk', 0)
      sim.setInput('reset', 1)
      sim.setInput('data_in', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()
      sim.setInput('clk', 0)
      sim.setInput('reset', 0)
      sim.step()

      errorRef.current = null
      outputBufferRef.current = ''
      serialInRef.current = []
      cycleCountRef.current = 0

      console.log('[CPU] Initialized with WASM simulator + cpu_minimal.wire')
      console.log('[CPU] Program origin:', '0x' + asmResult.program.origin.toString(16))
      console.log('[CPU] Binary size:', asmResult.program.binary.length, 'bytes')

      onBoot?.()
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errorRef.current = msg
      console.error('[CPU] Initialization failed:', msg)
      return false
    }
  }, [onBoot])

  // Run one clock cycle of the CPU
  const clockCycle = useCallback(() => {
    const sim = simulatorRef.current
    const memory = memoryRef.current
    if (!sim || !memory) return false

    const addr = sim.getOutput('addr')
    const memWrite = sim.getOutput('mem_write')

    // Handle memory write
    if (memWrite === 1) {
      const dataOut = sim.getOutput('data_out')
      if (addr === IO_PORTS.SERIAL_TX) {
        // Serial output
        const char = String.fromCharCode(dataOut)
        outputBufferRef.current += char
        options.onOutput?.(char)
      } else {
        // Regular memory write
        memory[addr] = dataOut
      }
    }

    // Provide data_in based on address
    let dataIn = 0
    if (addr === IO_PORTS.SERIAL_RX) {
      // Read from serial input queue
      dataIn = serialInRef.current.shift() ?? 0
    } else if (addr === IO_PORTS.SERIAL_STATUS) {
      // Return 1 if input available
      dataIn = serialInRef.current.length > 0 ? 1 : 0
    } else {
      // Regular memory read
      dataIn = memory[addr]
    }
    sim.setInput('data_in', dataIn)

    // Clock high
    sim.setInput('clk', 1)
    sim.step()

    // Clock low
    sim.setInput('clk', 0)
    sim.step()

    cycleCountRef.current++

    // Check if halted
    return sim.getOutput('halted') === 1
  }, [options])

  // Animation loop
  const animate = useCallback(() => {
    if (!isRunningRef.current) return

    // Run CPU for cyclesPerFrame clock cycles
    for (let i = 0; i < cyclesPerFrame; i++) {
      const halted = clockCycle()
      if (halted) {
        isRunningRef.current = false
        onHalt?.()
        console.log('[CPU] Halted at cycle', cycleCountRef.current)
        return
      }
    }

    // Continue animation
    if (isRunningRef.current) {
      rafIdRef.current = requestAnimationFrame(animate)
    }
  }, [cyclesPerFrame, clockCycle, onHalt])

  // Start CPU execution
  const start = useCallback(() => {
    if (isRunningRef.current) return
    if (!simulatorRef.current) {
      if (!initializeCPU()) return
    }

    isRunningRef.current = true
    rafIdRef.current = requestAnimationFrame(animate)
    console.log('[CPU] Started')
  }, [initializeCPU, animate])

  // Stop CPU execution
  const stop = useCallback(() => {
    isRunningRef.current = false
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    console.log('[CPU] Stopped')
  }, [])

  // Reset CPU
  const reset = useCallback(() => {
    stop()

    if (simulatorRef.current) {
      const sim = simulatorRef.current
      sim.setInput('clk', 0)
      sim.setInput('reset', 1)
      sim.setInput('data_in', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()
      sim.setInput('clk', 0)
      sim.setInput('reset', 0)
      sim.step()

      outputBufferRef.current = ''
      serialInRef.current = []
      cycleCountRef.current = 0
      console.log('[CPU] Reset')
    }

    if (autoStart) {
      start()
    }
  }, [stop, start, autoStart])

  // Send input to CPU serial
  const sendInput = useCallback((text: string) => {
    // Push each character to serial input queue
    for (const char of text) {
      serialInRef.current.push(char.charCodeAt(0))
    }
    console.log('[CPU] Sent input:', JSON.stringify(text), '- queue now has', serialInRef.current.length, 'bytes')
  }, [])

  // Initialize and optionally auto-start on mount
  useEffect(() => {
    if (autoStart) {
      initializeCPU()
      start()
    }

    return () => {
      stop()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // State accessors
    get isRunning() { return isRunningRef.current },
    get isHalted() { return simulatorRef.current?.getOutput('halted') === 1 },
    get cycles() { return cycleCountRef.current },
    get output() { return outputBufferRef.current },
    get error() { return errorRef.current },

    // Actions
    sendInput,
    reset,
    start,
    stop,
    initializeCPU,
  }
}
