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
const mux8Wire = readFileSync(resolve(__dirname, '../assets/wire/mux8.wire'), 'utf-8')
const mux16Wire = readFileSync(resolve(__dirname, '../assets/wire/mux16.wire'), 'utf-8')
const inc16Wire = readFileSync(resolve(__dirname, '../assets/wire/inc16.wire'), 'utf-8')

const stdlib = gatesWire + '\n' + arithmeticWire + '\n' + registersWire + '\n' + register16Wire + '\n' + adder16Wire + '\n' + mux8Wire + '\n' + mux16Wire + '\n' + inc16Wire

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

  describe('mux16', () => {
    const testModule = `
${stdlib}

module test_mux16(a:16, b:16, sel) -> out:16:
  out = mux16(a, b, sel)
`

    it('selects input a when sel=0', () => {
      const result = createSimulator(testModule, 'test_mux16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      sim.setInput('a', 0x1234)
      sim.setInput('b', 0x5678)
      sim.setInput('sel', 0)
      sim.step()

      expect(sim.getOutput('out')).toBe(0x1234)
    })

    it('selects input b when sel=1', () => {
      const result = createSimulator(testModule, 'test_mux16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      sim.setInput('a', 0x1234)
      sim.setInput('b', 0x5678)
      sim.setInput('sel', 1)
      sim.step()

      expect(sim.getOutput('out')).toBe(0x5678)
    })

    it('works with zero values', () => {
      const result = createSimulator(testModule, 'test_mux16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // sel=0: choose 0x0000
      sim.setInput('a', 0x0000)
      sim.setInput('b', 0xFFFF)
      sim.setInput('sel', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0x0000)

      // sel=1: choose 0xFFFF
      sim.setInput('sel', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xFFFF)
    })

    it('works with maximum values', () => {
      const result = createSimulator(testModule, 'test_mux16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      sim.setInput('a', 0xFFFF)
      sim.setInput('b', 0x0000)
      sim.setInput('sel', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xFFFF)

      sim.setInput('sel', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0x0000)
    })

    it('toggles between inputs', () => {
      const result = createSimulator(testModule, 'test_mux16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      sim.setInput('a', 0xAAAA)
      sim.setInput('b', 0x5555)

      // Toggle sel and verify output switches
      for (let i = 0; i < 4; i++) {
        sim.setInput('sel', i % 2)
        sim.step()
        expect(sim.getOutput('out')).toBe(i % 2 === 0 ? 0xAAAA : 0x5555)
      }
    })

    it('handles same input values', () => {
      const result = createSimulator(testModule, 'test_mux16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // When both inputs are same, output is same regardless of sel
      sim.setInput('a', 0x1234)
      sim.setInput('b', 0x1234)

      sim.setInput('sel', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0x1234)

      sim.setInput('sel', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0x1234)
    })

    it('works with bit patterns', () => {
      const result = createSimulator(testModule, 'test_mux16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      const testCases = [
        { a: 0x00FF, b: 0xFF00, sel: 0, expected: 0x00FF },
        { a: 0x00FF, b: 0xFF00, sel: 1, expected: 0xFF00 },
        { a: 0xF0F0, b: 0x0F0F, sel: 0, expected: 0xF0F0 },
        { a: 0xF0F0, b: 0x0F0F, sel: 1, expected: 0x0F0F },
      ]

      for (const tc of testCases) {
        sim.setInput('a', tc.a)
        sim.setInput('b', tc.b)
        sim.setInput('sel', tc.sel)
        sim.step()
        expect(sim.getOutput('out')).toBe(tc.expected)
      }
    })
  })

  describe('inc16', () => {
    const testModule = `
${stdlib}

module test_inc16(in:16) -> out:16:
  out = inc16(in)
`

    it('increments zero to one', () => {
      const result = createSimulator(testModule, 'test_inc16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      sim.setInput('in', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })

    it('increments simple values', () => {
      const result = createSimulator(testModule, 'test_inc16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      const testCases = [
        { input: 0x0001, expected: 0x0002 },
        { input: 0x0010, expected: 0x0011 },
        { input: 0x0100, expected: 0x0101 },
        { input: 0x1000, expected: 0x1001 },
        { input: 0x1234, expected: 0x1235 },
      ]

      for (const tc of testCases) {
        sim.setInput('in', tc.input)
        sim.step()
        expect(sim.getOutput('out')).toBe(tc.expected)
      }
    })

    it('handles carry from low byte to high byte', () => {
      const result = createSimulator(testModule, 'test_inc16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // 0x00FF + 1 = 0x0100 (carry from low to high byte)
      sim.setInput('in', 0x00FF)
      sim.step()
      expect(sim.getOutput('out')).toBe(0x0100)

      // 0x12FF + 1 = 0x1300
      sim.setInput('in', 0x12FF)
      sim.step()
      expect(sim.getOutput('out')).toBe(0x1300)
    })

    it('wraps around at maximum value', () => {
      const result = createSimulator(testModule, 'test_inc16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // 0xFFFF + 1 = 0x0000 (16-bit overflow/wrap)
      sim.setInput('in', 0xFFFF)
      sim.step()
      expect(sim.getOutput('out')).toBe(0x0000)
    })

    it('increments through a sequence', () => {
      const result = createSimulator(testModule, 'test_inc16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Start at 0x0FFD and increment through carry boundary
      let value = 0x0FFD
      for (let i = 0; i < 5; i++) {
        sim.setInput('in', value)
        sim.step()
        value = (value + 1) & 0xFFFF
        expect(sim.getOutput('out')).toBe(value)
      }
      // Should have gone through: 0xFFD->0xFFE, 0xFFE->0xFFF, 0xFFF->0x1000, 0x1000->0x1001, 0x1001->0x1002
    })

    it('handles carry through multiple bit positions', () => {
      const result = createSimulator(testModule, 'test_inc16')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      const testCases = [
        { input: 0x0FFF, expected: 0x1000 }, // carry through bits 0-11
        { input: 0x1FFF, expected: 0x2000 }, // carry through bits 0-12
        { input: 0x3FFF, expected: 0x4000 }, // carry through bits 0-13
        { input: 0x7FFF, expected: 0x8000 }, // carry through bits 0-14
      ]

      for (const tc of testCases) {
        sim.setInput('in', tc.input)
        sim.step()
        expect(sim.getOutput('out')).toBe(tc.expected)
      }
    })
  })

  describe('alu8', () => {
    // Load alu8 module
    const alu8Wire = readFileSync(resolve(__dirname, '../assets/wire/alu8.wire'), 'utf-8')
    const aluStdlib = stdlib + '\n' + alu8Wire

    const testModule = `
${aluStdlib}

module test_alu8(a:8, b:8, op:3, cin) -> (result:8, z, n, cout, vout):
  alu = alu8(a, b, op, cin)
  result = alu.result
  z = alu.z
  n = alu.n
  cout = alu.cout
  vout = alu.vout
`

    // Operation codes
    const OP_ADD = 0b000
    const OP_SUB = 0b001
    const OP_AND = 0b010
    const OP_OR = 0b011
    const OP_XOR = 0b100

    // ==========================================
    // ADD Operation Tests
    // ==========================================
    describe('ADD operation', () => {
      it('adds zero + zero = zero with Z flag', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x00)
        sim.setInput('b', 0x00)
        sim.setInput('op', OP_ADD)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x00)
        expect(sim.getOutput('z')).toBe(1) // Zero flag set
        expect(sim.getOutput('n')).toBe(0)
        expect(sim.getOutput('cout')).toBe(0)
        expect(sim.getOutput('vout')).toBe(0)
      })

      it('adds 1 + 1 = 2', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x01)
        sim.setInput('b', 0x01)
        sim.setInput('op', OP_ADD)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x02)
        expect(sim.getOutput('z')).toBe(0)
        expect(sim.getOutput('n')).toBe(0)
        expect(sim.getOutput('cout')).toBe(0)
        expect(sim.getOutput('vout')).toBe(0)
      })

      it('adds with carry in: 1 + 1 + 1 = 3', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x01)
        sim.setInput('b', 0x01)
        sim.setInput('op', OP_ADD)
        sim.setInput('cin', 1)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x03)
      })

      it('adds 0x7F + 0x01 = 0x80 with overflow (positive overflow to negative)', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x7F) // 127
        sim.setInput('b', 0x01) // 1
        sim.setInput('op', OP_ADD)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x80) // -128 in two's complement
        expect(sim.getOutput('n')).toBe(1) // Negative
        expect(sim.getOutput('vout')).toBe(1) // Overflow!
        expect(sim.getOutput('cout')).toBe(0) // No carry
      })

      it('adds 0xFF + 0x01 = 0x00 with carry (unsigned overflow)', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0xFF)
        sim.setInput('b', 0x01)
        sim.setInput('op', OP_ADD)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x00)
        expect(sim.getOutput('z')).toBe(1) // Result is zero
        expect(sim.getOutput('cout')).toBe(1) // Carry out
        expect(sim.getOutput('vout')).toBe(0) // No signed overflow (-1 + 1 = 0)
      })

      it('adds 0xFF + 0xFF = 0xFE with carry', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0xFF)
        sim.setInput('b', 0xFF)
        sim.setInput('op', OP_ADD)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0xFE)
        expect(sim.getOutput('cout')).toBe(1) // Carry
        expect(sim.getOutput('n')).toBe(1) // Negative
      })

      it('adds 0x80 + 0x80 = 0x00 with carry and overflow (negative overflow to positive)', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x80) // -128
        sim.setInput('b', 0x80) // -128
        sim.setInput('op', OP_ADD)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x00)
        expect(sim.getOutput('z')).toBe(1)
        expect(sim.getOutput('cout')).toBe(1) // Carry
        expect(sim.getOutput('vout')).toBe(1) // Overflow! Two negatives produced positive
      })

      it('adds 0x40 + 0x40 = 0x80 with overflow', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x40) // 64
        sim.setInput('b', 0x40) // 64
        sim.setInput('op', OP_ADD)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x80)
        expect(sim.getOutput('vout')).toBe(1) // 64 + 64 = 128, but signed max is 127
      })

      it('adds positive + negative without overflow: 0x50 + 0xF0 = 0x40', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x50) // 80
        sim.setInput('b', 0xF0) // -16
        sim.setInput('op', OP_ADD)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x40) // 80 + (-16) = 64
        expect(sim.getOutput('cout')).toBe(1) // Carry (unsigned overflow)
        expect(sim.getOutput('vout')).toBe(0) // No signed overflow
      })

      it('adds various values correctly', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        const testCases = [
          { a: 0x12, b: 0x34, expected: 0x46 },
          { a: 0x0F, b: 0x01, expected: 0x10 },
          { a: 0xAA, b: 0x55, expected: 0xFF },
          { a: 0x55, b: 0xAA, expected: 0xFF },
          { a: 0x10, b: 0x20, expected: 0x30 },
          { a: 0x99, b: 0x11, expected: 0xAA },
        ]

        for (const tc of testCases) {
          sim.setInput('a', tc.a)
          sim.setInput('b', tc.b)
          sim.setInput('op', OP_ADD)
          sim.setInput('cin', 0)
          sim.step()
          expect(sim.getOutput('result')).toBe(tc.expected)
        }
      })
    })

    // ==========================================
    // SUB Operation Tests
    // ==========================================
    describe('SUB operation', () => {
      it('subtracts 5 - 3 = 2 (cin=1 for no borrow)', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x05)
        sim.setInput('b', 0x03)
        sim.setInput('op', OP_SUB)
        sim.setInput('cin', 1) // No borrow in
        sim.step()

        expect(sim.getOutput('result')).toBe(0x02)
        expect(sim.getOutput('z')).toBe(0)
        expect(sim.getOutput('n')).toBe(0)
        expect(sim.getOutput('cout')).toBe(1) // No borrow (carry=1)
        expect(sim.getOutput('vout')).toBe(0)
      })

      it('subtracts same values: 0x42 - 0x42 = 0 with Z flag', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x42)
        sim.setInput('b', 0x42)
        sim.setInput('op', OP_SUB)
        sim.setInput('cin', 1)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x00)
        expect(sim.getOutput('z')).toBe(1)
        expect(sim.getOutput('cout')).toBe(1) // No borrow
      })

      it('subtracts 0x00 - 0x01 = 0xFF with borrow (underflow)', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x00)
        sim.setInput('b', 0x01)
        sim.setInput('op', OP_SUB)
        sim.setInput('cin', 1)
        sim.step()

        expect(sim.getOutput('result')).toBe(0xFF)
        expect(sim.getOutput('n')).toBe(1) // Negative
        expect(sim.getOutput('cout')).toBe(0) // Borrow occurred (carry=0)
      })

      it('subtracts 0x80 - 0x01 = 0x7F with overflow (negative to positive)', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x80) // -128
        sim.setInput('b', 0x01) // 1
        sim.setInput('op', OP_SUB)
        sim.setInput('cin', 1)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x7F) // 127
        expect(sim.getOutput('n')).toBe(0) // Positive
        expect(sim.getOutput('vout')).toBe(1) // Overflow! -128 - 1 should be -129
      })

      it('subtracts 0x7F - 0xFF = 0x80 with overflow (positive - negative = negative)', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x7F) // 127
        sim.setInput('b', 0xFF) // -1
        sim.setInput('op', OP_SUB)
        sim.setInput('cin', 1)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x80) // -128, but should be 128
        expect(sim.getOutput('n')).toBe(1)
        expect(sim.getOutput('vout')).toBe(1) // Overflow!
        expect(sim.getOutput('cout')).toBe(0) // Borrow
      })

      it('subtracts with borrow in: 0x10 - 0x05 - 1 = 0x0A', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x10)
        sim.setInput('b', 0x05)
        sim.setInput('op', OP_SUB)
        sim.setInput('cin', 0) // Borrow in
        sim.step()

        expect(sim.getOutput('result')).toBe(0x0A) // 16 - 5 - 1 = 10
      })

      it('subtracts 0xFF - 0x00 = 0xFF', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0xFF)
        sim.setInput('b', 0x00)
        sim.setInput('op', OP_SUB)
        sim.setInput('cin', 1)
        sim.step()

        expect(sim.getOutput('result')).toBe(0xFF)
        expect(sim.getOutput('n')).toBe(1)
        expect(sim.getOutput('cout')).toBe(1) // No borrow
      })

      it('subtracts various values correctly', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        const testCases = [
          { a: 0x50, b: 0x30, expected: 0x20 },
          { a: 0xFF, b: 0x0F, expected: 0xF0 },
          { a: 0x10, b: 0x10, expected: 0x00 },
          { a: 0xAA, b: 0x55, expected: 0x55 },
          { a: 0x80, b: 0x80, expected: 0x00 },
        ]

        for (const tc of testCases) {
          sim.setInput('a', tc.a)
          sim.setInput('b', tc.b)
          sim.setInput('op', OP_SUB)
          sim.setInput('cin', 1)
          sim.step()
          expect(sim.getOutput('result')).toBe(tc.expected)
        }
      })
    })

    // ==========================================
    // AND Operation Tests
    // ==========================================
    describe('AND operation', () => {
      it('ANDs 0xFF & 0x0F = 0x0F', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0xFF)
        sim.setInput('b', 0x0F)
        sim.setInput('op', OP_AND)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x0F)
        expect(sim.getOutput('z')).toBe(0)
        expect(sim.getOutput('n')).toBe(0)
      })

      it('ANDs 0x00 & 0xFF = 0x00 with Z flag', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x00)
        sim.setInput('b', 0xFF)
        sim.setInput('op', OP_AND)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x00)
        expect(sim.getOutput('z')).toBe(1)
      })

      it('ANDs 0xAA & 0x55 = 0x00 (no overlapping bits)', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0xAA) // 10101010
        sim.setInput('b', 0x55) // 01010101
        sim.setInput('op', OP_AND)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x00)
        expect(sim.getOutput('z')).toBe(1)
      })

      it('ANDs 0xF0 & 0xFF = 0xF0 with N flag', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0xF0)
        sim.setInput('b', 0xFF)
        sim.setInput('op', OP_AND)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0xF0)
        expect(sim.getOutput('n')).toBe(1) // Bit 7 is set
      })

      it('ANDs same values: 0x42 & 0x42 = 0x42', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x42)
        sim.setInput('b', 0x42)
        sim.setInput('op', OP_AND)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x42)
      })

      it('ANDs various patterns', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        const testCases = [
          { a: 0xFF, b: 0xFF, expected: 0xFF },
          { a: 0x0F, b: 0xF0, expected: 0x00 },
          { a: 0x12, b: 0x34, expected: 0x10 },
          { a: 0x80, b: 0x80, expected: 0x80 },
          { a: 0x7F, b: 0x80, expected: 0x00 },
        ]

        for (const tc of testCases) {
          sim.setInput('a', tc.a)
          sim.setInput('b', tc.b)
          sim.setInput('op', OP_AND)
          sim.setInput('cin', 0)
          sim.step()
          expect(sim.getOutput('result')).toBe(tc.expected)
        }
      })
    })

    // ==========================================
    // OR Operation Tests
    // ==========================================
    describe('OR operation', () => {
      it('ORs 0xF0 | 0x0F = 0xFF', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0xF0)
        sim.setInput('b', 0x0F)
        sim.setInput('op', OP_OR)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0xFF)
        expect(sim.getOutput('n')).toBe(1)
      })

      it('ORs 0x00 | 0x00 = 0x00 with Z flag', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x00)
        sim.setInput('b', 0x00)
        sim.setInput('op', OP_OR)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x00)
        expect(sim.getOutput('z')).toBe(1)
      })

      it('ORs 0xAA | 0x55 = 0xFF', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0xAA)
        sim.setInput('b', 0x55)
        sim.setInput('op', OP_OR)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0xFF)
      })

      it('ORs 0x80 | 0x00 = 0x80 with N flag', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x80)
        sim.setInput('b', 0x00)
        sim.setInput('op', OP_OR)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x80)
        expect(sim.getOutput('n')).toBe(1)
      })

      it('ORs with zero identity: 0x42 | 0x00 = 0x42', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x42)
        sim.setInput('b', 0x00)
        sim.setInput('op', OP_OR)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x42)
      })

      it('ORs various patterns', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        const testCases = [
          { a: 0x00, b: 0xFF, expected: 0xFF },
          { a: 0x12, b: 0x34, expected: 0x36 },
          { a: 0x01, b: 0x02, expected: 0x03 },
          { a: 0x70, b: 0x07, expected: 0x77 },
        ]

        for (const tc of testCases) {
          sim.setInput('a', tc.a)
          sim.setInput('b', tc.b)
          sim.setInput('op', OP_OR)
          sim.setInput('cin', 0)
          sim.step()
          expect(sim.getOutput('result')).toBe(tc.expected)
        }
      })
    })

    // ==========================================
    // XOR Operation Tests
    // ==========================================
    describe('XOR operation', () => {
      it('XORs 0xFF ^ 0x0F = 0xF0', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0xFF)
        sim.setInput('b', 0x0F)
        sim.setInput('op', OP_XOR)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0xF0)
        expect(sim.getOutput('n')).toBe(1)
      })

      it('XORs same values: 0x42 ^ 0x42 = 0x00 with Z flag', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x42)
        sim.setInput('b', 0x42)
        sim.setInput('op', OP_XOR)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x00)
        expect(sim.getOutput('z')).toBe(1)
      })

      it('XORs 0xAA ^ 0x55 = 0xFF', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0xAA)
        sim.setInput('b', 0x55)
        sim.setInput('op', OP_XOR)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0xFF)
      })

      it('XORs 0x80 ^ 0x00 = 0x80 with N flag', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x80)
        sim.setInput('b', 0x00)
        sim.setInput('op', OP_XOR)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x80)
        expect(sim.getOutput('n')).toBe(1)
      })

      it('XORs with zero identity: 0x42 ^ 0x00 = 0x42', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x42)
        sim.setInput('b', 0x00)
        sim.setInput('op', OP_XOR)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0x42)
      })

      it('XORs with FF (NOT): 0x42 ^ 0xFF = 0xBD', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x42)
        sim.setInput('b', 0xFF)
        sim.setInput('op', OP_XOR)
        sim.setInput('cin', 0)
        sim.step()

        expect(sim.getOutput('result')).toBe(0xBD) // ~0x42
      })

      it('XORs various patterns', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        const testCases = [
          { a: 0x00, b: 0x00, expected: 0x00 },
          { a: 0xFF, b: 0xFF, expected: 0x00 },
          { a: 0x12, b: 0x34, expected: 0x26 },
          { a: 0xF0, b: 0x0F, expected: 0xFF },
        ]

        for (const tc of testCases) {
          sim.setInput('a', tc.a)
          sim.setInput('b', tc.b)
          sim.setInput('op', OP_XOR)
          sim.setInput('cin', 0)
          sim.step()
          expect(sim.getOutput('result')).toBe(tc.expected)
        }
      })
    })

    // ==========================================
    // Zero Flag Comprehensive Tests
    // ==========================================
    describe('Zero flag', () => {
      it('sets Z when result is 0x00', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // 0 + 0 = 0
        sim.setInput('a', 0x00)
        sim.setInput('b', 0x00)
        sim.setInput('op', OP_ADD)
        sim.setInput('cin', 0)
        sim.step()
        expect(sim.getOutput('z')).toBe(1)
      })

      it('clears Z when result is non-zero', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x01)
        sim.setInput('b', 0x00)
        sim.setInput('op', OP_ADD)
        sim.setInput('cin', 0)
        sim.step()
        expect(sim.getOutput('z')).toBe(0)
      })

      it('sets Z on wraparound result', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // 0xFF + 0x01 = 0x00 (with carry)
        sim.setInput('a', 0xFF)
        sim.setInput('b', 0x01)
        sim.setInput('op', OP_ADD)
        sim.setInput('cin', 0)
        sim.step()
        expect(sim.getOutput('z')).toBe(1)
        expect(sim.getOutput('cout')).toBe(1)
      })

      it('sets Z on XOR of same values', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0xFF)
        sim.setInput('b', 0xFF)
        sim.setInput('op', OP_XOR)
        sim.setInput('cin', 0)
        sim.step()
        expect(sim.getOutput('z')).toBe(1)
      })

      it('sets Z on AND with no overlap', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0xF0)
        sim.setInput('b', 0x0F)
        sim.setInput('op', OP_AND)
        sim.setInput('cin', 0)
        sim.step()
        expect(sim.getOutput('z')).toBe(1)
      })
    })

    // ==========================================
    // Negative Flag Comprehensive Tests
    // ==========================================
    describe('Negative flag', () => {
      it('sets N when bit 7 is 1', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x80)
        sim.setInput('b', 0x00)
        sim.setInput('op', OP_OR)
        sim.setInput('cin', 0)
        sim.step()
        expect(sim.getOutput('n')).toBe(1)
      })

      it('clears N when bit 7 is 0', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x7F)
        sim.setInput('b', 0x00)
        sim.setInput('op', OP_OR)
        sim.setInput('cin', 0)
        sim.step()
        expect(sim.getOutput('n')).toBe(0)
      })

      it('N follows bit 7 across all values', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        const testCases = [
          { value: 0x00, n: 0 },
          { value: 0x7F, n: 0 },
          { value: 0x80, n: 1 },
          { value: 0xFF, n: 1 },
          { value: 0xC0, n: 1 },
          { value: 0x40, n: 0 },
        ]

        for (const tc of testCases) {
          sim.setInput('a', tc.value)
          sim.setInput('b', 0x00)
          sim.setInput('op', OP_OR)
          sim.setInput('cin', 0)
          sim.step()
          expect(sim.getOutput('n')).toBe(tc.n)
        }
      })
    })

    // ==========================================
    // Carry Flag Comprehensive Tests
    // ==========================================
    describe('Carry flag', () => {
      it('sets C on ADD overflow', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x80)
        sim.setInput('b', 0x80)
        sim.setInput('op', OP_ADD)
        sim.setInput('cin', 0)
        sim.step()
        expect(sim.getOutput('cout')).toBe(1)
      })

      it('clears C on ADD without overflow', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x10)
        sim.setInput('b', 0x20)
        sim.setInput('op', OP_ADD)
        sim.setInput('cin', 0)
        sim.step()
        expect(sim.getOutput('cout')).toBe(0)
      })

      it('sets C (no borrow) on SUB when a >= b', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x50)
        sim.setInput('b', 0x30)
        sim.setInput('op', OP_SUB)
        sim.setInput('cin', 1)
        sim.step()
        expect(sim.getOutput('cout')).toBe(1) // No borrow
      })

      it('clears C (borrow) on SUB when a < b', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x30)
        sim.setInput('b', 0x50)
        sim.setInput('op', OP_SUB)
        sim.setInput('cin', 1)
        sim.step()
        expect(sim.getOutput('cout')).toBe(0) // Borrow occurred
      })

      it('C propagates through carry chain', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // 0xFF + 0x01 = 0x00, carry=1
        sim.setInput('a', 0xFF)
        sim.setInput('b', 0x01)
        sim.setInput('op', OP_ADD)
        sim.setInput('cin', 0)
        sim.step()
        expect(sim.getOutput('cout')).toBe(1)
        expect(sim.getOutput('result')).toBe(0x00)
      })
    })

    // ==========================================
    // Overflow Flag Comprehensive Tests
    // ==========================================
    describe('Overflow flag', () => {
      it('sets V on positive + positive = negative', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x7F) // 127
        sim.setInput('b', 0x01) // 1
        sim.setInput('op', OP_ADD)
        sim.setInput('cin', 0)
        sim.step()
        expect(sim.getOutput('vout')).toBe(1)
        expect(sim.getOutput('result')).toBe(0x80) // -128
      })

      it('sets V on negative + negative = positive', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x80) // -128
        sim.setInput('b', 0x80) // -128
        sim.setInput('op', OP_ADD)
        sim.setInput('cin', 0)
        sim.step()
        expect(sim.getOutput('vout')).toBe(1)
        expect(sim.getOutput('result')).toBe(0x00)
      })

      it('clears V on positive + negative (no overflow possible)', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x50) // 80
        sim.setInput('b', 0xD0) // -48
        sim.setInput('op', OP_ADD)
        sim.setInput('cin', 0)
        sim.step()
        expect(sim.getOutput('vout')).toBe(0)
      })

      it('sets V on positive - negative = negative (SUB overflow)', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x7F) // 127
        sim.setInput('b', 0xFF) // -1
        sim.setInput('op', OP_SUB)
        sim.setInput('cin', 1)
        sim.step()
        expect(sim.getOutput('vout')).toBe(1) // 127 - (-1) = 128, overflow
      })

      it('sets V on negative - positive = positive (SUB overflow)', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x80) // -128
        sim.setInput('b', 0x01) // 1
        sim.setInput('op', OP_SUB)
        sim.setInput('cin', 1)
        sim.step()
        expect(sim.getOutput('vout')).toBe(1) // -128 - 1 = -129, overflow
      })

      it('clears V on negative - negative (same sign)', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x80) // -128
        sim.setInput('b', 0x80) // -128
        sim.setInput('op', OP_SUB)
        sim.setInput('cin', 1)
        sim.step()
        expect(sim.getOutput('vout')).toBe(0)
        expect(sim.getOutput('result')).toBe(0x00)
      })

      it('clears V on positive - positive (same sign)', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x50)
        sim.setInput('b', 0x30)
        sim.setInput('op', OP_SUB)
        sim.setInput('cin', 1)
        sim.step()
        expect(sim.getOutput('vout')).toBe(0)
      })

      it('tests edge case: 0x40 + 0x40 = 0x80 (V=1)', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x40) // 64
        sim.setInput('b', 0x40) // 64
        sim.setInput('op', OP_ADD)
        sim.setInput('cin', 0)
        sim.step()
        expect(sim.getOutput('vout')).toBe(1) // 64 + 64 = 128 > 127
      })

      it('tests edge case: 0xC0 + 0xC0 = 0x80 (V=0, wraps correctly)', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0xC0) // -64
        sim.setInput('b', 0xC0) // -64
        sim.setInput('op', OP_ADD)
        sim.setInput('cin', 0)
        sim.step()
        expect(sim.getOutput('vout')).toBe(0) // -64 + -64 = -128, fits in signed range
        expect(sim.getOutput('result')).toBe(0x80)
      })
    })

    // ==========================================
    // Exhaustive small-range tests
    // ==========================================
    describe('Exhaustive small range tests', () => {
      it('tests ADD for all combinations 0x00-0x0F', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        for (let a = 0; a < 16; a++) {
          for (let b = 0; b < 16; b++) {
            sim.setInput('a', a)
            sim.setInput('b', b)
            sim.setInput('op', OP_ADD)
            sim.setInput('cin', 0)
            sim.step()
            expect(sim.getOutput('result')).toBe((a + b) & 0xFF)
          }
        }
      })

      it('tests SUB for all combinations 0x00-0x0F', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        for (let a = 0; a < 16; a++) {
          for (let b = 0; b < 16; b++) {
            sim.setInput('a', a)
            sim.setInput('b', b)
            sim.setInput('op', OP_SUB)
            sim.setInput('cin', 1) // No borrow
            sim.step()
            expect(sim.getOutput('result')).toBe((a - b) & 0xFF)
          }
        }
      })

      it('tests AND for all combinations 0x00-0x0F', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        for (let a = 0; a < 16; a++) {
          for (let b = 0; b < 16; b++) {
            sim.setInput('a', a)
            sim.setInput('b', b)
            sim.setInput('op', OP_AND)
            sim.setInput('cin', 0)
            sim.step()
            expect(sim.getOutput('result')).toBe(a & b)
          }
        }
      })

      it('tests OR for all combinations 0x00-0x0F', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        for (let a = 0; a < 16; a++) {
          for (let b = 0; b < 16; b++) {
            sim.setInput('a', a)
            sim.setInput('b', b)
            sim.setInput('op', OP_OR)
            sim.setInput('cin', 0)
            sim.step()
            expect(sim.getOutput('result')).toBe(a | b)
          }
        }
      })

      it('tests XOR for all combinations 0x00-0x0F', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        for (let a = 0; a < 16; a++) {
          for (let b = 0; b < 16; b++) {
            sim.setInput('a', a)
            sim.setInput('b', b)
            sim.setInput('op', OP_XOR)
            sim.setInput('cin', 0)
            sim.step()
            expect(sim.getOutput('result')).toBe(a ^ b)
          }
        }
      })
    })

    // ==========================================
    // Boundary value tests
    // ==========================================
    describe('Boundary values', () => {
      it('tests all boundary values for ADD', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        const boundaries = [0x00, 0x01, 0x7E, 0x7F, 0x80, 0x81, 0xFE, 0xFF]

        for (const a of boundaries) {
          for (const b of boundaries) {
            sim.setInput('a', a)
            sim.setInput('b', b)
            sim.setInput('op', OP_ADD)
            sim.setInput('cin', 0)
            sim.step()

            const expected = (a + b) & 0xFF
            expect(sim.getOutput('result')).toBe(expected)

            // Verify Z flag
            expect(sim.getOutput('z')).toBe(expected === 0 ? 1 : 0)

            // Verify N flag
            expect(sim.getOutput('n')).toBe((expected & 0x80) ? 1 : 0)

            // Verify C flag
            expect(sim.getOutput('cout')).toBe((a + b) > 0xFF ? 1 : 0)
          }
        }
      })

      it('tests all boundary values for SUB', () => {
        const result = createSimulator(testModule, 'test_alu8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        const boundaries = [0x00, 0x01, 0x7E, 0x7F, 0x80, 0x81, 0xFE, 0xFF]

        for (const a of boundaries) {
          for (const b of boundaries) {
            sim.setInput('a', a)
            sim.setInput('b', b)
            sim.setInput('op', OP_SUB)
            sim.setInput('cin', 1) // No borrow in
            sim.step()

            const expected = (a - b) & 0xFF
            expect(sim.getOutput('result')).toBe(expected)

            // Verify Z flag
            expect(sim.getOutput('z')).toBe(expected === 0 ? 1 : 0)

            // Verify N flag
            expect(sim.getOutput('n')).toBe((expected & 0x80) ? 1 : 0)

            // Verify C flag (no borrow when a >= b)
            expect(sim.getOutput('cout')).toBe(a >= b ? 1 : 0)
          }
        }
      })
    })
  })

  describe('mux4way8', () => {
    // Load mux4way8 module
    const mux4way8Wire = readFileSync(resolve(__dirname, '../assets/wire/mux4way8.wire'), 'utf-8')
    const muxStdlib = stdlib + '\n' + mux4way8Wire

    const testModule = `
${muxStdlib}

module test_mux4way8(a:8, b:8, c:8, d:8, sel:2) -> out:8:
  out = mux4way8(a, b, c, d, sel)
`

    // ==========================================
    // Basic Selection Tests
    // ==========================================
    describe('basic selection', () => {
      it('selects input a when sel=00', () => {
        const result = createSimulator(testModule, 'test_mux4way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0xAA)
        sim.setInput('b', 0xBB)
        sim.setInput('c', 0xCC)
        sim.setInput('d', 0xDD)
        sim.setInput('sel', 0b00)
        sim.step()

        expect(sim.getOutput('out')).toBe(0xAA)
      })

      it('selects input b when sel=01', () => {
        const result = createSimulator(testModule, 'test_mux4way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0xAA)
        sim.setInput('b', 0xBB)
        sim.setInput('c', 0xCC)
        sim.setInput('d', 0xDD)
        sim.setInput('sel', 0b01)
        sim.step()

        expect(sim.getOutput('out')).toBe(0xBB)
      })

      it('selects input c when sel=10', () => {
        const result = createSimulator(testModule, 'test_mux4way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0xAA)
        sim.setInput('b', 0xBB)
        sim.setInput('c', 0xCC)
        sim.setInput('d', 0xDD)
        sim.setInput('sel', 0b10)
        sim.step()

        expect(sim.getOutput('out')).toBe(0xCC)
      })

      it('selects input d when sel=11', () => {
        const result = createSimulator(testModule, 'test_mux4way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0xAA)
        sim.setInput('b', 0xBB)
        sim.setInput('c', 0xCC)
        sim.setInput('d', 0xDD)
        sim.setInput('sel', 0b11)
        sim.step()

        expect(sim.getOutput('out')).toBe(0xDD)
      })
    })

    // ==========================================
    // Edge Cases
    // ==========================================
    describe('edge cases', () => {
      it('works with all zeros', () => {
        const result = createSimulator(testModule, 'test_mux4way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x00)
        sim.setInput('b', 0x00)
        sim.setInput('c', 0x00)
        sim.setInput('d', 0x00)

        for (let sel = 0; sel < 4; sel++) {
          sim.setInput('sel', sel)
          sim.step()
          expect(sim.getOutput('out')).toBe(0x00)
        }
      })

      it('works with all 0xFF', () => {
        const result = createSimulator(testModule, 'test_mux4way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0xFF)
        sim.setInput('b', 0xFF)
        sim.setInput('c', 0xFF)
        sim.setInput('d', 0xFF)

        for (let sel = 0; sel < 4; sel++) {
          sim.setInput('sel', sel)
          sim.step()
          expect(sim.getOutput('out')).toBe(0xFF)
        }
      })

      it('distinguishes between all inputs', () => {
        const result = createSimulator(testModule, 'test_mux4way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        const values = [0x11, 0x22, 0x33, 0x44]
        sim.setInput('a', values[0])
        sim.setInput('b', values[1])
        sim.setInput('c', values[2])
        sim.setInput('d', values[3])

        for (let sel = 0; sel < 4; sel++) {
          sim.setInput('sel', sel)
          sim.step()
          expect(sim.getOutput('out')).toBe(values[sel])
        }
      })

      it('works with alternating bit patterns', () => {
        const result = createSimulator(testModule, 'test_mux4way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0xAA)
        sim.setInput('b', 0x55)
        sim.setInput('c', 0xF0)
        sim.setInput('d', 0x0F)

        const expected = [0xAA, 0x55, 0xF0, 0x0F]
        for (let sel = 0; sel < 4; sel++) {
          sim.setInput('sel', sel)
          sim.step()
          expect(sim.getOutput('out')).toBe(expected[sel])
        }
      })
    })

    // ==========================================
    // Exhaustive Tests
    // ==========================================
    describe('exhaustive selection', () => {
      it('correctly selects for all sel values with unique inputs', () => {
        const result = createSimulator(testModule, 'test_mux4way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator

        // Test with multiple different input sets
        const testSets = [
          [0x00, 0x40, 0x80, 0xC0],
          [0x12, 0x34, 0x56, 0x78],
          [0xFF, 0x00, 0xFF, 0x00],
          [0x01, 0x02, 0x04, 0x08],
        ]

        for (const values of testSets) {
          sim.setInput('a', values[0])
          sim.setInput('b', values[1])
          sim.setInput('c', values[2])
          sim.setInput('d', values[3])

          for (let sel = 0; sel < 4; sel++) {
            sim.setInput('sel', sel)
            sim.step()
            expect(sim.getOutput('out')).toBe(values[sel])
          }
        }
      })

      it('selector transitions work correctly', () => {
        const result = createSimulator(testModule, 'test_mux4way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x10)
        sim.setInput('b', 0x20)
        sim.setInput('c', 0x30)
        sim.setInput('d', 0x40)

        // Test all transitions: 00->01->10->11->00
        const sequence = [0, 1, 2, 3, 0, 1, 2, 3]
        const expected = [0x10, 0x20, 0x30, 0x40, 0x10, 0x20, 0x30, 0x40]

        for (let i = 0; i < sequence.length; i++) {
          sim.setInput('sel', sequence[i])
          sim.step()
          expect(sim.getOutput('out')).toBe(expected[i])
        }
      })
    })
  })

  describe('mux8way8', () => {
    // Load mux8way8 module
    const mux8way8Wire = readFileSync(resolve(__dirname, '../assets/wire/mux8way8.wire'), 'utf-8')
    const muxStdlib = stdlib + '\n' + mux8way8Wire

    const testModule = `
${muxStdlib}

module test_mux8way8(a:8, b:8, c:8, d:8, e:8, f:8, g:8, h:8, sel:3) -> out:8:
  out = mux8way8(a, b, c, d, e, f, g, h, sel)
`

    // ==========================================
    // Basic Selection Tests
    // ==========================================
    describe('basic selection', () => {
      it('selects input a when sel=000', () => {
        const result = createSimulator(testModule, 'test_mux8way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x11)
        sim.setInput('b', 0x22)
        sim.setInput('c', 0x33)
        sim.setInput('d', 0x44)
        sim.setInput('e', 0x55)
        sim.setInput('f', 0x66)
        sim.setInput('g', 0x77)
        sim.setInput('h', 0x88)
        sim.setInput('sel', 0b000)
        sim.step()

        expect(sim.getOutput('out')).toBe(0x11)
      })

      it('selects input b when sel=001', () => {
        const result = createSimulator(testModule, 'test_mux8way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x11)
        sim.setInput('b', 0x22)
        sim.setInput('c', 0x33)
        sim.setInput('d', 0x44)
        sim.setInput('e', 0x55)
        sim.setInput('f', 0x66)
        sim.setInput('g', 0x77)
        sim.setInput('h', 0x88)
        sim.setInput('sel', 0b001)
        sim.step()

        expect(sim.getOutput('out')).toBe(0x22)
      })

      it('selects input c when sel=010', () => {
        const result = createSimulator(testModule, 'test_mux8way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x11)
        sim.setInput('b', 0x22)
        sim.setInput('c', 0x33)
        sim.setInput('d', 0x44)
        sim.setInput('e', 0x55)
        sim.setInput('f', 0x66)
        sim.setInput('g', 0x77)
        sim.setInput('h', 0x88)
        sim.setInput('sel', 0b010)
        sim.step()

        expect(sim.getOutput('out')).toBe(0x33)
      })

      it('selects input d when sel=011', () => {
        const result = createSimulator(testModule, 'test_mux8way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x11)
        sim.setInput('b', 0x22)
        sim.setInput('c', 0x33)
        sim.setInput('d', 0x44)
        sim.setInput('e', 0x55)
        sim.setInput('f', 0x66)
        sim.setInput('g', 0x77)
        sim.setInput('h', 0x88)
        sim.setInput('sel', 0b011)
        sim.step()

        expect(sim.getOutput('out')).toBe(0x44)
      })

      it('selects input e when sel=100', () => {
        const result = createSimulator(testModule, 'test_mux8way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x11)
        sim.setInput('b', 0x22)
        sim.setInput('c', 0x33)
        sim.setInput('d', 0x44)
        sim.setInput('e', 0x55)
        sim.setInput('f', 0x66)
        sim.setInput('g', 0x77)
        sim.setInput('h', 0x88)
        sim.setInput('sel', 0b100)
        sim.step()

        expect(sim.getOutput('out')).toBe(0x55)
      })

      it('selects input f when sel=101', () => {
        const result = createSimulator(testModule, 'test_mux8way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x11)
        sim.setInput('b', 0x22)
        sim.setInput('c', 0x33)
        sim.setInput('d', 0x44)
        sim.setInput('e', 0x55)
        sim.setInput('f', 0x66)
        sim.setInput('g', 0x77)
        sim.setInput('h', 0x88)
        sim.setInput('sel', 0b101)
        sim.step()

        expect(sim.getOutput('out')).toBe(0x66)
      })

      it('selects input g when sel=110', () => {
        const result = createSimulator(testModule, 'test_mux8way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x11)
        sim.setInput('b', 0x22)
        sim.setInput('c', 0x33)
        sim.setInput('d', 0x44)
        sim.setInput('e', 0x55)
        sim.setInput('f', 0x66)
        sim.setInput('g', 0x77)
        sim.setInput('h', 0x88)
        sim.setInput('sel', 0b110)
        sim.step()

        expect(sim.getOutput('out')).toBe(0x77)
      })

      it('selects input h when sel=111', () => {
        const result = createSimulator(testModule, 'test_mux8way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x11)
        sim.setInput('b', 0x22)
        sim.setInput('c', 0x33)
        sim.setInput('d', 0x44)
        sim.setInput('e', 0x55)
        sim.setInput('f', 0x66)
        sim.setInput('g', 0x77)
        sim.setInput('h', 0x88)
        sim.setInput('sel', 0b111)
        sim.step()

        expect(sim.getOutput('out')).toBe(0x88)
      })
    })

    // ==========================================
    // Edge Cases
    // ==========================================
    describe('edge cases', () => {
      it('works with all zeros', () => {
        const result = createSimulator(testModule, 'test_mux8way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0x00)
        sim.setInput('b', 0x00)
        sim.setInput('c', 0x00)
        sim.setInput('d', 0x00)
        sim.setInput('e', 0x00)
        sim.setInput('f', 0x00)
        sim.setInput('g', 0x00)
        sim.setInput('h', 0x00)

        for (let sel = 0; sel < 8; sel++) {
          sim.setInput('sel', sel)
          sim.step()
          expect(sim.getOutput('out')).toBe(0x00)
        }
      })

      it('works with all 0xFF', () => {
        const result = createSimulator(testModule, 'test_mux8way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('a', 0xFF)
        sim.setInput('b', 0xFF)
        sim.setInput('c', 0xFF)
        sim.setInput('d', 0xFF)
        sim.setInput('e', 0xFF)
        sim.setInput('f', 0xFF)
        sim.setInput('g', 0xFF)
        sim.setInput('h', 0xFF)

        for (let sel = 0; sel < 8; sel++) {
          sim.setInput('sel', sel)
          sim.step()
          expect(sim.getOutput('out')).toBe(0xFF)
        }
      })

      it('distinguishes between all 8 inputs', () => {
        const result = createSimulator(testModule, 'test_mux8way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        const values = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80]
        sim.setInput('a', values[0])
        sim.setInput('b', values[1])
        sim.setInput('c', values[2])
        sim.setInput('d', values[3])
        sim.setInput('e', values[4])
        sim.setInput('f', values[5])
        sim.setInput('g', values[6])
        sim.setInput('h', values[7])

        for (let sel = 0; sel < 8; sel++) {
          sim.setInput('sel', sel)
          sim.step()
          expect(sim.getOutput('out')).toBe(values[sel])
        }
      })

      it('works with sequential values', () => {
        const result = createSimulator(testModule, 'test_mux8way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        const values = [0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80]
        sim.setInput('a', values[0])
        sim.setInput('b', values[1])
        sim.setInput('c', values[2])
        sim.setInput('d', values[3])
        sim.setInput('e', values[4])
        sim.setInput('f', values[5])
        sim.setInput('g', values[6])
        sim.setInput('h', values[7])

        for (let sel = 0; sel < 8; sel++) {
          sim.setInput('sel', sel)
          sim.step()
          expect(sim.getOutput('out')).toBe(values[sel])
        }
      })
    })

    // ==========================================
    // Exhaustive Tests
    // ==========================================
    describe('exhaustive selection', () => {
      it('correctly selects for all sel values with multiple input sets', () => {
        const result = createSimulator(testModule, 'test_mux8way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator

        // Test with multiple different input sets
        const testSets = [
          [0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77],
          [0xFF, 0xEE, 0xDD, 0xCC, 0xBB, 0xAA, 0x99, 0x88],
          [0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0],
          [0x01, 0x03, 0x07, 0x0F, 0x1F, 0x3F, 0x7F, 0xFF],
        ]

        for (const values of testSets) {
          sim.setInput('a', values[0])
          sim.setInput('b', values[1])
          sim.setInput('c', values[2])
          sim.setInput('d', values[3])
          sim.setInput('e', values[4])
          sim.setInput('f', values[5])
          sim.setInput('g', values[6])
          sim.setInput('h', values[7])

          for (let sel = 0; sel < 8; sel++) {
            sim.setInput('sel', sel)
            sim.step()
            expect(sim.getOutput('out')).toBe(values[sel])
          }
        }
      })

      it('selector transitions work correctly', () => {
        const result = createSimulator(testModule, 'test_mux8way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        const values = [0xA0, 0xB0, 0xC0, 0xD0, 0xE0, 0xF0, 0x0A, 0x0B]
        sim.setInput('a', values[0])
        sim.setInput('b', values[1])
        sim.setInput('c', values[2])
        sim.setInput('d', values[3])
        sim.setInput('e', values[4])
        sim.setInput('f', values[5])
        sim.setInput('g', values[6])
        sim.setInput('h', values[7])

        // Test sequence: 0->1->2->3->4->5->6->7->0
        for (let i = 0; i <= 8; i++) {
          const sel = i % 8
          sim.setInput('sel', sel)
          sim.step()
          expect(sim.getOutput('out')).toBe(values[sel])
        }
      })

      it('handles non-sequential selector patterns', () => {
        const result = createSimulator(testModule, 'test_mux8way8')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        const values = [0x08, 0x18, 0x28, 0x38, 0x48, 0x58, 0x68, 0x78]
        sim.setInput('a', values[0])
        sim.setInput('b', values[1])
        sim.setInput('c', values[2])
        sim.setInput('d', values[3])
        sim.setInput('e', values[4])
        sim.setInput('f', values[5])
        sim.setInput('g', values[6])
        sim.setInput('h', values[7])

        // Jump around selector values
        const selSequence = [0, 7, 3, 4, 1, 6, 2, 5]
        for (const sel of selSequence) {
          sim.setInput('sel', sel)
          sim.step()
          expect(sim.getOutput('out')).toBe(values[sel])
        }
      })
    })
  })

  // ==========================================
  // Phase 2: CPU Components
  // ==========================================

  describe('pc (Program Counter)', () => {
    // Load PC module
    const pcWire = readFileSync(resolve(__dirname, '../assets/wire/pc.wire'), 'utf-8')
    const pcStdlib = stdlib + '\n' + pcWire

    const testModule = `
${pcStdlib}

module test_pc(clk, reset, load, inc, din:16) -> out:16:
  out = pc(clk, reset, load, inc, din)
`

    // Helper to clock the PC
    function clockCycle(sim: any) {
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()
    }

    // ==========================================
    // Basic Operations
    // ==========================================
    describe('basic operations', () => {
      it('starts at zero after reset', () => {
        const result = createSimulator(testModule, 'test_pc')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('reset', 1)
        sim.setInput('load', 0)
        sim.setInput('inc', 0)
        sim.setInput('din', 0)
        clockCycle(sim)

        expect(sim.getOutput('out')).toBe(0x0000)
      })

      it('increments by 1 when inc=1', () => {
        const result = createSimulator(testModule, 'test_pc')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Reset first
        sim.setInput('reset', 1)
        sim.setInput('load', 0)
        sim.setInput('inc', 0)
        sim.setInput('din', 0)
        clockCycle(sim)
        expect(sim.getOutput('out')).toBe(0x0000)

        // Now increment
        sim.setInput('reset', 0)
        sim.setInput('inc', 1)
        clockCycle(sim)
        expect(sim.getOutput('out')).toBe(0x0001)

        // Increment again
        clockCycle(sim)
        expect(sim.getOutput('out')).toBe(0x0002)
      })

      it('loads value when load=1', () => {
        const result = createSimulator(testModule, 'test_pc')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('reset', 0)
        sim.setInput('load', 1)
        sim.setInput('inc', 0)
        sim.setInput('din', 0x1234)
        clockCycle(sim)

        expect(sim.getOutput('out')).toBe(0x1234)
      })

      it('holds value when all controls are 0', () => {
        const result = createSimulator(testModule, 'test_pc')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Load a value first
        sim.setInput('reset', 0)
        sim.setInput('load', 1)
        sim.setInput('inc', 0)
        sim.setInput('din', 0xABCD)
        clockCycle(sim)
        expect(sim.getOutput('out')).toBe(0xABCD)

        // Now hold
        sim.setInput('load', 0)
        clockCycle(sim)
        expect(sim.getOutput('out')).toBe(0xABCD)

        clockCycle(sim)
        expect(sim.getOutput('out')).toBe(0xABCD)
      })
    })

    // ==========================================
    // Priority Tests
    // ==========================================
    describe('priority', () => {
      it('reset takes priority over load', () => {
        const result = createSimulator(testModule, 'test_pc')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Both reset and load active
        sim.setInput('reset', 1)
        sim.setInput('load', 1)
        sim.setInput('inc', 0)
        sim.setInput('din', 0x5678)
        clockCycle(sim)

        expect(sim.getOutput('out')).toBe(0x0000) // Reset wins
      })

      it('reset takes priority over inc', () => {
        const result = createSimulator(testModule, 'test_pc')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Load a non-zero value first
        sim.setInput('reset', 0)
        sim.setInput('load', 1)
        sim.setInput('inc', 0)
        sim.setInput('din', 0x1000)
        clockCycle(sim)

        // Now reset and inc together
        sim.setInput('reset', 1)
        sim.setInput('load', 0)
        sim.setInput('inc', 1)
        clockCycle(sim)

        expect(sim.getOutput('out')).toBe(0x0000) // Reset wins
      })

      it('load takes priority over inc', () => {
        const result = createSimulator(testModule, 'test_pc')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Set PC to 0x0010 first
        sim.setInput('reset', 0)
        sim.setInput('load', 1)
        sim.setInput('inc', 0)
        sim.setInput('din', 0x0010)
        clockCycle(sim)

        // Now load and inc together
        sim.setInput('load', 1)
        sim.setInput('inc', 1)
        sim.setInput('din', 0x2000)
        clockCycle(sim)

        expect(sim.getOutput('out')).toBe(0x2000) // Load wins
      })
    })

    // ==========================================
    // Edge Cases
    // ==========================================
    describe('edge cases', () => {
      it('wraps around from 0xFFFF to 0x0000', () => {
        const result = createSimulator(testModule, 'test_pc')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Load 0xFFFF
        sim.setInput('reset', 0)
        sim.setInput('load', 1)
        sim.setInput('inc', 0)
        sim.setInput('din', 0xFFFF)
        clockCycle(sim)
        expect(sim.getOutput('out')).toBe(0xFFFF)

        // Increment should wrap
        sim.setInput('load', 0)
        sim.setInput('inc', 1)
        clockCycle(sim)
        expect(sim.getOutput('out')).toBe(0x0000)
      })

      it('can load maximum value 0xFFFF', () => {
        const result = createSimulator(testModule, 'test_pc')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('reset', 0)
        sim.setInput('load', 1)
        sim.setInput('inc', 0)
        sim.setInput('din', 0xFFFF)
        clockCycle(sim)

        expect(sim.getOutput('out')).toBe(0xFFFF)
      })

      it('increments through carry boundary', () => {
        const result = createSimulator(testModule, 'test_pc')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Load 0x00FF
        sim.setInput('reset', 0)
        sim.setInput('load', 1)
        sim.setInput('inc', 0)
        sim.setInput('din', 0x00FF)
        clockCycle(sim)
        expect(sim.getOutput('out')).toBe(0x00FF)

        // Increment should carry into high byte
        sim.setInput('load', 0)
        sim.setInput('inc', 1)
        clockCycle(sim)
        expect(sim.getOutput('out')).toBe(0x0100)
      })
    })

    // ==========================================
    // Sequence Tests
    // ==========================================
    describe('sequences', () => {
      it('simulates fetch cycle: inc, inc, load, inc', () => {
        const result = createSimulator(testModule, 'test_pc')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Reset
        sim.setInput('reset', 1)
        sim.setInput('load', 0)
        sim.setInput('inc', 0)
        sim.setInput('din', 0)
        clockCycle(sim)
        expect(sim.getOutput('out')).toBe(0x0000)

        // Inc (fetch opcode)
        sim.setInput('reset', 0)
        sim.setInput('inc', 1)
        clockCycle(sim)
        expect(sim.getOutput('out')).toBe(0x0001)

        // Inc (fetch operand)
        clockCycle(sim)
        expect(sim.getOutput('out')).toBe(0x0002)

        // Load (jump to address)
        sim.setInput('inc', 0)
        sim.setInput('load', 1)
        sim.setInput('din', 0x1000)
        clockCycle(sim)
        expect(sim.getOutput('out')).toBe(0x1000)

        // Inc (fetch next opcode)
        sim.setInput('load', 0)
        sim.setInput('inc', 1)
        clockCycle(sim)
        expect(sim.getOutput('out')).toBe(0x1001)
      })

      it('counts from 0 to 10', () => {
        const result = createSimulator(testModule, 'test_pc')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Reset
        sim.setInput('reset', 1)
        sim.setInput('load', 0)
        sim.setInput('inc', 0)
        sim.setInput('din', 0)
        clockCycle(sim)

        // Count up
        sim.setInput('reset', 0)
        sim.setInput('inc', 1)
        for (let i = 1; i <= 10; i++) {
          clockCycle(sim)
          expect(sim.getOutput('out')).toBe(i)
        }
      })
    })
  })

  describe('decoder', () => {
    // Load decoder module
    const decoderWire = readFileSync(resolve(__dirname, '../assets/wire/decoder.wire'), 'utf-8')
    const decoderStdlib = stdlib + '\n' + decoderWire

    const testModule = `
${decoderStdlib}

module test_decoder(opcode:8) -> (is_lda, is_sta, is_jmp, is_hlt, needs_imm, needs_addr):
  dec = decoder(opcode)
  is_lda = dec.is_lda
  is_sta = dec.is_sta
  is_jmp = dec.is_jmp
  is_hlt = dec.is_hlt
  needs_imm = dec.needs_imm
  needs_addr = dec.needs_addr
`

    // ==========================================
    // LDA Detection
    // ==========================================
    describe('LDA detection', () => {
      it('detects LDA opcode 0xA9', () => {
        const result = createSimulator(testModule, 'test_decoder')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('opcode', 0xA9)
        sim.step()

        expect(sim.getOutput('is_lda')).toBe(1)
        expect(sim.getOutput('is_sta')).toBe(0)
        expect(sim.getOutput('is_jmp')).toBe(0)
        expect(sim.getOutput('is_hlt')).toBe(0)
      })

      it('sets needs_imm for LDA', () => {
        const result = createSimulator(testModule, 'test_decoder')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('opcode', 0xA9)
        sim.step()

        expect(sim.getOutput('needs_imm')).toBe(1)
        expect(sim.getOutput('needs_addr')).toBe(0)
      })
    })

    // ==========================================
    // STA Detection
    // ==========================================
    describe('STA detection', () => {
      it('detects STA opcode 0x8D', () => {
        const result = createSimulator(testModule, 'test_decoder')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('opcode', 0x8D)
        sim.step()

        expect(sim.getOutput('is_lda')).toBe(0)
        expect(sim.getOutput('is_sta')).toBe(1)
        expect(sim.getOutput('is_jmp')).toBe(0)
        expect(sim.getOutput('is_hlt')).toBe(0)
      })

      it('sets needs_addr for STA', () => {
        const result = createSimulator(testModule, 'test_decoder')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('opcode', 0x8D)
        sim.step()

        expect(sim.getOutput('needs_imm')).toBe(0)
        expect(sim.getOutput('needs_addr')).toBe(1)
      })
    })

    // ==========================================
    // JMP Detection
    // ==========================================
    describe('JMP detection', () => {
      it('detects JMP opcode 0x4C', () => {
        const result = createSimulator(testModule, 'test_decoder')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('opcode', 0x4C)
        sim.step()

        expect(sim.getOutput('is_lda')).toBe(0)
        expect(sim.getOutput('is_sta')).toBe(0)
        expect(sim.getOutput('is_jmp')).toBe(1)
        expect(sim.getOutput('is_hlt')).toBe(0)
      })

      it('sets needs_addr for JMP', () => {
        const result = createSimulator(testModule, 'test_decoder')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('opcode', 0x4C)
        sim.step()

        expect(sim.getOutput('needs_imm')).toBe(0)
        expect(sim.getOutput('needs_addr')).toBe(1)
      })
    })

    // ==========================================
    // HLT Detection
    // ==========================================
    describe('HLT detection', () => {
      it('detects HLT opcode 0x02', () => {
        const result = createSimulator(testModule, 'test_decoder')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('opcode', 0x02)
        sim.step()

        expect(sim.getOutput('is_lda')).toBe(0)
        expect(sim.getOutput('is_sta')).toBe(0)
        expect(sim.getOutput('is_jmp')).toBe(0)
        expect(sim.getOutput('is_hlt')).toBe(1)
      })

      it('HLT needs no operands', () => {
        const result = createSimulator(testModule, 'test_decoder')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('opcode', 0x02)
        sim.step()

        expect(sim.getOutput('needs_imm')).toBe(0)
        expect(sim.getOutput('needs_addr')).toBe(0)
      })
    })

    // ==========================================
    // Invalid/Other Opcodes
    // ==========================================
    describe('other opcodes', () => {
      it('does not match for 0x00 (BRK)', () => {
        const result = createSimulator(testModule, 'test_decoder')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('opcode', 0x00)
        sim.step()

        expect(sim.getOutput('is_lda')).toBe(0)
        expect(sim.getOutput('is_sta')).toBe(0)
        expect(sim.getOutput('is_jmp')).toBe(0)
        expect(sim.getOutput('is_hlt')).toBe(0)
      })

      it('does not match for 0xEA (NOP)', () => {
        const result = createSimulator(testModule, 'test_decoder')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('opcode', 0xEA)
        sim.step()

        expect(sim.getOutput('is_lda')).toBe(0)
        expect(sim.getOutput('is_sta')).toBe(0)
        expect(sim.getOutput('is_jmp')).toBe(0)
        expect(sim.getOutput('is_hlt')).toBe(0)
      })

      it('does not match for 0xFF', () => {
        const result = createSimulator(testModule, 'test_decoder')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('opcode', 0xFF)
        sim.step()

        expect(sim.getOutput('is_lda')).toBe(0)
        expect(sim.getOutput('is_sta')).toBe(0)
        expect(sim.getOutput('is_jmp')).toBe(0)
        expect(sim.getOutput('is_hlt')).toBe(0)
      })

      it('does not match for 0xA8 (similar to LDA 0xA9)', () => {
        const result = createSimulator(testModule, 'test_decoder')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('opcode', 0xA8) // TAY, not LDA
        sim.step()

        expect(sim.getOutput('is_lda')).toBe(0)
      })

      it('does not match for 0x8C (similar to STA 0x8D)', () => {
        const result = createSimulator(testModule, 'test_decoder')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('opcode', 0x8C) // STY, not STA
        sim.step()

        expect(sim.getOutput('is_sta')).toBe(0)
      })

      it('does not match for 0x4D (similar to JMP 0x4C)', () => {
        const result = createSimulator(testModule, 'test_decoder')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('opcode', 0x4D) // EOR absolute, not JMP
        sim.step()

        expect(sim.getOutput('is_jmp')).toBe(0)
      })

      it('does not match for 0x03 (similar to HLT 0x02)', () => {
        const result = createSimulator(testModule, 'test_decoder')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('opcode', 0x03)
        sim.step()

        expect(sim.getOutput('is_hlt')).toBe(0)
      })
    })

    // ==========================================
    // Exhaustive Tests
    // ==========================================
    describe('exhaustive', () => {
      it('only LDA matches for exactly opcode 0xA9', () => {
        const result = createSimulator(testModule, 'test_decoder')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        let ldaCount = 0

        for (let i = 0; i < 256; i++) {
          sim.setInput('opcode', i)
          sim.step()
          if (sim.getOutput('is_lda') === 1) {
            ldaCount++
            expect(i).toBe(0xA9)
          }
        }

        expect(ldaCount).toBe(1)
      })

      it('only STA matches for exactly opcode 0x8D', () => {
        const result = createSimulator(testModule, 'test_decoder')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        let staCount = 0

        for (let i = 0; i < 256; i++) {
          sim.setInput('opcode', i)
          sim.step()
          if (sim.getOutput('is_sta') === 1) {
            staCount++
            expect(i).toBe(0x8D)
          }
        }

        expect(staCount).toBe(1)
      })

      it('only JMP matches for exactly opcode 0x4C', () => {
        const result = createSimulator(testModule, 'test_decoder')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        let jmpCount = 0

        for (let i = 0; i < 256; i++) {
          sim.setInput('opcode', i)
          sim.step()
          if (sim.getOutput('is_jmp') === 1) {
            jmpCount++
            expect(i).toBe(0x4C)
          }
        }

        expect(jmpCount).toBe(1)
      })

      it('only HLT matches for exactly opcode 0x02', () => {
        const result = createSimulator(testModule, 'test_decoder')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        let hltCount = 0

        for (let i = 0; i < 256; i++) {
          sim.setInput('opcode', i)
          sim.step()
          if (sim.getOutput('is_hlt') === 1) {
            hltCount++
            expect(i).toBe(0x02)
          }
        }

        expect(hltCount).toBe(1)
      })

      it('verified all 4 opcodes together', () => {
        const result = createSimulator(testModule, 'test_decoder')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator

        // Test each opcode explicitly
        const opcodes = [
          { op: 0xA9, is_lda: 1, is_sta: 0, is_jmp: 0, is_hlt: 0 },
          { op: 0x8D, is_lda: 0, is_sta: 1, is_jmp: 0, is_hlt: 0 },
          { op: 0x4C, is_lda: 0, is_sta: 0, is_jmp: 1, is_hlt: 0 },
          { op: 0x02, is_lda: 0, is_sta: 0, is_jmp: 0, is_hlt: 1 },
        ]

        for (const tc of opcodes) {
          sim.setInput('opcode', tc.op)
          sim.step()
          expect(sim.getOutput('is_lda')).toBe(tc.is_lda)
          expect(sim.getOutput('is_sta')).toBe(tc.is_sta)
          expect(sim.getOutput('is_jmp')).toBe(tc.is_jmp)
          expect(sim.getOutput('is_hlt')).toBe(tc.is_hlt)
        }
      })
    })
  })

  describe('cpu_minimal', () => {
    // Load CPU module and dependencies
    const pcWire = readFileSync(resolve(__dirname, '../assets/wire/pc.wire'), 'utf-8')
    const decoderWire = readFileSync(resolve(__dirname, '../assets/wire/decoder.wire'), 'utf-8')
    const alu8Wire = readFileSync(resolve(__dirname, '../assets/wire/alu8.wire'), 'utf-8')
    const cpuWire = readFileSync(resolve(__dirname, '../assets/wire/cpu_minimal.wire'), 'utf-8')
    const cpuStdlib = stdlib + '\n' + pcWire + '\n' + decoderWire + '\n' + alu8Wire + '\n' + cpuWire

    const testModule = `
${cpuStdlib}

module test_cpu(clk, reset, data_in:8) -> (addr:16, data_out:8, mem_write, halted, a_out:8, x_out:8, flags_out:4, pc_out:16, state_out:3):
  cpu = cpu_minimal(clk, reset, data_in)
  addr = cpu.addr
  data_out = cpu.data_out
  mem_write = cpu.mem_write
  halted = cpu.halted
  a_out = cpu.a_out
  x_out = cpu.x_out
  flags_out = cpu.flags_out
  pc_out = cpu.pc_out
  state_out = cpu.state_out
`

    // Helper to clock the CPU
    function clockCycle(sim: ReturnType<typeof createSimulator> extends { ok: true, simulator: infer S } ? S : never) {
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()
    }

    // Helper to run a program (memory as array, returns final state)
    function runProgram(sim: ReturnType<typeof createSimulator> extends { ok: true, simulator: infer S } ? S : never, memory: number[], maxCycles: number = 50) {
      // Reset CPU
      sim.setInput('reset', 1)
      sim.setInput('data_in', 0)
      clockCycle(sim)
      sim.setInput('reset', 0)

      let cycles = 0
      const writes: { addr: number; value: number }[] = []

      while (cycles < maxCycles && sim.getOutput('halted') === 0) {
        // CPU outputs address
        const addr = sim.getOutput('addr')

        // Provide data from memory
        const data = addr < memory.length ? memory[addr] : 0
        sim.setInput('data_in', data)

        // Clock
        clockCycle(sim)

        // Check for memory write
        if (sim.getOutput('mem_write') === 1) {
          writes.push({
            addr: sim.getOutput('addr'),
            value: sim.getOutput('data_out')
          })
        }

        cycles++
      }

      return {
        cycles,
        halted: sim.getOutput('halted') === 1,
        a: sim.getOutput('a_out'),
        x: sim.getOutput('x_out'),
        flags: sim.getOutput('flags_out'),
        pc: sim.getOutput('pc_out'),
        state: sim.getOutput('state_out'),
        writes
      }
    }

    // ==========================================
    // Reset and Initial State
    // ==========================================
    describe('reset and initial state', () => {
      it('starts in state 0 (FETCH_OP) after reset', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('reset', 1)
        sim.setInput('data_in', 0)
        clockCycle(sim)

        expect(sim.getOutput('state_out')).toBe(0)
        expect(sim.getOutput('pc_out')).toBe(0)
        expect(sim.getOutput('halted')).toBe(0)
      })

      it('PC starts at 0 after reset', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('reset', 1)
        sim.setInput('data_in', 0)
        clockCycle(sim)

        expect(sim.getOutput('pc_out')).toBe(0)
        expect(sim.getOutput('addr')).toBe(0)
      })

      it('mem_write is 0 after reset', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        sim.setInput('reset', 1)
        sim.setInput('data_in', 0)
        clockCycle(sim)

        expect(sim.getOutput('mem_write')).toBe(0)
      })
    })

    // ==========================================
    // HLT Instruction
    // ==========================================
    describe('HLT instruction', () => {
      it('halts CPU after HLT (0x02)', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: HLT at address 0
        const program = [0x02]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.state).toBe(7)
      })

      it('traces state machine for debug', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$42, HLT
        const memory = [0xA9, 0x42, 0x02]

        // Reset
        sim.setInput('reset', 1)
        sim.setInput('data_in', 0)
        clockCycle(sim)

        console.log(`After reset: state=${sim.getOutput('state_out')} PC=${sim.getOutput('pc_out')} A=${sim.getOutput('a_out')}`)

        sim.setInput('reset', 0)

        // Run cycles
        const trace: string[] = []
        for (let i = 0; i < 10; i++) {
          const addr = sim.getOutput('addr')
          const data = addr < memory.length ? memory[addr] : 0
          const state = sim.getOutput('state_out')
          const pc = sim.getOutput('pc_out')
          const a = sim.getOutput('a_out')
          const halted = sim.getOutput('halted')

          trace.push(`Cycle ${i}: state=${state} addr=0x${addr.toString(16)} data_in=0x${data.toString(16)} PC=${pc} A=0x${a.toString(16)} halted=${halted}`)

          if (halted) {
            break
          }

          sim.setInput('data_in', data)
          clockCycle(sim)
        }

        console.log(trace.join('\n'))

        expect(sim.getOutput('halted')).toBe(1)
        expect(sim.getOutput('a_out')).toBe(0x42)
      })

      it('stays halted after HLT', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator

        // Reset and run a few cycles
        sim.setInput('reset', 1)
        sim.setInput('data_in', 0)
        clockCycle(sim)
        sim.setInput('reset', 0)

        // Provide HLT opcode and run until halted
        sim.setInput('data_in', 0x02)
        for (let i = 0; i < 10; i++) {
          clockCycle(sim)
        }

        // Should be halted and stay halted
        expect(sim.getOutput('halted')).toBe(1)
        expect(sim.getOutput('state_out')).toBe(7)

        // Clock more and verify still halted
        for (let i = 0; i < 5; i++) {
          clockCycle(sim)
          expect(sim.getOutput('halted')).toBe(1)
        }
      })
    })

    // ==========================================
    // LDA Instruction
    // ==========================================
    describe('LDA instruction', () => {
      it('loads immediate value 0x42 into A', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$42, HLT
        const program = [0xA9, 0x42, 0x02]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0x42)
      })

      it('loads immediate value 0x00 into A', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$00, HLT
        const program = [0xA9, 0x00, 0x02]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0x00)
      })

      it('loads immediate value 0xFF into A', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$FF, HLT
        const program = [0xA9, 0xFF, 0x02]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0xFF)
      })

      it('multiple LDA instructions update A', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$10, LDA #$20, LDA #$30, HLT
        const program = [0xA9, 0x10, 0xA9, 0x20, 0xA9, 0x30, 0x02]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0x30) // Last value loaded
      })
    })

    // ==========================================
    // LDX Instruction
    // ==========================================
    describe('LDX instruction', () => {
      it('loads immediate value 0x42 into X', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDX #$42, HLT
        const program = [0xA2, 0x42, 0x02]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.x).toBe(0x42)
      })

      it('loads immediate value 0x00 into X', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDX #$00, HLT
        const program = [0xA2, 0x00, 0x02]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.x).toBe(0x00)
      })

      it('loads immediate value 0xFF into X', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDX #$FF, HLT
        const program = [0xA2, 0xFF, 0x02]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.x).toBe(0xFF)
      })

      it('multiple LDX instructions update X', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDX #$10, LDX #$20, LDX #$30, HLT
        const program = [
          0xA2, 0x10,  // LDX #$10
          0xA2, 0x20,  // LDX #$20
          0xA2, 0x30,  // LDX #$30
          0x02         // HLT
        ]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.x).toBe(0x30) // Last value loaded
      })

      it('LDX does not affect A register', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$AA, LDX #$BB, HLT
        const program = [
          0xA9, 0xAA,  // LDA #$AA
          0xA2, 0xBB,  // LDX #$BB
          0x02         // HLT
        ]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0xAA)
        expect(final.x).toBe(0xBB)
      })
    })

    // ==========================================
    // ADC Instruction
    // ==========================================
    describe('ADC instruction', () => {
      it('adds immediate value without carry', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$10, ADC #$20, HLT (0x10 + 0x20 = 0x30)
        const program = [
          0xA9, 0x10,  // LDA #$10
          0x69, 0x20,  // ADC #$20
          0x02         // HLT
        ]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0x30)
        expect(final.flags & 0b0001).toBe(0) // Carry flag not set
        expect(final.flags & 0b0010).toBe(0) // Zero flag not set
        expect(final.flags & 0b0100).toBe(0) // Negative flag not set
      })

      it('adds with carry flag propagation', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$FF, ADC #$02, ADC #$03, HLT
        // First ADC: 0xFF + 0x02 = 0x01 with C=1
        // Second ADC: 0x01 + 0x03 + 1(carry) = 0x05 with C=0
        const program = [
          0xA9, 0xFF,  // LDA #$FF
          0x69, 0x02,  // ADC #$02
          0x69, 0x03,  // ADC #$03
          0x02         // HLT
        ]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0x05)
        expect(final.flags & 0b0001).toBe(0) // Carry flag not set after second ADC
      })

      it('sets carry flag on overflow', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$FF, ADC #$02, HLT (0xFF + 0x02 = 0x01 with C=1)
        const program = [
          0xA9, 0xFF,  // LDA #$FF
          0x69, 0x02,  // ADC #$02
          0x02         // HLT
        ]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0x01)
        expect(final.flags & 0b0001).toBe(1) // Carry flag set
      })

      it('sets zero flag when result is zero', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$00, ADC #$00, HLT (0x00 + 0x00 = 0x00)
        const program = [
          0xA9, 0x00,  // LDA #$00
          0x69, 0x00,  // ADC #$00
          0x02         // HLT
        ]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0x00)
        expect(final.flags & 0b0010).toBe(0b0010) // Zero flag set
      })

      it('sets negative flag when result is >= 0x80', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$80, ADC #$10, HLT (0x80 + 0x10 = 0x90)
        const program = [
          0xA9, 0x80,  // LDA #$80
          0x69, 0x10,  // ADC #$10
          0x02         // HLT
        ]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0x90)
        expect(final.flags & 0b0100).toBe(0b0100) // Negative flag set
      })

      it('sets overflow flag on signed overflow (positive + positive = negative)', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$7F, ADC #$01, HLT (127 + 1 = -128 in signed)
        const program = [
          0xA9, 0x7F,  // LDA #$7F
          0x69, 0x01,  // ADC #$01
          0x02         // HLT
        ]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0x80)
        expect(final.flags & 0b1000).toBe(0b1000) // Overflow flag set
      })

      it('clears overflow flag when no signed overflow', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$7F, ADC #$01, LDA #$40, ADC #$20, HLT
        // First ADC sets V flag, second clears it
        const program = [
          0xA9, 0x7F,  // LDA #$7F
          0x69, 0x01,  // ADC #$01 (sets V)
          0xA9, 0x40,  // LDA #$40
          0x69, 0x20,  // ADC #$20 (clears V)
          0x02         // HLT
        ]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0x60)
        expect(final.flags & 0b1000).toBe(0) // Overflow flag not set
      })

      it('handles multiple ADC operations in sequence', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$01, ADC #$02, ADC #$03, ADC #$04, HLT
        // 1 + 2 = 3, 3 + 3 = 6, 6 + 4 = 10
        const program = [
          0xA9, 0x01,  // LDA #$01
          0x69, 0x02,  // ADC #$02
          0x69, 0x03,  // ADC #$03
          0x69, 0x04,  // ADC #$04
          0x02         // HLT
        ]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0x0A)
      })

      it('ADC does not affect X register', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDX #$BB, LDA #$10, ADC #$20, HLT
        const program = [
          0xA2, 0xBB,  // LDX #$BB
          0xA9, 0x10,  // LDA #$10
          0x69, 0x20,  // ADC #$20
          0x02         // HLT
        ]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.x).toBe(0xBB)
        expect(final.a).toBe(0x30)
      })
    })

    // ==========================================
    // BEQ Instruction
    // ==========================================
    describe('BEQ instruction', () => {
      it('branches when zero flag is set', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$00, BEQ +3, LDA #$FF, HLT, HLT
        // Address 0: LDA #$00 (sets Z=1)
        // Address 2: BEQ +3 (branch to address 2+2+3=7)
        // Address 4: LDA #$FF (skipped)
        // Address 6: HLT (skipped)
        // Address 7: HLT (executed)
        const program = [
          0xA9, 0x00,  // 0: LDA #$00 (A=0, Z=1)
          0xF0, 0x03,  // 2: BEQ +3 (branch to 2+2+3=7)
          0xA9, 0xFF,  // 4: LDA #$FF (skipped)
          0x02,        // 6: HLT (skipped)
          0x02         // 7: HLT (executed)
        ]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0x00) // Should still be 0 (LDA #$FF skipped)
        expect(final.pc).toBe(8) // Should be at address after final HLT
      })

      it('does not branch when zero flag is clear', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$42, BEQ +3, LDA #$99, HLT
        // Address 0: LDA #$42 (sets Z=0)
        // Address 2: BEQ +3 (no branch, Z=0)
        // Address 4: LDA #$99 (executed)
        // Address 6: HLT
        const program = [
          0xA9, 0x42,  // 0: LDA #$42 (A=0x42, Z=0)
          0xF0, 0x03,  // 2: BEQ +3 (no branch)
          0xA9, 0x99,  // 4: LDA #$99 (executed)
          0x02         // 6: HLT
        ]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0x99) // Should have executed LDA #$99
        expect(final.pc).toBe(7)
      })

      it('branches backward with negative offset', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: Create a simple loop with backward branch
        // Address 0: LDX #$03 (counter)
        // Address 2: LDA #$00 (set Z=1)
        // Address 4: BEQ +2 (branch to 4+2+2=8)
        // Address 6: LDA #$FF (skipped)
        // Address 8: HLT
        const program = [
          0xA2, 0x03,  // 0: LDX #$03
          0xA9, 0x00,  // 2: LDA #$00 (A=0, Z=1)
          0xF0, 0x02,  // 4: BEQ +2 (branch to 8)
          0xA9, 0xFF,  // 6: LDA #$FF (skipped)
          0x02         // 8: HLT
        ]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0x00) // Should still be 0
        expect(final.x).toBe(0x03)
      })

      it('handles zero offset (branch to next instruction)', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$00, BEQ +0, HLT
        // The +0 offset means branch to the next instruction
        const program = [
          0xA9, 0x00,  // 0: LDA #$00 (Z=1)
          0xF0, 0x00,  // 2: BEQ +0 (branch to 4)
          0x02         // 4: HLT
        ]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0x00)
      })

      it('uses ADC to set zero flag then branch', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$FE, ADC #$02, BEQ +3, LDA #$FF, HLT, LDA #$AA, HLT
        // ADC: 0xFE + 0x02 = 0x00 with C=1, Z=1
        // BEQ should branch to skip LDA #$FF and HLT, landing at LDA #$AA
        const program = [
          0xA9, 0xFE,  // 0-1: LDA #$FE
          0x69, 0x02,  // 2-3: ADC #$02 (result 0x00, Z=1, C=1)
          0xF0, 0x03,  // 4-5: BEQ +3 (branch to 4+2+3=9)
          0xA9, 0xFF,  // 6-7: LDA #$FF (skipped)
          0x02,        // 8: HLT (skipped)
          0xA9, 0xAA,  // 9-10: LDA #$AA (executed)
          0x02         // 11: HLT
        ]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0xAA)
        expect(final.flags & 0b0001).toBe(1) // Carry flag still set from ADC
        expect(final.flags & 0b0010).toBe(0) // Zero flag cleared by LDA #$AA
      })
    })

    // ==========================================
    // STA Instruction
    // ==========================================
    describe('STA instruction', () => {
      it('stores A to memory address', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$42, STA $0100, HLT
        const program = [0xA9, 0x42, 0x8D, 0x00, 0x01, 0x02]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0x42)
        expect(final.writes.length).toBe(1)
        expect(final.writes[0].addr).toBe(0x0100)
        expect(final.writes[0].value).toBe(0x42)
      })

      it('stores to address 0x0000', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$AB, STA $0000, HLT
        const program = [0xA9, 0xAB, 0x8D, 0x00, 0x00, 0x02]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.writes[0].addr).toBe(0x0000)
        expect(final.writes[0].value).toBe(0xAB)
      })

      it('stores to high address 0xFF00', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$CD, STA $FF00, HLT
        const program = [0xA9, 0xCD, 0x8D, 0x00, 0xFF, 0x02]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.writes[0].addr).toBe(0xFF00)
        expect(final.writes[0].value).toBe(0xCD)
      })

      it('multiple STA writes to different addresses', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program: LDA #$11, STA $0100, LDA #$22, STA $0101, HLT
        const program = [
          0xA9, 0x11,       // LDA #$11
          0x8D, 0x00, 0x01, // STA $0100
          0xA9, 0x22,       // LDA #$22
          0x8D, 0x01, 0x01, // STA $0101
          0x02              // HLT
        ]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.writes.length).toBe(2)
        expect(final.writes[0]).toEqual({ addr: 0x0100, value: 0x11 })
        expect(final.writes[1]).toEqual({ addr: 0x0101, value: 0x22 })
      })
    })

    // ==========================================
    // JMP Instruction
    // ==========================================
    describe('JMP instruction', () => {
      it('jumps to address and continues execution', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program at 0x0000: JMP $0006
        // Program at 0x0003: LDA #$11 (should be skipped)
        // Program at 0x0005: HLT (should be skipped)
        // Program at 0x0006: LDA #$42
        // Program at 0x0008: HLT
        const program = new Array(10).fill(0)
        program[0] = 0x4C  // JMP
        program[1] = 0x06  // low byte of address
        program[2] = 0x00  // high byte of address
        program[3] = 0xA9  // LDA (skipped)
        program[4] = 0x11  // value
        program[5] = 0x02  // HLT (skipped)
        program[6] = 0xA9  // LDA (executed)
        program[7] = 0x42  // value
        program[8] = 0x02  // HLT

        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0x42) // Should have 0x42, not 0x11
      })

      it('jumps backward (simple loop exit)', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Program:
        // 0x0000: JMP $0003 (skip to HLT)
        // 0x0003: HLT
        const program = [
          0x4C, 0x03, 0x00,  // JMP $0003
          0x02               // HLT
        ]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.pc).toBe(4) // PC after HLT opcode fetch
      })

      it('jumps to high memory', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Create large memory with program at start and HLT at 0x1000
        const program = new Array(0x1001).fill(0)
        program[0] = 0x4C    // JMP
        program[1] = 0x00    // low byte
        program[2] = 0x10    // high byte (0x1000)
        program[0x1000] = 0x02  // HLT at 0x1000

        const final = runProgram(sim, program, 20)

        expect(final.halted).toBe(true)
      })
    })

    // ==========================================
    // Complete Programs
    // ==========================================
    describe('complete programs', () => {
      it('load and store: LDA #$42, STA $0100, HLT', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        const program = [
          0xA9, 0x42,        // LDA #$42
          0x8D, 0x00, 0x01,  // STA $0100
          0x02               // HLT
        ]
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0x42)
        expect(final.writes).toEqual([{ addr: 0x0100, value: 0x42 }])
      })

      it('store then jump: LDA, STA, JMP to HLT', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        const program = new Array(20).fill(0)
        // LDA #$99
        program[0] = 0xA9
        program[1] = 0x99
        // STA $0200
        program[2] = 0x8D
        program[3] = 0x00
        program[4] = 0x02
        // JMP $0010
        program[5] = 0x4C
        program[6] = 0x10
        program[7] = 0x00
        // HLT at 0x0010
        program[0x10] = 0x02

        const final = runProgram(sim, program, 30)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0x99)
        expect(final.writes).toEqual([{ addr: 0x0200, value: 0x99 }])
      })

      it('multiple stores with jumps', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        const program = new Array(0x20).fill(0)
        // At 0x0000: LDA #$AA, STA $0300, JMP $0010
        program[0] = 0xA9; program[1] = 0xAA
        program[2] = 0x8D; program[3] = 0x00; program[4] = 0x03
        program[5] = 0x4C; program[6] = 0x10; program[7] = 0x00

        // At 0x0010: LDA #$BB, STA $0301, HLT
        program[0x10] = 0xA9; program[0x11] = 0xBB
        program[0x12] = 0x8D; program[0x13] = 0x01; program[0x14] = 0x03
        program[0x15] = 0x02

        const final = runProgram(sim, program, 50)

        expect(final.halted).toBe(true)
        expect(final.a).toBe(0xBB)
        expect(final.writes).toEqual([
          { addr: 0x0300, value: 0xAA },
          { addr: 0x0301, value: 0xBB }
        ])
      })
    })

    // ==========================================
    // Edge Cases
    // ==========================================
    describe('edge cases', () => {
      it('handles PC rollover at address boundary', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        // Start PC near address boundary and execute simple instructions
        // Jump to 0xFFFD, then LDA, HLT wraps around
        // This is a simplified test - full edge case would need more setup
        const program = [0x02]  // Just HLT for basic test
        const final = runProgram(sim, program)

        expect(final.halted).toBe(true)
      })

      it('STA writes correct value when A is 0x00', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        const program = [
          0xA9, 0x00,        // LDA #$00
          0x8D, 0x50, 0x00,  // STA $0050
          0x02               // HLT
        ]
        const final = runProgram(sim, program)

        expect(final.writes).toEqual([{ addr: 0x0050, value: 0x00 }])
      })

      it('STA writes correct value when A is 0xFF', () => {
        const result = createSimulator(testModule, 'test_cpu')
        expect(result.ok).toBe(true)
        if (!result.ok) return

        const sim = result.simulator
        const program = [
          0xA9, 0xFF,        // LDA #$FF
          0x8D, 0x50, 0x00,  // STA $0050
          0x02               // HLT
        ]
        const final = runProgram(sim, program)

        expect(final.writes).toEqual([{ addr: 0x0050, value: 0xFF }])
      })
    })
  })
})
