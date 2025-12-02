import { describe, it, expect, beforeEach } from 'vitest'
import { createSimulator } from './simulator'
import { resetNodeCounter } from './compiler'

beforeEach(() => {
  resetNodeCounter()
})

describe('Multi-bit Bus Operations', () => {
  describe('8-bit passthrough', () => {
    const passthrough8 = `
module pass8(a:8) -> out:8:
  out = a
`
    it('passes through 8-bit value', () => {
      const result = createSimulator(passthrough8)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0b10101010)
      sim.step()
      expect(sim.getOutput('out')).toBe(0b10101010)
    })

    it('handles max 8-bit value', () => {
      const result = createSimulator(passthrough8)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 255)
      sim.step()
      expect(sim.getOutput('out')).toBe(255)
    })
  })

  describe('bit indexing', () => {
    const getBit = `
module get_bit0(a:8) -> out:
  out = a[0]

module get_bit7(a:8) -> out:
  out = a[7]
`
    it('extracts bit 0 (LSB)', () => {
      const result = createSimulator(getBit, 'get_bit0')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0b10101010)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)

      sim.setInput('a', 0b10101011)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)
    })

    it('extracts bit 7 (MSB)', () => {
      const result = createSimulator(getBit, 'get_bit7')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0b10000000)
      sim.step()
      expect(sim.getOutput('out')).toBe(1)

      sim.setInput('a', 0b01111111)
      sim.step()
      expect(sim.getOutput('out')).toBe(0)
    })
  })

  describe('bit slicing', () => {
    const getSlice = `
module get_low_nibble(a:8) -> out:4:
  out = a[0:3]

module get_high_nibble(a:8) -> out:4:
  out = a[4:7]
`
    it('extracts low nibble (bits 0-3)', () => {
      const result = createSimulator(getSlice, 'get_low_nibble')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0xAB)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xB)
    })

    it('extracts high nibble (bits 4-7)', () => {
      const result = createSimulator(getSlice, 'get_high_nibble')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0xAB)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xA)
    })
  })

  describe('concatenation', () => {
    const concatModule = `
module join_nibbles(high:4, low:4) -> out:8:
  out = concat(high, low)
`
    it('concatenates two 4-bit values into 8-bit', () => {
      const result = createSimulator(concatModule)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('high', 0xA)
      sim.setInput('low', 0xB)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xAB)
    })

    it('concatenates with zeros', () => {
      const result = createSimulator(concatModule)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('high', 0xF)
      sim.setInput('low', 0x0)
      sim.step()
      expect(sim.getOutput('out')).toBe(0xF0)
    })
  })

  describe('8-bit NAND', () => {
    const nand8 = `
module nand8(a:8, b:8) -> out:8:
  out = nand(a, b)
`
    it('performs bitwise NAND on 8-bit values', () => {
      const result = createSimulator(nand8)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator
      sim.setInput('a', 0b11110000)
      sim.setInput('b', 0b11001100)
      sim.step()
      // NAND: ~(a & b) = ~(0b11000000) = 0b00111111
      expect(sim.getOutput('out')).toBe(0b00111111)
    })
  })
})
