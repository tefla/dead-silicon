import { describe, it, expect, beforeEach } from 'vitest'
import { createSimulator, Simulator, SimulatorStrategy } from './simulator'

// Helper to run same test against both strategies
function testBothStrategies(
  name: string,
  code: string,
  moduleName: string,
  testFn: (sim: Simulator, strategy: SimulatorStrategy) => void
) {
  describe(name, () => {
    for (const strategy of ['event', 'wasm'] as const) {
      it(`works with ${strategy} strategy`, () => {
        const result = createSimulator(code, moduleName, strategy)
        if (!result.ok) {
          throw new Error(`Failed to create ${strategy} simulator: ${result.error}`)
        }
        testFn(result.simulator, strategy)
      })
    }
  })
}

// =============================================================================
// PRIMITIVES
// =============================================================================

describe('WASM Simulator - Primitives', () => {
  testBothStrategies(
    'constant 0',
    `module test() -> out: out = 0`,
    'test',
    (sim) => {
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    }
  )

  testBothStrategies(
    'constant 1',
    `module test() -> out: out = 1`,
    'test',
    (sim) => {
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    }
  )

  testBothStrategies(
    'wide constant',
    `module test() -> out:8: out = 0xFF`,
    'test',
    (sim) => {
      sim.step()
      expect(sim.getOutput('out')).toBe(255)
    }
  )

  testBothStrategies(
    'input passthrough',
    `module test(a) -> out: out = a`,
    'test',
    (sim) => {
      sim.setInput('a', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)

      sim.setInput('a', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    }
  )

  testBothStrategies(
    'wide input passthrough',
    `module test(a:8) -> out:8: out = a`,
    'test',
    (sim) => {
      sim.setInput('a', 0x42)
      sim.step()
      expect(sim.getOutput('out')).toBe(0x42)

      sim.setInput('a', 0xFF)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xFF)
    }
  )

  testBothStrategies(
    'NAND gate - truth table',
    `module test(a, b) -> out: out = nand(a, b)`,
    'test',
    (sim) => {
      const cases = [
        { a: 0, b: 0, expected: 1 },
        { a: 0, b: 1, expected: 1 },
        { a: 1, b: 0, expected: 1 },
        { a: 1, b: 1, expected: 0 },
      ]
      for (const { a, b, expected } of cases) {
        sim.setInput('a', a)
        sim.setInput('b', b)
        sim.step()
        expect(sim.getOutput('out')).toBe(expected)
      }
    }
  )

  testBothStrategies(
    'wide NAND',
    `module test(a:8, b:8) -> out:8: out = nand(a, b)`,
    'test',
    (sim) => {
      sim.setInput('a', 0xFF)
      sim.setInput('b', 0x0F)
      sim.step()
      // NAND(0xFF, 0x0F) = NOT(0x0F) = 0xF0
      expect(sim.getOutput('out')).toBe(0xF0)
    }
  )

  testBothStrategies(
    'DFF - stores value on clock edge',
    `module test(d, clk) -> q: q = dff(d, clk)`,
    'test',
    (sim) => {
      // Initial state
      sim.setInput('d', 1)
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(0) // Not clocked yet

      // Clock rising edge
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(1) // Captured

      // Change d, but no clock edge
      sim.setInput('d', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(1) // Still holds

      // Another clock edge
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(0) // New value captured
    }
  )
})

// =============================================================================
// BIT OPERATIONS
// =============================================================================

describe('WASM Simulator - Bit Operations', () => {
  // NOTE: concat(a, b) means a is MSB, b is LSB (first arg is high bits)
  // So concat(1, 0) = 0b10 = 2
  testBothStrategies(
    'concat two 1-bit values',
    `module test(a, b) -> out:2: out = concat(a, b)`,
    'test',
    (sim) => {
      sim.setInput('a', 0)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0b00)

      sim.setInput('a', 1)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0b10) // a is MSB (high bit)

      sim.setInput('a', 0)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0b01) // b is LSB (low bit)

      sim.setInput('a', 1)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0b11)
    }
  )

  // concat(b7, b6, b5, b4, b3, b2, b1, b0) = MSB first, so b7 is bit 7, b0 is bit 0
  testBothStrategies(
    'concat 8 bits',
    `module test(b7, b6, b5, b4, b3, b2, b1, b0) -> out:8:
      out = concat(b7, b6, b5, b4, b3, b2, b1, b0)`,
    'test',
    (sim) => {
      // Set bit 0 only (b0 is LSB, last in concat)
      sim.setInput('b0', 1)
      for (let i = 1; i < 8; i++) sim.setInput(`b${i}`, 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0x01)

      // Set bit 7 only (b7 is MSB, first in concat)
      sim.setInput('b0', 0)
      sim.setInput('b7', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0x80)

      // Set all bits
      for (let i = 0; i < 8; i++) sim.setInput(`b${i}`, 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xFF)
    }
  )

  // concat(hi, lo) puts hi in upper bits, lo in lower bits
  testBothStrategies(
    'concat two 4-bit values',
    `module test(hi:4, lo:4) -> out:8: out = concat(hi, lo)`,
    'test',
    (sim) => {
      sim.setInput('lo', 0x5)
      sim.setInput('hi', 0xA)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xA5)
    }
  )

  testBothStrategies(
    'index bit 0',
    `module test(a:8) -> out: out = a[0]`,
    'test',
    (sim) => {
      sim.setInput('a', 0x01)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)

      sim.setInput('a', 0xFE)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    }
  )

  testBothStrategies(
    'index bit 7',
    `module test(a:8) -> out: out = a[7]`,
    'test',
    (sim) => {
      sim.setInput('a', 0x80)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)

      sim.setInput('a', 0x7F)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    }
  )

  // NOTE: slice syntax is [start:end] where start is LSB index
  // So a[0:3] gets bits 0-3 (low nibble), a[4:7] gets bits 4-7 (high nibble)
  testBothStrategies(
    'slice low nibble',
    `module test(a:8) -> out:4: out = a[0:3]`,
    'test',
    (sim) => {
      sim.setInput('a', 0xAB)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xB)
    }
  )

  testBothStrategies(
    'slice high nibble',
    `module test(a:8) -> out:4: out = a[4:7]`,
    'test',
    (sim) => {
      sim.setInput('a', 0xAB)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xA)
    }
  )

  testBothStrategies(
    'slice middle bits',
    `module test(a:8) -> out:4: out = a[2:5]`,
    'test',
    (sim) => {
      sim.setInput('a', 0b11010100)
      sim.step()
      // bits 2-5 of 11010100 = 0101 = 5
      expect(sim.getOutput('out')).toBe(0b0101)
    }
  )
})

// =============================================================================
// SIMPLE MODULES
// =============================================================================

describe('WASM Simulator - Simple Modules', () => {
  testBothStrategies(
    'NOT gate from NAND',
    `
    module not(a) -> out:
      out = nand(a, a)

    module test(a) -> out:
      out = not(a)
    `,
    'test',
    (sim) => {
      sim.setInput('a', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)

      sim.setInput('a', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    }
  )

  testBothStrategies(
    'AND gate from NAND',
    `
    module not(a) -> out:
      out = nand(a, a)

    module and(a, b) -> out:
      out = not(nand(a, b))

    module test(a, b) -> out:
      out = and(a, b)
    `,
    'test',
    (sim) => {
      const cases = [
        { a: 0, b: 0, expected: 0 },
        { a: 0, b: 1, expected: 0 },
        { a: 1, b: 0, expected: 0 },
        { a: 1, b: 1, expected: 1 },
      ]
      for (const { a, b, expected } of cases) {
        sim.setInput('a', a)
        sim.setInput('b', b)
        sim.step()
        expect(sim.getOutput('out')).toBe(expected)
      }
    }
  )

  testBothStrategies(
    'OR gate from NAND',
    `
    module not(a) -> out:
      out = nand(a, a)

    module or(a, b) -> out:
      out = nand(not(a), not(b))

    module test(a, b) -> out:
      out = or(a, b)
    `,
    'test',
    (sim) => {
      const cases = [
        { a: 0, b: 0, expected: 0 },
        { a: 0, b: 1, expected: 1 },
        { a: 1, b: 0, expected: 1 },
        { a: 1, b: 1, expected: 1 },
      ]
      for (const { a, b, expected } of cases) {
        sim.setInput('a', a)
        sim.setInput('b', b)
        sim.step()
        expect(sim.getOutput('out')).toBe(expected)
      }
    }
  )

  testBothStrategies(
    'XOR gate from NAND',
    `
    module not(a) -> out:
      out = nand(a, a)

    module xor(a, b) -> out:
      t1 = nand(a, b)
      t2 = nand(a, t1)
      t3 = nand(b, t1)
      out = nand(t2, t3)

    module test(a, b) -> out:
      out = xor(a, b)
    `,
    'test',
    (sim) => {
      const cases = [
        { a: 0, b: 0, expected: 0 },
        { a: 0, b: 1, expected: 1 },
        { a: 1, b: 0, expected: 1 },
        { a: 1, b: 1, expected: 0 },
      ]
      for (const { a, b, expected } of cases) {
        sim.setInput('a', a)
        sim.setInput('b', b)
        sim.step()
        expect(sim.getOutput('out')).toBe(expected)
      }
    }
  )
})

// =============================================================================
// MODULE OUTPUT ALIASING
// =============================================================================

describe('WASM Simulator - Module Output Aliasing', () => {
  testBothStrategies(
    'single output module with alias',
    `
    module inner(a) -> out:
      out = nand(a, a)

    module test(a) -> out:
      result = inner(a)
      out = result
    `,
    'test',
    (sim) => {
      sim.setInput('a', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)

      sim.setInput('a', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    }
  )

  testBothStrategies(
    'chain of aliased modules',
    `
    module not(a) -> out:
      out = nand(a, a)

    module double_not(a) -> out:
      temp = not(a)
      out = not(temp)

    module test(a) -> out:
      out = double_not(a)
    `,
    'test',
    (sim) => {
      sim.setInput('a', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)

      sim.setInput('a', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    }
  )
})

// =============================================================================
// MULTI-OUTPUT MODULES
// =============================================================================

describe('WASM Simulator - Multi-Output Modules', () => {
  testBothStrategies(
    'two-output module',
    `
    module split(a:8) -> (lo:4, hi:4):
      lo = a[0:3]
      hi = a[4:7]

    module test(a:8) -> (lo:4, hi:4):
      result = split(a)
      lo = result.lo
      hi = result.hi
    `,
    'test',
    (sim) => {
      sim.setInput('a', 0xAB)
      sim.step()
      expect(sim.getOutput('lo')).toBe(0xB)
      expect(sim.getOutput('hi')).toBe(0xA)
    }
  )

  testBothStrategies(
    'half adder',
    `
    module not(a) -> out:
      out = nand(a, a)

    module xor(a, b) -> out:
      t1 = nand(a, b)
      t2 = nand(a, t1)
      t3 = nand(b, t1)
      out = nand(t2, t3)

    module and(a, b) -> out:
      out = not(nand(a, b))

    module half_adder(a, b) -> (sum, carry):
      sum = xor(a, b)
      carry = and(a, b)

    module test(a, b) -> (sum, carry):
      result = half_adder(a, b)
      sum = result.sum
      carry = result.carry
    `,
    'test',
    (sim) => {
      const cases = [
        { a: 0, b: 0, sum: 0, carry: 0 },
        { a: 0, b: 1, sum: 1, carry: 0 },
        { a: 1, b: 0, sum: 1, carry: 0 },
        { a: 1, b: 1, sum: 0, carry: 1 },
      ]
      for (const { a, b, sum, carry } of cases) {
        sim.setInput('a', a)
        sim.setInput('b', b)
        sim.step()
        expect(sim.getOutput('sum')).toBe(sum)
        expect(sim.getOutput('carry')).toBe(carry)
      }
    }
  )

  testBothStrategies(
    'full adder',
    `
    module not(a) -> out:
      out = nand(a, a)

    module xor(a, b) -> out:
      t1 = nand(a, b)
      t2 = nand(a, t1)
      t3 = nand(b, t1)
      out = nand(t2, t3)

    module and(a, b) -> out:
      out = not(nand(a, b))

    module or(a, b) -> out:
      out = nand(not(a), not(b))

    module half_adder(a, b) -> (sum, carry):
      sum = xor(a, b)
      carry = and(a, b)

    module full_adder(a, b, cin) -> (sum, cout):
      ha1 = half_adder(a, b)
      ha2 = half_adder(ha1.sum, cin)
      sum = ha2.sum
      cout = or(ha1.carry, ha2.carry)

    module test(a, b, cin) -> (sum, cout):
      result = full_adder(a, b, cin)
      sum = result.sum
      cout = result.cout
    `,
    'test',
    (sim) => {
      const cases = [
        { a: 0, b: 0, cin: 0, sum: 0, cout: 0 },
        { a: 0, b: 0, cin: 1, sum: 1, cout: 0 },
        { a: 0, b: 1, cin: 0, sum: 1, cout: 0 },
        { a: 0, b: 1, cin: 1, sum: 0, cout: 1 },
        { a: 1, b: 0, cin: 0, sum: 1, cout: 0 },
        { a: 1, b: 0, cin: 1, sum: 0, cout: 1 },
        { a: 1, b: 1, cin: 0, sum: 0, cout: 1 },
        { a: 1, b: 1, cin: 1, sum: 1, cout: 1 },
      ]
      for (const { a, b, cin, sum, cout } of cases) {
        sim.setInput('a', a)
        sim.setInput('b', b)
        sim.setInput('cin', cin)
        sim.step()
        expect(sim.getOutput('sum')).toBe(sum)
        expect(sim.getOutput('cout')).toBe(cout)
      }
    }
  )
})

// =============================================================================
// NESTED MODULES WITH ALIASING
// =============================================================================

describe('WASM Simulator - Nested Modules with Aliasing', () => {
  testBothStrategies(
    '4-bit adder using full adders',
    `
    module not(a) -> out:
      out = nand(a, a)

    module xor(a, b) -> out:
      t1 = nand(a, b)
      t2 = nand(a, t1)
      t3 = nand(b, t1)
      out = nand(t2, t3)

    module and(a, b) -> out:
      out = not(nand(a, b))

    module or(a, b) -> out:
      out = nand(not(a), not(b))

    module half_adder(a, b) -> (sum, carry):
      sum = xor(a, b)
      carry = and(a, b)

    module full_adder(a, b, cin) -> (sum, cout):
      ha1 = half_adder(a, b)
      ha2 = half_adder(ha1.sum, cin)
      sum = ha2.sum
      cout = or(ha1.carry, ha2.carry)

    module adder4(a:4, b:4, cin) -> (sum:4, cout):
      fa0 = full_adder(a[0], b[0], cin)
      fa1 = full_adder(a[1], b[1], fa0.cout)
      fa2 = full_adder(a[2], b[2], fa1.cout)
      fa3 = full_adder(a[3], b[3], fa2.cout)
      sum = concat(fa3.sum, fa2.sum, fa1.sum, fa0.sum)
      cout = fa3.cout

    module test(a:4, b:4, cin) -> (sum:4, cout):
      result = adder4(a, b, cin)
      sum = result.sum
      cout = result.cout
    `,
    'test',
    (sim) => {
      const cases = [
        { a: 0, b: 0, cin: 0, sum: 0, cout: 0 },
        { a: 1, b: 1, cin: 0, sum: 2, cout: 0 },
        { a: 5, b: 3, cin: 0, sum: 8, cout: 0 },
        { a: 15, b: 1, cin: 0, sum: 0, cout: 1 },
        { a: 15, b: 15, cin: 0, sum: 14, cout: 1 },
        { a: 15, b: 15, cin: 1, sum: 15, cout: 1 },
      ]
      for (const { a, b, cin, sum, cout } of cases) {
        sim.setInput('a', a)
        sim.setInput('b', b)
        sim.setInput('cin', cin)
        sim.step()
        expect(sim.getOutput('sum')).toBe(sum)
        expect(sim.getOutput('cout')).toBe(cout)
      }
    }
  )

  testBothStrategies(
    '8-bit adder using 4-bit adders',
    `
    module not(a) -> out:
      out = nand(a, a)

    module xor(a, b) -> out:
      t1 = nand(a, b)
      t2 = nand(a, t1)
      t3 = nand(b, t1)
      out = nand(t2, t3)

    module and(a, b) -> out:
      out = not(nand(a, b))

    module or(a, b) -> out:
      out = nand(not(a), not(b))

    module half_adder(a, b) -> (sum, carry):
      sum = xor(a, b)
      carry = and(a, b)

    module full_adder(a, b, cin) -> (sum, cout):
      ha1 = half_adder(a, b)
      ha2 = half_adder(ha1.sum, cin)
      sum = ha2.sum
      cout = or(ha1.carry, ha2.carry)

    module adder4(a:4, b:4, cin) -> (sum:4, cout):
      fa0 = full_adder(a[0], b[0], cin)
      fa1 = full_adder(a[1], b[1], fa0.cout)
      fa2 = full_adder(a[2], b[2], fa1.cout)
      fa3 = full_adder(a[3], b[3], fa2.cout)
      sum = concat(fa3.sum, fa2.sum, fa1.sum, fa0.sum)
      cout = fa3.cout

    module adder8(a:8, b:8, cin) -> (sum:8, cout):
      lo = adder4(a[0:3], b[0:3], cin)
      hi = adder4(a[4:7], b[4:7], lo.cout)
      sum = concat(hi.sum, lo.sum)
      cout = hi.cout

    module test(a:8, b:8, cin) -> (sum:8, cout):
      result = adder8(a, b, cin)
      sum = result.sum
      cout = result.cout
    `,
    'test',
    (sim) => {
      const cases = [
        { a: 0, b: 0, cin: 0, sum: 0, cout: 0 },
        { a: 1, b: 1, cin: 0, sum: 2, cout: 0 },
        { a: 100, b: 50, cin: 0, sum: 150, cout: 0 },
        { a: 255, b: 1, cin: 0, sum: 0, cout: 1 },
        { a: 255, b: 255, cin: 0, sum: 254, cout: 1 },
        { a: 255, b: 255, cin: 1, sum: 255, cout: 1 },
      ]
      for (const { a, b, cin, sum, cout } of cases) {
        sim.setInput('a', a)
        sim.setInput('b', b)
        sim.setInput('cin', cin)
        sim.step()
        expect(sim.getOutput('sum')).toBe(sum)
        expect(sim.getOutput('cout')).toBe(cout)
      }
    }
  )
})

// =============================================================================
// FEEDBACK LOOPS (Sequential Logic)
// =============================================================================

describe('WASM Simulator - Feedback Loops', () => {
  testBothStrategies(
    'simple DFF register',
    `
    module reg1(d, en, clk) -> q:
      mux_out = nand(nand(d, en), nand(q, nand(en, en)))
      q = dff(mux_out, clk)

    module test(d, en, clk) -> q:
      q = reg1(d, en, clk)
    `,
    'test',
    (sim) => {
      // Initialize
      sim.setInput('d', 0)
      sim.setInput('en', 0)
      sim.setInput('clk', 0)
      sim.step()

      // Load value 1
      sim.setInput('d', 1)
      sim.setInput('en', 1)
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(1)

      // Hold (en=0, d changes)
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('d', 0)
      sim.setInput('en', 0)
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(1) // Should still be 1
    }
  )

  testBothStrategies(
    '8-bit register',
    `
    module not(a) -> out:
      out = nand(a, a)

    module mux(a, b, sel) -> out:
      not_sel = not(sel)
      out = nand(nand(a, not_sel), nand(b, sel))

    module register1(d, en, clk) -> q:
      mux_out = mux(q, d, en)
      q = dff(mux_out, clk)

    module register8(d:8, en, clk) -> q:8:
      q = concat(
        register1(d[7], en, clk),
        register1(d[6], en, clk),
        register1(d[5], en, clk),
        register1(d[4], en, clk),
        register1(d[3], en, clk),
        register1(d[2], en, clk),
        register1(d[1], en, clk),
        register1(d[0], en, clk)
      )

    module test(d:8, en, clk) -> q:8:
      q = register8(d, en, clk)
    `,
    'test',
    (sim) => {
      // Initialize
      sim.setInput('d', 0)
      sim.setInput('en', 0)
      sim.setInput('clk', 0)
      sim.step()
      expect(sim.getOutput('q')).toBe(0)

      // Load 0x42
      sim.setInput('d', 0x42)
      sim.setInput('en', 1)
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(0x42)

      // Hold
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('d', 0xFF)
      sim.setInput('en', 0)
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(0x42) // Should still be 0x42

      // Load new value
      sim.setInput('d', 0xAB)
      sim.setInput('en', 1)
      sim.setInput('clk', 0)
      sim.step()
      sim.setInput('clk', 1)
      sim.step()
      expect(sim.getOutput('q')).toBe(0xAB)
    }
  )
})

// =============================================================================
// INCREMENT OPERATION (common failing case)
// =============================================================================

describe('WASM Simulator - Increment Operations', () => {
  testBothStrategies(
    '4-bit increment',
    `
    module not(a) -> out:
      out = nand(a, a)

    module xor(a, b) -> out:
      t1 = nand(a, b)
      t2 = nand(a, t1)
      t3 = nand(b, t1)
      out = nand(t2, t3)

    module and(a, b) -> out:
      out = not(nand(a, b))

    module or(a, b) -> out:
      out = nand(not(a), not(b))

    module half_adder(a, b) -> (sum, carry):
      sum = xor(a, b)
      carry = and(a, b)

    module full_adder(a, b, cin) -> (sum, cout):
      ha1 = half_adder(a, b)
      ha2 = half_adder(ha1.sum, cin)
      sum = ha2.sum
      cout = or(ha1.carry, ha2.carry)

    module adder4(a:4, b:4, cin) -> (sum:4, cout):
      fa0 = full_adder(a[0], b[0], cin)
      fa1 = full_adder(a[1], b[1], fa0.cout)
      fa2 = full_adder(a[2], b[2], fa1.cout)
      fa3 = full_adder(a[3], b[3], fa2.cout)
      sum = concat(fa3.sum, fa2.sum, fa1.sum, fa0.sum)
      cout = fa3.cout

    module inc4(a:4) -> out:4:
      result = adder4(a, 0, 1)
      out = result.sum

    module test(a:4) -> out:4:
      out = inc4(a)
    `,
    'test',
    (sim) => {
      const cases = [
        { a: 0, expected: 1 },
        { a: 1, expected: 2 },
        { a: 7, expected: 8 },
        { a: 14, expected: 15 },
        { a: 15, expected: 0 }, // Overflow
      ]
      for (const { a, expected } of cases) {
        sim.setInput('a', a)
        sim.step()
        expect(sim.getOutput('out')).toBe(expected)
      }
    }
  )
})

// =============================================================================
// MUX OPERATIONS
// =============================================================================

describe('WASM Simulator - Mux Operations', () => {
  testBothStrategies(
    '1-bit mux',
    `
    module not(a) -> out:
      out = nand(a, a)

    module mux(a, b, sel) -> out:
      not_sel = not(sel)
      out = nand(nand(a, not_sel), nand(b, sel))

    module test(a, b, sel) -> out:
      out = mux(a, b, sel)
    `,
    'test',
    (sim) => {
      // sel=0: output a
      sim.setInput('a', 1)
      sim.setInput('b', 0)
      sim.setInput('sel', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)

      // sel=1: output b
      sim.setInput('sel', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    }
  )

  testBothStrategies(
    '8-bit mux',
    `
    module not(a) -> out:
      out = nand(a, a)

    module mux(a, b, sel) -> out:
      not_sel = not(sel)
      out = nand(nand(a, not_sel), nand(b, sel))

    module mux8(a:8, b:8, sel) -> out:8:
      out = concat(
        mux(a[7], b[7], sel),
        mux(a[6], b[6], sel),
        mux(a[5], b[5], sel),
        mux(a[4], b[4], sel),
        mux(a[3], b[3], sel),
        mux(a[2], b[2], sel),
        mux(a[1], b[1], sel),
        mux(a[0], b[0], sel)
      )

    module test(a:8, b:8, sel) -> out:8:
      out = mux8(a, b, sel)
    `,
    'test',
    (sim) => {
      sim.setInput('a', 0xAA)
      sim.setInput('b', 0x55)
      sim.setInput('sel', 0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xAA)

      sim.setInput('sel', 1)
      sim.step()
      expect(sim.getOutput('out')).toBe(0x55)
    }
  )
})
