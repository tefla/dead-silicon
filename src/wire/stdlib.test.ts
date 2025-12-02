import { describe, it, expect, beforeEach } from 'vitest'
import { createSimulator } from './simulator'
import { resetNodeCounter } from './compiler'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load standard library files
const assetsDir = join(__dirname, '../assets/wire')
const gatesWire = readFileSync(join(assetsDir, 'gates.wire'), 'utf-8')
const arithmeticWire = readFileSync(join(assetsDir, 'arithmetic.wire'), 'utf-8')
const registersWire = readFileSync(join(assetsDir, 'registers.wire'), 'utf-8')

// Combine all stdlib
const stdlib = gatesWire + '\n' + arithmeticWire + '\n' + registersWire

beforeEach(() => {
  resetNodeCounter()
})

describe('Standard Library - Gates', () => {
  describe('NOT gate', () => {
    const testModule = `
${gatesWire}
module test_not(a) -> out:
  out = not(a)
`
    it('inverts 0 to 1', () => {
      const result = createSimulator(testModule, 'test_not')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })

    it('inverts 1 to 0', () => {
      const result = createSimulator(testModule, 'test_not')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })
  })

  describe('AND gate', () => {
    const testModule = `
${gatesWire}
module test_and(a, b) -> out:
  out = and(a, b)
`
    it('computes AND truth table', () => {
      const result = createSimulator(testModule, 'test_and')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      const testCases = [
        { a: 0, b: 0, expected: 0 },
        { a: 0, b: 1, expected: 0 },
        { a: 1, b: 0, expected: 0 },
        { a: 1, b: 1, expected: 1 },
      ]

      for (const { a, b, expected } of testCases) {
        sim.setInput('a', a)
        sim.setInput('b', b)
        sim.step()
        expect(sim.getOutput('out')).toBe(expected)
      }
    })
  })

  describe('OR gate', () => {
    const testModule = `
${gatesWire}
module test_or(a, b) -> out:
  out = or(a, b)
`
    it('computes OR truth table', () => {
      const result = createSimulator(testModule, 'test_or')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      const testCases = [
        { a: 0, b: 0, expected: 0 },
        { a: 0, b: 1, expected: 1 },
        { a: 1, b: 0, expected: 1 },
        { a: 1, b: 1, expected: 1 },
      ]

      for (const { a, b, expected } of testCases) {
        sim.setInput('a', a)
        sim.setInput('b', b)
        sim.step()
        expect(sim.getOutput('out')).toBe(expected)
      }
    })
  })

  describe('XOR gate', () => {
    const testModule = `
${gatesWire}
module test_xor(a, b) -> out:
  out = xor(a, b)
`
    it('computes XOR truth table', () => {
      const result = createSimulator(testModule, 'test_xor')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      const testCases = [
        { a: 0, b: 0, expected: 0 },
        { a: 0, b: 1, expected: 1 },
        { a: 1, b: 0, expected: 1 },
        { a: 1, b: 1, expected: 0 },
      ]

      for (const { a, b, expected } of testCases) {
        sim.setInput('a', a)
        sim.setInput('b', b)
        sim.step()
        expect(sim.getOutput('out')).toBe(expected)
      }
    })
  })

  describe('MUX', () => {
    const testModule = `
${gatesWire}
module test_mux(a, b, sel) -> out:
  out = mux(a, b, sel)
`
    it('selects a when sel=0', () => {
      const result = createSimulator(testModule, 'test_mux')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 1)
      sim.setInput('b', 0)
      sim.setInput('sel', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })

    it('selects b when sel=1', () => {
      const result = createSimulator(testModule, 'test_mux')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 1)
      sim.setInput('b', 0)
      sim.setInput('sel', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })
  })
})

describe('Standard Library - Arithmetic', () => {
  const testBase = gatesWire + '\n' + arithmeticWire

  describe('half_adder', () => {
    const testModule = `
${testBase}
module test_half(a, b) -> (s, c):
  h = half_adder(a, b)
  s = h.sum
  c = h.carry
`
    it('computes half adder truth table', () => {
      const result = createSimulator(testModule, 'test_half')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      const testCases = [
        { a: 0, b: 0, sum: 0, carry: 0 },
        { a: 0, b: 1, sum: 1, carry: 0 },
        { a: 1, b: 0, sum: 1, carry: 0 },
        { a: 1, b: 1, sum: 0, carry: 1 },
      ]

      for (const { a, b, sum, carry } of testCases) {
        sim.setInput('a', a)
        sim.setInput('b', b)
        sim.step()
        expect(sim.getOutput('s')).toBe(sum)
        expect(sim.getOutput('c')).toBe(carry)
      }
    })
  })

  describe('full_adder', () => {
    const testModule = `
${testBase}
module test_full(a, b, cin) -> (s, cout):
  f = full_adder(a, b, cin)
  s = f.sum
  cout = f.cout
`
    it('computes full adder truth table', () => {
      const result = createSimulator(testModule, 'test_full')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      const testCases = [
        { a: 0, b: 0, cin: 0, sum: 0, cout: 0 },
        { a: 0, b: 0, cin: 1, sum: 1, cout: 0 },
        { a: 0, b: 1, cin: 0, sum: 1, cout: 0 },
        { a: 0, b: 1, cin: 1, sum: 0, cout: 1 },
        { a: 1, b: 0, cin: 0, sum: 1, cout: 0 },
        { a: 1, b: 0, cin: 1, sum: 0, cout: 1 },
        { a: 1, b: 1, cin: 0, sum: 0, cout: 1 },
        { a: 1, b: 1, cin: 1, sum: 1, cout: 1 },
      ]

      for (const { a, b, cin, sum, cout } of testCases) {
        sim.setInput('a', a)
        sim.setInput('b', b)
        sim.setInput('cin', cin)
        sim.step()
        expect(sim.getOutput('s')).toBe(sum)
        expect(sim.getOutput('cout')).toBe(cout)
      }
    })
  })

  describe('adder8', () => {
    const testModule = `
${testBase}
module test_add8(a:8, b:8, cin) -> (s:8, cout):
  r = adder8(a, b, cin)
  s = r.sum
  cout = r.cout
`
    it('adds 0 + 0', () => {
      const result = createSimulator(testModule, 'test_add8')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0)
      sim.setInput('b', 0)
      sim.setInput('cin', 0)
      sim.step()
      expect(sim.getOutput('s')).toBe(0)
      expect(sim.getOutput('cout')).toBe(0)
    })

    it('adds 1 + 1', () => {
      const result = createSimulator(testModule, 'test_add8')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 1)
      sim.setInput('b', 1)
      sim.setInput('cin', 0)
      sim.step()
      expect(sim.getOutput('s')).toBe(2)
      expect(sim.getOutput('cout')).toBe(0)
    })

    it('adds 100 + 55', () => {
      const result = createSimulator(testModule, 'test_add8')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 100)
      sim.setInput('b', 55)
      sim.setInput('cin', 0)
      sim.step()
      expect(sim.getOutput('s')).toBe(155)
      expect(sim.getOutput('cout')).toBe(0)
    })

    it('adds 200 + 100 with overflow', () => {
      const result = createSimulator(testModule, 'test_add8')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 200)
      sim.setInput('b', 100)
      sim.setInput('cin', 0)
      sim.step()
      // 200 + 100 = 300 = 0x12C, so sum is 0x2C = 44, carry out
      expect(sim.getOutput('s')).toBe(44)
      expect(sim.getOutput('cout')).toBe(1)
    })

    it('adds with carry in', () => {
      const result = createSimulator(testModule, 'test_add8')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 10)
      sim.setInput('b', 20)
      sim.setInput('cin', 1)
      sim.step()
      expect(sim.getOutput('s')).toBe(31)
      expect(sim.getOutput('cout')).toBe(0)
    })
  })
})

describe('Standard Library - Registers', () => {
  const testBase = gatesWire + '\n' + registersWire

  describe('dff_simple (module wrapper)', () => {
    const testModule = `
${testBase}
module test_dff(d, clk) -> q:
  q = dff_simple(d, clk)
`
    it('latches on rising edge', () => {
      const result = createSimulator(testModule, 'test_dff')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Initially output should be 0
      sim.setInput('d', 1)
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(0)

      // Rising edge - latch the 1
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(1)

      // Change d while clock is high - should not affect output
      sim.setInput('d', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(1)

      // Clock low
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(1)

      // Rising edge with d=0
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(0)
    })
  })

  describe('counter1 (module wrapper)', () => {
    const testModule = `
${testBase}
module test_cnt1(en, clk) -> q:
  q = counter1(en, clk)
`
    it('toggles when enabled', () => {
      const result = createSimulator(testModule, 'test_cnt1')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Enable counter
      sim.setInput('en', 1)
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(0)

      // Clock cycle 1 - should toggle to 1
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(1)

      sim.setInput('clk', 0)
      sim.step()

      // Clock cycle 2 - should toggle to 0
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(0)

      sim.setInput('clk', 0)
      sim.step()

      // Clock cycle 3 - should toggle to 1
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(1)
    })

    it('holds when disabled', () => {
      const result = createSimulator(testModule, 'test_cnt1')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // First enable and toggle to 1
      sim.setInput('en', 1)
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(1)

      // Disable
      sim.setInput('en', 0)
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(1) // Should stay at 1

      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(1) // Still 1
    })
  })

  describe('register (module wrapper)', () => {
    const testModule = `
${testBase}
module test_reg(d, en, clk) -> q:
  q = register(d, en, clk)
`
    it('latches when enabled', () => {
      const result = createSimulator(testModule, 'test_reg')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Enable and set d=1
      sim.setInput('d', 1)
      sim.setInput('en', 1)
      sim.setInput('clk', 0)
      sim.step()

      // Rising edge - should latch 1
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(1)

      // Disable and try to write 0
      sim.setInput('d', 0)
      sim.setInput('en', 0)
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(1) // Should still be 1

      // Enable and write 0
      sim.setInput('en', 1)
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(0)
    })
  })
})
