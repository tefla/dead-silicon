import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createSimulator, type SimulatorStrategy } from '../src/wire/simulator'

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

// Program: Loop that increments accumulator
// LDA #$00      ; A = 0
// loop:
// ADC #$01      ; A = A + 1
// JMP loop      ; Jump back
const program = [
  0xA9, 0x00,  // 0: LDA #$00
  0x69, 0x01,  // 2: ADC #$01 (loop)
  0x4C, 0x02, 0x00  // 4: JMP $0002
]

const benchmarkCycles = 5000

function runBenchmark(strategy: SimulatorStrategy) {
  console.log(`Benchmarking strategy: ${strategy}`)

  const result = createSimulator(cpuStdlib, 'cpu_minimal', strategy)
  if (!result.ok) {
    console.log('ERROR:', result.error)
    process.exit(1)
  }

  const sim = result.simulator

  function clockCycle() {
    sim.setInput('clk', 0)
    sim.step()
    sim.setInput('clk', 1)
    sim.step()
  }

  // Reset
  sim.setInput('reset', 1)
  sim.setInput('data_in', 0)
  clockCycle()
  sim.setInput('reset', 0)

  const startTime = performance.now()

  for (let i = 0; i < benchmarkCycles; i++) {
    const addr = sim.getOutput('addr')
    const data = addr < program.length ? program[addr] : 0
    sim.setInput('data_in', data)
    clockCycle()
  }

  const endTime = performance.now()
  const elapsedMs = endTime - startTime
  const elapsedSec = elapsedMs / 1000
  const cyclesPerSec = benchmarkCycles / elapsedSec
  const khz = cyclesPerSec / 1000
  const mhz = cyclesPerSec / 1000000

  console.log(`Executed ${benchmarkCycles} cycles in ${elapsedMs.toFixed(2)} ms`)
  console.log(`Speed: ${cyclesPerSec.toFixed(0)} cycles/sec`)
  console.log(`       ${khz.toFixed(2)} KHz`)
  console.log(`       ${mhz.toFixed(3)} MHz`)

  const finalA = sim.getOutput('a_out')
  console.log(`Final A register: ${finalA} (0x${finalA.toString(16).padStart(2, '0')})`)
  console.log()

  return cyclesPerSec
}

console.log('Benchmarking CPU simulation speed...')
console.log('Running tight loop: LDA #$00, loop: ADC #$01, JMP loop')
console.log(`Cycles: ${benchmarkCycles}`)
console.log()

const interpreterSpeed = runBenchmark('interpreter')
const typedArraySpeed = runBenchmark('typed-array')
const jitSpeed = runBenchmark('jit')
const levelizedSpeed = runBenchmark('levelized')
const jit2Speed = runBenchmark('jit2')

console.log('--- Results ---')
console.log(`Interpreter: 1.00x (${interpreterSpeed.toFixed(0)} Hz)`)
console.log(`TypedArray:  ${(typedArraySpeed / interpreterSpeed).toFixed(2)}x (${typedArraySpeed.toFixed(0)} Hz)`)
console.log(`JIT v1:      ${(jitSpeed / interpreterSpeed).toFixed(2)}x (${jitSpeed.toFixed(0)} Hz)`)
console.log(`Levelized:   ${(levelizedSpeed / interpreterSpeed).toFixed(2)}x (${levelizedSpeed.toFixed(0)} Hz)`)
console.log(`JIT v2:      ${(jit2Speed / interpreterSpeed).toFixed(2)}x (${jit2Speed.toFixed(0)} Hz)`)
