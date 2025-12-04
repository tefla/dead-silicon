// Tests for compiler alias handling
// Tests for the three bugs fixed:
// 1. Aliases creating duplicate wires
// 2. Alias widths not being resolved correctly
// 3. Module output widths hardcoded to 1

import { describe, it, expect } from 'vitest'
import { createSimulator } from './simulator'
import { compile } from './compiler'
import { parse } from './parser'
import { lex } from './lexer'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load standard library
const gatesWire = readFileSync(resolve(__dirname, '../assets/wire/gates.wire'), 'utf-8')
const arithmeticWire = readFileSync(resolve(__dirname, '../assets/wire/arithmetic.wire'), 'utf-8')
const registersWire = readFileSync(resolve(__dirname, '../assets/wire/registers.wire'), 'utf-8')
const stdlib = gatesWire + '\n' + arithmeticWire + '\n' + registersWire

describe('Compiler Alias Bug Fixes', () => {
  describe('Bug 1: Aliases should not create duplicate wires', () => {
    const testModule = `
${stdlib}

module test_alias(d:8, en, clk) -> q:8:
  ; This creates an alias: result points to register8_out
  result = register8(d, en, clk)
  ; This should use the alias, not create a new wire
  q = result
`

    it('does not initialize alias wires to 0', () => {
      const result = createSimulator(testModule, 'test_alias')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Set d=0x42 and enable
      sim.setInput('d', 0x42)
      sim.setInput('en', 1)
      sim.setInput('clk', 0)
      sim.step()

      // Rising edge - should latch 0x42
      sim.setInput('clk', 1)
      sim.step()

      // Before the fix, 'result' would be initialized to 0, overriding the alias
      // After the fix, 'result' is just an alias to register8_out
      expect(sim.getOutput('q')).toBe(0x42)
    })

    it('compiles aliases correctly without duplicate wires', () => {
      const lexResult = lex(testModule)
      expect(lexResult.ok).toBe(true)
      if (!lexResult.ok) return

      const parseResult = parse(lexResult.tokens)
      expect(parseResult.ok).toBe(true)
      if (!parseResult.ok) return

      const compileResult = compile(parseResult.value)
      expect(compileResult.ok).toBe(true)
      if (!compileResult.ok) return

      const testAliasMod = compileResult.modules.get('test_alias')
      expect(testAliasMod).toBeDefined()
      if (!testAliasMod) return

      // 'result' should be in aliases map, not wires map
      expect(testAliasMod.aliases.has('result')).toBe(true)
      // 'result' should NOT be in wires map (before fix, it was)
      expect(testAliasMod.wires.has('result')).toBe(false)
    })
  })

  describe('Bug 2: Alias widths must be resolved through indirection', () => {
    const testModule = `
${stdlib}

module test_alias_width(d:8, en, clk) -> out:16:
  ; Create 8-bit aliases
  lo = register8(d, en, clk)
  hi = register8(d, en, clk)
  ; Concat should know that lo and hi are 8 bits, not 1 bit
  out = concat(hi, lo)
`

    it('resolves alias widths when used in concat', () => {
      const lexResult = lex(testModule)
      expect(lexResult.ok).toBe(true)
      if (!lexResult.ok) return

      const parseResult = parse(lexResult.tokens)
      expect(parseResult.ok).toBe(true)
      if (!parseResult.ok) return

      const compileResult = compile(parseResult.value)
      expect(compileResult.ok).toBe(true)
      if (!compileResult.ok) return

      const testMod = compileResult.modules.get('test_alias_width')
      expect(testMod).toBeDefined()
      if (!testMod) return

      // Find the concat node
      const concatNode = testMod.nodes.find(n => n.type === 'concat')
      expect(concatNode).toBeDefined()
      if (!concatNode) return

      // Before the fix: inputWidths would be [1, 1] because aliases defaulted to width 1
      // After the fix: inputWidths should be [8, 8]
      expect(concatNode.inputWidths).toEqual([8, 8])
      expect(concatNode.width).toBe(16)
    })

    it('produces correct output value with aliased inputs', () => {
      const result = createSimulator(testModule, 'test_alias_width')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Set d=0xAB, enable, and clock low
      sim.setInput('d', 0xAB)
      sim.setInput('en', 1)
      sim.setInput('clk', 0)
      sim.step()

      // Rising edge to latch
      sim.setInput('clk', 1)
      sim.step()

      // Should produce 0xABAB (hi=0xAB, lo=0xAB)
      expect(sim.getOutput('out')).toBe(0xABAB)
    })
  })

  describe('Bug 3: Module output widths must be looked up, not hardcoded', () => {
    const testModule = `
${stdlib}

; register8 returns 8 bits
module test_module_width(d:8, en, clk) -> out:16:
  ; Before fix: register8_out wire would be created with width=1
  ; After fix: register8_out should have width=8 from module definition
  byte1 = register8(d, en, clk)
  byte2 = register8(d, en, clk)
  out = concat(byte2, byte1)
`

    it('looks up module output widths from module definition', () => {
      const lexResult = lex(testModule)
      expect(lexResult.ok).toBe(true)
      if (!lexResult.ok) return

      const parseResult = parse(lexResult.tokens)
      expect(parseResult.ok).toBe(true)
      if (!parseResult.ok) return

      const compileResult = compile(parseResult.value)
      expect(compileResult.ok).toBe(true)
      if (!compileResult.ok) return

      const testMod = compileResult.modules.get('test_module_width')
      expect(testMod).toBeDefined()
      if (!testMod) return

      // Find register8 output wires
      const register8Nodes = testMod.nodes.filter(n => n.type === 'module' && n.moduleName === 'register8')
      expect(register8Nodes.length).toBe(2)

      // Before fix: output wires would have width=1 (hardcoded)
      // After fix: output wires should have width=8 (from register8 definition)
      for (const node of register8Nodes) {
        expect(node.width).toBe(8)
        const outputWire = node.outputs[0]
        expect(testMod.wires.get(outputWire)).toBe(8)
      }
    })

    it('produces correct 16-bit output from two 8-bit modules', () => {
      const result = createSimulator(testModule, 'test_module_width')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Set d=0x7F and enable
      sim.setInput('d', 0x7F)
      sim.setInput('en', 1)
      sim.setInput('clk', 0)
      sim.step()

      // Rising edge
      sim.setInput('clk', 1)
      sim.step()

      // Should produce 0x7F7F
      expect(sim.getOutput('out')).toBe(0x7F7F)
    })
  })

  describe('Integration: All three bugs together (register16 case)', () => {
    const testModule = `
${stdlib}

; This is the actual register16 pattern that exposed all three bugs
module register16_test(d:16, en, clk) -> q:16:
  ; Split into two 8-bit registers
  q_lo = register8(d[0:7], en, clk)   ; Bug 1: q_lo is an alias
  q_hi = register8(d[8:15], en, clk)  ; Bug 1: q_hi is an alias
  ; Bug 2: concat needs to resolve q_lo and q_hi widths through aliases
  ; Bug 3: register8 outputs must be 8 bits, not 1 bit
  q = concat(q_hi, q_lo)
`

    it('handles the full register16 pattern correctly', () => {
      const result = createSimulator(testModule, 'register16_test')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Test multiple values
      const testCases = [
        0x0000, 0xFFFF, 0x1234, 0xABCD, 0x00FF, 0xFF00, 0xAAAA, 0x5555
      ]

      for (const value of testCases) {
        sim.setInput('d', value)
        sim.setInput('en', 1)
        sim.setInput('clk', 0)
        sim.step()

        sim.setInput('clk', 1)
        sim.step()

        expect(sim.getOutput('q')).toBe(value)
      }
    })

    it('compiles with correct alias and width information', () => {
      const lexResult = lex(testModule)
      expect(lexResult.ok).toBe(true)
      if (!lexResult.ok) return

      const parseResult = parse(lexResult.tokens)
      expect(parseResult.ok).toBe(true)
      if (!parseResult.ok) return

      const compileResult = compile(parseResult.value)
      expect(compileResult.ok).toBe(true)
      if (!compileResult.ok) return

      const testMod = compileResult.modules.get('register16_test')
      expect(testMod).toBeDefined()
      if (!testMod) return

      // Bug 1: q_lo and q_hi should be aliases, not wires
      expect(testMod.aliases.has('q_lo')).toBe(true)
      expect(testMod.aliases.has('q_hi')).toBe(true)
      expect(testMod.wires.has('q_lo')).toBe(false)
      expect(testMod.wires.has('q_hi')).toBe(false)

      // Bug 3: register8 outputs should be 8 bits
      const register8Nodes = testMod.nodes.filter(n => n.type === 'module' && n.moduleName === 'register8')
      for (const node of register8Nodes) {
        expect(node.width).toBe(8)
      }

      // Bug 2: concat should have inputWidths [8, 8]
      const concatNode = testMod.nodes.find(n => n.type === 'concat')
      expect(concatNode).toBeDefined()
      if (!concatNode) return
      expect(concatNode.inputWidths).toEqual([8, 8])
    })
  })

  describe('Edge case: Chain of aliases', () => {
    const testModule = `
${stdlib}

module test_alias_chain(d:8, en, clk) -> out:8:
  a = register8(d, en, clk)
  b = a
  c = b
  d_alias = c
  out = d_alias
`

    it('resolves through multiple levels of aliases', () => {
      const lexResult = lex(testModule)
      expect(lexResult.ok).toBe(true)
      if (!lexResult.ok) return

      const parseResult = parse(lexResult.tokens)
      expect(parseResult.ok).toBe(true)
      if (!parseResult.ok) return

      const compileResult = compile(parseResult.value)
      expect(compileResult.ok).toBe(true)
      if (!compileResult.ok) return

      const testMod = compileResult.modules.get('test_alias_chain')
      expect(testMod).toBeDefined()
      if (!testMod) return

      // All should be aliases pointing through the chain
      expect(testMod.aliases.has('a')).toBe(true)
      expect(testMod.aliases.has('b')).toBe(true)
      expect(testMod.aliases.has('c')).toBe(true)
      expect(testMod.aliases.has('d_alias')).toBe(true)
    })

    it('produces correct output through alias chain', () => {
      const result = createSimulator(testModule, 'test_alias_chain')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sim = result.simulator

      // Set inputs and clock low
      sim.setInput('d', 0x99)
      sim.setInput('en', 1)
      sim.setInput('clk', 0)
      sim.step()

      // Rising edge to latch
      sim.setInput('clk', 1)
      sim.step()

      expect(sim.getOutput('out')).toBe(0x99)
    })
  })
})
