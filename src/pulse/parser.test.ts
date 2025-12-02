import { describe, it, expect } from 'vitest'
import { lex } from './lexer'
import { parse, Statement, InstructionStmt, LabelStmt, ConstantStmt, DirectiveStmt } from './parser'

const parseSource = (source: string) => {
  const lexResult = lex(source)
  expect(lexResult.ok).toBe(true)
  if (!lexResult.ok) return { ok: false, error: lexResult.error }
  return parse(lexResult.tokens)
}

describe('Pulse Parser', () => {
  describe('instructions', () => {
    it('parses implied instruction', () => {
      const result = parseSource('RTS')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.statements.length).toBe(1)
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.kind).toBe('instruction')
      expect(stmt.mnemonic).toBe('RTS')
      expect(stmt.operand.mode).toBe('implied')
    })

    it('parses immediate instruction', () => {
      const result = parseSource('LDA #$42')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.kind).toBe('instruction')
      expect(stmt.mnemonic).toBe('LDA')
      expect(stmt.operand.mode).toBe('immediate')
      expect(stmt.operand.value).toBe(0x42)
    })

    it('parses decimal immediate', () => {
      const result = parseSource('LDA #255')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.operand.value).toBe(255)
    })

    it('parses absolute instruction', () => {
      const result = parseSource('STA $F030')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('STA')
      expect(stmt.operand.mode).toBe('absolute')
      expect(stmt.operand.value).toBe(0xF030)
    })

    it('parses jump with symbol', () => {
      const result = parseSource('JMP main_loop')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('JMP')
      expect(stmt.operand.mode).toBe('absolute')
      expect(stmt.operand.value).toBe('main_loop')
    })

    it('parses branch as relative', () => {
      const result = parseSource('BNE loop')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('BNE')
      expect(stmt.operand.mode).toBe('relative')
      expect(stmt.operand.value).toBe('loop')
    })

    it('parses all implied instructions', () => {
      const implied = ['RTS', 'NOP', 'INX', 'DEX', 'INY', 'DEY', 'TAX', 'PHA', 'PLA']
      for (const mnemonic of implied) {
        const result = parseSource(mnemonic)
        expect(result.ok).toBe(true)
        if (!result.ok) continue
        const stmt = result.statements[0] as InstructionStmt
        expect(stmt.operand.mode).toBe('implied')
      }
    })
  })

  describe('labels', () => {
    it('parses label definition', () => {
      const result = parseSource('main_loop:')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const stmt = result.statements[0] as LabelStmt
      expect(stmt.kind).toBe('label')
      expect(stmt.name).toBe('main_loop')
    })

    it('parses label followed by instruction', () => {
      const result = parseSource('start:\n  LDA #0')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.statements.length).toBe(2)
      expect((result.statements[0] as LabelStmt).kind).toBe('label')
      expect((result.statements[1] as InstructionStmt).kind).toBe('instruction')
    })
  })

  describe('constants', () => {
    it('parses hex constant', () => {
      const result = parseSource('LED_PORT = $F030')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const stmt = result.statements[0] as ConstantStmt
      expect(stmt.kind).toBe('constant')
      expect(stmt.name).toBe('LED_PORT')
      expect(stmt.value).toBe(0xF030)
    })

    it('parses decimal constant', () => {
      const result = parseSource('DELAY = 255')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const stmt = result.statements[0] as ConstantStmt
      expect(stmt.value).toBe(255)
    })
  })

  describe('directives', () => {
    it('parses .org directive', () => {
      const result = parseSource('.org $0200')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const stmt = result.statements[0] as DirectiveStmt
      expect(stmt.kind).toBe('directive')
      expect(stmt.directive).toBe('org')
      expect(stmt.values).toEqual([0x0200])
    })

    it('parses .word directive with symbol', () => {
      const result = parseSource('.word reset')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const stmt = result.statements[0] as DirectiveStmt
      expect(stmt.directive).toBe('word')
      expect(stmt.values).toEqual(['reset'])
    })

    it('parses .byte directive with multiple values', () => {
      const result = parseSource('.byte $48, $45, $4C')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const stmt = result.statements[0] as DirectiveStmt
      expect(stmt.directive).toBe('byte')
      expect(stmt.values).toEqual([0x48, 0x45, 0x4C])
    })
  })

  describe('full program', () => {
    it('parses LED demo structure', () => {
      const source = `
LED_PORT = $F030

.org $0200
main:
    LDA #1
    STA LED_PORT
    LDA #0
    STA LED_PORT
    JMP main
`
      const result = parseSource(source)
      expect(result.ok).toBe(true)
      if (!result.ok) {
        console.log(result.error)
        return
      }

      const kinds = result.statements.map(s => s.kind)
      expect(kinds).toEqual([
        'constant',    // LED_PORT = $F030
        'directive',   // .org $0200
        'label',       // main:
        'instruction', // LDA #1
        'instruction', // STA LED_PORT
        'instruction', // LDA #0
        'instruction', // STA LED_PORT
        'instruction', // JMP main
      ])

      // Check LED_PORT constant
      const constant = result.statements[0] as ConstantStmt
      expect(constant.name).toBe('LED_PORT')
      expect(constant.value).toBe(0xF030)

      // Check .org directive
      const org = result.statements[1] as DirectiveStmt
      expect(org.values[0]).toBe(0x0200)

      // Check STA uses symbol reference
      const sta = result.statements[4] as InstructionStmt
      expect(sta.mnemonic).toBe('STA')
      expect(sta.operand.value).toBe('LED_PORT')

      // Check JMP uses symbol reference
      const jmp = result.statements[7] as InstructionStmt
      expect(jmp.operand.value).toBe('main')
    })

    it('parses delay loop with branches', () => {
      const source = `
delay:
    LDX #$FF
delay_loop:
    DEX
    BNE delay_loop
    RTS
`
      const result = parseSource(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      // 2 labels + 4 instructions = 6 statements
      expect(result.statements.length).toBe(6)

      const bne = result.statements[4] as InstructionStmt
      expect(bne.mnemonic).toBe('BNE')
      expect(bne.operand.mode).toBe('relative')
      expect(bne.operand.value).toBe('delay_loop')
    })
  })

  describe('line tracking', () => {
    it('tracks line numbers correctly', () => {
      const source = `LDA #1
STA $F030
RTS`
      const result = parseSource(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.statements[0].line).toBe(1)
      expect(result.statements[1].line).toBe(2)
      expect(result.statements[2].line).toBe(3)
    })
  })
})
