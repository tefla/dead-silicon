import { describe, it, expect, beforeEach } from 'vitest'
import { createSimulator } from './simulator'
import { resetNodeCounter } from './compiler'

beforeEach(() => {
  resetNodeCounter()
})

describe('Memory Primitives', () => {
  describe('RAM', () => {
    const ramModule = `
module test_ram(addr:8, data:8, write, clk) -> out:8:
  out = ram(addr, data, write, clk)
`

    it('reads 0 from uninitialized RAM', () => {
      const result = createSimulator(ramModule)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('addr', 0)
      sim.setInput('data', 0)
      sim.setInput('write', 0)
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })

    it('writes and reads data', () => {
      const result = createSimulator(ramModule)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Write 0x42 to address 0x10
      sim.setInput('addr', 0x10)
      sim.setInput('data', 0x42)
      sim.setInput('write', 1)
      sim.setInput('clk', 0)
      sim.step()

      // Rising edge - data should be written
      sim.setInput('clk', 1)
      sim.step()

      // Now read it back
      sim.setInput('write', 0)
      sim.setInput('clk', 0)
      sim.step()

      expect(sim.getOutput('out')).toBe(0x42)
    })

    it('writes to different addresses', () => {
      const result = createSimulator(ramModule)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Write 0xAA to address 0
      sim.setInput('addr', 0)
      sim.setInput('data', 0xAA)
      sim.setInput('write', 1)
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()

      // Write 0xBB to address 1
      sim.setInput('addr', 1)
      sim.setInput('data', 0xBB)
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()

      // Read address 0
      sim.setInput('write', 0)
      sim.setInput('addr', 0)
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xAA)

      // Read address 1
      sim.setInput('addr', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xBB)
    })

    it('does not write when write signal is low', () => {
      const result = createSimulator(ramModule)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Try to write with write=0
      sim.setInput('addr', 0)
      sim.setInput('data', 0xFF)
      sim.setInput('write', 0)
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()

      // Should still be 0
      expect(sim.getOutput('out')).toBe(0)
    })

    it('supports direct RAM access methods', () => {
      const result = createSimulator(ramModule)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Write directly
      sim.writeRam(5, 0x55)
      sim.writeRam(6, 0x66)

      // Read directly
      expect(sim.readRam(5)).toBe(0x55)
      expect(sim.readRam(6)).toBe(0x66)

      // Read through simulation
      sim.setInput('addr', 5)
      sim.setInput('write', 0)
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0x55)
    })
  })

  describe('ROM', () => {
    const romModule = `
module test_rom(addr:8) -> out:8:
  out = rom(addr)
`

    it('reads 0 from uninitialized ROM', () => {
      const result = createSimulator(romModule)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('addr', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })

    it('reads loaded data', () => {
      const result = createSimulator(romModule)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Load ROM data
      sim.loadRom([0x10, 0x20, 0x30, 0x40])

      // Read addresses
      sim.setInput('addr', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0x10)

      sim.setInput('addr', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0x20)

      sim.setInput('addr', 2)
      sim.step()
      expect(sim.getOutput('out')).toBe(0x30)

      sim.setInput('addr', 3)
      sim.step()
      expect(sim.getOutput('out')).toBe(0x40)
    })

    it('reads 0 from addresses beyond loaded data', () => {
      const result = createSimulator(romModule)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.loadRom([0xFF])

      sim.setInput('addr', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xFF)

      sim.setInput('addr', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })
  })
})
