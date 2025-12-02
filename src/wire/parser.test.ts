import { describe, it, expect } from 'vitest'
import { lex } from './lexer'
import { parse, parseModule } from './parser'
import type { Module, Expr } from './ast'

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

describe('Wire Parser', () => {
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
  })

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
  })

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
      }
    })
  })

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
  })

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
  })

  describe('comments', () => {
    it('ignores comments', () => {
      const module = parseOne(`
module not(a) -> out:  ; this is a NOT gate
  out = nand(a, a)     ; using NAND as primitive
`)
      expect(module.name).toBe('not')
      expect(module.statements.length).toBe(1)
    })
  })

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
  })
})
