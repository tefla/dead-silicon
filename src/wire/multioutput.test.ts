import { describe, it, expect, beforeEach } from 'vitest'
import { createSimulator } from './simulator'
import { resetNodeCounter } from './compiler'

beforeEach(() => {
  resetNodeCounter()
})

describe('Multi-output Modules', () => {
  describe('half adder pattern', () => {
    const halfAdderModule = `
module half_adder(a, b) -> (sum, carry):
  sum = xor_gate(a, b)
  carry = and_gate(a, b)

module xor_gate(a, b) -> out:
  n1 = nand(a, b)
  n2 = nand(a, n1)
  n3 = nand(b, n1)
  out = nand(n2, n3)

module and_gate(a, b) -> out:
  n = nand(a, b)
  out = nand(n, n)

module test_adder(a, b) -> (s, c):
  h = half_adder(a, b)
  s = h.sum
  c = h.carry
`

    it('computes sum correctly', () => {
      const result = createSimulator(halfAdderModule, 'test_adder')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // 0 + 0 = 0
      sim.setInput('a', 0)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('s')).toBe(0)

      // 0 + 1 = 1
      sim.setInput('a', 0)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('s')).toBe(1)

      // 1 + 0 = 1
      sim.setInput('a', 1)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('s')).toBe(1)

      // 1 + 1 = 0 (with carry)
      sim.setInput('a', 1)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('s')).toBe(0)
    })

    it('computes carry correctly', () => {
      const result = createSimulator(halfAdderModule, 'test_adder')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // 0 + 0 = carry 0
      sim.setInput('a', 0)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('c')).toBe(0)

      // 0 + 1 = carry 0
      sim.setInput('a', 0)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('c')).toBe(0)

      // 1 + 0 = carry 0
      sim.setInput('a', 1)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('c')).toBe(0)

      // 1 + 1 = carry 1
      sim.setInput('a', 1)
      sim.setInput('b', 1)
      sim.step()
      expect(sim.getOutput('c')).toBe(1)
    })
  })

  describe('direct multi-output access', () => {
    const swapModule = `
module swap(a, b) -> (x, y):
  x = b
  y = a

module test_swap(a, b) -> (p, q):
  s = swap(a, b)
  p = s.x
  q = s.y
`

    it('accesses multiple outputs via member syntax', () => {
      const result = createSimulator(swapModule, 'test_swap')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      sim.setInput('a', 1)
      sim.setInput('b', 0)
      sim.step()
      expect(sim.getOutput('p')).toBe(0) // s.x = b = 0
      expect(sim.getOutput('q')).toBe(1) // s.y = a = 1
    })
  })
})
