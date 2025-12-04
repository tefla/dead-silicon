import { describe, it, expect } from 'vitest'
import { lex, Token } from './lexer'

describe('Pulse Lexer', () => {
  const getTokenTypes = (source: string): string[] => {
    const result = lex(source)
    expect(result.ok).toBe(true)
    if (!result.ok) return []
    return result.tokens.map(t => t.type)
  }

  const getTokenValues = (source: string): string[] => {
    const result = lex(source)
    expect(result.ok).toBe(true)
    if (!result.ok) return []
    return result.tokens.map(t => t.value)
  }

  const tokenize = (source: string): Token[] => {
    const result = lex(source)
    expect(result.ok).toBe(true)
    if (!result.ok) return []
    return result.tokens
  }

// ============================================================================
// MNEMONIC TESTS
// ============================================================================

  describe('mnemonics', () => {
    it('recognizes basic mnemonics', () => {
      expect(getTokenTypes('LDA')).toEqual(['MNEMONIC', 'NEWLINE', 'EOF'])
      expect(getTokenTypes('STA')).toEqual(['MNEMONIC', 'NEWLINE', 'EOF'])
      expect(getTokenTypes('JMP')).toEqual(['MNEMONIC', 'NEWLINE', 'EOF'])
    })

    it('is case-insensitive', () => {
      expect(getTokenValues('lda')).toContain('LDA')
      expect(getTokenValues('Lda')).toContain('LDA')
      expect(getTokenValues('LDA')).toContain('LDA')
    })

    it('recognizes all minimal instruction set', () => {
      const mnemonics = ['LDA', 'STA', 'JMP', 'JSR', 'RTS', 'LDX', 'DEX', 'BNE']
      for (const m of mnemonics) {
        expect(getTokenTypes(m)).toEqual(['MNEMONIC', 'NEWLINE', 'EOF'])
      }
    })

    it('recognizes load instructions', () => {
      const loads = ['LDA', 'LDX', 'LDY']
      for (const m of loads) {
        expect(getTokenTypes(m)).toEqual(['MNEMONIC', 'NEWLINE', 'EOF'])
        expect(getTokenValues(m)).toContain(m)
      }
    })

    it('recognizes store instructions', () => {
      const stores = ['STA', 'STX', 'STY']
      for (const m of stores) {
        expect(getTokenTypes(m)).toEqual(['MNEMONIC', 'NEWLINE', 'EOF'])
        expect(getTokenValues(m)).toContain(m)
      }
    })

    it('recognizes arithmetic instructions', () => {
      const arith = ['ADC', 'SBC', 'AND', 'ORA', 'EOR']
      for (const m of arith) {
        expect(getTokenTypes(m)).toEqual(['MNEMONIC', 'NEWLINE', 'EOF'])
      }
    })

    it('recognizes compare instructions', () => {
      const compares = ['CMP', 'CPX', 'CPY']
      for (const m of compares) {
        expect(getTokenTypes(m)).toEqual(['MNEMONIC', 'NEWLINE', 'EOF'])
      }
    })

    it('recognizes control flow instructions', () => {
      const control = ['JMP', 'JSR', 'RTS', 'BEQ', 'BNE', 'BCC', 'BCS']
      for (const m of control) {
        expect(getTokenTypes(m)).toEqual(['MNEMONIC', 'NEWLINE', 'EOF'])
      }
    })

    it('recognizes increment/decrement instructions', () => {
      const incdec = ['INX', 'INY', 'DEX', 'DEY']
      for (const m of incdec) {
        expect(getTokenTypes(m)).toEqual(['MNEMONIC', 'NEWLINE', 'EOF'])
      }
    })

    it('recognizes stack instructions', () => {
      const stack = ['PHA', 'PLA', 'PHP', 'PLP']
      for (const m of stack) {
        expect(getTokenTypes(m)).toEqual(['MNEMONIC', 'NEWLINE', 'EOF'])
      }
    })

    it('recognizes transfer instructions', () => {
      const transfers = ['TAX', 'TAY', 'TXA', 'TYA', 'TXS', 'TSX']
      for (const m of transfers) {
        expect(getTokenTypes(m)).toEqual(['MNEMONIC', 'NEWLINE', 'EOF'])
      }
    })

    it('recognizes flag instructions', () => {
      const flags = ['SEC', 'CLC', 'SEI', 'CLI']
      for (const m of flags) {
        expect(getTokenTypes(m)).toEqual(['MNEMONIC', 'NEWLINE', 'EOF'])
      }
    })

    it('recognizes misc instructions', () => {
      const misc = ['NOP', 'BRK', 'HLT']
      for (const m of misc) {
        expect(getTokenTypes(m)).toEqual(['MNEMONIC', 'NEWLINE', 'EOF'])
      }
    })

    it('recognizes mixed case variants', () => {
      const variants = ['lda', 'Lda', 'lDa', 'ldA', 'LdA', 'LDA']
      for (const v of variants) {
        expect(getTokenValues(v)).toContain('LDA')
      }
    })
  })

// ============================================================================
// IMMEDIATE VALUE TESTS
// ============================================================================

  describe('immediate values', () => {
    it('parses hex immediate', () => {
      const result = lex('LDA #$42')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].type).toBe('IMMEDIATE')
      expect(result.tokens[1].value).toBe('#$42')
    })

    it('parses decimal immediate', () => {
      const result = lex('LDA #255')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].type).toBe('IMMEDIATE')
      expect(result.tokens[1].value).toBe('#255')
    })

    it('parses symbol immediate', () => {
      const result = lex('LDA #CONST')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].type).toBe('IMMEDIATE')
      expect(result.tokens[1].value).toBe('#CONST')
    })

    it('normalizes hex to uppercase', () => {
      const result = lex('LDA #$ff')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].value).toBe('#$FF')
    })

    it('parses #$00', () => {
      const result = lex('LDA #$00')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].value).toBe('#$00')
    })

    it('parses #$FF', () => {
      const result = lex('LDA #$FF')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].value).toBe('#$FF')
    })

    it('parses #0', () => {
      const result = lex('LDA #0')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].value).toBe('#0')
    })

    it('parses #1', () => {
      const result = lex('LDA #1')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].value).toBe('#1')
    })

    it('parses large decimal immediate', () => {
      const result = lex('LDA #12345')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].value).toBe('#12345')
    })

    it('parses immediate with symbol containing underscore', () => {
      const result = lex('LDA #MY_CONST')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].value).toBe('#MY_CONST')
    })

    it('parses immediate with symbol containing numbers', () => {
      const result = lex('LDA #VAR123')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].value).toBe('#VAR123')
    })

    it('parses multi-digit hex immediate', () => {
      const result = lex('LDA #$ABCD')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].value).toBe('#$ABCD')
    })
  })

// ============================================================================
// ADDRESS TESTS
// ============================================================================

  describe('addresses', () => {
    it('parses hex address', () => {
      const result = lex('STA $F030')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].type).toBe('ADDRESS')
      expect(result.tokens[1].value).toBe('$F030')
    })

    it('parses 4-digit hex address', () => {
      const result = lex('JMP $FFFC')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].value).toBe('$FFFC')
    })

    it('parses 2-digit hex address (zero page)', () => {
      const result = lex('LDA $00')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].value).toBe('$00')
    })

    it('parses single digit hex address', () => {
      const result = lex('LDA $F')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].value).toBe('$F')
    })

    it('normalizes hex address to uppercase', () => {
      const result = lex('STA $f030')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].value).toBe('$F030')
    })

    it('parses $0000', () => {
      const result = lex('LDA $0000')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].value).toBe('$0000')
    })

    it('parses $FFFF', () => {
      const result = lex('LDA $FFFF')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].value).toBe('$FFFF')
    })

    it('parses mixed case hex digits', () => {
      const result = lex('LDA $aBcD')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].value).toBe('$ABCD')
    })
  })

// ============================================================================
// LABEL TESTS
// ============================================================================

  describe('labels', () => {
    it('parses label definition', () => {
      const result = lex('main_loop:')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].type).toBe('LABEL')
      expect(result.tokens[0].value).toBe('main_loop')
    })

    it('parses label reference (as IDENT)', () => {
      const result = lex('JMP main_loop')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].type).toBe('IDENT')
      expect(result.tokens[1].value).toBe('main_loop')
    })

    it('parses simple label', () => {
      const result = lex('start:')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].type).toBe('LABEL')
      expect(result.tokens[0].value).toBe('start')
    })

    it('parses label with numbers', () => {
      const result = lex('loop1:')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].value).toBe('loop1')
    })

    it('parses label with underscores', () => {
      const result = lex('delay_inner_loop:')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].value).toBe('delay_inner_loop')
    })

    it('parses single character label', () => {
      const result = lex('L:')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].value).toBe('L')
    })

    it('parses label starting with underscore', () => {
      const result = lex('_private:')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].value).toBe('_private')
    })
  })

// ============================================================================
// DIRECTIVE TESTS
// ============================================================================

  describe('directives', () => {
    it('parses .org directive', () => {
      const result = lex('.org $0200')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].type).toBe('DIRECTIVE')
      expect(result.tokens[0].value).toBe('.org')
      expect(result.tokens[1].type).toBe('ADDRESS')
    })

    it('parses .word directive', () => {
      const result = lex('.word reset')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].type).toBe('DIRECTIVE')
      expect(result.tokens[0].value).toBe('.word')
      expect(result.tokens[1].type).toBe('IDENT')
    })

    it('parses .byte directive', () => {
      const result = lex('.byte $48')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].type).toBe('DIRECTIVE')
      expect(result.tokens[0].value).toBe('.byte')
    })

    it('normalizes directive to lowercase', () => {
      const result = lex('.ORG $0200')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].value).toBe('.org')
    })

    it('parses .db directive', () => {
      const result = lex('.db $00')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].value).toBe('.db')
    })

    it('parses directive with multiple values', () => {
      const result = lex('.byte $48, $45, $4C')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const types = result.tokens.map(t => t.type)
      expect(types).toContain('COMMA')
    })
  })

// ============================================================================
// CONSTANT TESTS
// ============================================================================

  describe('constants', () => {
    it('parses constant definition', () => {
      const result = lex('LED_PORT = $F030')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].type).toBe('IDENT')
      expect(result.tokens[0].value).toBe('LED_PORT')
      expect(result.tokens[1].type).toBe('EQUALS')
      expect(result.tokens[2].type).toBe('ADDRESS')
    })

    it('parses decimal constant', () => {
      const result = lex('DELAY = 255')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[2].type).toBe('NUMBER')
      expect(result.tokens[2].value).toBe('255')
    })

    it('parses constant with spaces around equals', () => {
      const result = lex('VALUE   =   $10')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].value).toBe('VALUE')
      expect(result.tokens[1].type).toBe('EQUALS')
      expect(result.tokens[2].value).toBe('$10')
    })
  })

// ============================================================================
// INDEXED ADDRESSING TESTS
// ============================================================================

  describe('indexed addressing', () => {
    it('parses X-indexed addressing', () => {
      const result = lex('LDA $0200,X')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].type).toBe('MNEMONIC')
      expect(result.tokens[1].type).toBe('ADDRESS')
      expect(result.tokens[2].type).toBe('COMMA')
      expect(result.tokens[3].type).toBe('IDENT')
      expect(result.tokens[3].value).toBe('X')
    })

    it('parses Y-indexed addressing', () => {
      const result = lex('LDA $0200,Y')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[3].value).toBe('Y')
    })

    it('parses zero page indexed', () => {
      const result = lex('LDA $00,X')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].value).toBe('$00')
      expect(result.tokens[3].value).toBe('X')
    })
  })

// ============================================================================
// COMMENT TESTS
// ============================================================================

  describe('comments', () => {
    it('skips semicolon comments', () => {
      const result = lex('LDA #$42 ; load value')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens.length).toBe(4) // MNEMONIC, IMMEDIATE, NEWLINE, EOF
    })

    it('handles comment-only lines', () => {
      const result = lex('; this is a comment\nLDA #$42')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].type).toBe('MNEMONIC')
    })

    it('skips double-slash comments', () => {
      const result = lex('LDA #$42 // load value')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens.length).toBe(4)
    })

    it('handles multiple comments', () => {
      const source = `; header comment
LDA #$42 ; inline comment
; another comment
STA $F030`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const mnemonics = result.tokens.filter(t => t.type === 'MNEMONIC')
      expect(mnemonics.length).toBe(2)
    })

    it('handles comment at end of file', () => {
      const result = lex('LDA #$42 ; final comment')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[result.tokens.length - 1].type).toBe('EOF')
    })

    it('handles empty comment', () => {
      const result = lex('LDA #$42 ;')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens.length).toBe(4)
    })
  })

// ============================================================================
// NUMBER TESTS
// ============================================================================

  describe('numbers', () => {
    it('parses decimal numbers', () => {
      const result = lex('CONST = 123')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[2].type).toBe('NUMBER')
      expect(result.tokens[2].value).toBe('123')
    })

    it('parses zero', () => {
      const result = lex('CONST = 0')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[2].value).toBe('0')
    })

    it('parses large numbers', () => {
      const result = lex('CONST = 65535')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[2].value).toBe('65535')
    })

    it('parses numbers as operands', () => {
      const result = lex('LDA 255')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].type).toBe('NUMBER')
    })
  })

// ============================================================================
// MULTILINE TESTS
// ============================================================================

  describe('multiline', () => {
    it('handles multiple lines', () => {
      const source = `
        LDA #$42
        STA $F030
      `
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const mnemonics = result.tokens.filter(t => t.type === 'MNEMONIC')
      expect(mnemonics.length).toBe(2)
      expect(mnemonics[0].value).toBe('LDA')
      expect(mnemonics[1].value).toBe('STA')
    })

    it('tracks line numbers correctly', () => {
      const source = `LDA #1
STA $F030
JMP main`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const mnemonics = result.tokens.filter(t => t.type === 'MNEMONIC')
      expect(mnemonics[0].line).toBe(1)
      expect(mnemonics[1].line).toBe(2)
      expect(mnemonics[2].line).toBe(3)
    })

    it('handles blank lines', () => {
      const source = `LDA #1

STA $F030

JMP main`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const mnemonics = result.tokens.filter(t => t.type === 'MNEMONIC')
      expect(mnemonics.length).toBe(3)
    })

    it('handles consecutive newlines', () => {
      const source = `LDA #1


STA $F030`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const newlines = result.tokens.filter(t => t.type === 'NEWLINE')
      // Should collapse consecutive newlines
      expect(newlines.length).toBeLessThanOrEqual(3)
    })

    it('handles leading blank lines', () => {
      const source = `

LDA #1`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].type).toBe('MNEMONIC')
    })

    it('handles trailing blank lines', () => {
      const source = `LDA #1

`
      const result = lex(source)
      expect(result.ok).toBe(true)
    })
  })

// ============================================================================
// FULL PROGRAM TESTS
// ============================================================================

  describe('full program', () => {
    it('lexes LED demo program', () => {
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
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (!result.ok) {
        console.log(result.error)
        return
      }

      // Check we got expected token types
      const types = result.tokens.map(t => t.type)
      expect(types).toContain('IDENT')      // LED_PORT
      expect(types).toContain('EQUALS')     // =
      expect(types).toContain('ADDRESS')    // $F030
      expect(types).toContain('DIRECTIVE')  // .org
      expect(types).toContain('LABEL')      // main:
      expect(types).toContain('MNEMONIC')   // LDA, STA, JMP
      expect(types).toContain('IMMEDIATE')  // #1, #0
    })

    it('lexes delay subroutine', () => {
      const source = `
delay:
    LDX #$FF
delay_loop:
    DEX
    BNE delay_loop
    RTS
`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const labels = result.tokens.filter(t => t.type === 'LABEL')
      expect(labels.length).toBe(2)
      expect(labels[0].value).toBe('delay')
      expect(labels[1].value).toBe('delay_loop')
    })

    it('lexes vector table', () => {
      const source = `
.org $FFFC
.word reset
.word reset
`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const directives = result.tokens.filter(t => t.type === 'DIRECTIVE')
      expect(directives.length).toBe(3)
    })
  })

// ============================================================================
// POSITION TRACKING TESTS
// ============================================================================

  describe('position tracking', () => {
    it('tracks column numbers', () => {
      const result = lex('  LDA #$42')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.tokens[0].column).toBe(3)  // LDA after 2 spaces
    })

    it('tracks multiple token columns', () => {
      const result = lex('LDA #$42')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.tokens[0].column).toBe(1)  // LDA
      expect(result.tokens[1].column).toBe(5)  // #$42
    })

    it('tracks line and column after newline', () => {
      const source = `LDA #1
STA $F030`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const sta = result.tokens.find(t => t.value === 'STA')
      expect(sta?.line).toBe(2)
      expect(sta?.column).toBe(1)
    })
  })

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

  describe('error cases', () => {
    it('errors on invalid character', () => {
      const result = lex('LDA @invalid')
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error.message).toContain('Unexpected character')
    })

    it('errors on empty hex after $', () => {
      const result = lex('LDA $')
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error.message).toContain('hex digits')
    })

    it('errors on empty immediate after #', () => {
      const result = lex('LDA #')
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error.message).toContain('value after #')
    })

    it('errors on empty hex immediate', () => {
      const result = lex('LDA #$')
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error.message).toContain('hex digits')
    })

    it('reports correct line for error', () => {
      const source = `LDA #1
STA $F030
LDA @`
      const result = lex(source)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error.line).toBe(3)
    })

    it('reports correct column for error', () => {
      const result = lex('   @')
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error.column).toBe(4)
    })

    it('errors on percent sign', () => {
      const result = lex('LDA %101')
      expect(result.ok).toBe(false)
    })

    it('errors on curly brace', () => {
      const result = lex('LDA {$42}')
      expect(result.ok).toBe(false)
    })

    it('errors on square bracket', () => {
      const result = lex('LDA [$42]')
      expect(result.ok).toBe(false)
    })
  })

// ============================================================================
// EDGE CASES
// ============================================================================

  describe('edge cases', () => {
    it('handles empty source', () => {
      const result = lex('')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens.length).toBe(1)
      expect(result.tokens[0].type).toBe('EOF')
    })

    it('handles whitespace-only source', () => {
      const result = lex('   \t  \n  \t  ')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[result.tokens.length - 1].type).toBe('EOF')
    })

    it('handles tabs', () => {
      const result = lex('\tLDA\t#$42')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].type).toBe('MNEMONIC')
    })

    it('handles very long identifiers', () => {
      const longName = 'a'.repeat(100)
      const result = lex(`${longName}:`)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].value).toBe(longName)
    })

    it('handles very long hex addresses', () => {
      const result = lex('LDA $FFFFFFFF')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[1].value).toBe('$FFFFFFFF')
    })

    it('distinguishes similar mnemonics and identifiers', () => {
      // LDA is a mnemonic, LDAX is not
      const result1 = lex('LDA')
      expect(result1.ok).toBe(true)
      if (result1.ok) expect(result1.tokens[0].type).toBe('MNEMONIC')

      const result2 = lex('LDAX')
      expect(result2.ok).toBe(true)
      if (result2.ok) expect(result2.tokens[0].type).toBe('IDENT')
    })

    it('handles mnemonic as part of identifier', () => {
      // LDA_LOOP should be IDENT, not MNEMONIC
      const result = lex('LDA_LOOP:')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].type).toBe('LABEL')
    })

    it('handles JEQ alias for BEQ-style jump', () => {
      const result = lex('JEQ target')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].type).toBe('MNEMONIC')
      expect(result.tokens[0].value).toBe('JEQ')
    })

    it('handles JNE alias', () => {
      const result = lex('JNE target')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.tokens[0].type).toBe('MNEMONIC')
    })
  })

// ============================================================================
// STRESS TESTS
// ============================================================================

  describe('stress tests', () => {
    it('handles many instructions', () => {
      const instructions = Array(100).fill('NOP').join('\n')
      const result = lex(instructions)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const nops = result.tokens.filter(t => t.value === 'NOP')
      expect(nops.length).toBe(100)
    })

    it('handles very long source', () => {
      const lines = []
      for (let i = 0; i < 1000; i++) {
        lines.push(`label${i}: LDA #${i % 256}`)
      }
      const result = lex(lines.join('\n'))
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const labels = result.tokens.filter(t => t.type === 'LABEL')
      expect(labels.length).toBe(1000)
    })

    it('handles rapid mnemonics on same line (via comma)', () => {
      // This tests the lexer handles commas correctly
      const result = lex('.byte $00, $01, $02, $03, $04')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      const commas = result.tokens.filter(t => t.type === 'COMMA')
      expect(commas.length).toBe(4)
    })
  })
})
