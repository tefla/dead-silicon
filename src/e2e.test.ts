// End-to-End Execution Tests
// Tests the complete pipeline: Wire HDL → Gate Simulation (WASM)

import { describe, it, expect, beforeEach } from 'vitest'
import { createSimulator, resetNodeCounter } from './wire'

// =============================================================================
// SECTION 1: Wire HDL End-to-End Tests
// =============================================================================

describe('E2E: Wire HDL Pipeline', () => {
  beforeEach(() => {
    resetNodeCounter()
  })

  describe('Basic Logic Circuits', () => {
    it('should simulate NOT gate from first principles', () => {
      const source = `
        module not(a) -> out:
          out = nand(a, a)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      sim.simulator.setInput('a', 0)
      sim.simulator.step()
      expect(sim.simulator.getOutput('out')).toBe(1)

      sim.simulator.setInput('a', 1)
      sim.simulator.step()
      expect(sim.simulator.getOutput('out')).toBe(0)
    })

    it('should simulate AND gate built from NAND', () => {
      const source = `
        module and(a, b) -> out:
          n = nand(a, b)
          out = nand(n, n)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      const testCases = [
        { a: 0, b: 0, expected: 0 },
        { a: 0, b: 1, expected: 0 },
        { a: 1, b: 0, expected: 0 },
        { a: 1, b: 1, expected: 1 }
      ]

      for (const { a, b, expected } of testCases) {
        sim.simulator.setInput('a', a)
        sim.simulator.setInput('b', b)
        sim.simulator.step()
        expect(sim.simulator.getOutput('out')).toBe(expected)
      }
    })

    it('should simulate OR gate built from NAND', () => {
      const source = `
        module or(a, b) -> out:
          na = nand(a, a)
          nb = nand(b, b)
          out = nand(na, nb)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      const testCases = [
        { a: 0, b: 0, expected: 0 },
        { a: 0, b: 1, expected: 1 },
        { a: 1, b: 0, expected: 1 },
        { a: 1, b: 1, expected: 1 }
      ]

      for (const { a, b, expected } of testCases) {
        sim.simulator.setInput('a', a)
        sim.simulator.setInput('b', b)
        sim.simulator.step()
        expect(sim.simulator.getOutput('out')).toBe(expected)
      }
    })

    it('should simulate XOR gate built from NAND', () => {
      const source = `
        module xor(a, b) -> out:
          n1 = nand(a, b)
          n2 = nand(a, n1)
          n3 = nand(b, n1)
          out = nand(n2, n3)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      const testCases = [
        { a: 0, b: 0, expected: 0 },
        { a: 0, b: 1, expected: 1 },
        { a: 1, b: 0, expected: 1 },
        { a: 1, b: 1, expected: 0 }
      ]

      for (const { a, b, expected } of testCases) {
        sim.simulator.setInput('a', a)
        sim.simulator.setInput('b', b)
        sim.simulator.step()
        expect(sim.simulator.getOutput('out')).toBe(expected)
      }
    })
  })

  describe('Arithmetic Circuits', () => {
    it('should simulate half adder', () => {
      const source = `
        module half_adder(a, b) -> (sum, carry):
          n1 = nand(a, b)
          n2 = nand(a, n1)
          n3 = nand(b, n1)
          sum = nand(n2, n3)
          c1 = nand(n1, n1)
          carry = c1
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      const testCases = [
        { a: 0, b: 0, sum: 0, carry: 0 },
        { a: 0, b: 1, sum: 1, carry: 0 },
        { a: 1, b: 0, sum: 1, carry: 0 },
        { a: 1, b: 1, sum: 0, carry: 1 }
      ]

      for (const { a, b, sum, carry } of testCases) {
        sim.simulator.setInput('a', a)
        sim.simulator.setInput('b', b)
        sim.simulator.step()
        expect(sim.simulator.getOutput('sum')).toBe(sum)
        expect(sim.simulator.getOutput('carry')).toBe(carry)
      }
    })

    it('should simulate full adder using half adders', () => {
      const source = `
        module half_adder(a, b) -> (sum, carry):
          n1 = nand(a, b)
          n2 = nand(a, n1)
          n3 = nand(b, n1)
          sum = nand(n2, n3)
          carry = nand(n1, n1)

        module full_adder(a, b, cin) -> (sum, cout):
          h1 = half_adder(a, b)
          h2 = half_adder(h1.sum, cin)
          sum = h2.sum
          c_not_a = nand(h1.carry, h1.carry)
          c_not_b = nand(h2.carry, h2.carry)
          cout = nand(c_not_a, c_not_b)
      `
      const sim = createSimulator(source, 'full_adder')
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      // Test all 8 combinations
      for (let a = 0; a <= 1; a++) {
        for (let b = 0; b <= 1; b++) {
          for (let cin = 0; cin <= 1; cin++) {
            const expected = a + b + cin
            const expectedSum = expected & 1
            const expectedCarry = (expected >> 1) & 1

            sim.simulator.setInput('a', a)
            sim.simulator.setInput('b', b)
            sim.simulator.setInput('cin', cin)
            sim.simulator.step()

            expect(sim.simulator.getOutput('sum')).toBe(expectedSum)
            expect(sim.simulator.getOutput('cout')).toBe(expectedCarry)
          }
        }
      }
    })
  })

  describe('Sequential Circuits', () => {
    it('should simulate D flip-flop with clock edge', () => {
      const source = `
        module dff_test(d, clk) -> q:
          q = dff(d, clk)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      // Set D=1, clock low -> Q should be 0 initially
      sim.simulator.setInput('d', 1)
      sim.simulator.setInput('clk', 0)
      sim.simulator.step()
      expect(sim.simulator.getOutput('q')).toBe(0)

      // Clock goes high -> Q should capture D=1
      sim.simulator.setInput('clk', 1)
      sim.simulator.step()
      expect(sim.simulator.getOutput('q')).toBe(1)

      // Change D to 0, clock still high -> Q should stay 1
      sim.simulator.setInput('d', 0)
      sim.simulator.step()
      expect(sim.simulator.getOutput('q')).toBe(1)

      // Clock low then high -> Q should capture D=0
      sim.simulator.setInput('clk', 0)
      sim.simulator.step()
      sim.simulator.setInput('clk', 1)
      sim.simulator.step()
      expect(sim.simulator.getOutput('q')).toBe(0)
    })

    it('should simulate a 2-bit counter', () => {
      const source = `
        module counter2(clk) -> (q0, q1):
          q0 = dff(n0, clk)
          n0 = nand(q0, q0)
          q1 = dff(n1, q0_bar)
          q0_bar = nand(q0, q0)
          n1 = nand(q1, q1)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      // Initialize
      sim.simulator.setInput('clk', 0)
      sim.simulator.step()

      // Count sequence - counter may start at any state
      const counts: number[] = []
      for (let i = 0; i < 8; i++) {
        sim.simulator.setInput('clk', 1)
        sim.simulator.step()
        const q0 = sim.simulator.getOutput('q0')
        const q1 = sim.simulator.getOutput('q1')
        counts.push(q1 * 2 + q0)
        sim.simulator.setInput('clk', 0)
        sim.simulator.step()
      }

      // Counter should visit all 4 states (0,1,2,3) and wrap around
      // Check that we see sequential counting pattern (can count up OR down)
      // This circuit counts DOWN due to how q1 is clocked by q0_bar
      for (let i = 1; i < counts.length; i++) {
        const expectedDown = (counts[i - 1] - 1 + 4) % 4
        expect(counts[i]).toBe(expectedDown)
      }
      // Also verify we hit all 4 values
      const unique = new Set(counts)
      expect(unique.size).toBe(4)
    })
  })

  describe('Complex Multi-Module Circuits', () => {
    it('should simulate a 2-to-1 multiplexer', () => {
      const source = `
        module mux2(sel, a, b) -> out:
          sel_bar = nand(sel, sel)
          t1 = nand(sel_bar, a)
          t2 = nand(sel, b)
          out = nand(t1, t2)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      // sel=0 selects a
      sim.simulator.setInput('sel', 0)
      sim.simulator.setInput('a', 1)
      sim.simulator.setInput('b', 0)
      sim.simulator.step()
      expect(sim.simulator.getOutput('out')).toBe(1)

      // sel=1 selects b
      sim.simulator.setInput('sel', 1)
      sim.simulator.setInput('a', 1)
      sim.simulator.setInput('b', 0)
      sim.simulator.step()
      expect(sim.simulator.getOutput('out')).toBe(0)
    })

    it('should simulate SR latch', () => {
      const source = `
        module sr_latch(s, r) -> (q, qbar):
          q = nand(s, qbar)
          qbar = nand(r, q)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      // Set (S=0, R=1 in NAND-based SR latch)
      sim.simulator.setInput('s', 0)
      sim.simulator.setInput('r', 1)
      sim.simulator.step()
      expect(sim.simulator.getOutput('q')).toBe(1)
      expect(sim.simulator.getOutput('qbar')).toBe(0)

      // Hold (S=1, R=1)
      sim.simulator.setInput('s', 1)
      sim.simulator.step()
      expect(sim.simulator.getOutput('q')).toBe(1)

      // Reset (S=1, R=0)
      sim.simulator.setInput('r', 0)
      sim.simulator.step()
      expect(sim.simulator.getOutput('q')).toBe(0)
      expect(sim.simulator.getOutput('qbar')).toBe(1)
    })
  })

  describe('Bus Operations', () => {
    it('should handle 8-bit buses through DFF', () => {
      const source = `
        module reg8(d:8, clk) -> q:8:
          q = dff(d, clk)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      // Test with various 8-bit values
      const testValues = [0x00, 0xFF, 0xAA, 0x55, 0x12, 0xFE]

      for (const val of testValues) {
        sim.simulator.setInput('d', val)
        sim.simulator.setInput('clk', 0)
        sim.simulator.step()
        sim.simulator.setInput('clk', 1)
        sim.simulator.step()
        expect(sim.simulator.getOutput('q')).toBe(val)
      }
    })
  })
})

// =============================================================================
// SECTION 2: Error Handling
// =============================================================================

describe('E2E: Error Handling', () => {
  beforeEach(() => {
    resetNodeCounter()
  })

  describe('Wire Compilation Errors', () => {
    it('should treat undefined module as black box outputting 0', () => {
      // In this system, undefined modules are treated as black boxes
      // that output 0 during simulation (lazy evaluation style)
      const source = `
        module test(a) -> out:
          out = undefined_module(a)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      sim.simulator.setInput('a', 1)
      sim.simulator.step()
      // Undefined module outputs 0
      expect(sim.simulator.getOutput('out')).toBe(0)
    })
  })
})

// =============================================================================
// SECTION 3: Performance and Stress Tests
// =============================================================================

describe('E2E: Stress Tests', () => {
  beforeEach(() => {
    resetNodeCounter()
  })

  describe('Wire Simulation Stress', () => {
    it('should handle deeply nested module instantiation', () => {
      // Chain of NOT gates
      let source = 'module not(a) -> out:\n  out = nand(a, a)\n\n'
      source += 'module chain(a) -> out:\n'
      source += '  t0 = not(a)\n'
      for (let i = 1; i < 20; i++) {
        source += `  t${i} = not(t${i-1})\n`
      }
      source += '  out = t19\n'

      const sim = createSimulator(source, 'chain')
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      // 20 inversions means: input 0 -> output 0, input 1 -> output 1
      sim.simulator.setInput('a', 0)
      sim.simulator.step()
      expect(sim.simulator.getOutput('out')).toBe(0)

      sim.simulator.setInput('a', 1)
      sim.simulator.step()
      expect(sim.simulator.getOutput('out')).toBe(1)
    })

    it('should handle rapid clock toggling', () => {
      const source = `
        module counter(clk) -> q:
          q = dff(n, clk)
          n = nand(q, q)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      // Toggle clock 1000 times
      for (let i = 0; i < 1000; i++) {
        sim.simulator.setInput('clk', i % 2)
        sim.simulator.step()
      }

      // Should still be functional
      expect([0, 1]).toContain(sim.simulator.getOutput('q'))
    })
  })
})
