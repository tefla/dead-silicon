import { describe, it, expect } from 'vitest'
import { createSimulator } from './simulator'

// Helper to create WASM simulator
function wasmSim(source: string, moduleName?: string) {
  const result = createSimulator(source, moduleName, 'wasm')
  if (!result.ok) throw new Error(result.error)
  return result.simulator
}

describe('WASM Simulator', () => {
  describe('Basic Gates', () => {
    it('should evaluate NOT gate', () => {
      const source = `
module not_gate(a) -> out:
  out = nand(a, a)
`
      const sim = wasmSim(source)

      sim.setInput('a', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)

      sim.setInput('a', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })

    it('should evaluate AND gate', () => {
      const source = `
module and_gate(a, b) -> out:
  nand_out = nand(a, b)
  out = nand(nand_out, nand_out)
`
      const sim = wasmSim(source)

      sim.setInput('a', 0)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)

      sim.setInput('a', 1)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)

      sim.setInput('a', 1)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })

    it('should evaluate OR gate', () => {
      const source = `
module or_gate(a, b) -> out:
  not_a = nand(a, a)
  not_b = nand(b, b)
  out = nand(not_a, not_b)
`
      const sim = wasmSim(source)

      sim.setInput('a', 0)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)

      sim.setInput('a', 1)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)

      sim.setInput('a', 0)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })

    it('should evaluate XOR gate', () => {
      const source = `
module xor_gate(a, b) -> out:
  nand_ab = nand(a, b)
  nand_a_nandab = nand(a, nand_ab)
  nand_b_nandab = nand(b, nand_ab)
  out = nand(nand_a_nandab, nand_b_nandab)
`
      const sim = wasmSim(source)

      sim.setInput('a', 0)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)

      sim.setInput('a', 1)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)

      sim.setInput('a', 0)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)

      sim.setInput('a', 1)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })
  })

  describe('Multi-bit Operations', () => {
    it('should handle 8-bit NAND', () => {
      const source = `
module nand8(a:8, b:8) -> out:8:
  out = nand(a, b)
`
      const sim = wasmSim(source)

      sim.setInput('a', 0xFF)
      sim.setInput('b', 0xFF)
      sim.step()
      expect(sim.getOutput('out')).toBe(0x00)

      sim.setInput('a', 0xAA)
      sim.setInput('b', 0x55)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xFF)

      sim.setInput('a', 0xFF)
      sim.setInput('b', 0x0F)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xF0)
    })

    it('should handle bit indexing', () => {
      const source = `
module bit_index(a:8) -> b0:
  b0 = a[0]
`
      const sim = wasmSim(source)

      sim.setInput('a', 0b10000011)
      sim.step()
      expect(sim.getOutput('b0')).toBe(1)

      sim.setInput('a', 0b01111100)
      sim.step()
      expect(sim.getOutput('b0')).toBe(0)
    })

    it('should handle bit slicing', () => {
      const source = `
module bit_slice(a:8) -> low:4:
  low = a[0:3]
`
      const sim = wasmSim(source)

      sim.setInput('a', 0xAB)
      sim.step()
      expect(sim.getOutput('low')).toBe(0xB)
    })

    it('should handle concatenation', () => {
      const source = `
module concat_test(a:4, b:4) -> out:8:
  out = concat(a, b)
`
      const sim = wasmSim(source)

      sim.setInput('a', 0xA)
      sim.setInput('b', 0xB)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xAB)
    })
  })

  describe('Sequential Logic (DFF)', () => {
    it('should latch on rising edge', () => {
      const source = `
module dff_test(d, clk) -> q:
  q = dff(d, clk)
`
      const sim = wasmSim(source)

      // Initial state: q should be 0
      sim.setInput('d', 0)
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(0)

      // Set d=1, clk still low - q stays 0
      sim.setInput('d', 1)
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(0)

      // Rising edge - q should become 1
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(1)

      // Change d while clk high - q stays 1
      sim.setInput('d', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(1)

      // Clock low - q stays 1
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(1)

      // Rising edge with d=0 - q becomes 0
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(0)
    })

    it('should work with 8-bit register', () => {
      const source = `
module reg8(d:8, clk) -> q:8:
  q = dff(d, clk)
`
      const sim = wasmSim(source)

      sim.setInput('d', 0x42)
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(0)

      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(0x42)

      sim.setInput('d', 0xFF)
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(0x42)

      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(0xFF)
    })
  })

  describe('Constants', () => {
    it('should handle constant values', () => {
      const source = `
module const_test() -> out:8:
  out = 0x42
`
      const sim = wasmSim(source)
      sim.step()
      expect(sim.getOutput('out')).toBe(0x42)
    })
  })

  describe('Complex Circuits', () => {
    it('should simulate a counter', () => {
      const source = `
module not(a) -> out:
  out = nand(a, a)

module and(a, b) -> out:
  n = nand(a, b)
  out = not(n)

module or(a, b) -> out:
  out = nand(not(a), not(b))

module xor(a, b) -> out:
  nab = nand(a, b)
  out = nand(nand(a, nab), nand(b, nab))

module counter(clk) -> count:4:
  q0 = dff(not(q0), clk)
  q1 = dff(xor(q1, q0), clk)
  q2 = dff(xor(q2, and(q0, q1)), clk)
  q3 = dff(xor(q3, and(and(q0, q1), q2)), clk)
  count = concat(q3, q2, q1, q0)
`
      const sim = wasmSim(source, 'counter')

      // Initial state: count should be 0 before any clocks
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('count')).toBe(0)

      // Count from 1 to 15 (first edge increments to 1)
      for (let i = 1; i <= 15; i++) {
        sim.setInput('clk', 1)
        sim.step()
        expect(sim.getOutput('count')).toBe(i)
        sim.setInput('clk', 0)
        sim.step()
      }

      // Wrap around to 0
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('count')).toBe(0)
    })
  })

  describe('Comparison with Levelized', () => {
    it('should match levelized simulator output for basic gate chain', () => {
      const source = `
module gate_chain(a, b) -> out:
  n1 = nand(a, b)
  n2 = nand(n1, n1)
  n3 = nand(a, n1)
  n4 = nand(b, n1)
  out = nand(n3, n4)
`
      const wasmResult = createSimulator(source, 'gate_chain', 'wasm')
      const levelizedResult = createSimulator(source, 'gate_chain', 'levelized')

      if (!wasmResult.ok || !levelizedResult.ok) throw new Error('Failed to create simulators')

      const wasm = wasmResult.simulator
      const levelized = levelizedResult.simulator

      // Test all input combinations
      for (let a = 0; a <= 1; a++) {
        for (let b = 0; b <= 1; b++) {
          wasm.setInput('a', a)
          wasm.setInput('b', b)
          levelized.setInput('a', a)
          levelized.setInput('b', b)

          wasm.step()
          levelized.step()

          expect(wasm.getOutput('out')).toBe(levelized.getOutput('out'))
        }
      }
    })
  })
})
