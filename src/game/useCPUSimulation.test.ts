// Tests for useCPUSimulation hook
// Tests the WASM CPU simulation integration with boot.pulse

import { describe, it, expect } from 'vitest'
import { createSimulator, type ISimulator } from '../wire/simulator'
import { assemble } from '../pulse/assembler'
import { IO_PORTS, createMemory } from '../wire/memory'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load Wire HDL modules
function loadWireModules(): string {
  const moduleNames = [
    'gates', 'arithmetic', 'registers', 'register16', 'adder16',
    'mux8', 'mux16', 'inc16', 'alu8', 'mux4way8', 'mux8way8',
    'decoder', 'pc', 'cpu_minimal'
  ]
  return moduleNames
    .map(m => readFileSync(join(__dirname, `../assets/wire/${m}.wire`), 'utf-8'))
    .join('\n')
}

// Load boot.pulse source
const bootSource = readFileSync(
  join(__dirname, '../assets/pulse/boot.pulse'),
  'utf-8'
)

// CPU wrapper module
const CPU_WRAPPER = `
module test_cpu(clk, reset, data_in:8) -> (addr:16, data_out:8, mem_write, halted):
  cpu = cpu_minimal(clk, reset, data_in)
  addr = cpu.addr
  data_out = cpu.data_out
  mem_write = cpu.mem_write
  halted = cpu.halted
`

describe('WASM CPU Simulation Integration', () => {
  let sim: ISimulator
  let memory: Uint8Array
  let serialIn: number[] = []
  let serialOut: number[] = []

  // Helper to create simulator
  async function createCPU() {
    // Assemble boot program
    const asmResult = assemble(bootSource)
    expect(asmResult.ok).toBe(true)
    if (!asmResult.ok) throw new Error(asmResult.error.message)

    // Create WASM simulator
    const wireCode = loadWireModules() + '\n' + CPU_WRAPPER
    const simResult = createSimulator(wireCode, 'test_cpu')
    expect(simResult.ok).toBe(true)
    if (!simResult.ok) throw new Error(simResult.error)

    sim = simResult.simulator

    // Create memory and load boot program
    memory = createMemory()
    for (let i = 0; i < asmResult.program.binary.length; i++) {
      memory[asmResult.program.origin + i] = asmResult.program.binary[i]
    }

    // Reset CPU
    sim.setInput('clk', 0)
    sim.setInput('reset', 1)
    sim.setInput('data_in', 0)
    sim.step()
    sim.setInput('clk', 1)
    sim.step()
    sim.setInput('clk', 0)
    sim.setInput('reset', 0)
    sim.step()

    serialIn = []
    serialOut = []
  }

  // Run one clock cycle
  function clockCycle(): boolean {
    const addr = sim.getOutput('addr')
    const memWrite = sim.getOutput('mem_write')

    // Handle memory write
    if (memWrite === 1) {
      const dataOut = sim.getOutput('data_out')
      if (addr === IO_PORTS.SERIAL_TX) {
        serialOut.push(dataOut)
      } else {
        memory[addr] = dataOut
      }
    }

    // Provide data_in based on address
    let dataIn = 0
    if (addr === IO_PORTS.SERIAL_RX) {
      dataIn = serialIn.shift() ?? 0
    } else if (addr === IO_PORTS.SERIAL_STATUS) {
      dataIn = serialIn.length > 0 ? 1 : 0
    } else {
      dataIn = memory[addr]
    }
    sim.setInput('data_in', dataIn)

    // Clock cycle
    sim.setInput('clk', 1)
    sim.step()
    sim.setInput('clk', 0)
    sim.step()

    return sim.getOutput('halted') === 1
  }

  // Run until waiting for input or halted
  function runUntilWaitingForInput(maxCycles = 2000): number {
    let cycles = 0
    while (cycles < maxCycles) {
      const halted = clockCycle()
      cycles++
      if (halted) break

      // Check if output contains prompt and no input available
      const output = getOutput()
      if (output.endsWith('$ ') && serialIn.length === 0) {
        // Give a few more cycles for CPU to settle
        for (let i = 0; i < 10 && !clockCycle(); i++) cycles++
        break
      }
    }
    return cycles
  }

  function getOutput(): string {
    return serialOut.map(c => String.fromCharCode(c)).join('')
  }

  describe('Boot sequence', () => {
    it('assembles boot.pulse successfully', () => {
      const result = assemble(bootSource)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.program.binary.length).toBeGreaterThan(0)
      }
    })

    it('boots and prints banner', async () => {
      await createCPU()

      // Run until shell prompt
      const cycles = runUntilWaitingForInput()

      const output = getOutput()
      expect(output).toContain('DEAD SILICON v0.1')
      expect(output).toContain('OK')
      expect(output).toContain('$ ')

      console.log(`Boot completed in ${cycles} cycles`)
    })

    it('responds to help command', async () => {
      await createCPU()

      // Boot first
      runUntilWaitingForInput()

      // Send 'h' command
      serialIn.push('h'.charCodeAt(0))
      serialIn.push(10) // newline

      // Run until waiting for input again
      runUntilWaitingForInput()

      const output = getOutput()
      expect(output).toContain('DEAD SILICON')
      expect(output).toContain('help')
      expect(output).toContain('status')
    })

    it('responds to status command', async () => {
      await createCPU()

      // Boot first
      runUntilWaitingForInput()

      // Send 's' command
      serialIn.push('s'.charCodeAt(0))
      serialIn.push(10) // newline

      // Run until waiting for input again
      runUntilWaitingForInput()

      const output = getOutput()
      expect(output).toContain('DEAD SILICON')
      expect(output).toContain('OK') // status outputs OK
    })

    it('handles unknown command', async () => {
      await createCPU()

      // Boot first
      runUntilWaitingForInput()

      // Send 'x' (unknown) command
      serialIn.push('x'.charCodeAt(0))
      serialIn.push(10) // newline

      // Run until waiting for input again
      runUntilWaitingForInput()

      const output = getOutput()
      expect(output).toContain('?') // Unknown command marker
    })
  })

  describe('Serial I/O', () => {
    it('echoes input characters', async () => {
      await createCPU()

      // Boot first
      runUntilWaitingForInput()

      // Clear output
      serialOut = []

      // Send 'hello' followed by newline
      const input = 'hello'
      for (const c of input) {
        serialIn.push(c.charCodeAt(0))
      }
      serialIn.push(10) // newline

      // Run until waiting for input again
      runUntilWaitingForInput()

      const output = getOutput()
      // Should echo the input
      expect(output).toContain('hello')
    })

    it('handles multiple commands in sequence', async () => {
      await createCPU()

      // Boot first
      runUntilWaitingForInput()

      // Send 'h' command
      serialIn.push('h'.charCodeAt(0))
      serialIn.push(10)
      runUntilWaitingForInput()

      // Send 's' command
      serialIn.push('s'.charCodeAt(0))
      serialIn.push(10)
      runUntilWaitingForInput()

      const output = getOutput()
      // Should have multiple prompts
      const promptCount = (output.match(/\$ /g) || []).length
      expect(promptCount).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Performance', () => {
    it('boots within 650 cycles', async () => {
      await createCPU()

      const cycles = runUntilWaitingForInput(650)

      expect(cycles).toBeLessThan(650)
      console.log(`WASM simulator boot completed in ${cycles} cycles`)
    })

    it('can run 5000 cycles without issues', async () => {
      await createCPU()

      // Pre-load some commands
      serialIn.push('h'.charCodeAt(0))
      serialIn.push(10)
      serialIn.push('s'.charCodeAt(0))
      serialIn.push(10)

      const startTime = performance.now()

      for (let i = 0; i < 5000; i++) {
        if (clockCycle()) break
      }

      const elapsed = performance.now() - startTime
      const cyclesPerSecond = 5000 / (elapsed / 1000)

      console.log(`5000 cycles in ${elapsed.toFixed(2)}ms = ${(cyclesPerSecond / 1000).toFixed(1)} KHz`)

      // WASM simulator should be at least 10 KHz
      expect(cyclesPerSecond).toBeGreaterThan(10000)
    })
  })
})
