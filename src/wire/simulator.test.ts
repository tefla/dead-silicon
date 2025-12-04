import { describe, it, expect, beforeEach } from 'vitest'
import { createSimulator, Simulator } from './simulator'
import { resetNodeCounter } from './compiler'

beforeEach(() => {
  resetNodeCounter()
})

// ============================================================================
// NAND PRIMITIVE TESTS
// ============================================================================

describe('Wire Simulator', () => {
  describe('NAND primitive', () => {
    const nandModule = `
module test_nand(a, b) -> out:
  out = nand(a, b)
`

    it('outputs 1 when both inputs are 0', () => {
      const result = createSimulator(nandModule)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })

    it('outputs 1 when a=0, b=1', () => {
      const result = createSimulator(nandModule)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })

    it('outputs 1 when a=1, b=0', () => {
      const result = createSimulator(nandModule)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 1)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })

    it('outputs 0 when both inputs are 1', () => {
      const result = createSimulator(nandModule)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 1)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })
  })

  describe('multi-bit NAND', () => {
    it('performs bitwise NAND on 8-bit values', () => {
      const result = createSimulator(`
module test(a:8, b:8) -> out:8:
  out = nand(a, b)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0xFF)
      sim.setInput('b', 0xF0)
      sim.step()
      // NAND(0xFF, 0xF0) = ~(0xFF & 0xF0) = ~0xF0 = 0x0F
      expect(sim.getOutput('out')).toBe(0x0F)
    })

    it('performs bitwise NAND on 16-bit values', () => {
      const result = createSimulator(`
module test(a:16, b:16) -> out:16:
  out = nand(a, b)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0xAAAA)
      sim.setInput('b', 0x5555)
      sim.step()
      // NAND(0xAAAA, 0x5555) = ~(0xAAAA & 0x5555) = ~0x0000 = 0xFFFF
      expect(sim.getOutput('out')).toBe(0xFFFF)
    })

    it('masks results to correct width', () => {
      const result = createSimulator(`
module test(a:4, b:4) -> out:4:
  out = nand(a, b)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0xF)
      sim.setInput('b', 0x0)
      sim.step()
      // NAND(0xF, 0x0) = ~(0xF & 0x0) & 0xF = ~0x0 & 0xF = 0xF
      expect(sim.getOutput('out')).toBe(0xF)
    })
  })

// ============================================================================
// NOT GATE TESTS (built from NAND)
// ============================================================================

  describe('NOT gate (from NAND)', () => {
    const notModule = `
module not(a) -> out:
  out = nand(a, a)
`

    it('outputs 1 when input is 0', () => {
      const result = createSimulator(notModule)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })

    it('outputs 0 when input is 1', () => {
      const result = createSimulator(notModule)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })

    it('works with multi-bit values', () => {
      const result = createSimulator(`
module not8(a:8) -> out:8:
  out = nand(a, a)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0x55)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xAA)
    })
  })

// ============================================================================
// AND GATE TESTS
// ============================================================================

  describe('AND gate (from NAND)', () => {
    const andModule = `
module not(a) -> out:
  out = nand(a, a)

module and(a, b) -> out:
  x = nand(a, b)
  out = not(x)
`

    it('outputs 0 when both inputs are 0', () => {
      const result = createSimulator(andModule, 'and')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })

    it('outputs 0 when a=0, b=1', () => {
      const result = createSimulator(andModule, 'and')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })

    it('outputs 0 when a=1, b=0', () => {
      const result = createSimulator(andModule, 'and')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 1)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })

    it('outputs 1 when both inputs are 1', () => {
      const result = createSimulator(andModule, 'and')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 1)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })
  })

  describe('AND gate with nested calls', () => {
    const andNestedModule = `
module not(a) -> out:
  out = nand(a, a)

module and(a, b) -> out:
  out = not(nand(a, b))
`

    it('outputs 0 when both inputs are 0', () => {
      const result = createSimulator(andNestedModule, 'and')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })

    it('outputs 0 when a=0, b=1', () => {
      const result = createSimulator(andNestedModule, 'and')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })

    it('outputs 0 when a=1, b=0', () => {
      const result = createSimulator(andNestedModule, 'and')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 1)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })

    it('outputs 1 when both inputs are 1', () => {
      const result = createSimulator(andNestedModule, 'and')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 1)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })
  })

// ============================================================================
// OR GATE TESTS
// ============================================================================

  describe('OR gate (from NAND)', () => {
    const orModule = `
module not(a) -> out:
  out = nand(a, a)

module or(a, b) -> out:
  na = not(a)
  nb = not(b)
  out = nand(na, nb)
`

    it('outputs 0 when both inputs are 0', () => {
      const result = createSimulator(orModule, 'or')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })

    it('outputs 1 when a=0, b=1', () => {
      const result = createSimulator(orModule, 'or')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })

    it('outputs 1 when a=1, b=0', () => {
      const result = createSimulator(orModule, 'or')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 1)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })

    it('outputs 1 when both inputs are 1', () => {
      const result = createSimulator(orModule, 'or')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 1)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })
  })

// ============================================================================
// XOR GATE TESTS
// ============================================================================

  describe('XOR gate (from NAND)', () => {
    const xorModule = `
module not(a) -> out:
  out = nand(a, a)

module and(a, b) -> out:
  x = nand(a, b)
  out = not(x)

module or(a, b) -> out:
  na = not(a)
  nb = not(b)
  out = nand(na, nb)

module xor(a, b) -> out:
  or_ab = or(a, b)
  nand_ab = nand(a, b)
  out = and(or_ab, nand_ab)
`

    it('outputs 0 when both inputs are 0', () => {
      const result = createSimulator(xorModule, 'xor')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })

    it('outputs 1 when a=0, b=1', () => {
      const result = createSimulator(xorModule, 'xor')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })

    it('outputs 1 when a=1, b=0', () => {
      const result = createSimulator(xorModule, 'xor')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 1)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })

    it('outputs 0 when both inputs are 1', () => {
      const result = createSimulator(xorModule, 'xor')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 1)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })
  })

// ============================================================================
// DFF PRIMITIVE TESTS
// ============================================================================

  describe('DFF primitive', () => {
    const dffModule = `
module test_dff(d, clk) -> q:
  q = dff(d, clk)
`

    it('latches value on rising clock edge', () => {
      const result = createSimulator(dffModule)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Initially output should be 0
      sim.setInput('d', 0)
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(0)

      // Set D to 1, but clock is still low
      sim.setInput('d', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(0) // Not latched yet

      // Rising edge - should latch the 1
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(1) // Latched!

      // Change D while clock is high - should not change output
      sim.setInput('d', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(1) // Still latched

      // Clock goes low
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(1) // Still latched

      // Another rising edge with D=0 - should latch 0
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(0) // Now latched 0
    })

    it('holds value when clock is stable high', () => {
      const result = createSimulator(dffModule)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('d', 1)
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(1)

      // Change D while clock is still high
      sim.setInput('d', 0)
      sim.step()
      sim.step()
      sim.step()
      expect(sim.getOutput('q')).toBe(1) // Still holds the latched value
    })

    it('holds value when clock is stable low', () => {
      const result = createSimulator(dffModule)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Latch a 1
      sim.setInput('d', 1)
      sim.setInput('clk', 1)
      sim.step()

      // Clock goes low
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(1)

      // Change D while clock is low
      sim.setInput('d', 0)
      sim.step()
      sim.step()
      expect(sim.getOutput('q')).toBe(1) // Still holds
    })

    it('ignores falling clock edge', () => {
      const result = createSimulator(dffModule)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Initial state: clock high, D=0, latch 0
      sim.setInput('d', 0)
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(0)

      // Set D=1, clock goes low (falling edge)
      sim.setInput('d', 1)
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(0) // Should NOT latch on falling edge
    })
  })

  describe('DFF counter pattern', () => {
    it('implements a simple 4-bit counter', () => {
      const result = createSimulator(`
module not(a) -> out:
  out = nand(a, a)

module counter(clk) -> q:
  next = not(q)
  q = dff(next, clk)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Start with clock low
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(0)

      // First rising edge: 0 -> 1
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(1)

      // Clock low
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(1)

      // Second rising edge: 1 -> 0
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(0)

      // Clock low
      sim.setInput('clk', 0)
      sim.step()

      // Third rising edge: 0 -> 1
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(1)
    })
  })

// ============================================================================
// BIT INDEXING TESTS
// ============================================================================

  describe('bit indexing', () => {
    it('extracts single bit from multi-bit value', () => {
      const result = createSimulator(`
module test(a:8) -> (b0, b1, b7):
  b0 = a[0]
  b1 = a[1]
  b7 = a[7]
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0b10000011) // bit 0, 1, and 7 set
      sim.step()
      expect(sim.getOutput('b0')).toBe(1)
      expect(sim.getOutput('b1')).toBe(1)
      expect(sim.getOutput('b7')).toBe(1)
    })

    it('extracts bit 0 correctly', () => {
      const result = createSimulator(`
module test(a:8) -> out:
  out = a[0]
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0b11111110) // bit 0 is 0
      sim.step()
      expect(sim.getOutput('out')).toBe(0)

      sim.setInput('a', 0b00000001) // bit 0 is 1
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })

    it('extracts high bits correctly', () => {
      const result = createSimulator(`
module test(a:16) -> out:
  out = a[15]
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0x7FFF) // bit 15 is 0
      sim.step()
      expect(sim.getOutput('out')).toBe(0)

      sim.setInput('a', 0x8000) // bit 15 is 1
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })
  })

// ============================================================================
// SLICE TESTS
// ============================================================================

  describe('slicing', () => {
    it('extracts low nibble', () => {
      const result = createSimulator(`
module test(a:8) -> out:4:
  out = a[0:3]
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0xAB)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xB)
    })

    it('extracts high nibble', () => {
      const result = createSimulator(`
module test(a:8) -> out:4:
  out = a[4:7]
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0xAB)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xA)
    })

    it('extracts middle bits', () => {
      const result = createSimulator(`
module test(a:16) -> out:4:
  out = a[4:7]
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0xABCD)
      sim.step()
      // bits 4-7 of 0xABCD (0b1010101111001101) = 0b1100 = 0xC
      expect(sim.getOutput('out')).toBe(0xC)
    })

    it('extracts single bit slice', () => {
      const result = createSimulator(`
module test(a:8) -> out:
  out = a[3:3]
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0b00001000) // bit 3 is 1
      sim.step()
      expect(sim.getOutput('out')).toBe(1)

      sim.setInput('a', 0b11110111) // bit 3 is 0
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })
  })

// ============================================================================
// CONCAT TESTS
// ============================================================================

  describe('concatenation', () => {
    it('concatenates two 4-bit values into 8-bit', () => {
      const result = createSimulator(`
module test(hi:4, lo:4) -> out:8:
  out = concat(hi, lo)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('hi', 0xA)
      sim.setInput('lo', 0xB)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xAB)
    })

    it('concatenates three values', () => {
      const result = createSimulator(`
module test(a:4, b:4, c:4) -> out:12:
  out = concat(a, b, c)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0xA)
      sim.setInput('b', 0xB)
      sim.setInput('c', 0xC)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xABC)
    })

    it('concatenates single bits', () => {
      const result = createSimulator(`
module test(a, b, c, d) -> out:4:
  out = concat(a, b, c, d)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 1)
      sim.setInput('b', 0)
      sim.setInput('c', 1)
      sim.setInput('d', 0)
      sim.step()
      // a=1, b=0, c=1, d=0 -> 0b1010 = 10
      expect(sim.getOutput('out')).toBe(0b1010)
    })

    it('concatenates unequal width values', () => {
      const result = createSimulator(`
module test(a:8, b:4) -> out:12:
  out = concat(a, b)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0xFF)
      sim.setInput('b', 0x0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xFF0)
    })
  })

// ============================================================================
// RAM TESTS
// ============================================================================

  describe('RAM', () => {
    it('reads initial value of 0', () => {
      const result = createSimulator(`
module test(addr:8, data:8, write, clk) -> out:8:
  out = ram(addr, data, write, clk)
`)
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

    it('writes on rising clock edge when write is high', () => {
      const result = createSimulator(`
module test(addr:8, data:8, write, clk) -> out:8:
  out = ram(addr, data, write, clk)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Setup write
      sim.setInput('addr', 5)
      sim.setInput('data', 42)
      sim.setInput('write', 1)
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0) // Not written yet

      // Rising edge - should write
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(42) // Now written and readable

      // Read back from same address
      sim.setInput('write', 0)
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(42)
    })

    it('does not write when write is low', () => {
      const result = createSimulator(`
module test(addr:8, data:8, write, clk) -> out:8:
  out = ram(addr, data, write, clk)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      sim.setInput('addr', 10)
      sim.setInput('data', 99)
      sim.setInput('write', 0) // Write disabled
      sim.setInput('clk', 0)
      sim.step()

      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0) // Should not have written
    })

    it('supports multiple addresses', () => {
      const result = createSimulator(`
module test(addr:8, data:8, write, clk) -> out:8:
  out = ram(addr, data, write, clk)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Write to address 0
      sim.setInput('addr', 0)
      sim.setInput('data', 11)
      sim.setInput('write', 1)
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()

      // Write to address 1
      sim.setInput('addr', 1)
      sim.setInput('data', 22)
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()

      // Write to address 2
      sim.setInput('addr', 2)
      sim.setInput('data', 33)
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()

      // Read back
      sim.setInput('write', 0)
      sim.setInput('addr', 0)
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(11)

      sim.setInput('addr', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(22)

      sim.setInput('addr', 2)
      sim.step()
      expect(sim.getOutput('out')).toBe(33)
    })

    it('direct writeRam and readRam work', () => {
      const result = createSimulator(`
module test(addr:8, data:8, write, clk) -> out:8:
  out = ram(addr, data, write, clk)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Write directly
      sim.writeRam(100, 0xAB)

      // Read back via simulation
      sim.setInput('addr', 100)
      sim.setInput('write', 0)
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xAB)

      // Read directly
      expect(sim.readRam(100)).toBe(0xAB)
    })
  })

// ============================================================================
// ROM TESTS
// ============================================================================

  describe('ROM', () => {
    it('reads loaded data', () => {
      const result = createSimulator(`
module test(addr:8) -> out:8:
  out = rom(addr)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Load data into ROM
      sim.loadRom([0, 10, 20, 30, 40, 50])

      sim.setInput('addr', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)

      sim.setInput('addr', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(10)

      sim.setInput('addr', 2)
      sim.step()
      expect(sim.getOutput('out')).toBe(20)

      sim.setInput('addr', 5)
      sim.step()
      expect(sim.getOutput('out')).toBe(50)
    })

    it('returns 0 for unloaded addresses', () => {
      const result = createSimulator(`
module test(addr:8) -> out:8:
  out = rom(addr)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      sim.setInput('addr', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)

      sim.setInput('addr', 100)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })

    it('loads Uint8Array data', () => {
      const result = createSimulator(`
module test(addr:8) -> out:8:
  out = rom(addr)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      const data = new Uint8Array([0xFF, 0xAA, 0x55, 0x00])
      sim.loadRom(data)

      sim.setInput('addr', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xFF)

      sim.setInput('addr', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xAA)

      sim.setInput('addr', 2)
      sim.step()
      expect(sim.getOutput('out')).toBe(0x55)
    })
  })

// ============================================================================
// CONSTANT TESTS
// ============================================================================

  describe('constants', () => {
    it('outputs constant 0', () => {
      const result = createSimulator(`
module test() -> out:
  out = 0
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })

    it('outputs constant 1', () => {
      const result = createSimulator(`
module test() -> out:
  out = 1
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })

    it('outputs hex constants', () => {
      const result = createSimulator(`
module test() -> out:8:
  out = 0xFF
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.step()
      expect(sim.getOutput('out')).toBe(0xFF)
    })

    it('outputs large constants', () => {
      const result = createSimulator(`
module test() -> out:16:
  out = 0xABCD
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.step()
      expect(sim.getOutput('out')).toBe(0xABCD)
    })
  })

// ============================================================================
// MODULE CALL TESTS
// ============================================================================

  describe('module calls', () => {
    it('calls a simple module', () => {
      const result = createSimulator(`
module not(a) -> out:
  out = nand(a, a)

module test(x) -> y:
  y = not(x)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('x', 0)
      sim.step()
      expect(sim.getOutput('y')).toBe(1)

      sim.setInput('x', 1)
      sim.step()
      expect(sim.getOutput('y')).toBe(0)
    })

    it('chains module calls', () => {
      const result = createSimulator(`
module not(a) -> out:
  out = nand(a, a)

module test(x) -> y:
  y = not(not(x))
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('x', 0)
      sim.step()
      expect(sim.getOutput('y')).toBe(0) // double negation

      sim.setInput('x', 1)
      sim.step()
      expect(sim.getOutput('y')).toBe(1)
    })

    it('handles multi-output modules', () => {
      const result = createSimulator(`
module swap(a, b) -> (x, y):
  x = b
  y = a

module test(p, q) -> (r, s):
  sw = swap(p, q)
  r = sw.x
  s = sw.y
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('p', 0)
      sim.setInput('q', 1)
      sim.step()
      expect(sim.getOutput('r')).toBe(1)
      expect(sim.getOutput('s')).toBe(0)
    })
  })

// ============================================================================
// WIRE ALIAS TESTS
// ============================================================================

  describe('wire aliases', () => {
    it('resolves simple aliases', () => {
      const result = createSimulator(`
module test(a) -> out:
  b = a
  out = b
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })

    it('resolves alias chains', () => {
      const result = createSimulator(`
module test(a) -> out:
  b = a
  c = b
  d = c
  out = d
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })
  })

// ============================================================================
// SIMULATOR STATE TESTS
// ============================================================================

  describe('simulator state', () => {
    it('getAllWires returns all wire values', () => {
      const result = createSimulator(`
module test(a, b) -> (x, y):
  x = a
  y = b
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 1)
      sim.setInput('b', 0)
      sim.step()

      const wires = sim.getAllWires()
      expect(wires.get('a')).toBe(1)
      expect(wires.get('b')).toBe(0)
    })

    it('reset clears all state', () => {
      const result = createSimulator(`
module test(d, clk) -> q:
  q = dff(d, clk)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Latch a value
      sim.setInput('d', 1)
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(1)

      // Reset
      sim.reset()
      expect(sim.getOutput('q')).toBe(0)
    })

    it('reset clears RAM', () => {
      const result = createSimulator(`
module test(addr:8, data:8, write, clk) -> out:8:
  out = ram(addr, data, write, clk)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Write a value
      sim.writeRam(10, 99)
      expect(sim.readRam(10)).toBe(99)

      // Reset
      sim.reset()
      expect(sim.readRam(10)).toBe(0)
    })

    it('run executes multiple steps', () => {
      const result = createSimulator(`
module not(a) -> out:
  out = nand(a, a)

module counter(clk) -> q:
  next = not(q)
  q = dff(next, clk)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('clk', 0)
      sim.run(10)
      // After 10 steps with clock low, nothing should change
      expect(sim.getOutput('q')).toBe(0)
    })
  })

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

  describe('error handling', () => {
    it('reports lex errors', () => {
      const result = createSimulator('module foo(@) -> out:')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('Lex error')
      }
    })

    it('reports parse errors', () => {
      const result = createSimulator('module foo(a) out:')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('Parse error')
      }
    })

    it('reports compile errors for undefined module', () => {
      const result = createSimulator(`
module test(a) -> out:
  out = undefined_module(a)
`)
      // This should compile (module calls are unresolved until simulation)
      // but during simulation, undefined module outputs 0
      expect(result.ok).toBe(true)
      if (result.ok) {
        result.simulator.setInput('a', 1)
        result.simulator.step()
        expect(result.simulator.getOutput('out')).toBe(0)
      }
    })

    it('handles empty source', () => {
      const result = createSimulator('')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('No modules found')
      }
    })

    it('handles whitespace-only source', () => {
      const result = createSimulator('   \n\n  \n')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('No modules found')
      }
    })
  })

// ============================================================================
// COMPLEX CIRCUIT TESTS
// ============================================================================

  describe('complex circuits', () => {
    it('implements half adder', () => {
      const result = createSimulator(`
module not(a) -> out:
  out = nand(a, a)

module and(a, b) -> out:
  out = not(nand(a, b))

module or(a, b) -> out:
  out = nand(not(a), not(b))

module xor(a, b) -> out:
  nand_ab = nand(a, b)
  out = nand(nand(a, nand_ab), nand(nand_ab, b))

module half_adder(a, b) -> (sum, carry):
  sum = xor(a, b)
  carry = and(a, b)
`, 'half_adder')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // 0 + 0 = 0, carry 0
      sim.setInput('a', 0)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('sum')).toBe(0)
      expect(sim.getOutput('carry')).toBe(0)

      // 0 + 1 = 1, carry 0
      sim.setInput('a', 0)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('sum')).toBe(1)
      expect(sim.getOutput('carry')).toBe(0)

      // 1 + 0 = 1, carry 0
      sim.setInput('a', 1)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('sum')).toBe(1)
      expect(sim.getOutput('carry')).toBe(0)

      // 1 + 1 = 0, carry 1
      sim.setInput('a', 1)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('sum')).toBe(0)
      expect(sim.getOutput('carry')).toBe(1)
    })

    it('implements 2-to-1 MUX', () => {
      const result = createSimulator(`
module not(a) -> out:
  out = nand(a, a)

module and(a, b) -> out:
  out = not(nand(a, b))

module or(a, b) -> out:
  out = nand(not(a), not(b))

module mux(sel, a, b) -> out:
  na = and(not(sel), a)
  nb = and(sel, b)
  out = or(na, nb)
`, 'mux')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // sel=0 selects a
      sim.setInput('sel', 0)
      sim.setInput('a', 1)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)

      sim.setInput('a', 0)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)

      // sel=1 selects b
      sim.setInput('sel', 1)
      sim.setInput('a', 1)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)

      sim.setInput('a', 0)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })

    it('implements SR latch', () => {
      const result = createSimulator(`
module sr_latch(s, r) -> (q, qn):
  q = nand(s, qn)
  qn = nand(r, q)
`, 'sr_latch')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Initial state: both inputs high (inactive for NAND-based SR)
      sim.setInput('s', 1)
      sim.setInput('r', 1)
      sim.step()
      // Should hold some stable state

      // Set (s low momentarily)
      sim.setInput('s', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(1)

      // Return s high
      sim.setInput('s', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(1) // Should hold

      // Reset (r low momentarily)
      sim.setInput('r', 0)
      sim.step()
      expect(sim.getOutput('qn')).toBe(1)
      expect(sim.getOutput('q')).toBe(0)
    })
  })

// ============================================================================
// STRESS TESTS
// ============================================================================

  describe('stress tests', () => {
    it('handles many nand gates in series', () => {
      // Build a chain of 50 NOT gates (100 NAND gates)
      let source = `module not(a) -> out:\n  out = nand(a, a)\n\n`
      source += `module chain(x) -> y:\n`
      source += `  w0 = not(x)\n`
      for (let i = 1; i < 50; i++) {
        source += `  w${i} = not(w${i-1})\n`
      }
      source += `  y = w49\n`

      const result = createSimulator(source, 'chain')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('x', 0)
      sim.step()
      // 50 inversions -> even number, so output = input
      expect(sim.getOutput('y')).toBe(0)

      sim.setInput('x', 1)
      sim.step()
      expect(sim.getOutput('y')).toBe(1)
    })

    it('handles wide datapath (32-bit NAND)', () => {
      const result = createSimulator(`
module test(a:32, b:32) -> out:32:
  out = nand(a, b)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0xFFFFFFFF)
      sim.setInput('b', 0xAAAAAAAA)
      sim.step()
      // NAND(0xFFFFFFFF, 0xAAAAAAAA) = ~(0xAAAAAAAA) = 0x55555555
      expect(sim.getOutput('out')).toBe(0x55555555)
    })

    it('handles multiple DFFs', () => {
      const result = createSimulator(`
module test(d0, d1, d2, d3, clk) -> (q0, q1, q2, q3):
  q0 = dff(d0, clk)
  q1 = dff(d1, clk)
  q2 = dff(d2, clk)
  q3 = dff(d3, clk)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('d0', 1)
      sim.setInput('d1', 0)
      sim.setInput('d2', 1)
      sim.setInput('d3', 0)
      sim.setInput('clk', 0)
      sim.step()

      sim.setInput('clk', 1)
      sim.step()

      expect(sim.getOutput('q0')).toBe(1)
      expect(sim.getOutput('q1')).toBe(0)
      expect(sim.getOutput('q2')).toBe(1)
      expect(sim.getOutput('q3')).toBe(0)
    })

    it('handles rapid input changes', () => {
      const result = createSimulator(`
module not(a) -> out:
  out = nand(a, a)

module test(x) -> y:
  y = not(x)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Rapidly toggle input many times
      for (let i = 0; i < 1000; i++) {
        sim.setInput('x', i % 2)
        sim.step()
        expect(sim.getOutput('y')).toBe(1 - (i % 2))
      }
    })

    it('handles deeply nested module calls', () => {
      const result = createSimulator(`
module not(a) -> out:
  out = nand(a, a)

module level1(x) -> y:
  y = not(x)

module level2(x) -> y:
  y = level1(x)

module level3(x) -> y:
  y = level2(x)

module level4(x) -> y:
  y = level3(x)

module level5(x) -> y:
  y = level4(x)

module test(x) -> y:
  y = level5(x)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('x', 0)
      sim.step()
      expect(sim.getOutput('y')).toBe(1)

      sim.setInput('x', 1)
      sim.step()
      expect(sim.getOutput('y')).toBe(0)
    })

    it('handles many simultaneous inputs', () => {
      // 16 inputs, 16 outputs
      let inputs = []
      let outputs = []
      for (let i = 0; i < 16; i++) {
        inputs.push(`i${i}`)
        outputs.push(`o${i}`)
      }

      let source = `module test(${inputs.join(', ')}) -> (${outputs.join(', ')}):\n`
      for (let i = 0; i < 16; i++) {
        source += `  o${i} = nand(i${i}, i${i})\n`
      }

      const result = createSimulator(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      for (let i = 0; i < 16; i++) {
        sim.setInput(`i${i}`, i % 2)
      }
      sim.step()

      for (let i = 0; i < 16; i++) {
        expect(sim.getOutput(`o${i}`)).toBe(1 - (i % 2))
      }
    })

    it('handles ROM lookup table', () => {
      const result = createSimulator(`
module test(addr:4) -> out:8:
  out = rom(addr)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Load a lookup table (e.g., 2^x for x=0..7)
      const table = [1, 2, 4, 8, 16, 32, 64, 128, 0, 0, 0, 0, 0, 0, 0, 0]
      sim.loadRom(table)

      for (let i = 0; i < 8; i++) {
        sim.setInput('addr', i)
        sim.step()
        expect(sim.getOutput('out')).toBe(1 << i)
      }
    })

    it('handles sequential RAM writes', () => {
      const result = createSimulator(`
module test(addr:8, data:8, write, clk) -> out:8:
  out = ram(addr, data, write, clk)
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Write sequential values
      for (let i = 0; i < 100; i++) {
        sim.setInput('addr', i)
        sim.setInput('data', i * 2)
        sim.setInput('write', 1)
        sim.setInput('clk', 0)
        sim.step()
        sim.setInput('clk', 1)
        sim.step()
      }

      // Read back
      sim.setInput('write', 0)
      for (let i = 0; i < 100; i++) {
        sim.setInput('addr', i)
        sim.step()
        expect(sim.getOutput('out')).toBe(i * 2)
      }
    })
  })

// ============================================================================
// EDGE CASES
// ============================================================================

  describe('edge cases', () => {
    it('handles zero-iteration fixed point (all constants)', () => {
      const result = createSimulator(`
module test() -> (a, b):
  a = 0
  b = 1
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.step()
      expect(sim.getOutput('a')).toBe(0)
      expect(sim.getOutput('b')).toBe(1)
    })

    it('handles module with no inputs', () => {
      const result = createSimulator(`
module const_one() -> out:
  out = 1

module test() -> y:
  y = const_one()
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.step()
      expect(sim.getOutput('y')).toBe(1)
    })

    it('handles module with no outputs', () => {
      // A module with no outputs is unusual but should not crash
      const result = createSimulator(`
module sink(a) -> ():
  x = nand(a, a)

module test(i) -> o:
  o = i
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('i', 1)
      sim.step()
      expect(sim.getOutput('o')).toBe(1)
    })

    it('getWire returns 0 for unknown wire', () => {
      const result = createSimulator(`
module test(a) -> b:
  b = a
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      expect(sim.getWire('nonexistent')).toBe(0)
    })

    it('setInput can set value before step', () => {
      const result = createSimulator(`
module test(a) -> b:
  b = a
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 1)
      // getWire should work even before step
      expect(sim.getWire('a')).toBe(1)
    })

    it('handles special wire names with underscores', () => {
      const result = createSimulator(`
module test(my_input_wire) -> my_output_wire:
  intermediate_wire = my_input_wire
  my_output_wire = intermediate_wire
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('my_input_wire', 1)
      sim.step()
      expect(sim.getOutput('my_output_wire')).toBe(1)
    })

    it('handles numeric wire names', () => {
      const result = createSimulator(`
module test(a0, a1, a2) -> (b0, b1, b2):
  b0 = a0
  b1 = a1
  b2 = a2
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a0', 0)
      sim.setInput('a1', 1)
      sim.setInput('a2', 0)
      sim.step()
      expect(sim.getOutput('b0')).toBe(0)
      expect(sim.getOutput('b1')).toBe(1)
      expect(sim.getOutput('b2')).toBe(0)
    })
  })
})
