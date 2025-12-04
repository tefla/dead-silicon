// Tests for 16-bit CPU components
// These components are building blocks for the Wire CPU

import { describe, it, expect } from 'vitest'
import { createSimulator } from './simulator'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load standard library
const gatesWire = readFileSync(resolve(__dirname, '../assets/wire/gates.wire'), 'utf-8')
const arithmeticWire = readFileSync(resolve(__dirname, '../assets/wire/arithmetic.wire'), 'utf-8')
const registersWire = readFileSync(resolve(__dirname, '../assets/wire/registers.wire'), 'utf-8')
const register16Wire = readFileSync(resolve(__dirname, '../assets/wire/register16.wire'), 'utf-8')
const adder16Wire = readFileSync(resolve(__dirname, '../assets/wire/adder16.wire'), 'utf-8')

const stdlib = gatesWire + '\n' + arithmeticWire + '\n' + registersWire + '\n' + register16Wire + '\n' + adder16Wire

describe('16-bit Components', () => {
  describe('bit slicing and concat (sanity check)', () => {
    // Test without loading register16Wire to isolate the issue
    const stdlibBasic = gatesWire + '\n' + arithmeticWire + '\n' + registersWire
    const testModule = `
${stdlibBasic}

module test_slice(d:16) -> (lo:8, hi:8, combined:16):
  lo = d[0:7]
  hi = d[8:15]
  combined = concat(hi, lo)
`

    it('can slice 16-bit value into bytes', () => {
      const result = createSimulator(testModule, 'test_slice')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Test multiple cases
      const testCases = [
        { input: 0x00FF, expectedLo: 0xFF, expectedHi: 0x00 },
        { input: 0xFF00, expectedLo: 0x00, expectedHi: 0xFF },
        { input: 0x1234, expectedLo: 0x34, expectedHi: 0x12 },
        { input: 0xABCD, expectedLo: 0xCD, expectedHi: 0xAB },
      ]

      for (const tc of testCases) {
        sim.setInput('d', tc.input)
        sim.step()

        expect(sim.getOutput('lo')).toBe(tc.expectedLo)
        expect(sim.getOutput('hi')).toBe(tc.expectedHi)
        expect(sim.getOutput('combined')).toBe(tc.input)
      }
    })
  })

  describe('register8 (sanity check)', () => {
    const testModule = `
${stdlib}

module test_reg8(d:8, en, clk) -> q:8:
  q = register8(d, en, clk)
`

    it('latches 8-bit value when enabled', () => {
      const result = createSimulator(testModule, 'test_reg8')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Enable and set d=0x42
      sim.setInput('d', 0x42)
      sim.setInput('en', 1)
      sim.setInput('clk', 0)
      sim.step()

      // Rising edge - should latch 0x42
      sim.setInput('clk', 1)
      sim.step()

      expect(sim.getOutput('q')).toBe(0x42)
    })
  })

  describe('register16', () => {
    const testModule = `
${stdlib}

module test_reg16(d:16, en, clk) -> q:16:
  q = register16(d, en, clk)
`

    it('holds zero on reset', () => {
      const result = createSimulator(testModule, 'test_reg16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Initial state should be 0
      sim.setInput('d', 0)
      sim.setInput('en', 0)
      sim.setInput('clk', 0)
      sim.step()

      expect(sim.getOutput('q')).toBe(0)
    })

    it('latches 16-bit value when enabled', () => {
      const result = createSimulator(testModule, 'test_reg16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Enable and set d=0x1234
      sim.setInput('d', 0x1234)
      sim.setInput('en', 1)
      sim.setInput('clk', 0)
      sim.step()

      // Rising edge - should latch 0x1234
      sim.setInput('clk', 1)
      sim.step()

      expect(sim.getOutput('q')).toBe(0x1234)
    })

    it('holds value when disabled', () => {
      const result = createSimulator(testModule, 'test_reg16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Latch 0xABCD
      sim.setInput('d', 0xABCD)
      sim.setInput('en', 1)
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(0xABCD)

      // Disable and try to write different value
      sim.setInput('d', 0x5678)
      sim.setInput('en', 0)
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()

      // Should still hold 0xABCD
      expect(sim.getOutput('q')).toBe(0xABCD)
    })

    it('updates on next enable', () => {
      const result = createSimulator(testModule, 'test_reg16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Latch first value
      sim.setInput('d', 0x1111)
      sim.setInput('en', 1)
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(0x1111)

      // Enable again with new value
      sim.setInput('d', 0x2222)
      sim.setInput('en', 1)
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(0x2222)
    })

    it('handles maximum value (0xFFFF)', () => {
      const result = createSimulator(testModule, 'test_reg16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      sim.setInput('d', 0xFFFF)
      sim.setInput('en', 1)
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(0xFFFF)
    })

    it('handles alternating patterns', () => {
      const result = createSimulator(testModule, 'test_reg16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Test 0xAAAA (alternating bits)
      sim.setInput('d', 0xAAAA)
      sim.setInput('en', 1)
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(0xAAAA)

      // Test 0x5555 (inverted alternating)
      sim.setInput('d', 0x5555)
      sim.setInput('en', 1)
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(0x5555)
    })
  })

  describe('adder16', () => {
    // First test if adder8 works
    it('SANITY: adder8 works correctly', () => {
      const adder8Test = `
${stdlib}
`
      const result = createSimulator(adder8Test, 'adder8')
      expect(result.ok).toBe(true)
      if (!result.ok) {
        console.log('Compile error:', result.error)
        return
      }

      const sim = result.simulator

      // 0x12 + 0x01 = 0x13
      sim.setInput('a', 0x12)
      sim.setInput('b', 0x01)
      sim.setInput('cin', 0)
      sim.step()

      expect(sim.getOutput('sum')).toBe(0x13)
      expect(sim.getOutput('cout')).toBe(0)
    })

    // Test adder16 directly without wrapper
    it('DIRECT TEST: adder16 works directly', () => {
      const directTest = `
${stdlib}
`
      const result = createSimulator(directTest, 'adder16')
      expect(result.ok).toBe(true)
      if (!result.ok) {
        console.log('Compile error:', result.error)
        return
      }

      const sim = result.simulator

      // 0x1234 + 0x0100 = 0x1334
      sim.setInput('a', 0x1234)
      sim.setInput('b', 0x0100)
      sim.setInput('cin', 0)
      sim.step()

      expect(sim.getOutput('sum')).toBe(0x1334)
      expect(sim.getOutput('cout')).toBe(0)
    })

    const testModule = `
${stdlib}

module test_adder16(a:16, b:16, cin) -> (sum:16, cout):
  result = adder16(a, b, cin)
  sum = result.sum
  cout = result.cout
`

    it('adds two zeros', () => {
      const result = createSimulator(testModule, 'test_adder16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0)
      sim.setInput('b', 0)
      sim.setInput('cin', 0)
      sim.step()

      expect(sim.getOutput('sum')).toBe(0)
      expect(sim.getOutput('cout')).toBe(0)
    })

    it('adds simple values without carry', () => {
      const result = createSimulator(testModule, 'test_adder16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // 0x1234 + 0x0100 = 0x1334
      sim.setInput('a', 0x1234)
      sim.setInput('b', 0x0100)
      sim.setInput('cin', 0)
      sim.step()

      expect(sim.getOutput('sum')).toBe(0x1334)
      expect(sim.getOutput('cout')).toBe(0)
    })

    it('propagates carry from low byte to high byte', () => {
      const result = createSimulator(testModule, 'test_adder16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // 0x00FF + 0x0001 = 0x0100 (carry from low to high)
      sim.setInput('a', 0x00FF)
      sim.setInput('b', 0x0001)
      sim.setInput('cin', 0)
      sim.step()

      expect(sim.getOutput('sum')).toBe(0x0100)
      expect(sim.getOutput('cout')).toBe(0)
    })

    it('handles carry out when sum exceeds 16 bits', () => {
      const result = createSimulator(testModule, 'test_adder16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // 0xFFFF + 0x0001 = 0x10000 -> sum=0x0000, cout=1
      sim.setInput('a', 0xFFFF)
      sim.setInput('b', 0x0001)
      sim.setInput('cin', 0)
      sim.step()

      expect(sim.getOutput('sum')).toBe(0)
      expect(sim.getOutput('cout')).toBe(1)
    })

    it('handles carry-in correctly', () => {
      const result = createSimulator(testModule, 'test_adder16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // 0x1234 + 0x5678 + 1 = 0x68AD
      sim.setInput('a', 0x1234)
      sim.setInput('b', 0x5678)
      sim.setInput('cin', 1)
      sim.step()

      expect(sim.getOutput('sum')).toBe(0x68AD)
      expect(sim.getOutput('cout')).toBe(0)
    })

    it('adds maximum values', () => {
      const result = createSimulator(testModule, 'test_adder16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // 0xFFFF + 0xFFFF = 0x1FFFE -> sum=0xFFFE, cout=1
      sim.setInput('a', 0xFFFF)
      sim.setInput('b', 0xFFFF)
      sim.setInput('cin', 0)
      sim.step()

      expect(sim.getOutput('sum')).toBe(0xFFFE)
      expect(sim.getOutput('cout')).toBe(1)
    })

    it('adds with both carry-in and carry-out', () => {
      const result = createSimulator(testModule, 'test_adder16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // 0xFFFF + 0xFFFF + 1 = 0x1FFFF -> sum=0xFFFF, cout=1
      sim.setInput('a', 0xFFFF)
      sim.setInput('b', 0xFFFF)
      sim.setInput('cin', 1)
      sim.step()

      expect(sim.getOutput('sum')).toBe(0xFFFF)
      expect(sim.getOutput('cout')).toBe(1)
    })

    it('handles multiple carry propagations', () => {
      const result = createSimulator(testModule, 'test_adder16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Test cases with carries through multiple bit positions
      const testCases = [
        { a: 0x0FFF, b: 0x0001, cin: 0, sum: 0x1000, cout: 0 },
        { a: 0x7FFF, b: 0x0001, cin: 0, sum: 0x8000, cout: 0 },
        { a: 0x8000, b: 0x8000, cin: 0, sum: 0x0000, cout: 1 },
        { a: 0xAAAA, b: 0x5555, cin: 0, sum: 0xFFFF, cout: 0 },
      ]

      for (const tc of testCases) {
        sim.setInput('a', tc.a)
        sim.setInput('b', tc.b)
        sim.setInput('cin', tc.cin)
        sim.step()

        expect(sim.getOutput('sum')).toBe(tc.sum)
        expect(sim.getOutput('cout')).toBe(tc.cout)
      }
    })
  })
})
