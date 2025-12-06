import { describe, it, expect } from 'vitest'
import { validatePuzzle, quickCheck } from './validator'

describe('Puzzle Validator with WASM Simulation', () => {
  describe('O2 Sensor Puzzle', () => {
    it('should reject the broken code with [0:6] slice', () => {
      const brokenCode = `
module o2_sensor(analog:8, clk) -> level:8:
  sampled = dff8(analog, clk)
  level = sampled[0:6]
`
      const result = validatePuzzle('o2_sensor', brokenCode)
      expect(result.success).toBe(false)
    })

    it('should accept the fixed code with [0:7] slice', () => {
      const fixedCode = `
module o2_sensor(analog:8, clk) -> level:8:
  sampled = dff8(analog, clk)
  level = sampled[0:7]
`
      const result = validatePuzzle('o2_sensor', fixedCode)
      expect(result.success).toBe(true)
      expect(result.message).toContain('passed')
    })
  })

  describe('CO2 Scrubber Puzzle', () => {
    it('should reject code with inverted comparison', () => {
      const brokenCode = `
module co2_scrubber(co2_level:8, threshold:8) -> scrubber_on:
  diff = adder8(co2_level, not8(threshold), 1)
  scrubber_on = diff.sum[7]
`
      const result = validatePuzzle('co2_scrubber', brokenCode)
      expect(result.success).toBe(false)
    })

    it('should accept fixed code with not(diff.sum[7])', () => {
      const fixedCode = `
module co2_scrubber(co2_level:8, threshold:8) -> scrubber_on:
  diff = adder8(co2_level, not8(threshold), 1)
  scrubber_on = not(diff.sum[7])
`
      const result = validatePuzzle('co2_scrubber', fixedCode)
      expect(result.success).toBe(true)
      expect(result.message).toContain('passed')
    })
  })

  describe('Solar Controller Puzzle', () => {
    it('should reject code with carry-in = 0', () => {
      const brokenCode = `
module solar_controller(light_level:8, threshold:8) -> charge_enable:
  diff = adder8(light_level, not8(threshold), 0)
  charge_enable = not(diff.sum[7])
`
      const result = validatePuzzle('solar_ctrl', brokenCode)
      expect(result.success).toBe(false)
    })

    it('should accept fixed code with carry-in = 1', () => {
      const fixedCode = `
module solar_controller(light_level:8, threshold:8) -> charge_enable:
  diff = adder8(light_level, not8(threshold), 1)
  charge_enable = not(diff.sum[7])
`
      const result = validatePuzzle('solar_ctrl', fixedCode)
      expect(result.success).toBe(true)
      expect(result.message).toContain('passed')
    })
  })

  describe('Battery Monitor Puzzle', () => {
    it('should accept fixed code with two delay stages', () => {
      const fixedCode = `
module battery_monitor(adc_data:8, clk) -> (level:8, valid):
  stage1 = dff8(adc_data, clk)
  stage2 = dff8(stage1, clk)
  level = stage2
  valid = 1
`
      const result = validatePuzzle('battery_mon', fixedCode)
      expect(result.success).toBe(true)
      expect(result.message).toContain('passed')
    })
  })

  describe('Flash Controller Puzzle', () => {
    it('should accept fixed code with double delay', () => {
      const fixedCode = `
module flash_controller(addr:16, read_en, clk) -> (data:8, valid):
  read_delay1 = dff(read_en, clk)
  read_delay2 = dff(read_delay1, clk)
  data = dff8(addr[0:7], read_delay2)
  valid = read_delay2
`
      const result = validatePuzzle('flash_ctrl', fixedCode)
      expect(result.success).toBe(true)
      expect(result.message).toContain('passed')
    })
  })

  describe('Error Handling', () => {
    it('should handle unknown puzzle ID', () => {
      const result = validatePuzzle('nonexistent', 'module foo() -> x: x = 0')
      expect(result.success).toBe(false)
      expect(result.message).toContain('Unknown puzzle')
    })

    it('should handle syntax errors', () => {
      const result = validatePuzzle('o2_sensor', 'this is not valid wire code')
      expect(result.success).toBe(false)
      expect(result.message).toContain('Compilation failed')
    })

    it('should handle empty code', () => {
      const result = validatePuzzle('o2_sensor', '')
      expect(result.success).toBe(false)
    })
  })

  describe('Quick Check', () => {
    it('should return ok:true for valid code', () => {
      const result = quickCheck(`
module test(a) -> out:
  out = not(a)
`)
      expect(result.ok).toBe(true)
    })

    it('should return ok:false for invalid code', () => {
      const result = quickCheck('invalid syntax')
      expect(result.ok).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
