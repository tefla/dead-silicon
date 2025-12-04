// WASM Simulator - Compiles flattened circuit to WebAssembly for maximum efficiency
// Uses Binaryen.js to generate WASM bytecode at runtime
// All wire values stored in WASM linear memory for fast i32 operations

import binaryen from 'binaryen'
import type { CompiledModule } from './compiler'
import type { ISimulator } from './simulator'
import { flatten, type FlattenedCircuit, type FlatNode } from './flatten'
import { topologicalSort, type TopologicalSortResult } from './topological-sort'

export class WASMSimulator implements ISimulator {
    private circuit: FlattenedCircuit
    private sortResult: TopologicalSortResult

    // WASM instance and memory
    private wasmInstance: WebAssembly.Instance | null = null
    private memory: WebAssembly.Memory | null = null
    private values: Int32Array | null = null
    private dffState: Int32Array | null = null
    private dffPrevClock: Int32Array | null = null

    // Exported WASM functions
    private wasmComb: (() => void) | null = null
    private wasmEdge: (() => number) | null = null

    // Index maps for JS interface
    private inputIndices: Map<string, number>
    private outputIndices: Map<string, number>

    // RAM/ROM state (kept in JS for now - complex memory access patterns)
    private ramState: Map<string, Uint8Array>
    private romData: Map<string, Uint8Array>
    private ramPrevClock: Map<string, number>

    // Memory layout offsets (in i32 units)
    private valuesOffset = 0
    private dffStateOffset = 0
    private dffPrevClockOffset = 0

    constructor(module: CompiledModule, modules: Map<string, CompiledModule> = new Map()) {
        // Flatten the circuit
        this.circuit = flatten(module, modules)

        // Topologically sort for single-pass evaluation
        this.sortResult = topologicalSort(this.circuit)

        // Build input/output index maps
        this.inputIndices = new Map()
        for (const input of this.circuit.inputs) {
            this.inputIndices.set(input.name, input.index)
        }

        this.outputIndices = new Map()
        for (const output of this.circuit.outputs) {
            this.outputIndices.set(output.name, output.index)
        }

        // Initialize RAM/ROM state
        this.ramState = new Map()
        this.ramPrevClock = new Map()
        for (const ram of this.circuit.ramNodes) {
            const size = 1 << (ram.addrWidth ?? 8)
            this.ramState.set(ram.id, new Uint8Array(size))
            this.ramPrevClock.set(ram.id, 0)
        }

        this.romData = new Map()
        for (const rom of this.circuit.romNodes) {
            const size = 1 << (rom.addrWidth ?? 8)
            this.romData.set(rom.id, new Uint8Array(size))
        }

        // Compile to WASM
        this.compile()
    }

    private compile(): void {
        const mod = new binaryen.Module()

        const wireCount = this.circuit.wireCount
        const dffCount = this.sortResult.sequentialNodes.length

        // Calculate memory layout (all i32 values, so multiply by 4 for byte offsets)
        this.valuesOffset = 0
        this.dffStateOffset = wireCount
        this.dffPrevClockOffset = wireCount + dffCount
        const totalI32s = wireCount + dffCount * 2

        // Memory: 1 page = 64KB, we need totalI32s * 4 bytes
        const pages = Math.ceil((totalI32s * 4) / 65536) || 1
        // Import memory from env instead of creating internal memory
        mod.addMemoryImport('0', 'env', 'memory')

        // Build the combinational evaluation function
        this.buildCombFunction(mod)

        // Build the edge detection function
        this.buildEdgeFunction(mod)

        // Validate the module
        if (!mod.validate()) {
            console.error('WASM module validation failed')
            console.error(mod.emitText())
            throw new Error('WASM module validation failed')
        }

        // Optimize the module
        mod.optimize()

        // Debug: print the generated WASM text
        // console.log('Generated WASM:')
        // console.log(mod.emitText())

        // Emit binary and instantiate
        const binary = mod.emitBinary()
        const wasmModule = new WebAssembly.Module(binary)

        // Create memory externally so we can access it from JS
        this.memory = new WebAssembly.Memory({ initial: pages, maximum: pages })

        this.wasmInstance = new WebAssembly.Instance(wasmModule, {
            env: { memory: this.memory }
        })

        // Get exported functions
        this.wasmComb = this.wasmInstance.exports.comb as () => void
        this.wasmEdge = this.wasmInstance.exports.edge as () => number

        // Create typed array views into WASM memory
        const buffer = this.memory.buffer
        this.values = new Int32Array(buffer, this.valuesOffset * 4, wireCount)
        this.dffState = new Int32Array(buffer, this.dffStateOffset * 4, dffCount)
        this.dffPrevClock = new Int32Array(buffer, this.dffPrevClockOffset * 4, dffCount)

        mod.dispose()
    }

    private buildCombFunction(mod: binaryen.Module): void {
        const seqNodes = this.sortResult.sequentialNodes
        const memNodes = this.sortResult.memoryNodes
        const combNodes = this.sortResult.combinationalOrder

        const stmts: number[] = []

        // 1. Output current DFF values
        for (let i = 0; i < seqNodes.length; i++) {
            const node = seqNodes[i]
            // values[output] = dffState[i]
            stmts.push(
                mod.i32.store(
                    0, 4,
                    mod.i32.const((this.valuesOffset + node.outputs[0]) * 4),
                    mod.i32.load(0, 4, mod.i32.const((this.dffStateOffset + i) * 4))
                )
            )
        }

        // 2. Memory reads (ROM/RAM) - skip for now, handled in JS
        // TODO: Could pass ROM/RAM data to WASM memory for full integration

        // 3. Combinational nodes
        for (const node of combNodes) {
            const stmt = this.emitNodeEvaluation(mod, node)
            if (stmt !== null) {
                stmts.push(stmt)
            }
        }

        // Create and export the function
        mod.addFunction(
            'comb',
            binaryen.none,
            binaryen.none,
            [],
            mod.block(null, stmts)
        )
        mod.addFunctionExport('comb', 'comb')
    }

    private buildEdgeFunction(mod: binaryen.Module): void {
        const seqNodes = this.sortResult.sequentialNodes

        const stmts: number[] = []

        // Local variable for anyChange flag
        const anyChangeLocal = 0
        stmts.push(mod.local.set(anyChangeLocal, mod.i32.const(0)))

        // Check each DFF for rising edge
        for (let i = 0; i < seqNodes.length; i++) {
            const node = seqNodes[i]
            const clkInputAddr = (this.valuesOffset + node.inputs[1]) * 4
            const dInputAddr = (this.valuesOffset + node.inputs[0]) * 4
            const prevClockAddr = (this.dffPrevClockOffset + i) * 4
            const dffStateAddr = (this.dffStateOffset + i) * 4

            // Load current clock value
            const clk = mod.i32.load(0, 4, mod.i32.const(clkInputAddr))
            // Load previous clock value
            const prevClk = mod.i32.load(0, 4, mod.i32.const(prevClockAddr))

            // if (prevClk === 0 && clk === 1)
            stmts.push(
                mod.if(
                    mod.i32.and(
                        mod.i32.eqz(prevClk),
                        mod.i32.eq(clk, mod.i32.const(1))
                    ),
                    mod.block(null, [
                        // newValue = values[d_input]
                        // if (dffState[i] !== newValue) { dffState[i] = newValue; anyChange = 1 }
                        mod.if(
                            mod.i32.ne(
                                mod.i32.load(0, 4, mod.i32.const(dffStateAddr)),
                                mod.i32.load(0, 4, mod.i32.const(dInputAddr))
                            ),
                            mod.block(null, [
                                mod.i32.store(
                                    0, 4,
                                    mod.i32.const(dffStateAddr),
                                    mod.i32.load(0, 4, mod.i32.const(dInputAddr))
                                ),
                                mod.local.set(anyChangeLocal, mod.i32.const(1))
                            ])
                        )
                    ])
                )
            )

            // Update prevClock
            stmts.push(
                mod.i32.store(
                    0, 4,
                    mod.i32.const(prevClockAddr),
                    mod.i32.load(0, 4, mod.i32.const(clkInputAddr))
                )
            )
        }

        // Return anyChange
        stmts.push(mod.return(mod.local.get(anyChangeLocal, binaryen.i32)))

        // Create and export the function
        mod.addFunction(
            'edge',
            binaryen.none,
            binaryen.i32,
            [binaryen.i32], // anyChange local
            mod.block(null, stmts)
        )
        mod.addFunctionExport('edge', 'edge')
    }

    private emitNodeEvaluation(mod: binaryen.Module, node: FlatNode): number | null {
        const outAddr = (this.valuesOffset + node.outputs[0]) * 4

        switch (node.type) {
            case 'const':
                return mod.i32.store(
                    0, 4,
                    mod.i32.const(outAddr),
                    mod.i32.const(node.constValue ?? 0)
                )

            case 'nand': {
                const mask = node.mask ?? ((1 << node.width) - 1)
                const in0Addr = (this.valuesOffset + node.inputs[0]) * 4
                const in1Addr = (this.valuesOffset + node.inputs[1]) * 4
                // values[out] = (~(values[in0] & values[in1])) & mask
                return mod.i32.store(
                    0, 4,
                    mod.i32.const(outAddr),
                    mod.i32.and(
                        mod.i32.xor(
                            mod.i32.and(
                                mod.i32.load(0, 4, mod.i32.const(in0Addr)),
                                mod.i32.load(0, 4, mod.i32.const(in1Addr))
                            ),
                            mod.i32.const(-1) // ~x = x XOR -1
                        ),
                        mod.i32.const(mask)
                    )
                )
            }

            case 'index': {
                const inAddr = (this.valuesOffset + node.inputs[0]) * 4
                // values[out] = (values[in] >> bitIndex) & 1
                return mod.i32.store(
                    0, 4,
                    mod.i32.const(outAddr),
                    mod.i32.and(
                        mod.i32.shr_u(
                            mod.i32.load(0, 4, mod.i32.const(inAddr)),
                            mod.i32.const(node.bitIndex ?? 0)
                        ),
                        mod.i32.const(1)
                    )
                )
            }

            case 'slice': {
                const inAddr = (this.valuesOffset + node.inputs[0]) * 4
                const mask = node.mask ?? ((1 << (node.sliceEnd! - node.sliceStart! + 1)) - 1)
                // values[out] = (values[in] >> sliceStart) & mask
                return mod.i32.store(
                    0, 4,
                    mod.i32.const(outAddr),
                    mod.i32.and(
                        mod.i32.shr_u(
                            mod.i32.load(0, 4, mod.i32.const(inAddr)),
                            mod.i32.const(node.sliceStart ?? 0)
                        ),
                        mod.i32.const(mask)
                    )
                )
            }

            case 'concat': {
                // Build up the concatenation with shifts and ORs
                let shift = 0
                let expr: number | null = null

                for (let i = node.inputs.length - 1; i >= 0; i--) {
                    const inAddr = (this.valuesOffset + node.inputs[i]) * 4
                    const width = node.inputWidths![i]
                    const mask = (1 << width) - 1

                    const part = mod.i32.shl(
                        mod.i32.and(
                            mod.i32.load(0, 4, mod.i32.const(inAddr)),
                            mod.i32.const(mask)
                        ),
                        mod.i32.const(shift)
                    )

                    if (expr === null) {
                        expr = part
                    } else {
                        expr = mod.i32.or(expr, part)
                    }
                    shift += width
                }

                if (expr !== null) {
                    return mod.i32.store(0, 4, mod.i32.const(outAddr), expr)
                }
                return null
            }

            case 'input':
            case 'output':
                // No-op
                return null

            default:
                return null
        }
    }

    setInput(name: string, value: number): void {
        const index = this.inputIndices.get(name)
        if (index !== undefined && this.values) {
            this.values[index] = value
        }
    }

    getOutput(name: string): number {
        const index = this.outputIndices.get(name)
        if (index !== undefined && this.values) {
            return this.values[index]
        }

        // Try wire names for member access
        const wireIndex = this.circuit.wireNames.get(name)
        if (wireIndex !== undefined && this.values) {
            return this.values[wireIndex]
        }

        return 0
    }

    getWire(name: string): number {
        if (!this.values) return 0

        const index = this.circuit.wireNames.get(name)
        if (index !== undefined) {
            return this.values[index]
        }

        // Handle indexing
        const indexMatch = name.match(/^(.+)\[(\d+)\]$/)
        if (indexMatch) {
            const [, base, indexStr] = indexMatch
            const baseIndex = this.circuit.wireNames.get(base)
            if (baseIndex !== undefined) {
                return (this.values[baseIndex] >> parseInt(indexStr, 10)) & 1
            }
        }

        // Handle slicing
        const sliceMatch = name.match(/^(.+)\[(\d+):(\d+)\]$/)
        if (sliceMatch) {
            const [, base, startStr, endStr] = sliceMatch
            const baseIndex = this.circuit.wireNames.get(base)
            if (baseIndex !== undefined) {
                const start = parseInt(startStr, 10)
                const end = parseInt(endStr, 10)
                const mask = (1 << (end - start + 1)) - 1
                return (this.values[baseIndex] >> start) & mask
            }
        }

        return 0
    }

    loadRom(data: Uint8Array | number[], nodeId?: string): void {
        const dataArray = data instanceof Uint8Array ? data : new Uint8Array(data)
        if (nodeId) {
            const rom = this.romData.get(nodeId)
            if (rom) rom.set(dataArray.slice(0, rom.length))
        } else {
            for (const [, rom] of this.romData) {
                rom.set(dataArray.slice(0, rom.length))
            }
        }
    }

    readRam(addr: number, nodeId?: string): number {
        if (nodeId) {
            const ram = this.ramState.get(nodeId)
            return ram && addr < ram.length ? ram[addr] : 0
        }
        for (const [, ram] of this.ramState) {
            return addr < ram.length ? ram[addr] : 0
        }
        return 0
    }

    writeRam(addr: number, value: number, nodeId?: string): void {
        if (nodeId) {
            const ram = this.ramState.get(nodeId)
            if (ram && addr < ram.length) {
                ram[addr] = value & 0xFF
            }
        } else {
            for (const [, ram] of this.ramState) {
                if (addr < ram.length) {
                    ram[addr] = value & 0xFF
                }
                break
            }
        }
    }

    step(): void {
        if (!this.wasmComb || !this.wasmEdge) return

        // 1. Evaluate combinational logic (in WASM)
        this.wasmComb()

        // 2. Handle clock edges (in WASM)
        const needsReevaluate = this.wasmEdge()

        // 3. Re-evaluate if any edges triggered
        if (needsReevaluate) {
            this.wasmComb()
        }
    }

    run(cycles: number): void {
        for (let i = 0; i < cycles; i++) {
            this.step()
        }
    }

    reset(): void {
        if (this.values) this.values.fill(0)
        if (this.dffState) this.dffState.fill(0)
        if (this.dffPrevClock) this.dffPrevClock.fill(0)
        for (const ram of this.ramState.values()) {
            ram.fill(0)
        }
    }

    getAllWires(): Map<string, number> {
        const result = new Map<string, number>()
        if (this.values) {
            for (const [name, index] of this.circuit.wireNames) {
                result.set(name, this.values[index])
            }
        }
        return result
    }
}
