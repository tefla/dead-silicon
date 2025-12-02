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
  })

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
  })

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
  })

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
  })

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
  })

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
  })

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
  })

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
  })

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
  })

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
  })

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
    })

    it('errors on empty immediate after #', () => {
      const result = lex('LDA #')
      expect(result.ok).toBe(false)
    })
  })
})
