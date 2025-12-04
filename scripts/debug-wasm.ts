import { createSimulator } from '../src/wire/simulator'
import { WASMSimulator } from '../src/wire/simulator-wasm'
import { LevelizedSimulator } from '../src/wire/simulator-levelized'

const source = `
module not_gate(a) -> out:
  out = nand(a, a)
`

console.log('=== Testing NOT gate ===')
console.log()

// Create both simulators
const wasmResult = createSimulator(source, 'not_gate', 'wasm')
const levelizedResult = createSimulator(source, 'not_gate', 'levelized')

if (!wasmResult.ok) {
    console.log('WASM Error:', wasmResult.error)
    process.exit(1)
}
if (!levelizedResult.ok) {
    console.log('Levelized Error:', levelizedResult.error)
    process.exit(1)
}

const wasm = wasmResult.simulator as WASMSimulator
const levelized = levelizedResult.simulator as LevelizedSimulator

console.log('WASM simulator created')
console.log('Levelized simulator created')
console.log()

// Test with a=0
console.log('Setting a=0')
wasm.setInput('a', 0)
levelized.setInput('a', 0)

console.log('Before step:')
console.log('  WASM a:', wasm.getWire('a'))
console.log('  WASM out:', wasm.getOutput('out'))
console.log('  Levelized a:', levelized.getWire('a'))
console.log('  Levelized out:', levelized.getOutput('out'))

console.log()
console.log('Stepping...')
wasm.step()
levelized.step()

console.log()
console.log('After step:')
console.log('  WASM a:', wasm.getWire('a'))
console.log('  WASM out:', wasm.getOutput('out'))
console.log('  Levelized a:', levelized.getWire('a'))
console.log('  Levelized out:', levelized.getOutput('out'))

console.log()
console.log('All WASM wires:', wasm.getAllWires())
console.log('All Levelized wires:', levelized.getAllWires())
