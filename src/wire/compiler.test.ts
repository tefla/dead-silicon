import { describe, it, expect, beforeEach } from 'vitest'
import { compile, resetNodeCounter, type CompiledModule, type Node } from './compiler'
import { lex } from './lexer'
import { parse } from './parser'
import type { Module } from './ast'

// Helper to compile Wire source directly
const compileWire = (source: string): Map<string, CompiledModule> => {
  const lexResult = lex(source)
  if (!lexResult.ok) throw new Error(`Lex error: ${lexResult.error.message}`)
  const parseResult = parse(lexResult.tokens)
  if (!parseResult.ok) throw new Error(`Parse error: ${parseResult.error.message}`)
  const compileResult = compile(parseResult.value)
  if (!compileResult.ok) throw new Error(`Compile error: ${compileResult.error.message}`)
  return compileResult.modules
}

// Helper to get a single module
const compileOne = (source: string): CompiledModule => {
  const modules = compileWire(source)
  if (modules.size !== 1) throw new Error(`Expected 1 module, got ${modules.size}`)
  return modules.values().next().value!
}

// Helper to expect compile success
const expectOk = (source: string): Map<string, CompiledModule> => {
  const lexResult = lex(source)
  expect(lexResult.ok).toBe(true)
  if (!lexResult.ok) throw new Error(lexResult.error.message)
  const parseResult = parse(lexResult.tokens)
  expect(parseResult.ok).toBe(true)
  if (!parseResult.ok) throw new Error(parseResult.error.message)
  const compileResult = compile(parseResult.value)
  expect(compileResult.ok).toBe(true)
  if (!compileResult.ok) throw new Error(compileResult.error.message)
  return compileResult.modules
}

// Helper to expect compile failure
const expectError = (source: string): { message: string; module: string } => {
  const lexResult = lex(source)
  if (!lexResult.ok) throw new Error(`Unexpected lex error: ${lexResult.error.message}`)
  const parseResult = parse(lexResult.tokens)
  if (!parseResult.ok) throw new Error(`Unexpected parse error: ${parseResult.error.message}`)
  const compileResult = compile(parseResult.value)
  expect(compileResult.ok).toBe(false)
  if (compileResult.ok) throw new Error('Expected compile error')
  return compileResult.error
}

describe('Wire Compiler', () => {
  beforeEach(() => {
    resetNodeCounter()
  })

  // ============================================
  // MODULE STRUCTURE TESTS
  // ============================================
  describe('module structure', () => {
    it('compiles empty module', () => {
      const mod = compileOne('module empty() -> out:')
      expect(mod.name).toBe('empty')
      expect(mod.inputs).toEqual([])
      expect(mod.outputs).toEqual([{ name: 'out', width: 1 }])
    })

    it('compiles module with single input', () => {
      const mod = compileOne(`module copy(a) -> out:
        out = a`)
      expect(mod.inputs).toEqual([{ name: 'a', width: 1 }])
    })

    it('compiles module with multiple inputs', () => {
      const mod = compileOne(`module multi(a, b, c) -> out:
        out = a`)
      expect(mod.inputs.length).toBe(3)
      expect(mod.inputs.map(i => i.name)).toEqual(['a', 'b', 'c'])
    })

    it('compiles module with multiple outputs', () => {
      const mod = compileOne(`module multi(a) -> (x, y):
        x = a
        y = a`)
      expect(mod.outputs.length).toBe(2)
      expect(mod.outputs.map(o => o.name)).toEqual(['x', 'y'])
    })

    it('compiles module with width specifiers', () => {
      const mod = compileOne(`module wide(a:8, b:16) -> out:32:
        out = a`)
      expect(mod.inputs[0].width).toBe(8)
      expect(mod.inputs[1].width).toBe(16)
      expect(mod.outputs[0].width).toBe(32)
    })

    it('creates input nodes for each input', () => {
      const mod = compileOne(`module test(a, b, c) -> out:
        out = a`)
      const inputNodes = mod.nodes.filter(n => n.type === 'input')
      expect(inputNodes.length).toBe(3)
    })

    it('creates output nodes for each output', () => {
      const mod = compileOne(`module test(a) -> (x, y, z):
        x = a
        y = a
        z = a`)
      const outputNodes = mod.nodes.filter(n => n.type === 'output')
      expect(outputNodes.length).toBe(3)
    })

    it('input nodes have correct output wire names', () => {
      const mod = compileOne(`module test(a, b) -> out:
        out = a`)
      const inputNodes = mod.nodes.filter(n => n.type === 'input')
      expect(inputNodes.map(n => n.outputs[0])).toContain('a')
      expect(inputNodes.map(n => n.outputs[0])).toContain('b')
    })

    it('output nodes have correct input wire names', () => {
      const mod = compileOne(`module test(a) -> out:
        out = a`)
      const outputNodes = mod.nodes.filter(n => n.type === 'output')
      expect(outputNodes[0].inputs[0]).toBe('out')
    })
  })

  // ============================================
  // WIRE TRACKING TESTS
  // ============================================
  describe('wire tracking', () => {
    it('tracks input wires', () => {
      const mod = compileOne(`module test(a, b) -> out:
        out = a`)
      expect(mod.wires.has('a')).toBe(true)
      expect(mod.wires.has('b')).toBe(true)
    })

    it('tracks output wires', () => {
      const mod = compileOne(`module test(a) -> (x, y):
        x = a
        y = a`)
      expect(mod.wires.has('x')).toBe(true)
      expect(mod.wires.has('y')).toBe(true)
    })

    it('tracks intermediate wires', () => {
      const mod = compileOne(`module test(a) -> out:
        x = a
        y = x
        out = y`)
      expect(mod.wires.has('x')).toBe(true)
      expect(mod.wires.has('y')).toBe(true)
    })

    it('tracks correct widths for inputs', () => {
      const mod = compileOne(`module test(a:8, b:16) -> out:
        out = a`)
      expect(mod.wires.get('a')).toBe(8)
      expect(mod.wires.get('b')).toBe(16)
    })

    it('tracks correct widths for outputs', () => {
      const mod = compileOne(`module test(a) -> (x:8, y:16):
        x = a
        y = a`)
      expect(mod.wires.get('x')).toBe(8)
      expect(mod.wires.get('y')).toBe(16)
    })
  })

  // ============================================
  // ALIAS TESTS
  // ============================================
  describe('aliases', () => {
    it('creates alias for simple assignment', () => {
      const mod = compileOne(`module test(a) -> out:
        out = a`)
      expect(mod.aliases.get('out')).toBe('a')
    })

    it('creates alias chain', () => {
      const mod = compileOne(`module test(a) -> out:
        x = a
        y = x
        out = y`)
      expect(mod.aliases.get('x')).toBe('a')
      expect(mod.aliases.get('y')).toBe('x')
      expect(mod.aliases.get('out')).toBe('y')
    })

    it('does not create self-alias', () => {
      const mod = compileOne(`module test(a) -> out:
        out = a`)
      // 'a' should not alias to itself
      expect(mod.aliases.has('a')).toBe(false)
    })

    it('creates alias from function call result', () => {
      const mod = compileOne(`module test(a, b) -> out:
        out = nand(a, b)`)
      // out should alias to the nand output wire
      expect(mod.aliases.has('out')).toBe(true)
    })
  })

  // ============================================
  // NAND PRIMITIVE TESTS
  // ============================================
  describe('nand primitive', () => {
    it('compiles simple nand call', () => {
      const mod = compileOne(`module test(a, b) -> out:
        out = nand(a, b)`)
      const nandNode = mod.nodes.find(n => n.type === 'nand')
      expect(nandNode).toBeDefined()
    })

    it('nand node has correct inputs', () => {
      const mod = compileOne(`module test(a, b) -> out:
        out = nand(a, b)`)
      const nandNode = mod.nodes.find(n => n.type === 'nand')!
      expect(nandNode.inputs).toContain('a')
      expect(nandNode.inputs).toContain('b')
    })

    it('nand node has output wire', () => {
      const mod = compileOne(`module test(a, b) -> out:
        out = nand(a, b)`)
      const nandNode = mod.nodes.find(n => n.type === 'nand')!
      expect(nandNode.outputs.length).toBe(1)
    })

    it('nand inherits width from first argument', () => {
      const mod = compileOne(`module test(a:8, b:8) -> out:8:
        out = nand(a, b)`)
      const nandNode = mod.nodes.find(n => n.type === 'nand')!
      expect(nandNode.width).toBe(8)
    })

    it('compiles nested nand calls', () => {
      const mod = compileOne(`module test(a, b, c) -> out:
        out = nand(nand(a, b), c)`)
      const nandNodes = mod.nodes.filter(n => n.type === 'nand')
      expect(nandNodes.length).toBe(2)
    })

    it('compiles multiple nand calls', () => {
      const mod = compileOne(`module test(a, b) -> out:
        x = nand(a, b)
        y = nand(a, b)
        out = nand(x, y)`)
      const nandNodes = mod.nodes.filter(n => n.type === 'nand')
      expect(nandNodes.length).toBe(3)
    })

    it('errors on nand with wrong argument count', () => {
      const error = expectError(`module test(a) -> out:
        out = nand(a)`)
      expect(error.message).toContain('2 arguments')
    })

    it('errors on nand with too many arguments', () => {
      const error = expectError(`module test(a, b, c) -> out:
        out = nand(a, b, c)`)
      expect(error.message).toContain('2 arguments')
    })
  })

  // ============================================
  // DFF PRIMITIVE TESTS
  // ============================================
  describe('dff primitive', () => {
    it('compiles simple dff call', () => {
      const mod = compileOne(`module test(d, clk) -> out:
        out = dff(d, clk)`)
      const dffNode = mod.nodes.find(n => n.type === 'dff')
      expect(dffNode).toBeDefined()
    })

    it('dff node has correct inputs', () => {
      const mod = compileOne(`module test(d, clk) -> out:
        out = dff(d, clk)`)
      const dffNode = mod.nodes.find(n => n.type === 'dff')!
      expect(dffNode.inputs[0]).toBe('d')
      expect(dffNode.inputs[1]).toBe('clk')
    })

    it('dff node has output wire', () => {
      const mod = compileOne(`module test(d, clk) -> out:
        out = dff(d, clk)`)
      const dffNode = mod.nodes.find(n => n.type === 'dff')!
      expect(dffNode.outputs.length).toBe(1)
    })

    it('dff has width 1', () => {
      const mod = compileOne(`module test(d, clk) -> out:
        out = dff(d, clk)`)
      const dffNode = mod.nodes.find(n => n.type === 'dff')!
      expect(dffNode.width).toBe(1)
    })

    it('errors on dff with wrong argument count', () => {
      const error = expectError(`module test(d) -> out:
        out = dff(d)`)
      expect(error.message).toContain('2 arguments')
    })

    it('compiles counter pattern with dff', () => {
      const mod = compileOne(`module counter(clk) -> out:
        next = nand(out, out)
        out = dff(next, clk)`)
      const dffNode = mod.nodes.find(n => n.type === 'dff')
      const nandNode = mod.nodes.find(n => n.type === 'nand')
      expect(dffNode).toBeDefined()
      expect(nandNode).toBeDefined()
    })
  })

  // ============================================
  // CONSTANT TESTS
  // ============================================
  describe('constants', () => {
    it('compiles constant 0', () => {
      const mod = compileOne(`module test(a) -> out:
        out = 0`)
      const constNode = mod.nodes.find(n => n.type === 'const')
      expect(constNode).toBeDefined()
      expect(constNode?.constValue).toBe(0)
    })

    it('compiles constant 1', () => {
      const mod = compileOne(`module test(a) -> out:
        out = 1`)
      const constNode = mod.nodes.find(n => n.type === 'const')
      expect(constNode?.constValue).toBe(1)
    })

    it('compiles hex constants', () => {
      const mod = compileOne(`module test(a) -> out:
        out = 0xFF`)
      const constNode = mod.nodes.find(n => n.type === 'const')
      expect(constNode?.constValue).toBe(255)
    })

    it('compiles large constants', () => {
      const mod = compileOne(`module test(a) -> out:
        out = 0xDEADBEEF`)
      const constNode = mod.nodes.find(n => n.type === 'const')
      expect(constNode?.constValue).toBe(0xDEADBEEF)
    })

    it('constant node has output wire', () => {
      const mod = compileOne(`module test(a) -> out:
        out = 42`)
      const constNode = mod.nodes.find(n => n.type === 'const')!
      expect(constNode.outputs.length).toBe(1)
    })
  })

  // ============================================
  // MODULE CALL TESTS
  // ============================================
  describe('module calls', () => {
    it('compiles module call', () => {
      const mod = compileOne(`module test(a, b) -> out:
        out = not(a)`)
      const moduleNode = mod.nodes.find(n => n.type === 'module')
      expect(moduleNode).toBeDefined()
      expect(moduleNode?.moduleName).toBe('not')
    })

    it('module node has correct inputs', () => {
      const mod = compileOne(`module test(a, b) -> out:
        out = and(a, b)`)
      const moduleNode = mod.nodes.find(n => n.type === 'module')!
      expect(moduleNode.inputs).toEqual(['a', 'b'])
    })

    it('compiles chained module calls', () => {
      const mod = compileOne(`module test(a) -> out:
        x = not(a)
        out = not(x)`)
      const moduleNodes = mod.nodes.filter(n => n.type === 'module')
      expect(moduleNodes.length).toBe(2)
    })

    it('compiles nested module calls', () => {
      const mod = compileOne(`module test(a, b) -> out:
        out = not(and(a, b))`)
      const moduleNodes = mod.nodes.filter(n => n.type === 'module')
      expect(moduleNodes.length).toBe(2)
    })

    it('compiles module call with many arguments', () => {
      const mod = compileOne(`module test(a, b, c, d) -> out:
        out = mux4(a, b, c, d)`)
      const moduleNode = mod.nodes.find(n => n.type === 'module')!
      expect(moduleNode.inputs.length).toBe(4)
    })

    it('compiles module call with no arguments', () => {
      const mod = compileOne(`module test(a) -> out:
        out = clock()`)
      const moduleNode = mod.nodes.find(n => n.type === 'module')!
      expect(moduleNode.inputs.length).toBe(0)
    })
  })

  // ============================================
  // MEMBER ACCESS TESTS
  // ============================================
  describe('member access', () => {
    it('compiles member access', () => {
      const mod = compileOne(`module test(a) -> out:
        result = half_adder(a, a)
        out = result.sum`)
      expect(mod.wires.has('result.sum')).toBe(true)
    })

    it('compiles chained member access', () => {
      const mod = compileOne(`module test(a) -> out:
        out = foo.bar.baz`)
      // The compiler creates synthetic wires for member access
      const memberWires = Array.from(mod.wires.keys()).filter(k => k.includes('.'))
      expect(memberWires.length).toBeGreaterThan(0)
    })

    it('compiles member access as function argument', () => {
      const mod = compileOne(`module test(a, b) -> out:
        result = half_adder(a, b)
        out = nand(result.sum, result.carry)`)
      const nandNode = mod.nodes.find(n => n.type === 'nand')
      expect(nandNode).toBeDefined()
    })
  })

  // ============================================
  // INDEX TESTS
  // ============================================
  describe('indexing', () => {
    it('compiles bit indexing', () => {
      const mod = compileOne(`module test(a:8) -> out:
        out = a[0]`)
      const indexNode = mod.nodes.find(n => n.type === 'index')
      expect(indexNode).toBeDefined()
    })

    it('index node has correct bit index', () => {
      const mod = compileOne(`module test(a:8) -> out:
        out = a[3]`)
      const indexNode = mod.nodes.find(n => n.type === 'index')!
      expect(indexNode.bitIndex).toBe(3)
    })

    it('index node has width 1', () => {
      const mod = compileOne(`module test(a:8) -> out:
        out = a[5]`)
      const indexNode = mod.nodes.find(n => n.type === 'index')!
      expect(indexNode.width).toBe(1)
    })

    it('index node has correct input', () => {
      const mod = compileOne(`module test(a:8) -> out:
        out = a[0]`)
      const indexNode = mod.nodes.find(n => n.type === 'index')!
      expect(indexNode.inputs[0]).toBe('a')
    })

    it('compiles multiple index operations', () => {
      const mod = compileOne(`module test(a:8) -> (lo, hi):
        lo = a[0]
        hi = a[7]`)
      const indexNodes = mod.nodes.filter(n => n.type === 'index')
      expect(indexNodes.length).toBe(2)
    })

    it('compiles index on function result', () => {
      const mod = compileOne(`module test(a:8, b:8) -> out:
        out = add(a, b)[0]`)
      const indexNode = mod.nodes.find(n => n.type === 'index')
      expect(indexNode).toBeDefined()
    })
  })

  // ============================================
  // SLICE TESTS
  // ============================================
  describe('slicing', () => {
    it('compiles slice operation', () => {
      const mod = compileOne(`module test(a:8) -> out:4:
        out = a[0:3]`)
      const sliceNode = mod.nodes.find(n => n.type === 'slice')
      expect(sliceNode).toBeDefined()
    })

    it('slice node has correct start/end', () => {
      const mod = compileOne(`module test(a:8) -> out:4:
        out = a[2:5]`)
      const sliceNode = mod.nodes.find(n => n.type === 'slice')!
      expect(sliceNode.sliceStart).toBe(2)
      expect(sliceNode.sliceEnd).toBe(5)
    })

    it('slice node has correct width', () => {
      const mod = compileOne(`module test(a:8) -> out:4:
        out = a[0:3]`)
      const sliceNode = mod.nodes.find(n => n.type === 'slice')!
      expect(sliceNode.width).toBe(4)
    })

    it('slice node has correct input', () => {
      const mod = compileOne(`module test(a:8) -> out:4:
        out = a[0:3]`)
      const sliceNode = mod.nodes.find(n => n.type === 'slice')!
      expect(sliceNode.inputs[0]).toBe('a')
    })

    it('compiles low nibble slice', () => {
      const mod = compileOne(`module test(a:8) -> out:4:
        out = a[0:3]`)
      const sliceNode = mod.nodes.find(n => n.type === 'slice')!
      expect(sliceNode.width).toBe(4)
    })

    it('compiles high nibble slice', () => {
      const mod = compileOne(`module test(a:8) -> out:4:
        out = a[4:7]`)
      const sliceNode = mod.nodes.find(n => n.type === 'slice')!
      expect(sliceNode.sliceStart).toBe(4)
      expect(sliceNode.sliceEnd).toBe(7)
    })

    it('compiles multiple slices', () => {
      const mod = compileOne(`module test(a:8) -> (lo:4, hi:4):
        lo = a[0:3]
        hi = a[4:7]`)
      const sliceNodes = mod.nodes.filter(n => n.type === 'slice')
      expect(sliceNodes.length).toBe(2)
    })
  })

  // ============================================
  // CONCAT TESTS
  // ============================================
  describe('concatenation', () => {
    it('compiles concat operation', () => {
      const mod = compileOne(`module test(a:4, b:4) -> out:8:
        out = concat(a, b)`)
      const concatNode = mod.nodes.find(n => n.type === 'concat')
      expect(concatNode).toBeDefined()
    })

    it('concat node has correct inputs', () => {
      const mod = compileOne(`module test(a:4, b:4) -> out:8:
        out = concat(a, b)`)
      const concatNode = mod.nodes.find(n => n.type === 'concat')!
      expect(concatNode.inputs).toEqual(['a', 'b'])
    })

    it('concat node calculates correct width', () => {
      const mod = compileOne(`module test(a:4, b:4) -> out:8:
        out = concat(a, b)`)
      const concatNode = mod.nodes.find(n => n.type === 'concat')!
      expect(concatNode.width).toBe(8)
    })

    it('errors on concat with less than 2 arguments', () => {
      const error = expectError(`module test(a:4) -> out:4:
        out = concat(a)`)
      expect(error.message).toContain('at least 2')
    })

    it('compiles concat with 3 arguments', () => {
      const mod = compileOne(`module test(a:2, b:2, c:2) -> out:6:
        out = concat(a, b, c)`)
      const concatNode = mod.nodes.find(n => n.type === 'concat')!
      expect(concatNode.inputs.length).toBe(3)
    })
  })

  // ============================================
  // RAM TESTS
  // ============================================
  describe('ram primitive', () => {
    it('compiles ram call', () => {
      const mod = compileOne(`module test(addr:8, data:8, write, clk) -> out:8:
        out = ram(addr, data, write, clk)`)
      const ramNode = mod.nodes.find(n => n.type === 'ram')
      expect(ramNode).toBeDefined()
    })

    it('ram node has correct inputs', () => {
      const mod = compileOne(`module test(addr:8, data:8, write, clk) -> out:8:
        out = ram(addr, data, write, clk)`)
      const ramNode = mod.nodes.find(n => n.type === 'ram')!
      expect(ramNode.inputs.length).toBe(4)
    })

    it('ram node has correct address width', () => {
      const mod = compileOne(`module test(addr:8, data:8, write, clk) -> out:8:
        out = ram(addr, data, write, clk)`)
      const ramNode = mod.nodes.find(n => n.type === 'ram')!
      expect(ramNode.addrWidth).toBe(8)
    })

    it('errors on ram with wrong argument count', () => {
      const error = expectError(`module test(addr:8, data:8, write) -> out:8:
        out = ram(addr, data, write)`)
      expect(error.message).toContain('4 arguments')
    })
  })

  // ============================================
  // ROM TESTS
  // ============================================
  describe('rom primitive', () => {
    it('compiles rom call', () => {
      const mod = compileOne(`module test(addr:8) -> out:8:
        out = rom(addr)`)
      const romNode = mod.nodes.find(n => n.type === 'rom')
      expect(romNode).toBeDefined()
    })

    it('rom node has correct input', () => {
      const mod = compileOne(`module test(addr:8) -> out:8:
        out = rom(addr)`)
      const romNode = mod.nodes.find(n => n.type === 'rom')!
      expect(romNode.inputs.length).toBe(1)
    })

    it('rom node has correct address width', () => {
      const mod = compileOne(`module test(addr:16) -> out:8:
        out = rom(addr)`)
      const romNode = mod.nodes.find(n => n.type === 'rom')!
      expect(romNode.addrWidth).toBe(16)
    })

    it('errors on rom with wrong argument count', () => {
      const error = expectError(`module test(addr:8, extra) -> out:8:
        out = rom(addr, extra)`)
      expect(error.message).toContain('1 argument')
    })
  })

  // ============================================
  // MULTIPLE MODULES TESTS
  // ============================================
  describe('multiple modules', () => {
    it('compiles multiple modules', () => {
      const modules = compileWire(`
module not(a) -> out:
  out = nand(a, a)

module and(a, b) -> out:
  x = nand(a, b)
  out = nand(x, x)
`)
      expect(modules.size).toBe(2)
      expect(modules.has('not')).toBe(true)
      expect(modules.has('and')).toBe(true)
    })

    it('each module has correct structure', () => {
      const modules = compileWire(`
module not(a) -> out:
  out = nand(a, a)

module and(a, b) -> out:
  x = nand(a, b)
  out = nand(x, x)
`)
      const notMod = modules.get('not')!
      expect(notMod.inputs.length).toBe(1)

      const andMod = modules.get('and')!
      expect(andMod.inputs.length).toBe(2)
    })

    it('compiles standard library gates', () => {
      const modules = compileWire(`
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
`)
      expect(modules.size).toBe(4)
    })
  })

  // ============================================
  // REAL CIRCUIT TESTS
  // ============================================
  describe('real circuits', () => {
    it('compiles NOT gate', () => {
      const mod = compileOne(`module not(a) -> out:
        out = nand(a, a)`)
      const nandNodes = mod.nodes.filter(n => n.type === 'nand')
      expect(nandNodes.length).toBe(1)
    })

    it('compiles AND gate', () => {
      const mod = compileOne(`module and(a, b) -> out:
        x = nand(a, b)
        out = nand(x, x)`)
      const nandNodes = mod.nodes.filter(n => n.type === 'nand')
      expect(nandNodes.length).toBe(2)
    })

    it('compiles OR gate', () => {
      const mod = compileOne(`module or(a, b) -> out:
        na = nand(a, a)
        nb = nand(b, b)
        out = nand(na, nb)`)
      const nandNodes = mod.nodes.filter(n => n.type === 'nand')
      expect(nandNodes.length).toBe(3)
    })

    it('compiles XOR gate', () => {
      const mod = compileOne(`module xor(a, b) -> out:
        nab = nand(a, b)
        na = nand(a, nab)
        nb = nand(b, nab)
        out = nand(na, nb)`)
      const nandNodes = mod.nodes.filter(n => n.type === 'nand')
      expect(nandNodes.length).toBe(4)
    })

    it('compiles half adder', () => {
      const modules = compileWire(`
module xor(a, b) -> out:
  nab = nand(a, b)
  na = nand(a, nab)
  nb = nand(b, nab)
  out = nand(na, nb)

module and(a, b) -> out:
  x = nand(a, b)
  out = nand(x, x)

module half_adder(a, b) -> (sum, carry):
  sum = xor(a, b)
  carry = and(a, b)
`)
      const ha = modules.get('half_adder')!
      expect(ha.outputs.length).toBe(2)
      expect(ha.outputs.map(o => o.name)).toEqual(['sum', 'carry'])
    })

    it('compiles SR latch', () => {
      const mod = compileOne(`module sr_latch(s, r) -> (q, qn):
        q = nand(s, qn)
        qn = nand(r, q)`)
      expect(mod.outputs.length).toBe(2)
      const nandNodes = mod.nodes.filter(n => n.type === 'nand')
      expect(nandNodes.length).toBe(2)
    })

    it('compiles D flip-flop pattern', () => {
      const mod = compileOne(`module d_ff(d, clk) -> q:
        qn = nand(q, q)
        next = nand(d, qn)
        q = dff(next, clk)`)
      const dffNode = mod.nodes.find(n => n.type === 'dff')
      const nandNodes = mod.nodes.filter(n => n.type === 'nand')
      expect(dffNode).toBeDefined()
      expect(nandNodes.length).toBe(2)
    })

    it('compiles MUX', () => {
      const mod = compileOne(`module mux(a, b, sel) -> out:
        nsel = nand(sel, sel)
        x = nand(a, nsel)
        y = nand(b, sel)
        out = nand(x, y)`)
      expect(mod.inputs.length).toBe(3)
      const nandNodes = mod.nodes.filter(n => n.type === 'nand')
      expect(nandNodes.length).toBe(4)
    })
  })

  // ============================================
  // EDGE CASES TESTS
  // ============================================
  describe('edge cases', () => {
    it('handles long wire chains', () => {
      let assignments = ''
      for (let i = 0; i < 100; i++) {
        if (i === 0) {
          assignments += '  x0 = a\n'
        } else {
          assignments += `  x${i} = x${i - 1}\n`
        }
      }
      const source = `module chain(a) -> out:
${assignments}  out = x99`
      const mod = compileOne(source)
      expect(mod.aliases.size).toBe(101)
    })

    it('handles many nand gates', () => {
      let statements = ''
      for (let i = 0; i < 50; i++) {
        statements += `  n${i} = nand(a, b)\n`
      }
      const source = `module many_nand(a, b) -> out:
${statements}  out = n49`
      const mod = compileOne(source)
      const nandNodes = mod.nodes.filter(n => n.type === 'nand')
      expect(nandNodes.length).toBe(50)
    })

    it('handles wide buses', () => {
      const mod = compileOne(`module wide(a:64) -> out:64:
        out = nand(a, a)`)
      expect(mod.wires.get('a')).toBe(64)
    })

    it('handles deep nesting', () => {
      // nand(nand(nand(nand(nand(a, a), nand(b, b)), nand(a, b)), a), b)
      // Counting: 1:nand(a,a), 2:nand(b,b), 3:nand(a,b), 4:nand(1,2), 5:nand(4,3), 6:nand(5,a), 7:nand(6,b)
      const mod = compileOne(`module deep(a, b) -> out:
        out = nand(nand(nand(nand(nand(a, a), nand(b, b)), nand(a, b)), a), b)`)
      const nandNodes = mod.nodes.filter(n => n.type === 'nand')
      expect(nandNodes.length).toBe(7)
    })

    it('handles single-character names', () => {
      const mod = compileOne(`module m(a, b, c, d, e) -> (x, y, z):
        x = a
        y = b
        z = c`)
      expect(mod.name).toBe('m')
      expect(mod.inputs.length).toBe(5)
      expect(mod.outputs.length).toBe(3)
    })

    it('handles very long names', () => {
      const longName = 'a'.repeat(100)
      const mod = compileOne(`module ${longName}(input_wire) -> output_wire:
        output_wire = input_wire`)
      expect(mod.name).toBe(longName)
    })
  })
})
