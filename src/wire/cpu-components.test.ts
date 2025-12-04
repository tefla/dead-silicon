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

const stdlib = gatesWire + '\n' + arithmeticWire + '\n' + registersWire + '\n' + register16Wire

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
})
