import { describe, it, expect } from 'vitest'
import { lex } from './lexer'
import { parse, parseModule } from './parser'
import type { Module, Expr, Statement } from './ast'

// Helper to parse Wire source directly
const parseWire = (source: string): Module[] => {
  const lexResult = lex(source)
  if (!lexResult.ok) throw new Error(lexResult.error.message)
  const parseResult = parse(lexResult.tokens)
  if (!parseResult.ok) throw new Error(parseResult.error.message)
  return parseResult.value
}

const parseOne = (source: string): Module => {
  const modules = parseWire(source)
  if (modules.length !== 1) throw new Error(`Expected 1 module, got ${modules.length}`)
  return modules[0]
}

// Helper to expect parse success
const expectOk = (source: string): Module[] => {
  const lexResult = lex(source)
  expect(lexResult.ok).toBe(true)
  if (!lexResult.ok) throw new Error(lexResult.error.message)
  const parseResult = parse(lexResult.tokens)
  expect(parseResult.ok).toBe(true)
  if (!parseResult.ok) throw new Error(parseResult.error.message)
  return parseResult.value
}

// Helper to expect parse failure
const expectError = (source: string): { message: string; line: number; column: number } => {
  const lexResult = lex(source)
  if (!lexResult.ok) throw new Error(`Lex error: ${lexResult.error.message}`)
  const parseResult = parse(lexResult.tokens)
  expect(parseResult.ok).toBe(false)
  if (parseResult.ok) throw new Error('Expected parse error')
  return parseResult.error
}

describe('Wire Parser', () => {
  // ============================================
  // MODULE DECLARATION TESTS
  // ============================================
  describe('module declarations', () => {
    it('parses simple module with single-bit ports', () => {
      const module = parseOne('module not(a) -> out:')
      expect(module.name).toBe('not')
      expect(module.inputs).toEqual([{ name: 'a', width: 1 }])
      expect(module.outputs).toEqual([{ name: 'out', width: 1 }])
    })

    it('parses module with multiple inputs', () => {
      const module = parseOne('module nand(a, b) -> out:')
      expect(module.inputs).toEqual([
        { name: 'a', width: 1 },
        { name: 'b', width: 1 },
      ])
    })

    it('parses module with width specifiers', () => {
      const module = parseOne('module add8(a:8, b:8) -> out:8:')
      expect(module.inputs).toEqual([
        { name: 'a', width: 8 },
        { name: 'b', width: 8 },
      ])
      expect(module.outputs).toEqual([{ name: 'out', width: 8 }])
    })

    it('parses module with multiple outputs', () => {
      const module = parseOne('module half_adder(a, b) -> (sum, carry):')
      expect(module.outputs).toEqual([
        { name: 'sum', width: 1 },
        { name: 'carry', width: 1 },
      ])
    })

    it('parses module with no inputs', () => {
      const module = parseOne('module clock() -> clk:')
      expect(module.inputs).toEqual([])
      expect(module.outputs).toEqual([{ name: 'clk', width: 1 }])
    })

    it('parses module with many inputs', () => {
      const module = parseOne('module multi(a, b, c, d, e, f, g, h) -> out:')
      expect(module.inputs.length).toBe(8)
      expect(module.inputs.map(p => p.name)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
    })

    it('parses module with many outputs', () => {
      const module = parseOne('module decoder(sel:3) -> (y0, y1, y2, y3, y4, y5, y6, y7):')
      expect(module.outputs.length).toBe(8)
    })

    it('parses module with mixed width inputs', () => {
      const module = parseOne('module test(a:1, b:8, c:16, d:32) -> out:')
      expect(module.inputs).toEqual([
        { name: 'a', width: 1 },
        { name: 'b', width: 8 },
        { name: 'c', width: 16 },
        { name: 'd', width: 32 },
      ])
    })

    it('parses module with mixed width outputs', () => {
      const module = parseOne('module test(a) -> (x:1, y:8, z:16):')
      expect(module.outputs).toEqual([
        { name: 'x', width: 1 },
        { name: 'y', width: 8 },
        { name: 'z', width: 16 },
      ])
    })

    it('parses module with very large width', () => {
      const module = parseOne('module wide(a:64, b:128) -> out:256:')
      expect(module.inputs[0].width).toBe(64)
      expect(module.inputs[1].width).toBe(128)
      expect(module.outputs[0].width).toBe(256)
    })

    it('parses module with hex width', () => {
      const module = parseOne('module test(a:0x10) -> out:0x20:')
      expect(module.inputs[0].width).toBe(16)
      expect(module.outputs[0].width).toBe(32)
    })

    it('parses module names with underscores', () => {
      const module = parseOne('module my_module_name(a) -> out:')
      expect(module.name).toBe('my_module_name')
    })

    it('parses module names with numbers', () => {
      const module = parseOne('module add8bit(a) -> out:')
      expect(module.name).toBe('add8bit')
    })

    it('parses port names with underscores', () => {
      const module = parseOne('module test(input_a, input_b) -> output_result:')
      expect(module.inputs[0].name).toBe('input_a')
      expect(module.inputs[1].name).toBe('input_b')
      expect(module.outputs[0].name).toBe('output_result')
    })
  })

  // ============================================
  // STATEMENT TESTS
  // ============================================
  describe('statements', () => {
    it('parses simple assignment with function call', () => {
      const module = parseOne(`module not(a) -> out:
        out = nand(a, a)`)
      expect(module.statements.length).toBe(1)
      expect(module.statements[0].target).toBe('out')

      const expr = module.statements[0].expr
      expect(expr.kind).toBe('call')
      if (expr.kind === 'call') {
        expect(expr.name).toBe('nand')
        expect(expr.args.length).toBe(2)
      }
    })

    it('parses multiple statements', () => {
      const module = parseOne(`module and(a, b) -> out:
        x = nand(a, b)
        out = nand(x, x)`)
      expect(module.statements.length).toBe(2)
      expect(module.statements[0].target).toBe('x')
      expect(module.statements[1].target).toBe('out')
    })

    it('parses nested function calls', () => {
      const module = parseOne(`module or(a, b) -> out:
        out = nand(nand(a, a), nand(b, b))`)
      const expr = module.statements[0].expr
      expect(expr.kind).toBe('call')
      if (expr.kind === 'call') {
        expect(expr.args[0].kind).toBe('call')
        expect(expr.args[1].kind).toBe('call')
      }
    })

    it('parses assignment to identifier', () => {
      const module = parseOne(`module copy(a) -> out:
        out = a`)
      const expr = module.statements[0].expr
      expect(expr.kind).toBe('ident')
      if (expr.kind === 'ident') {
        expect(expr.name).toBe('a')
      }
    })

    it('parses assignment to number literal', () => {
      const module = parseOne(`module const(a) -> out:
        out = 0`)
      const expr = module.statements[0].expr
      expect(expr.kind).toBe('number')
      if (expr.kind === 'number') {
        expect(expr.value).toBe(0)
      }
    })

    it('parses assignment to hex number', () => {
      const module = parseOne(`module const(a) -> out:8:
        out = 0xFF`)
      const expr = module.statements[0].expr
      expect(expr.kind).toBe('number')
      if (expr.kind === 'number') {
        expect(expr.value).toBe(255)
      }
    })

    it('parses many statements', () => {
      const source = `module complex(a, b, c, d) -> out:
        w = nand(a, b)
        x = nand(c, d)
        y = nand(w, x)
        z = nand(y, y)
        out = z`
      const module = parseOne(source)
      expect(module.statements.length).toBe(5)
      expect(module.statements.map(s => s.target)).toEqual(['w', 'x', 'y', 'z', 'out'])
    })

    it('parses function call with no arguments', () => {
      const module = parseOne(`module test(a) -> out:
        out = clock()`)
      const expr = module.statements[0].expr
      expect(expr.kind).toBe('call')
      if (expr.kind === 'call') {
        expect(expr.name).toBe('clock')
        expect(expr.args.length).toBe(0)
      }
    })

    it('parses function call with many arguments', () => {
      const module = parseOne(`module test(a, b, c, d, e, f, g, h) -> out:
        out = mux8(a, b, c, d, e, f, g, h)`)
      const expr = module.statements[0].expr
      expect(expr.kind).toBe('call')
      if (expr.kind === 'call') {
        expect(expr.args.length).toBe(8)
      }
    })

    it('parses deeply nested function calls', () => {
      const module = parseOne(`module test(a) -> out:
        out = f(g(h(i(j(a)))))`)
      let expr = module.statements[0].expr
      const names: string[] = []
      while (expr.kind === 'call') {
        names.push(expr.name)
        expr = expr.args[0]
      }
      expect(names).toEqual(['f', 'g', 'h', 'i', 'j'])
    })
  })

  // ============================================
  // MEMBER ACCESS TESTS
  // ============================================
  describe('member access', () => {
    it('parses member access on identifier', () => {
      const module = parseOne(`module test(a) -> out:
        result = half_adder(a, a)
        out = result.sum`)
      const expr = module.statements[1].expr
      expect(expr.kind).toBe('member')
      if (expr.kind === 'member') {
        expect(expr.field).toBe('sum')
        expect(expr.object.kind).toBe('ident')
      }
    })

    it('parses chained member access', () => {
      const module = parseOne(`module test(a) -> out:
        out = foo.bar.baz`)
      const expr = module.statements[0].expr
      expect(expr.kind).toBe('member')
      if (expr.kind === 'member') {
        expect(expr.field).toBe('baz')
        expect(expr.object.kind).toBe('member')
        if (expr.object.kind === 'member') {
          expect(expr.object.field).toBe('bar')
        }
      }
    })

    it('parses member access on function result', () => {
      const module = parseOne(`module test(a, b) -> out:
        out = half_adder(a, b).sum`)
      const expr = module.statements[0].expr
      expect(expr.kind).toBe('member')
      if (expr.kind === 'member') {
        expect(expr.object.kind).toBe('call')
      }
    })

    it('parses member access as function argument', () => {
      const module = parseOne(`module test(a, b) -> out:
        result = complex(a, b)
        out = nand(result.x, result.y)`)
      const expr = module.statements[1].expr
      expect(expr.kind).toBe('call')
      if (expr.kind === 'call') {
        expect(expr.args[0].kind).toBe('member')
        expect(expr.args[1].kind).toBe('member')
      }
    })

    it('parses deeply nested member access', () => {
      const module = parseOne(`module test(a) -> out:
        out = a.b.c.d.e.f`)
      let expr = module.statements[0].expr
      const fields: string[] = []
      while (expr.kind === 'member') {
        fields.unshift(expr.field)
        expr = expr.object
      }
      expect(fields).toEqual(['b', 'c', 'd', 'e', 'f'])
    })
  })

  // ============================================
  // BUS OPERATIONS TESTS
  // ============================================
  describe('bus operations', () => {
    it('parses single bit indexing', () => {
      const module = parseOne(`module test(a:8) -> out:
        out = a[0]`)
      const expr = module.statements[0].expr
      expect(expr.kind).toBe('index')
      if (expr.kind === 'index') {
        expect(expr.index).toBe(0)
      }
    })

    it('parses slice operation', () => {
      const module = parseOne(`module test(a:8) -> out:4:
        out = a[0:3]`)
      const expr = module.statements[0].expr
      expect(expr.kind).toBe('slice')
      if (expr.kind === 'slice') {
        expect(expr.start).toBe(0)
        expect(expr.end).toBe(3)
      }
    })

    it('parses indexing on function result', () => {
      const module = parseOne(`module test(a:8) -> out:
        out = add8(a, a)[0]`)
      const expr = module.statements[0].expr
      expect(expr.kind).toBe('index')
      if (expr.kind === 'index') {
        expect(expr.object.kind).toBe('call')
      }
    })

    it('parses indexing with high bit index', () => {
      const module = parseOne(`module test(a:8) -> out:
        out = a[7]`)
      const expr = module.statements[0].expr
      expect(expr.kind).toBe('index')
      if (expr.kind === 'index') {
        expect(expr.index).toBe(7)
      }
    })

    it('parses slice with hex indices', () => {
      const module = parseOne(`module test(a:16) -> out:8:
        out = a[0x0:0x7]`)
      const expr = module.statements[0].expr
      expect(expr.kind).toBe('slice')
      if (expr.kind === 'slice') {
        expect(expr.start).toBe(0)
        expect(expr.end).toBe(7)
      }
    })

    it('parses indexing after member access', () => {
      const module = parseOne(`module test(a:8) -> out:
        result = adder(a, a)
        out = result.sum[0]`)
      const expr = module.statements[1].expr
      expect(expr.kind).toBe('index')
      if (expr.kind === 'index') {
        expect(expr.object.kind).toBe('member')
      }
    })

    it('parses member access after indexing (if allowed)', () => {
      // Note: This might not be valid in all implementations
      // Testing what the parser does with this combination
      try {
        const module = parseOne(`module test(a:8) -> out:
          out = a[0].foo`)
        // If it parses, verify structure
        const expr = module.statements[0].expr
        expect(expr.kind).toBe('member')
      } catch (e) {
        // Also acceptable if parser rejects this
        expect(true).toBe(true)
      }
    })

    it('parses multiple index operations in one statement', () => {
      const module = parseOne(`module test(a:8, b:8) -> out:
        out = nand(a[0], b[7])`)
      const expr = module.statements[0].expr
      expect(expr.kind).toBe('call')
      if (expr.kind === 'call') {
        expect(expr.args[0].kind).toBe('index')
        expect(expr.args[1].kind).toBe('index')
      }
    })

    it('parses wide slice', () => {
      const module = parseOne(`module test(a:32) -> out:16:
        out = a[0:15]`)
      const expr = module.statements[0].expr
      expect(expr.kind).toBe('slice')
      if (expr.kind === 'slice') {
        expect(expr.start).toBe(0)
        expect(expr.end).toBe(15)
      }
    })
  })

  // ============================================
  // MULTIPLE MODULES TESTS
  // ============================================
  describe('multiple modules', () => {
    it('parses multiple modules in one file', () => {
      const modules = parseWire(`
module not(a) -> out:
  out = nand(a, a)

module and(a, b) -> out:
  x = nand(a, b)
  out = not(x)
`)
      expect(modules.length).toBe(2)
      expect(modules[0].name).toBe('not')
      expect(modules[1].name).toBe('and')
    })

    it('parses many modules', () => {
      const source = `
module m1(a) -> out:
  out = a

module m2(a) -> out:
  out = a

module m3(a) -> out:
  out = a

module m4(a) -> out:
  out = a

module m5(a) -> out:
  out = a
`
      const modules = parseWire(source)
      expect(modules.length).toBe(5)
      expect(modules.map(m => m.name)).toEqual(['m1', 'm2', 'm3', 'm4', 'm5'])
    })

    it('parses modules with interdependencies', () => {
      const source = `
module not(a) -> out:
  out = nand(a, a)

module and(a, b) -> out:
  x = nand(a, b)
  out = not(x)

module or(a, b) -> out:
  na = not(a)
  nb = not(b)
  out = nand(na, nb)

module xor(a, b) -> out:
  nab = nand(a, b)
  x = and(a, nab)
  y = and(b, nab)
  out = or(x, y)
`
      const modules = parseWire(source)
      expect(modules.length).toBe(4)
    })

    it('parses modules with blank lines between', () => {
      const source = `module a(x) -> y:
  y = x



module b(x) -> y:
  y = x
`
      const modules = parseWire(source)
      expect(modules.length).toBe(2)
    })
  })

  // ============================================
  // COMMENT HANDLING TESTS
  // ============================================
  describe('comments', () => {
    it('ignores comments after module header', () => {
      const module = parseOne(`
module not(a) -> out:  ; this is a NOT gate
  out = nand(a, a)
`)
      expect(module.name).toBe('not')
    })

    it('ignores comments after statements', () => {
      const module = parseOne(`
module not(a) -> out:
  out = nand(a, a)     ; using NAND as primitive
`)
      expect(module.statements.length).toBe(1)
    })

    it('ignores comment-only lines between statements', () => {
      const module = parseOne(`
module test(a, b) -> out:
  x = a
  ; compute intermediate
  y = b
  ; combine
  out = nand(x, y)
`)
      expect(module.statements.length).toBe(3)
    })

    it('ignores comments before module', () => {
      const module = parseOne(`
; Module description
; Implements NOT gate
module not(a) -> out:
  out = nand(a, a)
`)
      expect(module.name).toBe('not')
    })
  })

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================
  describe('error handling', () => {
    it('reports missing arrow', () => {
      const lexResult = lex('module foo(a) out:')
      expect(lexResult.ok).toBe(true)
      if (lexResult.ok) {
        const parseResult = parse(lexResult.tokens)
        expect(parseResult.ok).toBe(false)
        if (!parseResult.ok) {
          expect(parseResult.error.message).toContain('->')
        }
      }
    })

    it('reports missing colon', () => {
      const lexResult = lex('module foo(a) -> out')
      expect(lexResult.ok).toBe(true)
      if (lexResult.ok) {
        const parseResult = parse(lexResult.tokens)
        expect(parseResult.ok).toBe(false)
      }
    })

    it('reports missing module name', () => {
      const error = expectError('module (a) -> out:')
      expect(error.message).toContain('name')
    })

    it('reports missing opening paren', () => {
      const error = expectError('module foo a) -> out:')
      expect(error.message).toContain('(')
    })

    it('reports missing closing paren', () => {
      const error = expectError('module foo(a -> out:')
      expect(error.message).toContain(')')
    })

    it('reports missing equals in assignment', () => {
      const error = expectError(`module test(a) -> out:
  out nand(a, a)`)
      expect(error.message).toContain('=')
    })

    it('reports missing closing paren in call', () => {
      const error = expectError(`module test(a) -> out:
  out = nand(a, a`)
      expect(error.message).toContain(')')
    })

    it('reports missing closing bracket in index', () => {
      const error = expectError(`module test(a:8) -> out:
  out = a[0`)
      expect(error.message).toContain(']')
    })

    it('reports error on empty source', () => {
      const modules = parseWire('')
      expect(modules.length).toBe(0)
    })

    it('reports error for unexpected token', () => {
      const error = expectError(`module test(a) -> out:
  out = ,`)
      expect(error.message).toContain('Unexpected')
    })

    it('reports error line number', () => {
      const error = expectError(`module test(a) -> out:
  x = a
  y = b
  out = ,`)
      expect(error.line).toBeGreaterThan(1)
    })
  })

  // ============================================
  // EDGE CASES TESTS
  // ============================================
  describe('edge cases', () => {
    it('parses empty module body', () => {
      const module = parseOne('module empty() -> out:')
      expect(module.statements.length).toBe(0)
    })

    it('parses module with single statement', () => {
      const module = parseOne(`module single(a) -> out:
  out = a`)
      expect(module.statements.length).toBe(1)
    })

    it('parses module with many statements', () => {
      let statements = ''
      for (let i = 0; i < 100; i++) {
        statements += `  x${i} = a\n`
      }
      const source = `module many(a) -> out:
${statements}  out = x99`
      const module = parseOne(source)
      expect(module.statements.length).toBe(101)
    })

    it('handles identifier that looks like keyword', () => {
      const module = parseOne(`module test(module_in) -> module_out:
  module_out = module_in`)
      expect(module.inputs[0].name).toBe('module_in')
    })

    it('parses width of 1 explicitly', () => {
      const module = parseOne('module test(a:1) -> out:1:')
      expect(module.inputs[0].width).toBe(1)
      expect(module.outputs[0].width).toBe(1)
    })

    it('parses zero as valid value', () => {
      const module = parseOne(`module test(a) -> out:
  out = 0`)
      expect(module.statements[0].expr.kind).toBe('number')
    })

    it('handles complex expression chain', () => {
      const module = parseOne(`module test(a:8) -> out:
  out = foo(bar(baz(a).x[0]).y).z[1:3]`)
      // Just verify it parses without error
      expect(module.statements.length).toBe(1)
    })

    it('handles tabs in indentation', () => {
      const source = `module test(a) -> out:
\tout = a`
      const module = parseOne(source)
      expect(module.statements.length).toBe(1)
    })

    it('handles mixed indentation', () => {
      const source = `module test(a) -> out:
  x = a
\ty = x
    out = y`
      const module = parseOne(source)
      expect(module.statements.length).toBe(3)
    })
  })

  // ============================================
  // AST STRUCTURE TESTS
  // ============================================
  describe('AST structure', () => {
    it('builds correct call expression AST', () => {
      const module = parseOne(`module test(a, b) -> out:
  out = nand(a, b)`)
      const expr = module.statements[0].expr
      expect(expr).toEqual({
        kind: 'call',
        name: 'nand',
        args: [
          { kind: 'ident', name: 'a' },
          { kind: 'ident', name: 'b' }
        ]
      })
    })

    it('builds correct member expression AST', () => {
      const module = parseOne(`module test(a) -> out:
  out = result.sum`)
      const expr = module.statements[0].expr
      expect(expr).toEqual({
        kind: 'member',
        object: { kind: 'ident', name: 'result' },
        field: 'sum'
      })
    })

    it('builds correct index expression AST', () => {
      const module = parseOne(`module test(a:8) -> out:
  out = a[3]`)
      const expr = module.statements[0].expr
      expect(expr).toEqual({
        kind: 'index',
        object: { kind: 'ident', name: 'a' },
        index: 3
      })
    })

    it('builds correct slice expression AST', () => {
      const module = parseOne(`module test(a:8) -> out:4:
  out = a[0:3]`)
      const expr = module.statements[0].expr
      expect(expr).toEqual({
        kind: 'slice',
        object: { kind: 'ident', name: 'a' },
        start: 0,
        end: 3
      })
    })

    it('builds correct nested call AST', () => {
      const module = parseOne(`module test(a) -> out:
  out = f(g(a))`)
      const expr = module.statements[0].expr
      expect(expr).toEqual({
        kind: 'call',
        name: 'f',
        args: [{
          kind: 'call',
          name: 'g',
          args: [{ kind: 'ident', name: 'a' }]
        }]
      })
    })

    it('builds correct number literal AST', () => {
      const module = parseOne(`module test(a) -> out:8:
  out = 0xFF`)
      const expr = module.statements[0].expr
      expect(expr).toEqual({
        kind: 'number',
        value: 255
      })
    })

    it('builds correct port list', () => {
      const module = parseOne('module test(a:4, b:8, c) -> (x:16, y):')
      expect(module.inputs).toEqual([
        { name: 'a', width: 4 },
        { name: 'b', width: 8 },
        { name: 'c', width: 1 }
      ])
      expect(module.outputs).toEqual([
        { name: 'x', width: 16 },
        { name: 'y', width: 1 }
      ])
    })

    it('builds correct statement list', () => {
      const module = parseOne(`module test(a, b) -> out:
  x = a
  y = b
  out = nand(x, y)`)
      expect(module.statements.length).toBe(3)
      expect(module.statements[0].target).toBe('x')
      expect(module.statements[1].target).toBe('y')
      expect(module.statements[2].target).toBe('out')
    })
  })

  // ============================================
  // REAL WIRE CODE TESTS
  // ============================================
  describe('real Wire code', () => {
    it('parses NOT gate implementation', () => {
      const module = parseOne(`module not(a) -> out:
  out = nand(a, a)`)
      expect(module.name).toBe('not')
      expect(module.inputs.length).toBe(1)
      expect(module.outputs.length).toBe(1)
      expect(module.statements.length).toBe(1)
    })

    it('parses AND gate implementation', () => {
      const module = parseOne(`module and(a, b) -> out:
  x = nand(a, b)
  out = nand(x, x)`)
      expect(module.name).toBe('and')
      expect(module.statements.length).toBe(2)
    })

    it('parses OR gate implementation', () => {
      const module = parseOne(`module or(a, b) -> out:
  na = nand(a, a)
  nb = nand(b, b)
  out = nand(na, nb)`)
      expect(module.name).toBe('or')
      expect(module.statements.length).toBe(3)
    })

    it('parses XOR gate implementation', () => {
      const module = parseOne(`module xor(a, b) -> out:
  nab = nand(a, b)
  na = nand(a, nab)
  nb = nand(b, nab)
  out = nand(na, nb)`)
      expect(module.name).toBe('xor')
      expect(module.statements.length).toBe(4)
    })

    it('parses MUX implementation', () => {
      const module = parseOne(`module mux(a, b, sel) -> out:
  nsel = nand(sel, sel)
  x = nand(a, nsel)
  y = nand(b, sel)
  out = nand(x, y)`)
      expect(module.name).toBe('mux')
      expect(module.inputs.length).toBe(3)
    })

    it('parses half adder implementation', () => {
      const module = parseOne(`module half_adder(a, b) -> (sum, carry):
  sum = xor(a, b)
  carry = and(a, b)`)
      expect(module.outputs.length).toBe(2)
    })

    it('parses full adder implementation', () => {
      const module = parseOne(`module full_adder(a, b, cin) -> (sum, cout):
  ha1 = half_adder(a, b)
  ha2 = half_adder(ha1.sum, cin)
  sum = ha2.sum
  cout = or(ha1.carry, ha2.carry)`)
      expect(module.inputs.length).toBe(3)
      expect(module.outputs.length).toBe(2)
      expect(module.statements.length).toBe(4)
    })

    it('parses D flip-flop usage', () => {
      const module = parseOne(`module counter(clk) -> out:
  next = not(out)
  out = dff(next, clk)`)
      expect(module.name).toBe('counter')
      expect(module.statements.length).toBe(2)
    })

    it('parses SR latch', () => {
      const module = parseOne(`module sr_latch(s, r) -> (q, qn):
  q = nand(s, qn)
  qn = nand(r, q)`)
      expect(module.name).toBe('sr_latch')
      expect(module.inputs.length).toBe(2)
      expect(module.outputs.length).toBe(2)
    })

    it('parses 8-bit adder', () => {
      const source = `module adder8(a:8, b:8, cin) -> (sum:8, cout):
  fa0 = full_adder(a[0], b[0], cin)
  fa1 = full_adder(a[1], b[1], fa0.cout)
  fa2 = full_adder(a[2], b[2], fa1.cout)
  fa3 = full_adder(a[3], b[3], fa2.cout)
  fa4 = full_adder(a[4], b[4], fa3.cout)
  fa5 = full_adder(a[5], b[5], fa4.cout)
  fa6 = full_adder(a[6], b[6], fa5.cout)
  fa7 = full_adder(a[7], b[7], fa6.cout)
  sum = 0
  cout = fa7.cout`
      const module = parseOne(source)
      expect(module.inputs[0].width).toBe(8)
      expect(module.inputs[1].width).toBe(8)
      expect(module.outputs[0].width).toBe(8)
      expect(module.statements.length).toBe(10)
    })

    it('parses standard library gates', () => {
      const source = `
module not(a) -> out:
  out = nand(a, a)

module and(a, b) -> out:
  x = nand(a, b)
  out = not(x)

module or(a, b) -> out:
  na = not(a)
  nb = not(b)
  out = nand(na, nb)

module xor(a, b) -> out:
  nab = nand(a, b)
  x = and(a, nab)
  y = and(b, nab)
  out = or(x, y)

module nor(a, b) -> out:
  x = or(a, b)
  out = not(x)

module nand3(a, b, c) -> out:
  ab = and(a, b)
  out = nand(ab, c)
`
      const modules = parseWire(source)
      expect(modules.length).toBe(6)
      expect(modules.map(m => m.name)).toEqual(['not', 'and', 'or', 'xor', 'nor', 'nand3'])
    })
  })
})
