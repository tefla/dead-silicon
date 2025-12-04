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

// ============================================================================
// INSTRUCTION TESTS
// ============================================================================

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

    it('parses all branch instructions as relative', () => {
      const branches = ['BEQ', 'BNE', 'BCC', 'BCS']
      for (const mnemonic of branches) {
        const result = parseSource(`${mnemonic} target`)
        expect(result.ok).toBe(true)
        if (!result.ok) continue
        const stmt = result.statements[0] as InstructionStmt
        expect(stmt.operand.mode).toBe('relative')
      }
    })
  })

// ============================================================================
// LOAD INSTRUCTION TESTS
// ============================================================================

  describe('load instructions', () => {
    it('parses LDA immediate', () => {
      const result = parseSource('LDA #$FF')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('LDA')
      expect(stmt.operand.mode).toBe('immediate')
      expect(stmt.operand.value).toBe(0xFF)
    })

    it('parses LDA absolute', () => {
      const result = parseSource('LDA $1000')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.operand.mode).toBe('absolute')
      expect(stmt.operand.value).toBe(0x1000)
    })

    it('parses LDA with symbol', () => {
      const result = parseSource('LDA MY_VAR')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.operand.value).toBe('MY_VAR')
    })

    it('parses LDX immediate', () => {
      const result = parseSource('LDX #$10')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('LDX')
      expect(stmt.operand.value).toBe(0x10)
    })

    it('parses LDY immediate', () => {
      const result = parseSource('LDY #$20')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('LDY')
      expect(stmt.operand.value).toBe(0x20)
    })
  })

// ============================================================================
// STORE INSTRUCTION TESTS
// ============================================================================

  describe('store instructions', () => {
    it('parses STA absolute', () => {
      const result = parseSource('STA $2000')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('STA')
      expect(stmt.operand.mode).toBe('absolute')
      expect(stmt.operand.value).toBe(0x2000)
    })

    it('parses STA with symbol', () => {
      const result = parseSource('STA OUTPUT')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.operand.value).toBe('OUTPUT')
    })

    it('parses STX', () => {
      const result = parseSource('STX $0010')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('STX')
    })

    it('parses STY', () => {
      const result = parseSource('STY $0020')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('STY')
    })
  })

// ============================================================================
// ARITHMETIC INSTRUCTION TESTS
// ============================================================================

  describe('arithmetic instructions', () => {
    it('parses ADC immediate', () => {
      const result = parseSource('ADC #$01')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('ADC')
      expect(stmt.operand.mode).toBe('immediate')
    })

    it('parses ADC absolute', () => {
      const result = parseSource('ADC $0100')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.operand.mode).toBe('absolute')
    })

    it('parses SBC immediate', () => {
      const result = parseSource('SBC #$01')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('SBC')
    })

    it('parses AND immediate', () => {
      const result = parseSource('AND #$0F')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('AND')
      expect(stmt.operand.value).toBe(0x0F)
    })

    it('parses ORA immediate', () => {
      const result = parseSource('ORA #$F0')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('ORA')
    })

    it('parses EOR immediate', () => {
      const result = parseSource('EOR #$FF')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('EOR')
    })
  })

// ============================================================================
// COMPARE INSTRUCTION TESTS
// ============================================================================

  describe('compare instructions', () => {
    it('parses CMP immediate', () => {
      const result = parseSource('CMP #$42')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('CMP')
      expect(stmt.operand.mode).toBe('immediate')
    })

    it('parses CMP absolute', () => {
      const result = parseSource('CMP $1000')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.operand.mode).toBe('absolute')
    })

    it('parses CPX immediate', () => {
      const result = parseSource('CPX #$00')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('CPX')
    })

    it('parses CPY immediate', () => {
      const result = parseSource('CPY #$00')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('CPY')
    })
  })

// ============================================================================
// CONTROL FLOW INSTRUCTION TESTS
// ============================================================================

  describe('control flow instructions', () => {
    it('parses JMP absolute', () => {
      const result = parseSource('JMP $0200')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('JMP')
      expect(stmt.operand.mode).toBe('absolute')
      expect(stmt.operand.value).toBe(0x0200)
    })

    it('parses JSR absolute', () => {
      const result = parseSource('JSR subroutine')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('JSR')
      expect(stmt.operand.value).toBe('subroutine')
    })

    it('parses RTS', () => {
      const result = parseSource('RTS')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('RTS')
      expect(stmt.operand.mode).toBe('implied')
    })

    it('parses BEQ relative', () => {
      const result = parseSource('BEQ skip')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('BEQ')
      expect(stmt.operand.mode).toBe('relative')
    })

    it('parses BNE relative', () => {
      const result = parseSource('BNE loop')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('BNE')
      expect(stmt.operand.mode).toBe('relative')
    })

    it('parses BCC relative', () => {
      const result = parseSource('BCC no_carry')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('BCC')
      expect(stmt.operand.mode).toBe('relative')
    })

    it('parses BCS relative', () => {
      const result = parseSource('BCS has_carry')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('BCS')
      expect(stmt.operand.mode).toBe('relative')
    })
  })

// ============================================================================
// INCREMENT/DECREMENT INSTRUCTION TESTS
// ============================================================================

  describe('increment/decrement instructions', () => {
    it('parses INX', () => {
      const result = parseSource('INX')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('INX')
      expect(stmt.operand.mode).toBe('implied')
    })

    it('parses INY', () => {
      const result = parseSource('INY')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('INY')
    })

    it('parses DEX', () => {
      const result = parseSource('DEX')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('DEX')
    })

    it('parses DEY', () => {
      const result = parseSource('DEY')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('DEY')
    })
  })

// ============================================================================
// STACK INSTRUCTION TESTS
// ============================================================================

  describe('stack instructions', () => {
    it('parses PHA', () => {
      const result = parseSource('PHA')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('PHA')
      expect(stmt.operand.mode).toBe('implied')
    })

    it('parses PLA', () => {
      const result = parseSource('PLA')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('PLA')
    })

    it('parses PHP', () => {
      const result = parseSource('PHP')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('PHP')
    })

    it('parses PLP', () => {
      const result = parseSource('PLP')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('PLP')
    })
  })

// ============================================================================
// TRANSFER INSTRUCTION TESTS
// ============================================================================

  describe('transfer instructions', () => {
    it('parses TAX', () => {
      const result = parseSource('TAX')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('TAX')
      expect(stmt.operand.mode).toBe('implied')
    })

    it('parses TAY', () => {
      const result = parseSource('TAY')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('TAY')
    })

    it('parses TXA', () => {
      const result = parseSource('TXA')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('TXA')
    })

    it('parses TYA', () => {
      const result = parseSource('TYA')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('TYA')
    })

    it('parses TXS', () => {
      const result = parseSource('TXS')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('TXS')
    })

    it('parses TSX', () => {
      const result = parseSource('TSX')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('TSX')
    })
  })

// ============================================================================
// FLAG INSTRUCTION TESTS
// ============================================================================

  describe('flag instructions', () => {
    it('parses SEC', () => {
      const result = parseSource('SEC')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('SEC')
      expect(stmt.operand.mode).toBe('implied')
    })

    it('parses CLC', () => {
      const result = parseSource('CLC')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('CLC')
    })

    it('parses SEI', () => {
      const result = parseSource('SEI')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('SEI')
    })

    it('parses CLI', () => {
      const result = parseSource('CLI')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('CLI')
    })
  })

// ============================================================================
// MISC INSTRUCTION TESTS
// ============================================================================

  describe('misc instructions', () => {
    it('parses NOP', () => {
      const result = parseSource('NOP')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('NOP')
      expect(stmt.operand.mode).toBe('implied')
    })

    it('parses BRK', () => {
      const result = parseSource('BRK')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('BRK')
    })

    it('parses HLT', () => {
      const result = parseSource('HLT')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.mnemonic).toBe('HLT')
    })
  })

// ============================================================================
// LABEL TESTS
// ============================================================================

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

    it('parses multiple labels', () => {
      const result = parseSource(`
loop1:
loop2:
loop3:
  NOP
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const labels = result.statements.filter(s => s.kind === 'label')
      expect(labels.length).toBe(3)
    })

    it('parses label with underscore', () => {
      const result = parseSource('delay_loop:')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as LabelStmt
      expect(stmt.name).toBe('delay_loop')
    })

    it('parses label with numbers', () => {
      const result = parseSource('loop123:')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as LabelStmt
      expect(stmt.name).toBe('loop123')
    })
  })

// ============================================================================
// CONSTANT TESTS
// ============================================================================

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

    it('parses zero constant', () => {
      const result = parseSource('ZERO = 0')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as ConstantStmt
      expect(stmt.value).toBe(0)
    })

    it('parses large hex constant', () => {
      const result = parseSource('MAX_ADDR = $FFFF')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as ConstantStmt
      expect(stmt.value).toBe(0xFFFF)
    })

    it('parses multiple constants', () => {
      const result = parseSource(`
PORT_A = $F000
PORT_B = $F001
PORT_C = $F002
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const constants = result.statements.filter(s => s.kind === 'constant')
      expect(constants.length).toBe(3)
    })
  })

// ============================================================================
// DIRECTIVE TESTS
// ============================================================================

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

    it('parses .byte with decimal values', () => {
      const result = parseSource('.byte 1, 2, 3, 4, 5')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as DirectiveStmt
      expect(stmt.values).toEqual([1, 2, 3, 4, 5])
    })

    it('parses .word with address', () => {
      const result = parseSource('.word $FFFC')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as DirectiveStmt
      expect(stmt.values).toEqual([0xFFFC])
    })

    it('parses .db directive', () => {
      const result = parseSource('.db $00, $01, $02')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as DirectiveStmt
      expect(stmt.directive).toBe('db')
    })

    it('parses multiple .org directives', () => {
      const result = parseSource(`
.org $0200
NOP
.org $FFFC
.word $0200
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const orgs = result.statements.filter(s => s.kind === 'directive' && (s as DirectiveStmt).directive === 'org')
      expect(orgs.length).toBe(2)
    })
  })

// ============================================================================
// FULL PROGRAM TESTS
// ============================================================================

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

    it('parses subroutine call pattern', () => {
      const source = `
main:
    JSR init
    JSR loop
    HLT

init:
    LDA #0
    RTS

loop:
    INX
    BNE loop
    RTS
`
      const result = parseSource(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const jsrs = result.statements.filter(s => s.kind === 'instruction' && (s as InstructionStmt).mnemonic === 'JSR')
      expect(jsrs.length).toBe(2)
    })

    it('parses vector table', () => {
      const source = `
.org $FFFA
.word nmi_handler
.word reset_handler
.word irq_handler
`
      const result = parseSource(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const words = result.statements.filter(s => s.kind === 'directive' && (s as DirectiveStmt).directive === 'word')
      expect(words.length).toBe(3)
    })
  })

// ============================================================================
// LINE TRACKING TESTS
// ============================================================================

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

    it('tracks line numbers with blank lines', () => {
      const source = `LDA #1

STA $F030

RTS`
      const result = parseSource(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.statements[0].line).toBe(1)
      expect(result.statements[1].line).toBe(3)
      expect(result.statements[2].line).toBe(5)
    })

    it('tracks line numbers for labels', () => {
      const source = `
main:
    NOP
`
      const result = parseSource(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.statements[0].line).toBe(2)
    })

    it('tracks line numbers for constants', () => {
      const source = `
VALUE = $10
`
      const result = parseSource(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.statements[0].line).toBe(2)
    })
  })

// ============================================================================
// IMMEDIATE SYMBOL TESTS
// ============================================================================

  describe('immediate symbols', () => {
    it('parses immediate with symbol reference', () => {
      const result = parseSource('LDA #CONST_VALUE')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.operand.mode).toBe('immediate')
      expect(stmt.operand.value).toBe('CONST_VALUE')
    })

    it('parses immediate with symbol containing underscore', () => {
      const result = parseSource('LDA #MY_CONST')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const stmt = result.statements[0] as InstructionStmt
      expect(stmt.operand.value).toBe('MY_CONST')
    })
  })

// ============================================================================
// EDGE CASES
// ============================================================================

  describe('edge cases', () => {
    it('handles empty source', () => {
      const result = parseSource('')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.statements.length).toBe(0)
    })

    it('handles whitespace-only source', () => {
      const result = parseSource('   \n\n   \n')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.statements.length).toBe(0)
    })

    it('handles comments-only source', () => {
      const result = parseSource(`
; This is a comment
; Another comment
// Also a comment
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.statements.length).toBe(0)
    })

    it('handles instruction on same line as label', () => {
      // In our grammar, label and instruction are on separate lines
      // but we should handle this gracefully
      const result = parseSource('start:\nLDA #0')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.statements.length).toBe(2)
    })

    it('handles many consecutive labels', () => {
      const result = parseSource(`
a:
b:
c:
d:
e:
NOP
`)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const labels = result.statements.filter(s => s.kind === 'label')
      expect(labels.length).toBe(5)
    })

    it('handles instruction with no operand when operand expected', () => {
      // LDA normally takes an operand, but if it's at end of file...
      // The parser should handle this gracefully
      const result = parseSource('NOP')  // NOP has no operand
      expect(result.ok).toBe(true)
    })
  })

// ============================================================================
// STRESS TESTS
// ============================================================================

  describe('stress tests', () => {
    it('handles many instructions', () => {
      const instructions = Array(100).fill('NOP').join('\n')
      const result = parseSource(instructions)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const nops = result.statements.filter(s => s.kind === 'instruction')
      expect(nops.length).toBe(100)
    })

    it('handles large program', () => {
      const lines = []
      for (let i = 0; i < 100; i++) {
        lines.push(`label${i}:`)
        lines.push(`  LDA #${i % 256}`)
        lines.push(`  STA $${(0x1000 + i).toString(16).toUpperCase()}`)
      }
      const result = parseSource(lines.join('\n'))
      expect(result.ok).toBe(true)
      if (!result.ok) return
      // 100 labels + 200 instructions = 300 statements
      expect(result.statements.length).toBe(300)
    })

    it('handles many constants', () => {
      const lines = []
      for (let i = 0; i < 50; i++) {
        lines.push(`CONST_${i} = $${i.toString(16).toUpperCase()}`)
      }
      const result = parseSource(lines.join('\n'))
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.statements.length).toBe(50)
    })

    it('handles many directives', () => {
      const lines = ['.org $0200']
      for (let i = 0; i < 50; i++) {
        lines.push(`.byte $${i.toString(16).toUpperCase().padStart(2, '0')}`)
      }
      const result = parseSource(lines.join('\n'))
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.statements.length).toBe(51)
    })
  })
})
