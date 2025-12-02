import { describe, it, expect } from 'vitest'
import { lex, type Token } from './lexer'

// Helper to extract just types and values for easier testing
const tokenize = (source: string): { type: string; value: string }[] => {
  const result = lex(source)
  if (!result.ok) throw new Error(result.error.message)
  return result.tokens.map(t => ({ type: t.type, value: t.value }))
}

describe('Wire Lexer', () => {
  describe('basic tokens', () => {
    it('lexes empty source', () => {
      const tokens = tokenize('')
      expect(tokens).toEqual([{ type: 'EOF', value: '' }])
    })

    it('lexes identifiers', () => {
      const tokens = tokenize('foo bar_baz test123')
      expect(tokens.slice(0, 3)).toEqual([
        { type: 'IDENT', value: 'foo' },
        { type: 'IDENT', value: 'bar_baz' },
        { type: 'IDENT', value: 'test123' },
      ])
    })

    it('lexes numbers', () => {
      const tokens = tokenize('42 0xFF 0x10')
      expect(tokens.slice(0, 3)).toEqual([
        { type: 'NUMBER', value: '42' },
        { type: 'NUMBER', value: '0xFF' },
        { type: 'NUMBER', value: '0x10' },
      ])
    })

    it('lexes operators and delimiters', () => {
      const tokens = tokenize('-> : = , ( ) [ ] .')
      expect(tokens.slice(0, 9).map(t => t.type)).toEqual([
        'ARROW', 'COLON', 'EQUALS', 'COMMA',
        'LPAREN', 'RPAREN', 'LBRACKET', 'RBRACKET', 'DOT'
      ])
    })

    it('lexes module keyword', () => {
      const tokens = tokenize('module')
      expect(tokens[0]).toEqual({ type: 'MODULE', value: 'module' })
    })
  })

  describe('comments', () => {
    it('skips line comments', () => {
      const tokens = tokenize('foo ; this is a comment\nbar')
      const idents = tokens.filter(t => t.type === 'IDENT')
      expect(idents).toEqual([
        { type: 'IDENT', value: 'foo' },
        { type: 'IDENT', value: 'bar' },
      ])
    })
  })

  describe('module declarations', () => {
    it('lexes simple module header', () => {
      const tokens = tokenize('module not(a) -> out:')
      expect(tokens.map(t => t.type).filter(t => t !== 'NEWLINE')).toEqual([
        'MODULE', 'IDENT', 'LPAREN', 'IDENT', 'RPAREN',
        'ARROW', 'IDENT', 'COLON', 'EOF'
      ])
    })

    it('lexes module with width specifiers', () => {
      const tokens = tokenize('module add8(a:8, b:8) -> out:8:')
      const types = tokens.map(t => t.type).filter(t => t !== 'NEWLINE')
      expect(types).toContain('NUMBER')
      expect(tokens.filter(t => t.value === '8').length).toBe(3)
    })

    it('lexes module with multiple outputs', () => {
      const tokens = tokenize('module half_adder(a, b) -> (sum, carry):')
      const types = tokens.map(t => t.type).filter(t => t !== 'NEWLINE')
      expect(types.filter(t => t === 'LPAREN').length).toBe(2)
      expect(types.filter(t => t === 'RPAREN').length).toBe(2)
    })
  })

  describe('statements', () => {
    it('lexes assignment', () => {
      const tokens = tokenize('out = nand(a, b)')
      expect(tokens.map(t => t.type).filter(t => t !== 'NEWLINE' && t !== 'EOF')).toEqual([
        'IDENT', 'EQUALS', 'IDENT', 'LPAREN', 'IDENT', 'COMMA', 'IDENT', 'RPAREN'
      ])
    })

    it('lexes member access', () => {
      const tokens = tokenize('result.sum')
      expect(tokens.slice(0, 3)).toEqual([
        { type: 'IDENT', value: 'result' },
        { type: 'DOT', value: '.' },
        { type: 'IDENT', value: 'sum' },
      ])
    })

    it('lexes bus indexing', () => {
      const tokens = tokenize('value[0]')
      expect(tokens.slice(0, 4).map(t => t.type)).toEqual([
        'IDENT', 'LBRACKET', 'NUMBER', 'RBRACKET'
      ])
    })

    it('lexes bus slicing', () => {
      const tokens = tokenize('value[0:3]')
      expect(tokens.slice(0, 6).map(t => t.type)).toEqual([
        'IDENT', 'LBRACKET', 'NUMBER', 'COLON', 'NUMBER', 'RBRACKET'
      ])
    })
  })

  describe('indentation', () => {
    it('captures indentation in module body', () => {
      const source = `module not(a) -> out:
  out = nand(a, a)`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const indentToken = result.tokens.find(t => t.type === 'INDENT')
        expect(indentToken).toBeDefined()
        expect(indentToken?.value).toBe('  ')
      }
    })
  })

  describe('complete module', () => {
    it('lexes a full not gate module', () => {
      const source = `module not(a) -> out:
  out = nand(a, a)`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const types = result.tokens.map(t => t.type)
        expect(types).toContain('MODULE')
        expect(types).toContain('ARROW')
        expect(types).toContain('EQUALS')
        expect(types).toContain('INDENT')
      }
    })
  })

  describe('error handling', () => {
    it('reports unexpected characters', () => {
      const result = lex('foo @ bar')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('@')
      }
    })
  })
})
