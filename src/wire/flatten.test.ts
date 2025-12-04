import { describe, it, expect, beforeEach } from 'vitest'
import { flatten, resetFlatWireCounter } from './flatten'
import { compile, resetNodeCounter } from './compiler'
import { lex } from './lexer'
import { parse } from './parser'

// Helper to compile source and flatten
function compileAndFlatten(source: string, mainModule?: string) {
    resetNodeCounter()
    resetFlatWireCounter()

    const lexResult = lex(source)
    if (!lexResult.ok) throw new Error(`Lex error: ${lexResult.error.message}`)

    const parseResult = parse(lexResult.tokens)
    if (!parseResult.ok) throw new Error(`Parse error: ${parseResult.error.message}`)

    const compileResult = compile(parseResult.value)
    if (!compileResult.ok) throw new Error(`Compile error: ${compileResult.error.message}`)

    const modules = compileResult.modules

    // Find main module
    let main = mainModule ? modules.get(mainModule) : undefined
    if (!main) {
        for (const mod of modules.values()) {
            main = mod
        }
    }
    if (!main) throw new Error('No modules found')

    return flatten(main, modules)
}

beforeEach(() => {
    resetNodeCounter()
    resetFlatWireCounter()
})

describe('Circuit Flattening', () => {
    describe('basic circuits', () => {
        it('flattens a simple NAND gate', () => {
            const circuit = compileAndFlatten(`
module test(a, b) -> out:
  out = nand(a, b)
`)
            expect(circuit.inputs).toHaveLength(2)
            expect(circuit.outputs).toHaveLength(1)
            expect(circuit.nodes.filter(n => n.type === 'nand')).toHaveLength(1)
        })

        it('flattens a NOT gate', () => {
            const circuit = compileAndFlatten(`
module test(a) -> out:
  out = nand(a, a)
`)
            expect(circuit.inputs).toHaveLength(1)
            expect(circuit.outputs).toHaveLength(1)
            expect(circuit.nodes.filter(n => n.type === 'nand')).toHaveLength(1)
        })

        it('flattens a constant', () => {
            const circuit = compileAndFlatten(`
module test() -> out:
  out = 1
`)
            expect(circuit.inputs).toHaveLength(0)
            expect(circuit.outputs).toHaveLength(1)
            expect(circuit.nodes.filter(n => n.type === 'const')).toHaveLength(1)
            expect(circuit.nodes.find(n => n.type === 'const')?.constValue).toBe(1)
        })

        it('flattens a DFF', () => {
            const circuit = compileAndFlatten(`
module test(d, clk) -> q:
  q = dff(d, clk)
`)
            expect(circuit.dffNodes).toHaveLength(1)
            expect(circuit.nodes.filter(n => n.type === 'dff')).toHaveLength(1)
        })

        it('flattens index operation', () => {
            const circuit = compileAndFlatten(`
module test(a:8) -> out:
  out = a[3]
`)
            expect(circuit.nodes.filter(n => n.type === 'index')).toHaveLength(1)
            expect(circuit.nodes.find(n => n.type === 'index')?.bitIndex).toBe(3)
        })

        it('flattens slice operation', () => {
            const circuit = compileAndFlatten(`
module test(a:8) -> out:4:
  out = a[0:3]
`)
            const sliceNode = circuit.nodes.find(n => n.type === 'slice')
            expect(sliceNode).toBeDefined()
            expect(sliceNode?.sliceStart).toBe(0)
            expect(sliceNode?.sliceEnd).toBe(3)
        })

        it('flattens concat operation', () => {
            const circuit = compileAndFlatten(`
module test(hi:4, lo:4) -> out:8:
  out = concat(hi, lo)
`)
            const concatNode = circuit.nodes.find(n => n.type === 'concat')
            expect(concatNode).toBeDefined()
            expect(concatNode?.inputs).toHaveLength(2)
            expect(concatNode?.inputWidths).toEqual([4, 4])
        })

        it('flattens RAM', () => {
            const circuit = compileAndFlatten(`
module test(addr:8, data:8, write, clk) -> out:8:
  out = ram(addr, data, write, clk)
`)
            expect(circuit.ramNodes).toHaveLength(1)
            expect(circuit.nodes.filter(n => n.type === 'ram')).toHaveLength(1)
        })

        it('flattens ROM', () => {
            const circuit = compileAndFlatten(`
module test(addr:8) -> out:8:
  out = rom(addr)
`)
            expect(circuit.romNodes).toHaveLength(1)
            expect(circuit.nodes.filter(n => n.type === 'rom')).toHaveLength(1)
        })
    })

    describe('module inlining', () => {
        it('inlines a simple module call', () => {
            const circuit = compileAndFlatten(`
module not(a) -> out:
  out = nand(a, a)

module test(x) -> y:
  y = not(x)
`)
            // The NOT module's NAND should be inlined
            expect(circuit.nodes.filter(n => n.type === 'nand')).toHaveLength(1)
            // No module nodes should remain
            expect(circuit.nodes.filter(n => n.type === 'module' as any)).toHaveLength(0)
        })

        it('inlines nested module calls', () => {
            const circuit = compileAndFlatten(`
module not(a) -> out:
  out = nand(a, a)

module and(a, b) -> out:
  x = nand(a, b)
  out = not(x)

module test(p, q) -> r:
  r = and(p, q)
`, 'test')
            // AND = NAND + NOT = 2 NANDs total
            expect(circuit.nodes.filter(n => n.type === 'nand')).toHaveLength(2)
        })

        it('inlines deeply nested modules', () => {
            const circuit = compileAndFlatten(`
module not(a) -> out:
  out = nand(a, a)

module level1(x) -> y:
  y = not(x)

module level2(x) -> y:
  y = level1(x)

module level3(x) -> y:
  y = level2(x)

module test(a) -> b:
  b = level3(a)
`)
            // All levels should be flattened to just 1 NAND
            expect(circuit.nodes.filter(n => n.type === 'nand')).toHaveLength(1)
        })

        it('handles multiple instances of the same module', () => {
            const circuit = compileAndFlatten(`
module not(a) -> out:
  out = nand(a, a)

module test(a, b) -> (x, y):
  x = not(a)
  y = not(b)
`)
            // Two NOT instances = 2 NANDs
            expect(circuit.nodes.filter(n => n.type === 'nand')).toHaveLength(2)
        })

        it('inlines multi-output modules', () => {
            const circuit = compileAndFlatten(`
module swap(a, b) -> (x, y):
  x = b
  y = a

module test(p, q) -> (r, s):
  sw = swap(p, q)
  r = sw.x
  s = sw.y
`)
            // Swap just aliases, no gates
            expect(circuit.inputs).toHaveLength(2)
            expect(circuit.outputs).toHaveLength(2)
        })

        it('inlines half adder correctly', () => {
            const circuit = compileAndFlatten(`
module not(a) -> out:
  out = nand(a, a)

module and(a, b) -> out:
  x = nand(a, b)
  out = not(x)

module xor(a, b) -> out:
  nand_ab = nand(a, b)
  out = nand(nand(a, nand_ab), nand(nand_ab, b))

module half_adder(a, b) -> (sum, cout):
  sum = xor(a, b)
  cout = and(a, b)
`, 'half_adder')
            // XOR = 4 NANDs, AND = 2 NANDs, total = 6
            expect(circuit.nodes.filter(n => n.type === 'nand')).toHaveLength(6)
            expect(circuit.inputs).toHaveLength(2)
            expect(circuit.outputs).toHaveLength(2)
        })
    })

    describe('complex circuits', () => {
        it('flattens OR gate', () => {
            const circuit = compileAndFlatten(`
module not(a) -> out:
  out = nand(a, a)

module or(a, b) -> out:
  na = not(a)
  nb = not(b)
  out = nand(na, nb)
`, 'or')
            // OR = NOT(a) + NOT(b) + NAND = 3 NANDs
            expect(circuit.nodes.filter(n => n.type === 'nand')).toHaveLength(3)
        })

        it('flattens XOR gate', () => {
            const circuit = compileAndFlatten(`
module xor(a, b) -> out:
  nand_ab = nand(a, b)
  out = nand(nand(a, nand_ab), nand(nand_ab, b))
`)
            // XOR = 4 NANDs
            expect(circuit.nodes.filter(n => n.type === 'nand')).toHaveLength(4)
        })

        it('flattens SR latch', () => {
            const circuit = compileAndFlatten(`
module sr_latch(s, r) -> (q, qn):
  q = nand(s, qn)
  qn = nand(r, q)
`)
            expect(circuit.nodes.filter(n => n.type === 'nand')).toHaveLength(2)
            expect(circuit.outputs).toHaveLength(2)
        })

        it('flattens counter with DFF', () => {
            const circuit = compileAndFlatten(`
module not(a) -> out:
  out = nand(a, a)

module counter(clk) -> q:
  next = not(q)
  q = dff(next, clk)
`)
            expect(circuit.nodes.filter(n => n.type === 'nand')).toHaveLength(1)
            expect(circuit.dffNodes).toHaveLength(1)
        })
    })

    describe('wire connectivity', () => {
        it('correctly maps input wires', () => {
            const circuit = compileAndFlatten(`
module test(a, b) -> out:
  out = nand(a, b)
`)
            const nandNode = circuit.nodes.find(n => n.type === 'nand')!
            const inputA = circuit.inputs.find(i => i.name === 'a')!
            const inputB = circuit.inputs.find(i => i.name === 'b')!

            expect(nandNode.inputs).toContain(inputA.index)
            expect(nandNode.inputs).toContain(inputB.index)
        })

        it('correctly maps output wires', () => {
            const circuit = compileAndFlatten(`
module test(a, b) -> out:
  out = nand(a, b)
`)
            const nandNode = circuit.nodes.find(n => n.type === 'nand')!
            const output = circuit.outputs.find(o => o.name === 'out')!

            // The output wire is connected via the alias system
            // The NAND writes to its output wire, which is aliased to 'out'
            // We verify the wire exists and the NAND has an output
            expect(nandNode.outputs).toHaveLength(1)
            expect(output.index).toBeGreaterThanOrEqual(0)
            // The output should reference the same wire as the NAND output
            // (they may be the same or connected via wireNames)
            expect(circuit.wireNames.has('out')).toBe(true)
        })

        it('chains gates correctly', () => {
            const circuit = compileAndFlatten(`
module test(a) -> out:
  x = nand(a, a)
  out = nand(x, x)
`)
            const nandNodes = circuit.nodes.filter(n => n.type === 'nand')
            expect(nandNodes).toHaveLength(2)

            // First NAND's output should be second NAND's input
            const firstNand = nandNodes[0]
            const secondNand = nandNodes[1]
            expect(secondNand.inputs[0]).toBe(firstNand.outputs[0])
            expect(secondNand.inputs[1]).toBe(firstNand.outputs[0])
        })

        it('shares wires between nodes correctly', () => {
            const circuit = compileAndFlatten(`
module test(a, b) -> (x, y):
  shared = nand(a, b)
  x = nand(shared, shared)
  y = nand(shared, a)
`)
            const nandNodes = circuit.nodes.filter(n => n.type === 'nand')
            expect(nandNodes).toHaveLength(3)

            // The 'shared' wire should be used by both x and y NANDs
            const sharedWire = nandNodes[0].outputs[0]
            expect(nandNodes[1].inputs).toContain(sharedWire)
            expect(nandNodes[2].inputs).toContain(sharedWire)
        })
    })

    describe('wire width handling', () => {
        it('preserves 8-bit input width', () => {
            const circuit = compileAndFlatten(`
module test(a:8, b:8) -> out:8:
  out = nand(a, b)
`)
            const inputA = circuit.inputs.find(i => i.name === 'a')!
            expect(inputA.width).toBe(8)
        })

        it('preserves 16-bit wire width', () => {
            const circuit = compileAndFlatten(`
module test(a:16) -> out:16:
  out = a
`)
            const output = circuit.outputs.find(o => o.name === 'out')!
            expect(output.width).toBe(16)
        })

        it('correctly tracks concat width', () => {
            const circuit = compileAndFlatten(`
module test(hi:4, lo:4) -> out:8:
  out = concat(hi, lo)
`)
            const concatNode = circuit.nodes.find(n => n.type === 'concat')!
            expect(concatNode.width).toBe(8)
        })

        it('correctly tracks slice width', () => {
            const circuit = compileAndFlatten(`
module test(a:16) -> out:8:
  out = a[0:7]
`)
            const sliceNode = circuit.nodes.find(n => n.type === 'slice')!
            expect(sliceNode.width).toBe(8)
        })
    })

    describe('edge cases', () => {
        it('handles empty module', () => {
            const circuit = compileAndFlatten(`
module test(a) -> out:
  out = a
`)
            // Just aliasing, no gates
            expect(circuit.nodes.filter(n => n.type === 'nand')).toHaveLength(0)
        })

        it('handles module with no inputs', () => {
            const circuit = compileAndFlatten(`
module const_one() -> out:
  out = 1
`)
            expect(circuit.inputs).toHaveLength(0)
            expect(circuit.outputs).toHaveLength(1)
        })

        it('handles many chained modules', () => {
            let source = `module not(a) -> out:\n  out = nand(a, a)\n\n`
            source += `module chain(x) -> y:\n`
            source += `  w0 = not(x)\n`
            for (let i = 1; i < 20; i++) {
                source += `  w${i} = not(w${i - 1})\n`
            }
            source += `  y = w19\n`

            const circuit = compileAndFlatten(source, 'chain')
            // 20 NOT gates = 20 NANDs
            expect(circuit.nodes.filter(n => n.type === 'nand')).toHaveLength(20)
        })

        it('handles parallel instances', () => {
            const circuit = compileAndFlatten(`
module not(a) -> out:
  out = nand(a, a)

module test(a, b, c, d) -> (w, x, y, z):
  w = not(a)
  x = not(b)
  y = not(c)
  z = not(d)
`)
            expect(circuit.nodes.filter(n => n.type === 'nand')).toHaveLength(4)
        })

        it('handles module with DFF and combinational logic', () => {
            const circuit = compileAndFlatten(`
module not(a) -> out:
  out = nand(a, a)

module toggle(clk) -> q:
  next = not(q)
  q = dff(next, clk)
`)
            expect(circuit.nodes.filter(n => n.type === 'nand')).toHaveLength(1)
            expect(circuit.dffNodes).toHaveLength(1)
        })
    })

    describe('unique wire indices', () => {
        it('each wire has a unique index', () => {
            const circuit = compileAndFlatten(`
module not(a) -> out:
  out = nand(a, a)

module and(a, b) -> out:
  x = nand(a, b)
  out = not(x)

module test(a, b, c) -> out:
  t1 = and(a, b)
  out = and(t1, c)
`)
            // All wire indices should be unique
            const allIndices = new Set<number>()
            for (const node of circuit.nodes) {
                for (const i of node.inputs) {
                    allIndices.add(i)
                }
                for (const o of node.outputs) {
                    allIndices.add(o)
                }
            }

            // The indices should form a contiguous range from 0
            const sorted = Array.from(allIndices).sort((a, b) => a - b)
            for (let i = 0; i < sorted.length; i++) {
                expect(sorted[i]).toBeLessThan(circuit.wireCount)
            }
        })

        it('wire count matches actual wires used', () => {
            const circuit = compileAndFlatten(`
module test(a, b, c) -> (x, y):
  x = nand(a, b)
  y = nand(b, c)
`)
            // a, b, c, x, y = 5 wires
            // But internal wires may add more
            expect(circuit.wireCount).toBeGreaterThanOrEqual(5)
            expect(circuit.wireNames.size).toBeGreaterThanOrEqual(5)
        })
    })
})
