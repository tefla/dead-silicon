import { describe, it, expect, beforeEach } from 'vitest'
import { createSimulator } from './simulator'
import { resetNodeCounter } from './compiler'

beforeEach(() => {
  resetNodeCounter()
})

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
  })

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
  })

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
  })
})
