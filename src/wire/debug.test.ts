import { describe, it, expect, beforeEach } from 'vitest'
import { createSimulator } from './simulator'
import { resetNodeCounter } from './compiler'

beforeEach(() => {
  resetNodeCounter()
})

describe('Debug multi-output', () => {
  it('simple swap', () => {
    const swapModule = `
module swap(a, b) -> (x, y):
  x = b
  y = a

module test(a, b) -> (p, q):
  s = swap(a, b)
  p = s.x
  q = s.y
`
    const result = createSimulator(swapModule, 'test')
    expect(result.ok).toBe(true)
    if (!result.ok) {
      console.log('Error:', result.error)
      return
    }

    const sim = result.simulator
    sim.setInput('a', 1)
    sim.setInput('b', 0)
    sim.step()

    // Debug output
    console.log('All wires:', Object.fromEntries(sim.getAllWires()))
    console.log('Aliases:', Object.fromEntries(result.modules.get('test')?.aliases ?? new Map()))

    expect(sim.getOutput('p')).toBe(0)
    expect(sim.getOutput('q')).toBe(1)
  })
})
