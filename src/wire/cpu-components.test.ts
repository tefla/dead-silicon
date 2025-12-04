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

module test_alu8(a:8, b:8, op:3, cin) -> (result:8, z, n, c, v):
  alu = alu8(a, b, op, cin)
  result = alu.result
  z = alu.z
  n = alu.n
  c = alu.c
  v = alu.v
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
        expect(sim.getOutput('c')).toBe(0)
        expect(sim.getOutput('v')).toBe(0)
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
        expect(sim.getOutput('c')).toBe(0)
        expect(sim.getOutput('v')).toBe(0)
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
        expect(sim.getOutput('v')).toBe(1) // Overflow!
        expect(sim.getOutput('c')).toBe(0) // No carry
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
        expect(sim.getOutput('c')).toBe(1) // Carry out
        expect(sim.getOutput('v')).toBe(0) // No signed overflow (-1 + 1 = 0)
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
        expect(sim.getOutput('c')).toBe(1) // Carry
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
        expect(sim.getOutput('c')).toBe(1) // Carry
        expect(sim.getOutput('v')).toBe(1) // Overflow! Two negatives produced positive
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
        expect(sim.getOutput('v')).toBe(1) // 64 + 64 = 128, but signed max is 127
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
        expect(sim.getOutput('c')).toBe(1) // Carry (unsigned overflow)
        expect(sim.getOutput('v')).toBe(0) // No signed overflow
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
        expect(sim.getOutput('c')).toBe(1) // No borrow (carry=1)
        expect(sim.getOutput('v')).toBe(0)
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
        expect(sim.getOutput('c')).toBe(1) // No borrow
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
        expect(sim.getOutput('c')).toBe(0) // Borrow occurred (carry=0)
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
        expect(sim.getOutput('v')).toBe(1) // Overflow! -128 - 1 should be -129
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
        expect(sim.getOutput('v')).toBe(1) // Overflow!
        expect(sim.getOutput('c')).toBe(0) // Borrow
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
        expect(sim.getOutput('c')).toBe(1) // No borrow
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
        expect(sim.getOutput('c')).toBe(1)
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
        expect(sim.getOutput('c')).toBe(1)
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
        expect(sim.getOutput('c')).toBe(0)
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
        expect(sim.getOutput('c')).toBe(1) // No borrow
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
        expect(sim.getOutput('c')).toBe(0) // Borrow occurred
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
        expect(sim.getOutput('c')).toBe(1)
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
        expect(sim.getOutput('v')).toBe(1)
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
        expect(sim.getOutput('v')).toBe(1)
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
        expect(sim.getOutput('v')).toBe(0)
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
        expect(sim.getOutput('v')).toBe(1) // 127 - (-1) = 128, overflow
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
        expect(sim.getOutput('v')).toBe(1) // -128 - 1 = -129, overflow
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
        expect(sim.getOutput('v')).toBe(0)
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
        expect(sim.getOutput('v')).toBe(0)
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
        expect(sim.getOutput('v')).toBe(1) // 64 + 64 = 128 > 127
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
        expect(sim.getOutput('v')).toBe(0) // -64 + -64 = -128, fits in signed range
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
            expect(sim.getOutput('c')).toBe((a + b) > 0xFF ? 1 : 0)
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
            expect(sim.getOutput('c')).toBe(a >= b ? 1 : 0)
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
})

