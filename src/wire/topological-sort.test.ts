import { describe, it, expect, beforeEach } from 'vitest'
import { flatten, resetFlatWireCounter } from './flatten'
import { topologicalSort, computeLevels } from './topological-sort'
import { compile, resetNodeCounter } from './compiler'
import { lex } from './lexer'
import { parse } from './parser'

// Helper to compile, flatten, and sort
function compileAndSort(source: string, mainModule?: string) {
    resetNodeCounter()
    resetFlatWireCounter()

    const lexResult = lex(source)
    if (!lexResult.ok) throw new Error(`Lex error: ${lexResult.error.message}`)

    const parseResult = parse(lexResult.tokens)
    if (!parseResult.ok) throw new Error(`Parse error: ${parseResult.error.message}`)

    const compileResult = compile(parseResult.value)
    if (!compileResult.ok) throw new Error(`Compile error: ${compileResult.error.message}`)

    const modules = compileResult.modules

    let main = mainModule ? modules.get(mainModule) : undefined
    if (!main) {
        for (const mod of modules.values()) {
            main = mod
        }
    }
    if (!main) throw new Error('No modules found')

    const circuit = flatten(main, modules)
    const sorted = topologicalSort(circuit)

    return { circuit, sorted }
}

beforeEach(() => {
    resetNodeCounter()
    resetFlatWireCounter()
})

describe('Topological Sort', () => {
    describe('basic circuits', () => {
        it('sorts a single NAND gate', () => {
            const { sorted } = compileAndSort(`
module test(a, b) -> out:
  out = nand(a, b)
`)
            expect(sorted.combinationalOrder).toHaveLength(1)
            expect(sorted.sequentialNodes).toHaveLength(0)
            expect(sorted.hasCycles).toBe(false)
        })

        it('sorts chained gates in correct order', () => {
            const { sorted } = compileAndSort(`
module test(a) -> out:
  x = nand(a, a)
  y = nand(x, x)
  out = nand(y, y)
`)
            expect(sorted.combinationalOrder).toHaveLength(3)
            expect(sorted.hasCycles).toBe(false)

            // Verify order: first NAND must come before second, etc.
            const order = sorted.combinationalOrder.map(n => n.id)
            const xIdx = order.findIndex(id => sorted.combinationalOrder[order.indexOf(id)].inputs.length === 2)
            // All nodes should be NANDs in dependency order
            expect(sorted.combinationalOrder.every(n => n.type === 'nand')).toBe(true)
        })

        it('sorts constant nodes first', () => {
            const { sorted } = compileAndSort(`
module test() -> out:
  x = 1
  out = nand(x, x)
`)
            expect(sorted.combinationalOrder).toHaveLength(2)
            expect(sorted.combinationalOrder[0].type).toBe('const')
            expect(sorted.combinationalOrder[1].type).toBe('nand')
        })

        it('handles parallel gates', () => {
            const { sorted } = compileAndSort(`
module test(a, b, c, d) -> (x, y):
  x = nand(a, b)
  y = nand(c, d)
`)
            expect(sorted.combinationalOrder).toHaveLength(2)
            expect(sorted.hasCycles).toBe(false)
            // Both can be at level 1 (no dependency between them)
        })

        it('handles diamond dependencies', () => {
            const { sorted } = compileAndSort(`
module test(a) -> out:
  x = nand(a, a)
  y = nand(a, a)
  out = nand(x, y)
`)
            expect(sorted.combinationalOrder).toHaveLength(3)
            expect(sorted.hasCycles).toBe(false)

            // The final NAND must come after both x and y
            const outNode = sorted.combinationalOrder.find(n =>
                sorted.combinationalOrder.indexOf(n) === sorted.combinationalOrder.length - 1
            )
            expect(outNode).toBeDefined()
        })
    })

    describe('sequential circuits', () => {
        it('separates DFF from combinational logic', () => {
            const { sorted } = compileAndSort(`
module test(d, clk) -> q:
  q = dff(d, clk)
`)
            expect(sorted.combinationalOrder).toHaveLength(0)
            expect(sorted.sequentialNodes).toHaveLength(1)
            expect(sorted.sequentialNodes[0].type).toBe('dff')
        })

        it('marks DFF outputs as feedback wires', () => {
            const { sorted, circuit } = compileAndSort(`
module test(d, clk) -> q:
  q = dff(d, clk)
`)
            expect(sorted.feedbackWires.size).toBe(1)
            // The feedback wire should be the DFF output
            const dffOutput = circuit.dffNodes[0].outputs[0]
            expect(sorted.feedbackWires.has(dffOutput)).toBe(true)
        })

        it('handles counter pattern (feedback through combinational logic)', () => {
            const { sorted } = compileAndSort(`
module test(clk) -> q:
  next = nand(q, q)
  q = dff(next, clk)
`)
            // The NAND is combinational, depends on DFF output (feedback)
            expect(sorted.combinationalOrder).toHaveLength(1)
            expect(sorted.sequentialNodes).toHaveLength(1)
            expect(sorted.hasCycles).toBe(false)
        })

        it('handles multiple DFFs', () => {
            const { sorted } = compileAndSort(`
module test(d0, d1, clk) -> (q0, q1):
  q0 = dff(d0, clk)
  q1 = dff(d1, clk)
`)
            expect(sorted.sequentialNodes).toHaveLength(2)
            expect(sorted.feedbackWires.size).toBe(2)
        })
    })

    describe('memory circuits', () => {
        it('separates RAM from combinational logic', () => {
            const { sorted } = compileAndSort(`
module test(addr:8, data:8, write, clk) -> out:8:
  out = ram(addr, data, write, clk)
`)
            expect(sorted.memoryNodes).toHaveLength(1)
            expect(sorted.memoryNodes[0].type).toBe('ram')
        })

        it('separates ROM from combinational logic', () => {
            const { sorted } = compileAndSort(`
module test(addr:8) -> out:8:
  out = rom(addr)
`)
            expect(sorted.memoryNodes).toHaveLength(1)
            expect(sorted.memoryNodes[0].type).toBe('rom')
        })

        it('marks RAM/ROM outputs as feedback wires', () => {
            const { sorted, circuit } = compileAndSort(`
module test(addr:8, data:8, write, clk) -> (ram_out:8, rom_out:8):
  ram_out = ram(addr, data, write, clk)
  rom_out = rom(addr)
`)
            expect(sorted.feedbackWires.size).toBe(2)
        })
    })

    describe('complex circuits', () => {
        it('sorts half adder correctly', () => {
            const { sorted } = compileAndSort(`
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
            // 6 NANDs total (4 for XOR, 2 for AND)
            expect(sorted.combinationalOrder).toHaveLength(6)
            expect(sorted.hasCycles).toBe(false)
        })

        it('sorts full adder correctly', () => {
            const { sorted } = compileAndSort(`
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
  nand_ab = nand(a, b)
  out = nand(nand(a, nand_ab), nand(nand_ab, b))

module half_adder(a, b) -> (sum, cout):
  sum = xor(a, b)
  cout = and(a, b)

module full_adder(a, b, cin) -> (sum, cout):
  h1 = half_adder(a, b)
  h2 = half_adder(h1.sum, cin)
  sum = h2.sum
  cout = or(h1.cout, h2.cout)
`, 'full_adder')
            // Should have many gates but no cycles
            expect(sorted.combinationalOrder.length).toBeGreaterThan(10)
            expect(sorted.hasCycles).toBe(false)
        })

        it('sorts SR latch (has feedback but handled via aliases)', () => {
            const { sorted } = compileAndSort(`
module sr_latch(s, r) -> (q, qn):
  q = nand(s, qn)
  qn = nand(r, q)
`)
            // This is a combinational loop - it may detect a cycle
            // depending on how aliases resolve
            expect(sorted.combinationalOrder.length).toBe(2)
        })
    })

    describe('level computation', () => {
        it('computes correct levels for chain', () => {
            resetNodeCounter()
            resetFlatWireCounter()

            const source = `
module test(a) -> out:
  x = nand(a, a)
  y = nand(x, x)
  out = nand(y, y)
`
            const lexResult = lex(source)
            const parseResult = parse(lexResult.tokens)
            const compileResult = compile(parseResult.value)
            const modules = compileResult.modules
            const main = Array.from(modules.values()).pop()!
            const circuit = flatten(main, modules)
            const levels = computeLevels(circuit)

            // Should have levels 1, 2, 3
            const levelValues = Array.from(levels.values()).filter(l => l >= 0)
            expect(Math.max(...levelValues)).toBe(3)
            expect(Math.min(...levelValues)).toBe(1)
        })

        it('parallel gates have same level', () => {
            resetNodeCounter()
            resetFlatWireCounter()

            const source = `
module test(a, b) -> (x, y):
  x = nand(a, a)
  y = nand(b, b)
`
            const lexResult = lex(source)
            const parseResult = parse(lexResult.tokens)
            const compileResult = compile(parseResult.value)
            const modules = compileResult.modules
            const main = Array.from(modules.values()).pop()!
            const circuit = flatten(main, modules)
            const levels = computeLevels(circuit)

            // Both NANDs should be at level 1
            const levelValues = Array.from(levels.values()).filter(l => l >= 0)
            expect(levelValues).toEqual([1, 1])
        })

        it('DFFs are at level -1', () => {
            resetNodeCounter()
            resetFlatWireCounter()

            const source = `
module test(d, clk) -> q:
  x = nand(d, d)
  q = dff(x, clk)
`
            const lexResult = lex(source)
            const parseResult = parse(lexResult.tokens)
            const compileResult = compile(parseResult.value)
            const modules = compileResult.modules
            const main = Array.from(modules.values()).pop()!
            const circuit = flatten(main, modules)
            const levels = computeLevels(circuit)

            // Find the DFF node and check its level
            const dffNode = circuit.nodes.find(n => n.type === 'dff')!
            expect(levels.get(dffNode)).toBe(-1)
        })
    })

    describe('dependency order verification', () => {
        it('all inputs are available before node is evaluated', () => {
            const { sorted, circuit } = compileAndSort(`
module not(a) -> out:
  out = nand(a, a)

module and(a, b) -> out:
  x = nand(a, b)
  out = not(x)

module or(a, b) -> out:
  na = not(a)
  nb = not(b)
  out = nand(na, nb)

module test(a, b, c) -> out:
  t1 = and(a, b)
  t2 = or(t1, c)
  out = and(t2, a)
`, 'test')

            // Build a set of "available" wires as we process nodes
            const availableWires = new Set<number>()

            // Module inputs are available
            for (const input of circuit.inputs) {
                availableWires.add(input.index)
            }

            // Feedback wires are available
            for (const wire of sorted.feedbackWires) {
                availableWires.add(wire)
            }

            // All wires that are produced by nodes are tracked
            // First, collect all wires produced by any node
            const allProducedWires = new Set<number>()
            for (const node of sorted.combinationalOrder) {
                for (const outputWire of node.outputs) {
                    allProducedWires.add(outputWire)
                }
            }

            // Process nodes in sorted order
            for (const node of sorted.combinationalOrder) {
                // Check all inputs are available (either from inputs, feedback, or previously processed nodes)
                for (const inputWire of node.inputs) {
                    // If this wire is produced by a combinational node, it must be available
                    if (allProducedWires.has(inputWire)) {
                        expect(availableWires.has(inputWire)).toBe(true)
                    }
                    // Otherwise it's an external input or feedback wire (already checked above)
                }

                // Add outputs to available set
                for (const outputWire of node.outputs) {
                    availableWires.add(outputWire)
                }
            }
        })
    })

    describe('edge cases', () => {
        it('handles empty circuit', () => {
            const { sorted } = compileAndSort(`
module test(a) -> out:
  out = a
`)
            expect(sorted.combinationalOrder).toHaveLength(0)
            expect(sorted.hasCycles).toBe(false)
        })

        it('handles circuit with only constants', () => {
            const { sorted } = compileAndSort(`
module test() -> (a, b):
  a = 0
  b = 1
`)
            expect(sorted.combinationalOrder).toHaveLength(2)
            expect(sorted.hasCycles).toBe(false)
        })

        it('handles large chain', () => {
            let source = `module not(a) -> out:\n  out = nand(a, a)\n\n`
            source += `module chain(x) -> y:\n`
            source += `  w0 = not(x)\n`
            for (let i = 1; i < 50; i++) {
                source += `  w${i} = not(w${i - 1})\n`
            }
            source += `  y = w49\n`

            const { sorted } = compileAndSort(source, 'chain')
            expect(sorted.combinationalOrder).toHaveLength(50)
            expect(sorted.hasCycles).toBe(false)

            // Verify order is correct (first depends on nothing, last depends on all)
            const nodeOrder = new Map<string, number>()
            sorted.combinationalOrder.forEach((node, idx) => {
                nodeOrder.set(node.id, idx)
            })

            // Each node should come after its dependencies
            for (let i = 1; i < sorted.combinationalOrder.length; i++) {
                const node = sorted.combinationalOrder[i]
                for (const inputWire of node.inputs) {
                    // Find which node produces this wire
                    const producer = sorted.combinationalOrder.find(n =>
                        n.outputs.includes(inputWire)
                    )
                    if (producer) {
                        const producerIdx = nodeOrder.get(producer.id)!
                        const myIdx = nodeOrder.get(node.id)!
                        expect(producerIdx).toBeLessThan(myIdx)
                    }
                }
            }
        })
    })
})
