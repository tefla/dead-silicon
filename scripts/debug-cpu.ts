import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createSimulator } from '../src/wire/simulator'

// Load CPU and dependencies
const gatesWire = readFileSync(resolve('./src/assets/wire/gates.wire'), 'utf-8')
const arithmeticWire = readFileSync(resolve('./src/assets/wire/arithmetic.wire'), 'utf-8')
const registersWire = readFileSync(resolve('./src/assets/wire/registers.wire'), 'utf-8')
const register16Wire = readFileSync(resolve('./src/assets/wire/register16.wire'), 'utf-8')
const adder16Wire = readFileSync(resolve('./src/assets/wire/adder16.wire'), 'utf-8')
const mux8Wire = readFileSync(resolve('./src/assets/wire/mux8.wire'), 'utf-8')
const mux16Wire = readFileSync(resolve('./src/assets/wire/mux16.wire'), 'utf-8')
const inc16Wire = readFileSync(resolve('./src/assets/wire/inc16.wire'), 'utf-8')

const stdlib = gatesWire + '\n' + arithmeticWire + '\n' + registersWire + '\n' + register16Wire + '\n' + adder16Wire + '\n' + mux8Wire + '\n' + mux16Wire + '\n' + inc16Wire

const pcWire = readFileSync(resolve('./src/assets/wire/pc.wire'), 'utf-8')
const decoderWire = readFileSync(resolve('./src/assets/wire/decoder.wire'), 'utf-8')
const alu8Wire = readFileSync(resolve('./src/assets/wire/alu8.wire'), 'utf-8')
const cpuWire = readFileSync(resolve('./src/assets/wire/cpu_minimal.wire'), 'utf-8')
const cpuStdlib = stdlib + '\n' + pcWire + '\n' + decoderWire + '\n' + alu8Wire + '\n' + cpuWire

const res1 = createSimulator(cpuStdlib, 'cpu_minimal', 'interpreter')
const res2 = createSimulator(cpuStdlib, 'cpu_minimal', 'typed-array')

if (!res1.ok || !res2.ok) {
    console.error('Failed to create simulators')
    process.exit(1)
}

const sim1 = res1.simulator
const sim2 = res2.simulator

const program = [
    0xA9, 0x00,  // 0: LDA #$00
    0x69, 0x01,  // 2: ADC #$01 (loop)
    0x4C, 0x02, 0x00  // 4: JMP $0002
]

function compare(stepName: string, cycleNum: number, phase: string) {
    const wires1 = sim1.getAllWires()
    const wires2 = sim2.getAllWires()

    let diffs = 0
    for (const [name, val1] of wires1) {
        const val2 = wires2.get(name) ?? 0
        if (val1 !== val2) {
            console.log(`Diff at ${stepName}: ${name} interpreter=${val1} typed=${val2}`)
            diffs++
            // Compare internal signals relevant to IR loading
            const signals = ['ir', 'load_ir', 'data_in', 'clk', 'reset']
            // Note: internal wires might have different names due to compilation
            // But 'load_ir' is a named wire in cpu_minimal.wire, so it should exist (or be aliased)

            // We need to find the actual wire names for state bits if possible
            // cpu_minimal uses discrete dffs: state0, state1, state2
            const stateSignals = ['state0', 'state1', 'state2', 'ns0', 'ns1', 'ns2']

            for (const sig of [...signals, ...stateSignals]) {
                const val1 = sim1.getWire(sig)
                const val2 = sim2.getWire(sig)
                if (val1 !== val2) {
                    console.log(`Diff at cycle ${cycleNum} ${phase}: ${sig} interpreter=${val1} typed=${val2}`)
                }
            }

            // Also check is_state_0
            const isState0_1 = sim1.getWire('is_state_0')
            const isState0_2 = sim2.getWire('is_state_0')
            if (isState0_1 !== isState0_2) {
                console.log(`Diff at cycle ${cycleNum} ${phase}: is_state_0 interpreter=${isState0_1} typed=${isState0_2}`)
            }

            // Check address latches and PC logic
            const addrSignals = ['addr_lo', 'addr_hi', 'pc_target', 'pc_load', 'is_state_3', 'is_state_4', 'is_state_6']
            for (const sig of addrSignals) {
                const val1 = sim1.getWire(sig)
                const val2 = sim2.getWire(sig)
                if (val1 !== val2) {
                    console.log(`Diff at cycle ${cycleNum} ${phase}: ${sig} interpreter=${val1} typed=${val2}`)
                }
            }

            // Check decoder and A load
            // dec is a module instance. dec.is_adc is member access.
            const decSignals = ['dec.is_adc', 'dec.is_lda', 'a_load', 'is_state_2', 'a_data_src']
            for (const sig of decSignals) {
                const val1 = sim1.getWire(sig)
                const val2 = sim2.getWire(sig)
                if (val1 !== val2) {
                    console.log(`Diff at cycle ${cycleNum} ${phase}: ${sig} interpreter=${val1} typed=${val2}`)
                }
            }
        }
    }

    if (diffs > 0) {
        console.log(`Found ${diffs} differences at ${stepName}`)
        // process.exit(1)
    }
}

function clockCycle(i: number) {
    sim1.setInput('clk', 0)
    sim2.setInput('clk', 0)
    sim1.step()
    sim2.step()
    compare(`cycle ${i} low`, i, 'low')

    sim1.setInput('clk', 1)
    sim2.setInput('clk', 1)
    sim1.step()
    sim2.step()
    compare(`cycle ${i} high`, i, 'high')
}

// Reset
sim1.setInput('reset', 1)
sim2.setInput('reset', 1)
sim1.setInput('data_in', 0)
sim2.setInput('data_in', 0)
clockCycle(0)

sim1.setInput('reset', 0)
sim2.setInput('reset', 0)

for (let i = 1; i <= 10; i++) {
    const addr1 = sim1.getOutput('addr')
    const addr2 = sim2.getOutput('addr')

    if (addr1 !== addr2) {
        console.log(`Addr mismatch at cycle ${i}: interpreter=${addr1} typed=${addr2}`)
    }

    const data = addr1 < program.length ? program[addr1] : 0
    sim1.setInput('data_in', data)
    sim2.setInput('data_in', data)

    clockCycle(i)
}
