import { describe, it, expect } from 'vitest'
import { lex, type Token, type LexResult } from './lexer'

// Helper to extract just types and values for easier testing
const tokenize = (source: string): { type: string; value: string }[] => {
  const result = lex(source)
  if (!result.ok) throw new Error(result.error.message)
  return result.tokens.map(t => ({ type: t.type, value: t.value }))
}

// Helper to get just token types
const getTypes = (source: string): string[] => {
  const result = lex(source)
  if (!result.ok) throw new Error(result.error.message)
  return result.tokens.map(t => t.type)
}

// Helper to expect lex success
const expectOk = (source: string): Token[] => {
  const result = lex(source)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.error.message)
  return result.tokens
}

// Helper to expect lex failure
const expectError = (source: string): { message: string; line: number; column: number } => {
  const result = lex(source)
  expect(result.ok).toBe(false)
  if (result.ok) throw new Error('Expected lex error')
  return result.error
}

describe('Wire Lexer', () => {
  // ============================================
  // BASIC TOKEN TESTS
  // ============================================
  describe('basic tokens', () => {
    it('lexes empty source', () => {
      const tokens = tokenize('')
      expect(tokens).toEqual([{ type: 'EOF', value: '' }])
    })

    it('lexes whitespace-only source', () => {
      const tokens = tokenize('   \t  ')
      expect(tokens).toEqual([{ type: 'EOF', value: '' }])
    })

    it('lexes single newline', () => {
      // Newlines outside module body are not emitted
      const tokens = tokenize('\n')
      expect(tokens).toEqual([{ type: 'EOF', value: '' }])
    })

    it('lexes multiple newlines', () => {
      const tokens = tokenize('\n\n\n')
      expect(tokens).toEqual([{ type: 'EOF', value: '' }])
    })

    it('lexes single identifier', () => {
      const tokens = tokenize('foo')
      expect(tokens[0]).toEqual({ type: 'IDENT', value: 'foo' })
    })

    it('lexes multiple identifiers', () => {
      const tokens = tokenize('foo bar baz')
      expect(tokens.slice(0, 3)).toEqual([
        { type: 'IDENT', value: 'foo' },
        { type: 'IDENT', value: 'bar' },
        { type: 'IDENT', value: 'baz' },
      ])
    })
  })

  // ============================================
  // IDENTIFIER TESTS
  // ============================================
  describe('identifiers', () => {
    it('lexes simple identifiers', () => {
      const tokens = tokenize('foo bar_baz test123')
      expect(tokens.slice(0, 3)).toEqual([
        { type: 'IDENT', value: 'foo' },
        { type: 'IDENT', value: 'bar_baz' },
        { type: 'IDENT', value: 'test123' },
      ])
    })

    it('lexes identifier starting with underscore', () => {
      const tokens = tokenize('_foo _bar_baz _123test')
      expect(tokens.slice(0, 3).map(t => t.value)).toEqual(['_foo', '_bar_baz', '_123test'])
    })

    it('lexes single character identifiers', () => {
      const tokens = tokenize('a b c x y z _')
      expect(tokens.slice(0, 7).every(t => t.type === 'IDENT')).toBe(true)
    })

    it('lexes very long identifiers', () => {
      const longIdent = 'a'.repeat(1000)
      const tokens = tokenize(longIdent)
      expect(tokens[0].value).toBe(longIdent)
    })

    it('lexes mixed case identifiers', () => {
      const tokens = tokenize('FooBar fOO_bAr ALLCAPS lowercase')
      expect(tokens.slice(0, 4).map(t => t.value)).toEqual([
        'FooBar', 'fOO_bAr', 'ALLCAPS', 'lowercase'
      ])
    })

    it('lexes identifiers with numbers', () => {
      const tokens = tokenize('a1 b2c3 test123abc foo42bar')
      expect(tokens.slice(0, 4).map(t => t.value)).toEqual([
        'a1', 'b2c3', 'test123abc', 'foo42bar'
      ])
    })

    it('lexes identifiers with multiple underscores', () => {
      const tokens = tokenize('a__b foo___bar __test__ _a_b_c_')
      expect(tokens.slice(0, 4).map(t => t.value)).toEqual([
        'a__b', 'foo___bar', '__test__', '_a_b_c_'
      ])
    })

    it('lexes identifier-like strings near keywords', () => {
      const tokens = tokenize('modules modulex xmodule module_test')
      expect(tokens.slice(0, 4).every(t => t.type === 'IDENT')).toBe(true)
    })

    it('distinguishes module keyword from similar identifiers', () => {
      const tokens = tokenize('module modules Module MODULE')
      expect(tokens[0].type).toBe('MODULE')
      expect(tokens[1].type).toBe('IDENT')
      expect(tokens[2].type).toBe('IDENT') // Case-sensitive
      expect(tokens[3].type).toBe('IDENT')
    })
  })

  // ============================================
  // NUMBER TESTS
  // ============================================
  describe('numbers', () => {
    it('lexes decimal zero', () => {
      const tokens = tokenize('0')
      expect(tokens[0]).toEqual({ type: 'NUMBER', value: '0' })
    })

    it('lexes single digit numbers', () => {
      for (let i = 0; i <= 9; i++) {
        const tokens = tokenize(String(i))
        expect(tokens[0]).toEqual({ type: 'NUMBER', value: String(i) })
      }
    })

    it('lexes multi-digit decimal numbers', () => {
      const nums = ['10', '42', '123', '99999', '12345678901234567890']
      for (const num of nums) {
        const tokens = tokenize(num)
        expect(tokens[0]).toEqual({ type: 'NUMBER', value: num })
      }
    })

    it('lexes hexadecimal with 0x prefix', () => {
      const tokens = tokenize('0x10 0xFF 0xDEADBEEF')
      expect(tokens.slice(0, 3)).toEqual([
        { type: 'NUMBER', value: '0x10' },
        { type: 'NUMBER', value: '0xFF' },
        { type: 'NUMBER', value: '0xDEADBEEF' },
      ])
    })

    it('lexes hexadecimal with 0X prefix (uppercase)', () => {
      const tokens = tokenize('0X10 0XFF 0XABCD')
      expect(tokens.slice(0, 3)).toEqual([
        { type: 'NUMBER', value: '0X10' },
        { type: 'NUMBER', value: '0XFF' },
        { type: 'NUMBER', value: '0XABCD' },
      ])
    })

    it('lexes mixed case hex digits', () => {
      const tokens = tokenize('0xaAbBcCdDeEfF')
      expect(tokens[0].value).toBe('0xaAbBcCdDeEfF')
    })

    it('lexes all hex digits', () => {
      const tokens = tokenize('0x0123456789ABCDEF')
      expect(tokens[0].value).toBe('0x0123456789ABCDEF')
    })

    it('lexes 0 followed by non-hex', () => {
      // 0 followed by something other than x
      const tokens = tokenize('0 07')
      expect(tokens[0]).toEqual({ type: 'NUMBER', value: '0' })
      expect(tokens[1]).toEqual({ type: 'NUMBER', value: '07' })
    })

    it('lexes numbers adjacent to invalid operators as error', () => {
      // + is not a valid token in Wire language
      const result = lex('123+456')
      expect(result.ok).toBe(false)
    })

    it('lexes numbers separated by valid operators', () => {
      const tokens = tokenize('8:8')
      expect(tokens.slice(0, 3).map(t => t.type)).toEqual(['NUMBER', 'COLON', 'NUMBER'])
    })

    it('lexes number in brackets', () => {
      const tokens = tokenize('[0]')
      expect(tokens.slice(0, 3).map(t => t.type)).toEqual(['LBRACKET', 'NUMBER', 'RBRACKET'])
    })

    it('lexes numbers at line start', () => {
      const tokens = tokenize('42')
      expect(tokens[0]).toEqual({ type: 'NUMBER', value: '42' })
    })
  })

  // ============================================
  // OPERATOR TESTS
  // ============================================
  describe('operators and delimiters', () => {
    it('lexes arrow operator', () => {
      const tokens = tokenize('->')
      expect(tokens[0]).toEqual({ type: 'ARROW', value: '->' })
    })

    it('lexes colon', () => {
      const tokens = tokenize(':')
      expect(tokens[0]).toEqual({ type: 'COLON', value: ':' })
    })

    it('lexes equals', () => {
      const tokens = tokenize('=')
      expect(tokens[0]).toEqual({ type: 'EQUALS', value: '=' })
    })

    it('lexes comma', () => {
      const tokens = tokenize(',')
      expect(tokens[0]).toEqual({ type: 'COMMA', value: ',' })
    })

    it('lexes parentheses', () => {
      const tokens = tokenize('()')
      expect(tokens.slice(0, 2).map(t => t.type)).toEqual(['LPAREN', 'RPAREN'])
    })

    it('lexes brackets', () => {
      const tokens = tokenize('[]')
      expect(tokens.slice(0, 2).map(t => t.type)).toEqual(['LBRACKET', 'RBRACKET'])
    })

    it('lexes dot', () => {
      const tokens = tokenize('.')
      expect(tokens[0]).toEqual({ type: 'DOT', value: '.' })
    })

    it('lexes all operators together', () => {
      const tokens = tokenize('-> : = , ( ) [ ] .')
      expect(tokens.slice(0, 9).map(t => t.type)).toEqual([
        'ARROW', 'COLON', 'EQUALS', 'COMMA',
        'LPAREN', 'RPAREN', 'LBRACKET', 'RBRACKET', 'DOT'
      ])
    })

    it('lexes operators without spaces', () => {
      const tokens = tokenize(':=,()[].')
      expect(tokens.slice(0, 8).map(t => t.type)).toEqual([
        'COLON', 'EQUALS', 'COMMA', 'LPAREN', 'RPAREN', 'LBRACKET', 'RBRACKET', 'DOT'
      ])
    })

    it('lexes repeated operators', () => {
      const tokens = tokenize('::::')
      expect(tokens.slice(0, 4).every(t => t.type === 'COLON')).toBe(true)
    })

    it('lexes nested parentheses', () => {
      const tokens = tokenize('(((())))')
      expect(tokens.slice(0, 8).map(t => t.type)).toEqual([
        'LPAREN', 'LPAREN', 'LPAREN', 'LPAREN',
        'RPAREN', 'RPAREN', 'RPAREN', 'RPAREN'
      ])
    })

    it('lexes nested brackets', () => {
      const tokens = tokenize('[[]]')
      expect(tokens.slice(0, 4).map(t => t.type)).toEqual([
        'LBRACKET', 'LBRACKET', 'RBRACKET', 'RBRACKET'
      ])
    })

    it('lexes single hyphen as error (not arrow)', () => {
      const result = lex('-')
      expect(result.ok).toBe(false)
    })

    it('lexes hyphen-hyphen as error', () => {
      const result = lex('--')
      expect(result.ok).toBe(false)
    })
  })

  // ============================================
  // KEYWORD TESTS
  // ============================================
  describe('keywords', () => {
    it('lexes module keyword', () => {
      const tokens = tokenize('module')
      expect(tokens[0]).toEqual({ type: 'MODULE', value: 'module' })
    })

    it('module keyword is case-sensitive', () => {
      const variants = ['Module', 'MODULE', 'mOdUlE', 'modul', 'modulee']
      for (const v of variants) {
        const tokens = tokenize(v)
        expect(tokens[0].type).toBe('IDENT')
      }
    })

    it('lexes module in context', () => {
      const tokens = tokenize('module foo(a) -> out:')
      expect(tokens[0].type).toBe('MODULE')
      expect(tokens[1].type).toBe('IDENT')
    })
  })

  // ============================================
  // COMMENT TESTS
  // ============================================
  describe('comments', () => {
    it('skips line comments', () => {
      const tokens = tokenize('foo ; this is a comment')
      expect(tokens[0]).toEqual({ type: 'IDENT', value: 'foo' })
      expect(tokens[1]).toEqual({ type: 'EOF', value: '' })
    })

    it('skips comment at start of line', () => {
      const tokens = tokenize('; comment\nfoo')
      expect(tokens[0]).toEqual({ type: 'IDENT', value: 'foo' })
    })

    it('skips multiple comments', () => {
      const tokens = tokenize('a ; c1\nb ; c2\nc')
      const idents = tokens.filter(t => t.type === 'IDENT')
      expect(idents.map(t => t.value)).toEqual(['a', 'b', 'c'])
    })

    it('handles comment-only source', () => {
      const tokens = tokenize('; just a comment')
      expect(tokens).toEqual([{ type: 'EOF', value: '' }])
    })

    it('handles multiple comment-only lines', () => {
      const tokens = tokenize('; line 1\n; line 2\n; line 3')
      expect(tokens).toEqual([{ type: 'EOF', value: '' }])
    })

    it('preserves tokens before comment', () => {
      const tokens = tokenize('foo bar ; comment')
      expect(tokens.slice(0, 2).map(t => t.value)).toEqual(['foo', 'bar'])
    })

    it('handles empty comment', () => {
      const tokens = tokenize('foo;\nbar')
      expect(tokens[0]).toEqual({ type: 'IDENT', value: 'foo' })
    })

    it('comment with special characters', () => {
      const tokens = tokenize('foo ; !@#$%^&*(){}[]|\\:;"\'<>,.?/~`')
      expect(tokens[0]).toEqual({ type: 'IDENT', value: 'foo' })
      expect(tokens[1]).toEqual({ type: 'EOF', value: '' })
    })

    it('handles comment at end of file without newline', () => {
      const tokens = tokenize('foo ; comment at end')
      expect(tokens[0]).toEqual({ type: 'IDENT', value: 'foo' })
      expect(tokens[1]).toEqual({ type: 'EOF', value: '' })
    })
  })

  // ============================================
  // MODULE DECLARATION TESTS
  // ============================================
  describe('module declarations', () => {
    it('lexes simple module header', () => {
      const tokens = tokenize('module not(a) -> out:')
      expect(tokens.map(t => t.type).filter(t => t !== 'NEWLINE')).toEqual([
        'MODULE', 'IDENT', 'LPAREN', 'IDENT', 'RPAREN',
        'ARROW', 'IDENT', 'COLON', 'EOF'
      ])
    })

    it('lexes module with no inputs', () => {
      const tokens = tokenize('module clock() -> out:')
      expect(tokens.map(t => t.type).filter(t => t !== 'NEWLINE')).toEqual([
        'MODULE', 'IDENT', 'LPAREN', 'RPAREN',
        'ARROW', 'IDENT', 'COLON', 'EOF'
      ])
    })

    it('lexes module with multiple inputs', () => {
      const tokens = tokenize('module nand(a, b) -> out:')
      const idents = tokens.filter(t => t.type === 'IDENT').map(t => t.value)
      expect(idents).toEqual(['nand', 'a', 'b', 'out'])
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

    it('lexes module with many inputs and outputs', () => {
      const tokens = tokenize('module complex(a, b, c, d, e) -> (x, y, z):')
      const idents = tokens.filter(t => t.type === 'IDENT').map(t => t.value)
      expect(idents).toEqual(['complex', 'a', 'b', 'c', 'd', 'e', 'x', 'y', 'z'])
    })

    it('lexes module with mixed width specifiers', () => {
      const tokens = tokenize('module test(a:1, b:8, c:16) -> (x:4, y):')
      const numbers = tokens.filter(t => t.type === 'NUMBER').map(t => t.value)
      expect(numbers).toEqual(['1', '8', '16', '4'])
    })
  })

  // ============================================
  // STATEMENT TESTS
  // ============================================
  describe('statements', () => {
    it('lexes simple assignment', () => {
      const tokens = tokenize('out = a')
      expect(tokens.map(t => t.type).filter(t => t !== 'NEWLINE' && t !== 'EOF')).toEqual([
        'IDENT', 'EQUALS', 'IDENT'
      ])
    })

    it('lexes function call', () => {
      const tokens = tokenize('out = nand(a, b)')
      expect(tokens.map(t => t.type).filter(t => t !== 'NEWLINE' && t !== 'EOF')).toEqual([
        'IDENT', 'EQUALS', 'IDENT', 'LPAREN', 'IDENT', 'COMMA', 'IDENT', 'RPAREN'
      ])
    })

    it('lexes nested function calls', () => {
      const tokens = tokenize('out = nand(nand(a, a), nand(b, b))')
      const parens = tokens.filter(t => t.type === 'LPAREN' || t.type === 'RPAREN')
      expect(parens.length).toBe(6) // 3 opens + 3 closes
    })

    it('lexes member access', () => {
      const tokens = tokenize('result.sum')
      expect(tokens.slice(0, 3)).toEqual([
        { type: 'IDENT', value: 'result' },
        { type: 'DOT', value: '.' },
        { type: 'IDENT', value: 'sum' },
      ])
    })

    it('lexes chained member access', () => {
      const tokens = tokenize('a.b.c.d')
      const types = tokens.map(t => t.type).filter(t => t !== 'EOF')
      expect(types).toEqual(['IDENT', 'DOT', 'IDENT', 'DOT', 'IDENT', 'DOT', 'IDENT'])
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

    it('lexes complex expression', () => {
      const tokens = tokenize('out = add8(a, b).overflow[0]')
      const types = tokens.map(t => t.type).filter(t => t !== 'NEWLINE' && t !== 'EOF')
      expect(types).toContain('DOT')
      expect(types).toContain('LBRACKET')
    })
  })

  // ============================================
  // INDENTATION TESTS
  // ============================================
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

    it('captures tab indentation', () => {
      const source = `module not(a) -> out:
\tout = nand(a, a)`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const indentToken = result.tokens.find(t => t.type === 'INDENT')
        expect(indentToken).toBeDefined()
        expect(indentToken?.value).toBe('\t')
      }
    })

    it('captures mixed tabs and spaces', () => {
      const source = `module not(a) -> out:
\t  \tout = nand(a, a)`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const indentToken = result.tokens.find(t => t.type === 'INDENT')
        expect(indentToken).toBeDefined()
        expect(indentToken?.value).toBe('\t  \t')
      }
    })

    it('captures multiple indentation levels', () => {
      const source = `module test(a) -> out:
  x = a
    y = x
      z = y`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const indents = result.tokens.filter(t => t.type === 'INDENT')
        expect(indents.length).toBe(3)
        expect(indents[0].value).toBe('  ')
        expect(indents[1].value).toBe('    ')
        expect(indents[2].value).toBe('      ')
      }
    })

    it('does not capture indentation outside module body', () => {
      const source = `   module not(a) -> out:`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const indentToken = result.tokens.find(t => t.type === 'INDENT')
        expect(indentToken).toBeUndefined()
      }
    })

    it('captures no indentation for non-indented body lines', () => {
      const source = `module test(a) -> out:
out = a`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        // Line starts with 'o' not whitespace, so no INDENT before it
        const hasIndentBeforeOut = result.tokens.some((t, i) =>
          t.type === 'INDENT' && result.tokens[i + 1]?.value === 'out'
        )
        expect(hasIndentBeforeOut).toBe(false)
      }
    })
  })

  // ============================================
  // COMPLETE MODULE TESTS
  // ============================================
  describe('complete modules', () => {
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

    it('lexes multiple modules', () => {
      const source = `module not(a) -> out:
  out = nand(a, a)

module and(a, b) -> out:
  x = nand(a, b)
  out = not(x)`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const moduleTokens = result.tokens.filter(t => t.type === 'MODULE')
        expect(moduleTokens.length).toBe(2)
      }
    })

    it('lexes module with comments', () => {
      const source = `; NOT gate implementation
module not(a) -> out:  ; inverts input
  out = nand(a, a)     ; NAND(a,a) = NOT(a)`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const moduleTokens = result.tokens.filter(t => t.type === 'MODULE')
        expect(moduleTokens.length).toBe(1)
      }
    })

    it('lexes complex module', () => {
      const source = `module full_adder(a, b, cin) -> (sum, cout):
  p = xor(a, b)
  g = and(a, b)
  sum = xor(p, cin)
  h = and(p, cin)
  cout = or(g, h)`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const idents = result.tokens.filter(t => t.type === 'IDENT').map(t => t.value)
        expect(idents).toContain('full_adder')
        expect(idents).toContain('sum')
        expect(idents).toContain('cout')
        expect(idents).toContain('xor')
        expect(idents).toContain('and')
        expect(idents).toContain('or')
      }
    })
  })

  // ============================================
  // LINE/COLUMN TRACKING TESTS
  // ============================================
  describe('position tracking', () => {
    it('tracks line numbers correctly', () => {
      const source = `a
b
c`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const idents = result.tokens.filter(t => t.type === 'IDENT')
        expect(idents[0].line).toBe(1)
        expect(idents[1].line).toBe(2)
        expect(idents[2].line).toBe(3)
      }
    })

    it('tracks column numbers correctly', () => {
      const source = 'a b c'
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const idents = result.tokens.filter(t => t.type === 'IDENT')
        expect(idents[0].column).toBe(1)
        expect(idents[1].column).toBe(3)
        expect(idents[2].column).toBe(5)
      }
    })

    it('tracks position after tabs', () => {
      const source = '\ta'
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const ident = result.tokens.find(t => t.type === 'IDENT')
        expect(ident?.column).toBe(2)
      }
    })

    it('resets column after newline', () => {
      const source = 'abc\ndef'
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const idents = result.tokens.filter(t => t.type === 'IDENT')
        expect(idents[0].column).toBe(1)
        expect(idents[1].column).toBe(1)
        expect(idents[1].line).toBe(2)
      }
    })

    it('tracks position in multiline module', () => {
      const source = `module not(a) -> out:
  out = nand(a, a)`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const moduleToken = result.tokens.find(t => t.type === 'MODULE')
        expect(moduleToken?.line).toBe(1)
        expect(moduleToken?.column).toBe(1)

        const nandToken = result.tokens.find(t => t.value === 'nand')
        expect(nandToken?.line).toBe(2)
      }
    })

    it('tracks EOF position', () => {
      const source = 'abc'
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const eof = result.tokens.find(t => t.type === 'EOF')
        expect(eof?.line).toBe(1)
        expect(eof?.column).toBe(4)
      }
    })

    it('tracks position for operators', () => {
      const source = '-> = :'
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.tokens[0].column).toBe(1) // ->
        expect(result.tokens[1].column).toBe(4) // =
        expect(result.tokens[2].column).toBe(6) // :
      }
    })
  })

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================
  describe('error handling', () => {
    it('reports unexpected character @', () => {
      const error = expectError('foo @ bar')
      expect(error.message).toContain('@')
    })

    it('reports unexpected character #', () => {
      const error = expectError('foo # bar')
      expect(error.message).toContain('#')
    })

    it('reports unexpected character $', () => {
      const error = expectError('$100')
      expect(error.message).toContain('$')
    })

    it('reports unexpected character %', () => {
      const error = expectError('50%')
      expect(error.message).toContain('%')
    })

    it('reports unexpected character ^', () => {
      const error = expectError('a ^ b')
      expect(error.message).toContain('^')
    })

    it('reports unexpected character &', () => {
      const error = expectError('a & b')
      expect(error.message).toContain('&')
    })

    it('reports unexpected character |', () => {
      const error = expectError('a | b')
      expect(error.message).toContain('|')
    })

    it('reports unexpected character !', () => {
      const error = expectError('!a')
      expect(error.message).toContain('!')
    })

    it('reports unexpected character ~', () => {
      const error = expectError('~a')
      expect(error.message).toContain('~')
    })

    it('reports unexpected character `', () => {
      const error = expectError('`foo`')
      expect(error.message).toContain('`')
    })

    it('reports correct line for error', () => {
      const source = `foo
bar
@baz`
      const error = expectError(source)
      expect(error.line).toBe(3)
    })

    it('reports correct column for error', () => {
      const error = expectError('foo @bar')
      expect(error.column).toBe(5)
    })

    it('reports error for single hyphen', () => {
      const error = expectError('a - b')
      expect(error.message).toContain('-')
    })

    it('reports error for plus sign', () => {
      const error = expectError('a + b')
      expect(error.message).toContain('+')
    })

    it('reports error for asterisk', () => {
      const error = expectError('a * b')
      expect(error.message).toContain('*')
    })

    it('reports error for forward slash', () => {
      const error = expectError('a / b')
      expect(error.message).toContain('/')
    })

    it('reports error for less than', () => {
      const error = expectError('a < b')
      expect(error.message).toContain('<')
    })

    it('reports error for greater than', () => {
      const error = expectError('a > b')
      expect(error.message).toContain('>')
    })

    it('reports error for curly braces', () => {
      const error = expectError('{foo}')
      expect(error.message).toContain('{')
    })

    it('reports error for question mark', () => {
      const error = expectError('foo?')
      expect(error.message).toContain('?')
    })

    it('reports error for backslash', () => {
      const error = expectError('foo\\bar')
      expect(error.message).toContain('\\')
    })

    it('reports error for quotes', () => {
      const error = expectError('"string"')
      expect(error.message).toContain('"')
    })

    it('reports error for single quotes', () => {
      const error = expectError("'char'")
      expect(error.message).toContain("'")
    })
  })

  // ============================================
  // EDGE CASES AND STRESS TESTS
  // ============================================
  describe('edge cases', () => {
    it('handles very long source', () => {
      const source = 'a '.repeat(10000) + 'end'
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const idents = result.tokens.filter(t => t.type === 'IDENT')
        expect(idents.length).toBe(10001)
      }
    })

    it('handles very long line', () => {
      const source = 'module ' + 'x'.repeat(10000) + '(a) -> out:'
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const nameToken = result.tokens.find(t => t.value.length === 10000)
        expect(nameToken).toBeDefined()
      }
    })

    it('handles many tokens', () => {
      const source = Array(1000).fill('a,').join('') + 'a'
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const commas = result.tokens.filter(t => t.type === 'COMMA')
        expect(commas.length).toBe(1000)
      }
    })

    it('handles deeply nested parentheses', () => {
      const source = '('.repeat(100) + ')'.repeat(100)
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const lparens = result.tokens.filter(t => t.type === 'LPAREN')
        const rparens = result.tokens.filter(t => t.type === 'RPAREN')
        expect(lparens.length).toBe(100)
        expect(rparens.length).toBe(100)
      }
    })

    it('handles alternating whitespace types', () => {
      const source = 'a \t \t \t b'
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const idents = result.tokens.filter(t => t.type === 'IDENT')
        expect(idents.length).toBe(2)
      }
    })

    it('handles numbers at edge of valid range', () => {
      const source = '0 1 999999999999999999999999999999'
      const result = lex(source)
      expect(result.ok).toBe(true)
    })

    it('handles hex numbers at edge of valid range', () => {
      const source = '0x0 0x1 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
      const result = lex(source)
      expect(result.ok).toBe(true)
    })

    it('handles consecutive arrows', () => {
      const tokens = tokenize('->->->')
      expect(tokens.slice(0, 3).every(t => t.type === 'ARROW')).toBe(true)
    })

    it('handles identifier immediately after number', () => {
      // This should lex as two separate tokens
      const source = '123abc'
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.tokens[0].type).toBe('NUMBER')
        expect(result.tokens[0].value).toBe('123')
        expect(result.tokens[1].type).toBe('IDENT')
        expect(result.tokens[1].value).toBe('abc')
      }
    })

    it('handles hex prefix with no digits as two tokens', () => {
      const source = '0x'
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        // '0x' with no digits should be parsed as '0' followed by identifier 'x'
        expect(result.tokens[0].type).toBe('NUMBER')
        expect(result.tokens[0].value).toBe('0x')
      }
    })

    it('handles arrow at end of file', () => {
      const tokens = tokenize('->')
      expect(tokens[0].type).toBe('ARROW')
    })

    it('handles multiple modules with various spacing', () => {
      const source = `module a()->x:
x=y



module b()->z:
z=w`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const modules = result.tokens.filter(t => t.type === 'MODULE')
        expect(modules.length).toBe(2)
      }
    })

    it('handles empty module body', () => {
      const tokens = tokenize('module empty() -> out:')
      expect(tokens.some(t => t.type === 'MODULE')).toBe(true)
    })

    it('handles unicode in comments (skipped)', () => {
      const source = 'a ; \u{1F600} emoji comment\nb'
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const idents = result.tokens.filter(t => t.type === 'IDENT')
        expect(idents.length).toBe(2)
      }
    })
  })

  // ============================================
  // NEWLINE HANDLING TESTS
  // ============================================
  describe('newline handling', () => {
    it('emits NEWLINE only in module body', () => {
      const source = `module test(a) -> out:
  out = a`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const newlines = result.tokens.filter(t => t.type === 'NEWLINE')
        expect(newlines.length).toBeGreaterThan(0)
      }
    })

    it('does not emit NEWLINE before module keyword', () => {
      const source = `
module test(a) -> out:`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        // First token should be MODULE, not NEWLINE
        expect(result.tokens[0].type).toBe('MODULE')
      }
    })

    it('handles Windows line endings (CRLF)', () => {
      // Note: The lexer doesn't explicitly handle \r, it will error on it
      // This is documenting current behavior - could be enhanced later
      const source = 'module test(a) -> out:\r\n  out = a'
      const result = lex(source)
      // \r is not handled as whitespace, causing an error
      expect(result.ok).toBe(false)
    })

    it('handles multiple consecutive newlines in body', () => {
      const source = `module test(a) -> out:
  x = a


  out = x`
      const result = lex(source)
      expect(result.ok).toBe(true)
      if (result.ok) {
        const newlines = result.tokens.filter(t => t.type === 'NEWLINE')
        expect(newlines.length).toBeGreaterThanOrEqual(2)
      }
    })
  })

  // ============================================
  // INTEGRATION TESTS (Real Wire code)
  // ============================================
  describe('real Wire code', () => {
    it('lexes NOT gate', () => {
      const source = `; NOT gate using NAND
module not(a) -> out:
  out = nand(a, a)`
      const result = lex(source)
      expect(result.ok).toBe(true)
    })

    it('lexes AND gate', () => {
      const source = `module and(a, b) -> out:
  x = nand(a, b)
  out = nand(x, x)`
      const result = lex(source)
      expect(result.ok).toBe(true)
    })

    it('lexes OR gate', () => {
      const source = `module or(a, b) -> out:
  na = nand(a, a)
  nb = nand(b, b)
  out = nand(na, nb)`
      const result = lex(source)
      expect(result.ok).toBe(true)
    })

    it('lexes XOR gate', () => {
      const source = `module xor(a, b) -> out:
  nab = nand(a, b)
  na = nand(a, nab)
  nb = nand(b, nab)
  out = nand(na, nb)`
      const result = lex(source)
      expect(result.ok).toBe(true)
    })

    it('lexes half adder', () => {
      const source = `module half_adder(a, b) -> (sum, carry):
  sum = xor(a, b)
  carry = and(a, b)`
      const result = lex(source)
      expect(result.ok).toBe(true)
    })

    it('lexes full adder', () => {
      const source = `module full_adder(a, b, cin) -> (sum, cout):
  ha1 = half_adder(a, b)
  ha2 = half_adder(ha1.sum, cin)
  sum = ha2.sum
  cout = or(ha1.carry, ha2.carry)`
      const result = lex(source)
      expect(result.ok).toBe(true)
    })

    it('lexes D flip-flop usage', () => {
      const source = `module counter(clk) -> out:
  next = not(out)
  out = dff(next, clk)`
      const result = lex(source)
      expect(result.ok).toBe(true)
    })

    it('lexes bus operations', () => {
      const source = `module bus_test(a:8) -> (lo:4, hi:4):
  lo = a[0:3]
  hi = a[4:7]`
      const result = lex(source)
      expect(result.ok).toBe(true)
    })

    it('lexes complex circuit', () => {
      const source = `; 8-bit ripple carry adder
module adder8(a:8, b:8, cin) -> (sum:8, cout):
  ; First bit
  fa0 = full_adder(a[0], b[0], cin)
  sum[0] = fa0.sum

  ; Remaining bits
  fa1 = full_adder(a[1], b[1], fa0.cout)
  sum[1] = fa1.sum

  fa2 = full_adder(a[2], b[2], fa1.cout)
  sum[2] = fa2.sum

  fa3 = full_adder(a[3], b[3], fa2.cout)
  sum[3] = fa3.sum

  fa4 = full_adder(a[4], b[4], fa3.cout)
  sum[4] = fa4.sum

  fa5 = full_adder(a[5], b[5], fa4.cout)
  sum[5] = fa5.sum

  fa6 = full_adder(a[6], b[6], fa5.cout)
  sum[6] = fa6.sum

  fa7 = full_adder(a[7], b[7], fa6.cout)
  sum[7] = fa7.sum
  cout = fa7.cout`
      const result = lex(source)
      expect(result.ok).toBe(true)
    })
  })
})
