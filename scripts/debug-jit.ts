import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createSimulator } from '../src/wire/simulator'
import { JIT2Simulator } from '../src/wire/simulator-jit2'

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

const result = createSimulator(cpuStdlib, 'cpu_minimal', 'jit2')
if (!result.ok) {
  console.log('ERROR:', result.error)
  process.exit(1)
}

const sim = result.simulator as JIT2Simulator

console.log('Generated JIT code:')
console.log('='.repeat(80))
console.log(sim.getGeneratedCode())
console.log('='.repeat(80))
