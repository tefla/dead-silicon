import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createSimulator, type SimulatorStrategy } from '../src/wire/simulator'
import { WASMFastSimulator } from '../src/wire/simulator-wasm-fast'

// Load all dependencies
const gatesWire = readFileSync(resolve('./src/assets/wire/gates.wire'), 'utf-8')
const arithmeticWire = readFileSync(resolve('./src/assets/wire/arithmetic.wire'), 'utf-8')
const registersWire = readFileSync(resolve('./src/assets/wire/registers.wire'), 'utf-8')
const register16Wire = readFileSync(resolve('./src/assets/wire/register16.wire'), 'utf-8')
const adder16Wire = readFileSync(resolve('./src/assets/wire/adder16.wire'), 'utf-8')
const mux8Wire = readFileSync(resolve('./src/assets/wire/mux8.wire'), 'utf-8')
const mux16Wire = readFileSync(resolve('./src/assets/wire/mux16.wire'), 'utf-8')
const inc16Wire = readFileSync(resolve('./src/assets/wire/inc16.wire'), 'utf-8')

const stdlib = [gatesWire, arithmeticWire, registersWire, register16Wire, adder16Wire, mux8Wire, mux16Wire, inc16Wire].join('\n')

const pcWire = readFileSync(resolve('./src/assets/wire/pc.wire'), 'utf-8')
const decoderWire = readFileSync(resolve('./src/assets/wire/decoder.wire'), 'utf-8')
const alu8Wire = readFileSync(resolve('./src/assets/wire/alu8.wire'), 'utf-8')
const cpuWire = readFileSync(resolve('./src/assets/wire/cpu_minimal.wire'), 'utf-8')
const cpuStdlib = stdlib + '\n' + pcWire + '\n' + decoderWire + '\n' + alu8Wire + '\n' + cpuWire

const program = [
  0xA9, 0x00,  // LDA #$00
  0x69, 0x01,  // ADC #$01
  0x4C, 0x02, 0x00  // JMP $0002
]

const benchmarkCycles = 10000

console.log('=== WASM Optimization Benchmark ===')
console.log(`Running ${benchmarkCycles} clock cycles\n`)

// 1. Original WASM with original step() calls
function benchmarkWasmOriginal() {
  const result = createSimulator(cpuStdlib, 'cpu_minimal', 'wasm')
  if (!result.ok) throw new Error(result.error)
  const sim = result.simulator

  function clockCycle() {
    sim.setInput('clk', 0)
    sim.step()
    sim.setInput('clk', 1)
    sim.step()
  }

  sim.setInput('reset', 1)
  sim.setInput('data_in', 0)
  clockCycle()
  sim.setInput('reset', 0)

  const start = performance.now()
  for (let i = 0; i < benchmarkCycles; i++) {
    const addr = sim.getOutput('addr')
    const data = addr < program.length ? program[addr] : 0
    sim.setInput('data_in', data)
    clockCycle()
  }
  const elapsed = performance.now() - start
  const khz = benchmarkCycles / elapsed
  console.log(`WASM (original step):     ${khz.toFixed(2)} KHz`)
  return khz
}

// 2. WASM-fast with step() for fair comparison
function benchmarkWasmFastStep() {
  const result = createSimulator(cpuStdlib, 'cpu_minimal', 'wasm-fast')
  if (!result.ok) throw new Error(result.error)
  const sim = result.simulator

  function clockCycle() {
    sim.setInput('clk', 0)
    sim.step()
    sim.setInput('clk', 1)
    sim.step()
  }

  sim.setInput('reset', 1)
  sim.setInput('data_in', 0)
  clockCycle()
  sim.setInput('reset', 0)

  const start = performance.now()
  for (let i = 0; i < benchmarkCycles; i++) {
    const addr = sim.getOutput('addr')
    const data = addr < program.length ? program[addr] : 0
    sim.setInput('data_in', data)
    clockCycle()
  }
  const elapsed = performance.now() - start
  const khz = benchmarkCycles / elapsed
  console.log(`WASM-fast (step):         ${khz.toFixed(2)} KHz`)
  return khz
}

// 3. WASM-fast with cycle() (combined clock toggling)
function benchmarkWasmFastCycle() {
  const result = createSimulator(cpuStdlib, 'cpu_minimal', 'wasm-fast')
  if (!result.ok) throw new Error(result.error)
  const sim = result.simulator as WASMFastSimulator

  sim.setInput('reset', 1)
  sim.setInput('data_in', 0)
  sim.cycle()
  sim.setInput('reset', 0)

  const start = performance.now()
  for (let i = 0; i < benchmarkCycles; i++) {
    const addr = sim.getOutput('addr')
    const data = addr < program.length ? program[addr] : 0
    sim.setInput('data_in', data)
    sim.cycle()
  }
  const elapsed = performance.now() - start
  const khz = benchmarkCycles / elapsed
  console.log(`WASM-fast (cycle):        ${khz.toFixed(2)} KHz`)
  return khz
}

// 4. WASM-fast with direct memory access
function benchmarkWasmFastDirect() {
  const result = createSimulator(cpuStdlib, 'cpu_minimal', 'wasm-fast')
  if (!result.ok) throw new Error(result.error)
  const sim = result.simulator as WASMFastSimulator

  // Get direct access to wire indices
  const addrIndex = sim.getWireIndex('addr')
  const dataInIndex = sim.getWireIndex('data_in')
  const values = sim.getValuesArray()!

  sim.setInput('reset', 1)
  sim.setInput('data_in', 0)
  sim.cycle()
  sim.setInput('reset', 0)

  const start = performance.now()
  for (let i = 0; i < benchmarkCycles; i++) {
    const addr = values[addrIndex]
    const data = addr < program.length ? program[addr] : 0
    values[dataInIndex] = data
    sim.cycle()
  }
  const elapsed = performance.now() - start
  const khz = benchmarkCycles / elapsed
  console.log(`WASM-fast (direct):       ${khz.toFixed(2)} KHz`)
  return khz
}

// 5. WASM-fast runCycles() - but this can't update data_in per cycle
// (Shows theoretical max if program was in ROM/WASM)
function benchmarkWasmFastBatch() {
  const result = createSimulator(cpuStdlib, 'cpu_minimal', 'wasm-fast')
  if (!result.ok) throw new Error(result.error)
  const sim = result.simulator as WASMFastSimulator

  sim.setInput('reset', 1)
  sim.setInput('data_in', 0)
  sim.cycle()
  sim.setInput('reset', 0)
  sim.setInput('data_in', 0)  // Fixed value - can't change during batch

  const start = performance.now()
  sim.runCycles(benchmarkCycles)
  const elapsed = performance.now() - start
  const khz = benchmarkCycles / elapsed
  console.log(`WASM-fast (batch):        ${khz.toFixed(2)} KHz (note: fixed data_in)`)
  return khz
}

// 6. Levelized for comparison
function benchmarkLevelized() {
  const result = createSimulator(cpuStdlib, 'cpu_minimal', 'levelized')
  if (!result.ok) throw new Error(result.error)
  const sim = result.simulator

  function clockCycle() {
    sim.setInput('clk', 0)
    sim.step()
    sim.setInput('clk', 1)
    sim.step()
  }

  sim.setInput('reset', 1)
  sim.setInput('data_in', 0)
  clockCycle()
  sim.setInput('reset', 0)

  const start = performance.now()
  for (let i = 0; i < benchmarkCycles; i++) {
    const addr = sim.getOutput('addr')
    const data = addr < program.length ? program[addr] : 0
    sim.setInput('data_in', data)
    clockCycle()
  }
  const elapsed = performance.now() - start
  const khz = benchmarkCycles / elapsed
  console.log(`Levelized (JS baseline):  ${khz.toFixed(2)} KHz`)
  return khz
}

// Run benchmarks
console.log('--- Comparison vs JS baseline ---')
const levelized = benchmarkLevelized()

console.log('\n--- WASM variants ---')
const wasmOrig = benchmarkWasmOriginal()
const wasmFastStep = benchmarkWasmFastStep()
const wasmFastCycle = benchmarkWasmFastCycle()
const wasmFastDirect = benchmarkWasmFastDirect()
const wasmFastBatch = benchmarkWasmFastBatch()

console.log('\n=== Results vs Levelized JS ===')
console.log(`Levelized (JS):          1.00x baseline`)
console.log(`WASM (original):         ${(wasmOrig/levelized).toFixed(2)}x`)
console.log(`WASM-fast (step):        ${(wasmFastStep/levelized).toFixed(2)}x`)
console.log(`WASM-fast (cycle):       ${(wasmFastCycle/levelized).toFixed(2)}x`)
console.log(`WASM-fast (direct):      ${(wasmFastDirect/levelized).toFixed(2)}x`)
console.log(`WASM-fast (batch):       ${(wasmFastBatch/levelized).toFixed(2)}x (theoretical max)`)

console.log('\n=== Results vs Original WASM ===')
console.log(`WASM (original):         1.00x`)
console.log(`WASM-fast (step):        ${(wasmFastStep/wasmOrig).toFixed(2)}x`)
console.log(`WASM-fast (cycle):       ${(wasmFastCycle/wasmOrig).toFixed(2)}x`)
console.log(`WASM-fast (direct):      ${(wasmFastDirect/wasmOrig).toFixed(2)}x`)
console.log(`WASM-fast (batch):       ${(wasmFastBatch/wasmOrig).toFixed(2)}x`)
