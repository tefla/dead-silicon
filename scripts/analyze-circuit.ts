import { readFileSync } from 'fs'
import { resolve } from 'path'
import { lex } from '../src/wire/lexer'
import { parse } from '../src/wire/parser'
import { compile } from '../src/wire/compiler'
import { flatten } from '../src/wire/flatten'
import { topologicalSort } from '../src/wire/topological-sort'

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

// Compile
const lexResult = lex(cpuStdlib)
if (!lexResult.ok) throw new Error(lexResult.error.message)

const parseResult = parse(lexResult.tokens)
if (!parseResult.ok) throw new Error(parseResult.error.message)

const compileResult = compile(parseResult.value)
if (!compileResult.ok) throw new Error(compileResult.error.message)

const main = compileResult.modules.get('cpu_minimal')!
const circuit = flatten(main, compileResult.modules)
const sortResult = topologicalSort(circuit)

console.log('=== CPU Circuit Analysis ===\n')
console.log('Wire counts:')
console.log(`  Total wires: ${circuit.wireCount}`)
console.log(`  Wire names: ${circuit.wireNames.size}`)

console.log('\nNode counts by type:')
const nodeCounts = new Map<string, number>()
for (const node of circuit.nodes) {
  nodeCounts.set(node.type, (nodeCounts.get(node.type) || 0) + 1)
}
for (const [type, count] of [...nodeCounts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type}: ${count}`)
}

console.log('\nTopological sort results:')
console.log(`  Combinational nodes: ${sortResult.combinationalOrder.length}`)
console.log(`  Sequential nodes (DFFs): ${sortResult.sequentialNodes.length}`)
console.log(`  Memory nodes: ${sortResult.memoryNodes.length}`)
console.log(`  Has cycles: ${sortResult.hasCycles}`)

// Analyze NAND patterns
const nandNodes = circuit.nodes.filter(n => n.type === 'nand')
let sameInputNands = 0  // NOT gates
for (const node of nandNodes) {
  if (node.inputs[0] === node.inputs[1]) {
    sameInputNands++
  }
}
console.log('\nNAND analysis:')
console.log(`  Total NANDs: ${nandNodes.length}`)
console.log(`  Same-input NANDs (NOT gates): ${sameInputNands}`)
console.log(`  True NANDs (2 different inputs): ${nandNodes.length - sameInputNands}`)

// Operations per step
console.log('\nOperations per step() call:')
console.log(`  Comb nodes to evaluate: ${sortResult.combinationalOrder.length}`)
console.log(`  DFF outputs to set: ${sortResult.sequentialNodes.length}`)
console.log(`  DFF edges to check: ${sortResult.sequentialNodes.length}`)

// Estimate bytes per step
const bytesPerComb = sortResult.combinationalOrder.length * 4 * 3 // ~3 i32 ops per node (load, op, store)
const bytesPerDff = sortResult.sequentialNodes.length * 4 * 2
console.log('\nMemory access estimate:')
console.log(`  Bytes read/written per step: ~${bytesPerComb + bytesPerDff}`)
