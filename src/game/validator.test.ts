// Tests for puzzle validation
import { describe, it, expect } from 'vitest'
import { validatePuzzle, quickCheckPuzzle } from './validator'

describe('Puzzle Validator', () => {
  // Note: The validator uses pattern matching for most puzzles since full
  // simulation requires the standard library (dff8, adder8, etc.).
  // These tests verify the pattern-matching validation works correctly.

  describe('O2 Sensor Puzzle', () => {
    it('should reject the original broken code with [0:6]', () => {
      const brokenCode = `
module o2_sensor(analog:8, clk) -> level:8:
  sampled = dff8(analog, clk)
  level = sampled[0:6]
`
      const result = validatePuzzle('o2_sensor', brokenCode)
      expect(result.success).toBe(false)
    })

    it('should accept the fixed code with [0:7]', () => {
      const fixedCode = `
module o2_sensor(analog:8, clk) -> level:8:
  sampled = dff8(analog, clk)
  level = sampled[0:7]
`
      const result = validatePuzzle('o2_sensor', fixedCode)
      expect(result.success).toBe(true)
      expect(result.message).toContain('corrected')
    })

    it('should reject code that has both [0:7] and [0:6]', () => {
      const stillBroken = `
module o2_sensor(analog:8, clk) -> level:8:
  sampled = dff8(analog, clk)
  level = sampled[0:7]
  other = sampled[0:6]
`
      const result = validatePuzzle('o2_sensor', stillBroken)
      expect(result.success).toBe(false)
    })
  })

  describe('CO2 Scrubber Puzzle', () => {
    it('should reject code without inverted comparison', () => {
      const brokenCode = `
module co2_scrubber(co2_level:8, threshold:8) -> scrubber_on:
  diff = adder8(co2_level, not8(threshold), 1)
  scrubber_on = diff[7]
`
      const result = validatePuzzle('co2_scrubber', brokenCode)
      expect(result.success).toBe(false)
    })

    it('should accept fixed code with not(diff[7])', () => {
      const fixedCode = `
module co2_scrubber(co2_level:8, threshold:8) -> scrubber_on:
  diff = adder8(co2_level, not8(threshold), 1)
  scrubber_on = not(diff[7])
`
      const result = validatePuzzle('co2_scrubber', fixedCode)
      expect(result.success).toBe(true)
    })
  })

  describe('Solar Controller Puzzle', () => {
    it('should reject code with carry-in = 0', () => {
      const brokenCode = `
module solar_controller(light_level:8, threshold:8) -> charge_enable:
  diff = adder8(light_level, not8(threshold), 0)
  charge_enable = not(diff[7])
`
      const result = validatePuzzle('solar_ctrl', brokenCode)
      expect(result.success).toBe(false)
    })

    it('should accept fixed code with carry-in = 1', () => {
      const fixedCode = `
module solar_controller(light_level:8, threshold:8) -> charge_enable:
  diff = adder8(light_level, not8(threshold), 1)
  charge_enable = not(diff[7])
`
      const result = validatePuzzle('solar_ctrl', fixedCode)
      expect(result.success).toBe(true)
    })
  })

  describe('Battery Monitor Puzzle', () => {
    it('should reject code without dff8(stage1', () => {
      const brokenCode = `
module battery_monitor(adc_data:8, clk) -> (level:8, valid):
  stage1 = dff8(adc_data, clk)
  level = stage1
  valid = 1
`
      const result = validatePuzzle('battery_mon', brokenCode)
      expect(result.success).toBe(false)
    })

    it('should accept fixed code with dff8(stage1, clk)', () => {
      const fixedCode = `
module battery_monitor(adc_data:8, clk) -> (level:8, valid):
  stage1 = dff8(adc_data, clk)
  stage2 = dff8(stage1, clk)
  level = stage2
  valid = 1
`
      const result = validatePuzzle('battery_mon', fixedCode)
      expect(result.success).toBe(true)
    })
  })

  describe('Flash Controller Puzzle', () => {
    it('should reject code without dff(read_delay1', () => {
      const brokenCode = `
module flash_controller(addr:16, read_en, clk) -> (data:8, valid):
  read_delay1 = dff(read_en, clk)
  data = dff8(addr[0:7], read_delay1)
  valid = read_delay1
`
      const result = validatePuzzle('flash_ctrl', brokenCode)
      expect(result.success).toBe(false)
    })

    it('should accept fixed code with dff(read_delay1, clk)', () => {
      const fixedCode = `
module flash_controller(addr:16, read_en, clk) -> (data:8, valid):
  read_delay1 = dff(read_en, clk)
  read_delay2 = dff(read_delay1, clk)
  data = dff8(addr[0:7], read_delay2)
  valid = read_delay2
`
      const result = validatePuzzle('flash_ctrl', fixedCode)
      expect(result.success).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle unknown puzzle ID', () => {
      const result = validatePuzzle('nonexistent_puzzle', 'module foo() -> out: out = 1')
      expect(result.success).toBe(false)
      expect(result.message).toContain('Unknown puzzle')
    })

    it('should handle invalid syntax', () => {
      const result = validatePuzzle('o2_sensor', 'this is not valid wire code')
      expect(result.success).toBe(false)
      // Pattern validation still runs but code doesn't contain the fix pattern
      expect(result.success).toBe(false)
    })

    it('should handle empty code', () => {
      const result = validatePuzzle('o2_sensor', '')
      expect(result.success).toBe(false)
    })
  })
})

describe('Quick Check', () => {
  it('should detect O2 sensor fix', () => {
    expect(quickCheckPuzzle('o2_sensor', 'level = sampled[0:7]')).toBe(true)
    expect(quickCheckPuzzle('o2_sensor', 'level = sampled[0:6]')).toBe(false)
  })

  it('should detect CO2 scrubber fix', () => {
    expect(quickCheckPuzzle('co2_scrubber', 'scrubber_on = not(diff[7])')).toBe(true)
    expect(quickCheckPuzzle('co2_scrubber', 'scrubber_on = diff[7]')).toBe(false)
  })

  it('should detect solar controller fix', () => {
    expect(quickCheckPuzzle('solar_ctrl', 'adder8(light, not8(threshold), 1)')).toBe(true)
    expect(quickCheckPuzzle('solar_ctrl', 'adder8(light, not8(threshold), 0)')).toBe(false)
  })

  it('should return false for unknown puzzle', () => {
    expect(quickCheckPuzzle('unknown', 'anything')).toBe(false)
  })
})
