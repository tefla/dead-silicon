import { describe, it, expect } from 'vitest'
import { createSimulator, type SimulatorStrategy } from './simulator'

describe('Simulator Strategies', () => {
    const strategies: SimulatorStrategy[] = ['interpreter', 'typed-array', 'jit', 'levelized']

    const testCircuit = `
    module test_circuit(a, b, sel, clk, reset) -> (out, dff_out):
      ; Combinational logic
      w1 = nand(a, b)
      w2 = nand(w1, w1) ; AND
      
      ; Mux
      sel_n = nand(sel, sel)
      t1 = nand(a, sel_n)
      t2 = nand(b, sel)
      out = nand(t1, t2) ; XOR-like mux structure (simplified)
      
      ; Sequential logic
      dff_in = nand(out, out) ; Invert
      dff_out = dff(dff_in, clk)
    `

    it('all strategies produce same output for combinational logic', () => {
        const results = strategies.map(strategy => {
            const { simulator } = createSimulator(testCircuit, 'test_circuit', strategy) as any
            simulator.setInput('a', 1)
            simulator.setInput('b', 0)
            simulator.setInput('sel', 0)
            simulator.step()
            return {
                strategy,
                out: simulator.getOutput('out')
            }
        })

        const expected = results[0].out
        results.forEach(r => {
            expect(r.out).toBe(expected)
        })
    })

    it('all strategies produce same output for sequential logic', () => {
        const results = strategies.map(strategy => {
            const result = createSimulator(testCircuit, 'test_circuit', strategy)
            if (!result.ok) {
                console.error(`Strategy ${strategy} failed:`, result.error)
                throw new Error(`Strategy ${strategy} failed: ${result.error}`)
            }
            const simulator = result.simulator

            // Reset
            simulator.setInput('reset', 1)
            simulator.step()
            simulator.setInput('reset', 0)

            // Clock cycle 1
            simulator.setInput('clk', 0)
            simulator.step()
            simulator.setInput('clk', 1)
            simulator.step()

            const out1 = simulator.getOutput('dff_out')

            // Clock cycle 2
            simulator.setInput('clk', 0)
            simulator.step()
            simulator.setInput('clk', 1)
            simulator.step()

            const out2 = simulator.getOutput('dff_out')

            return { strategy, out1, out2 }
        })

        const expected1 = results[0].out1
        const expected2 = results[0].out2

        results.forEach(r => {
            expect(r.out1).toBe(expected1)
            expect(r.out2).toBe(expected2)
        })
    })

    it('all strategies produce same output for complex nodes (concat, slice, index)', () => {
        const complexCircuit = `
        module complex_test(in:8) -> (out_concat:8, out_slice:4, out_index):
          ; Slice
          out_slice = in[0:3]
          
          ; Index
          out_index = in[7]
          
          ; Concat
          high = in[4:7]
          low = in[0:3]
          out_concat = concat(low, high) ; Swap nibbles
        `

        const results = strategies.map(strategy => {
            const result = createSimulator(complexCircuit, 'complex_test', strategy)
            if (!result.ok) throw new Error(result.error)
            const sim = result.simulator

            sim.setInput('in', 0xAB) // 1010 1011
            sim.step()

            return {
                strategy,
                slice: sim.getOutput('out_slice'),
                index: sim.getOutput('out_index'),
                concat: sim.getOutput('out_concat')
            }
        })

        const expected = results[0]
        results.forEach(r => {
            expect(r.slice).toBe(expected.slice) // 0xB (1011)
            expect(r.index).toBe(expected.index) // 1
            expect(r.concat).toBe(expected.concat) // 0xBA (1011 1010)
        })
    })

    it('all strategies produce same output for RAM/ROM', () => {
        const memoryCircuit = `
        module memory_test(addr:8, data:8, write, clk) -> (ram_out:8, rom_out:8):
          ram_out = ram(addr, data, write, clk)
          rom_out = rom(addr)
        `

        const results = strategies.map(strategy => {
            const result = createSimulator(memoryCircuit, 'memory_test', strategy)
            if (!result.ok) throw new Error(result.error)
            const sim = result.simulator

            // Initialize ROM
            const romData = new Uint8Array(256)
            romData[5] = 42
            sim.loadRom(romData)

            // Write to RAM
            sim.setInput('clk', 0)
            sim.step()

            sim.setInput('addr', 10)
            sim.setInput('data', 99)
            sim.setInput('write', 1)
            sim.setInput('clk', 1)
            sim.step() // Rising edge -> write

            sim.setInput('clk', 0)
            sim.step()

            // Read back
            sim.setInput('write', 0)
            sim.setInput('addr', 10) // Read RAM
            sim.step()
            const ramVal = sim.getOutput('ram_out')

            sim.setInput('addr', 5) // Read ROM
            sim.step()
            const romVal = sim.getOutput('rom_out')

            return { strategy, ramVal, romVal }
        })

        const expected = results[0]
        results.forEach(r => {
            expect(r.ramVal).toBe(expected.ramVal) // 99
            expect(r.romVal).toBe(expected.romVal) // 42
        })
    })

    it('all strategies produce same output for nested modules', () => {
        const nestedCircuit = `
        module inner(a, b) -> out:
          out = nand(a, b)
          
        module middle(a, b) -> out:
          i = inner(a, b)
          out = inner(i, i) ; NOT(NAND(a,b)) = AND(a,b)
          
        module outer(a, b) -> out:
          m = middle(a, b)
          out = middle(m, m) ; AND(AND(a,b), AND(a,b)) = AND(a,b)
        `

        const results = strategies.map(strategy => {
            const result = createSimulator(nestedCircuit, 'outer', strategy)
            if (!result.ok) throw new Error(result.error)
            const sim = result.simulator

            sim.setInput('a', 1)
            sim.setInput('b', 1)
            sim.step()
            const out1 = sim.getOutput('out') // 1 AND 1 = 1

            sim.setInput('b', 0)
            sim.step()
            const out2 = sim.getOutput('out') // 1 AND 0 = 0

            return { strategy, out1, out2 }
        })

        const expected = results[0]
        results.forEach(r => {
            expect(r.out1).toBe(expected.out1) // 1
            expect(r.out2).toBe(expected.out2) // 0
        })
    })

    it('all strategies produce same output for PC module (simplified)', () => {
        const stdlib = `
        module half_adder(a, b) -> (sum, cout):
          ; sum = a ^ b
          ; cout = a & b
          n1 = nand(a, b)
          n2 = nand(a, n1)
          n3 = nand(b, n1)
          sum = nand(n2, n3)
          n_cout = nand(n1, n1) ; invert n1 to get AND
          cout = n_cout
          
        module dff(d, clk) -> q:
          q = dff(d, clk)
          
        module pc_test(clk, reset, inc) -> out:2:
           ; 2-bit register
           ; 2-bit incrementer
           
           q0_old = dff(q0_next, clk)
           q1_old = dff(q1_next, clk)
           out = concat(q1_old, q0_old)
           
           ; Incrementer: out + 1
           ; Half adder for bit 0
           ha0 = half_adder(q0_old, 1)
           s0 = ha0.sum
           c0 = ha0.cout
           
           ; Half adder for bit 1
           ha1 = half_adder(q1_old, c0)
           s1 = ha1.sum
           c1 = ha1.cout
           
           ; Mux: if inc=1 use s, else use q
           ; mux(a, b, sel) -> (a & !sel) | (b & sel)
           inc_n = nand(inc, inc) ; NOT(inc)
           
           ; Bit 0
           t0_a_n = nand(q0_old, inc_n)
           t0_a = nand(t0_a_n, t0_a_n) ; AND
           
           t0_b_n = nand(s0, inc)
           t0_b = nand(t0_b_n, t0_b_n) ; AND
           
           d0_n = nand(t0_a, t0_b) ; NAND(AND, AND) = NOT(AND) OR NOT(AND) != OR
           ; OR(a,b) = NAND(NOT(a), NOT(b))
           ; We have t0_a and t0_b (AND results).
           ; We want OR(t0_a, t0_b).
           ; OR(x,y) = NAND(NOT(x), NOT(y)).
           ; NOT(t0_a) = t0_a_n.
           ; NOT(t0_b) = t0_b_n.
           d0 = nand(t0_a_n, t0_b_n)
           
           ; Bit 1
           t1_a_n = nand(q1_old, inc_n)
           t1_b_n = nand(s1, inc)
           d1 = nand(t1_a_n, t1_b_n)
           
           ; Reset
           reset_n = nand(reset, reset) ; NOT(reset)
           
           ; q0_next = d0 & !reset
           q0_next_n = nand(d0, reset_n)
           q0_next = nand(q0_next_n, q0_next_n)
           
           ; q1_next = d1 & !reset
           q1_next_n = nand(d1, reset_n)
           q1_next = nand(q1_next_n, q1_next_n)
        `

        const results = strategies.map(strategy => {
            const result = createSimulator(stdlib, 'pc_test', strategy)
            if (!result.ok) throw new Error(result.error)
            const sim = result.simulator

            // Reset
            sim.setInput('reset', 1)
            sim.step()
            sim.setInput('reset', 0)

            // Increment
            sim.setInput('inc', 1)

            sim.setInput('clk', 0)
            sim.step()
            sim.setInput('clk', 1)
            sim.step()

            const out1 = sim.getOutput('out') // Should be 1

            sim.setInput('clk', 0)
            sim.step()
            sim.setInput('clk', 1)
            sim.step()

            const out2 = sim.getOutput('out') // Should be 2

            return { strategy, out1, out2 }
        })

        const expected = results[0]
        results.forEach(r => {
            expect(r.out1).toBe(expected.out1) // 1
            expect(r.out2).toBe(expected.out2) // 2
        })
    })

    it('all strategies produce same output for register8', () => {
        const stdlib = `
        module dff(d, clk) -> q:
          q = dff(d, clk)
          
        module not(a) -> out:
          out = nand(a, a)
          
        module and(a, b) -> out:
          n = nand(a, b)
          out = nand(n, n)
          
        module or(a, b) -> out:
          na = nand(a, a)
          nb = nand(b, b)
          out = nand(na, nb)

        module register8(d:8, load, clk) -> q:8:
          d0 = d[0]
          d1 = d[1]
          d2 = d[2]
          d3 = d[3]
          d4 = d[4]
          d5 = d[5]
          d6 = d[6]
          d7 = d[7]
          
          load_n = not(load)
          
          q0_old = dff(q0_next, clk)
          t0_a = and(q0_old, load_n)
          t0_b = and(d0, load)
          q0_next = or(t0_a, t0_b)
          
          q1_old = dff(q1_next, clk)
          t1_a = and(q1_old, load_n)
          t1_b = and(d1, load)
          q1_next = or(t1_a, t1_b)
          
          q2_old = dff(q2_next, clk)
          t2_a = and(q2_old, load_n)
          t2_b = and(d2, load)
          q2_next = or(t2_a, t2_b)
          
          q3_old = dff(q3_next, clk)
          t3_a = and(q3_old, load_n)
          t3_b = and(d3, load)
          q3_next = or(t3_a, t3_b)
          
          q4_old = dff(q4_next, clk)
          t4_a = and(q4_old, load_n)
          t4_b = and(d4, load)
          q4_next = or(t4_a, t4_b)
          
          q5_old = dff(q5_next, clk)
          t5_a = and(q5_old, load_n)
          t5_b = and(d5, load)
          q5_next = or(t5_a, t5_b)
          
          q6_old = dff(q6_next, clk)
          t6_a = and(q6_old, load_n)
          t6_b = and(d6, load)
          q6_next = or(t6_a, t6_b)
          
          q7_old = dff(q7_next, clk)
          t7_a = and(q7_old, load_n)
          t7_b = and(d7, load)
          q7_next = or(t7_a, t7_b)
          
          q = concat(q7_old, q6_old, q5_old, q4_old, q3_old, q2_old, q1_old, q0_old)
        `

        const results = strategies.map(strategy => {
            const result = createSimulator(stdlib, 'register8', strategy)
            if (!result.ok) throw new Error(result.error)
            const sim = result.simulator

            // Load 0xAA (10101010)
            sim.setInput('d', 0xAA)
            sim.setInput('load', 1)

            sim.setInput('clk', 0)
            sim.step()
            sim.setInput('clk', 1)
            sim.step()

            const out1 = sim.getOutput('q') // Should be 0xAA

            // Hold (load=0), change d to 0x55
            sim.setInput('load', 0)
            sim.setInput('d', 0x55)

            sim.setInput('clk', 0)
            sim.step()
            sim.setInput('clk', 1)
            sim.step()

            const out2 = sim.getOutput('q') // Should still be 0xAA

            return { strategy, out1, out2 }
        })

        const expected = results[0]
        results.forEach(r => {
            expect(r.out1).toBe(expected.out1) // 0xAA
            expect(r.out2).toBe(expected.out2) // 0xAA
        })
    })
})
