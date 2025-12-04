// Levelized Simulator
// Uses flattened circuit and topological sort for single-pass evaluation
// This is the fast path - no iteration, no sub-simulators

import type { CompiledModule } from './compiler'
import type { ISimulator } from './simulator'
import { flatten, type FlattenedCircuit, type FlatNode } from './flatten'
import { topologicalSort, type TopologicalSortResult } from './topological-sort'

export class LevelizedSimulator implements ISimulator {
    private circuit: FlattenedCircuit
    private sortResult: TopologicalSortResult

    // Wire values stored in a typed array for performance
    private values: Int32Array

    // OPTIMIZATION: Typed array storage for sequential state (avoids Map lookups in hot path)
    // DFF state stored in typed arrays with precomputed indices
    private dffIndex: Map<string, number>     // node id -> array index (only used at construction)
    private dffState: Int32Array              // index -> latched value
    private dffPrevClock: Int32Array          // index -> previous clock value

    // RAM/ROM still use Maps (less frequent access, variable size)
    private ramIndex: Map<string, number>     // RAM node id -> array index
    private ramPrevClock: Int32Array          // RAM index -> previous clock value
    private ramState: Map<string, Uint8Array> // RAM node id -> memory contents
    private romData: Map<string, Uint8Array>  // ROM node id -> data contents

    // OPTIMIZATION: Cache last memory addresses to skip redundant reads
    private lastMemAddr: Int32Array           // memory node index -> last address read
    private memNodeIndex: Map<string, number> // memory node id -> array index

    // Precomputed data for fast evaluation
    private inputIndices: Map<string, number>  // Input name -> wire index
    private outputIndices: Map<string, number> // Output name -> wire index

    // OPTIMIZATION: Precomputed arrays for hot loop - avoids Map lookups and property access
    private dffOutputWires: Int32Array     // DFF index -> output wire index
    private dffInputD: Int32Array          // DFF index -> D input wire index
    private dffInputClk: Int32Array        // DFF index -> CLK input wire index


    constructor(module: CompiledModule, modules: Map<string, CompiledModule> = new Map()) {
        // Flatten the circuit
        this.circuit = flatten(module, modules)

        // Topologically sort for single-pass evaluation
        this.sortResult = topologicalSort(this.circuit)

        // Allocate wire storage
        this.values = new Int32Array(this.circuit.wireCount)

        // OPTIMIZATION: Build typed array indices for DFFs
        this.dffIndex = new Map()
        const seqNodes = this.sortResult.sequentialNodes
        const dffCount = seqNodes.length
        this.dffState = new Int32Array(dffCount)
        this.dffPrevClock = new Int32Array(dffCount)
        this.dffOutputWires = new Int32Array(dffCount)
        this.dffInputD = new Int32Array(dffCount)
        this.dffInputClk = new Int32Array(dffCount)

        for (let i = 0; i < dffCount; i++) {
            const node = seqNodes[i]
            this.dffIndex.set(node.id, i)
            this.dffOutputWires[i] = node.outputs[0]
            this.dffInputD[i] = node.inputs[0]
            this.dffInputClk[i] = node.inputs[1]
        }

        // Initialize RAM state
        this.ramIndex = new Map()
        this.ramState = new Map()
        let ramIdx = 0
        for (const ram of this.circuit.ramNodes) {
            this.ramIndex.set(ram.id, ramIdx++)
            const size = 1 << (ram.addrWidth ?? 8)
            this.ramState.set(ram.id, new Uint8Array(size))
        }
        this.ramPrevClock = new Int32Array(ramIdx)

        // Initialize ROM state
        this.romData = new Map()
        for (const rom of this.circuit.romNodes) {
            const size = 1 << (rom.addrWidth ?? 8)
            this.romData.set(rom.id, new Uint8Array(size))
        }

        // OPTIMIZATION: Build memory address cache
        this.memNodeIndex = new Map()
        let memIdx = 0
        for (const node of this.sortResult.memoryNodes) {
            this.memNodeIndex.set(node.id, memIdx++)
        }
        this.lastMemAddr = new Int32Array(memIdx)
        this.lastMemAddr.fill(-1)  // -1 indicates "never read"

        // Build input/output index maps
        this.inputIndices = new Map()
        for (const input of this.circuit.inputs) {
            this.inputIndices.set(input.name, input.index)
        }

        this.outputIndices = new Map()
        for (const output of this.circuit.outputs) {
            this.outputIndices.set(output.name, output.index)
        }

    }

    setInput(name: string, value: number): void {
        const index = this.inputIndices.get(name)
        if (index !== undefined) {
            this.values[index] = value
        }
    }

    getOutput(name: string): number {
        const index = this.outputIndices.get(name)
        if (index !== undefined) {
            return this.values[index]
        }

        // Try to find via wire names (for member access like "alu.sum")
        const wireIndex = this.circuit.wireNames.get(name)
        if (wireIndex !== undefined) {
            return this.values[wireIndex]
        }

        return 0
    }

    getWire(name: string): number {
        const index = this.circuit.wireNames.get(name)
        if (index !== undefined) {
            return this.values[index]
        }

        // Handle indexing: "wire[0]"
        const indexMatch = name.match(/^(.+)\[(\d+)\]$/)
        if (indexMatch) {
            const [, base, indexStr] = indexMatch
            const baseIndex = this.circuit.wireNames.get(base)
            if (baseIndex !== undefined) {
                const baseValue = this.values[baseIndex]
                const bitIndex = parseInt(indexStr, 10)
                return (baseValue >> bitIndex) & 1
            }
        }

        // Handle slicing: "wire[0:3]"
        const sliceMatch = name.match(/^(.+)\[(\d+):(\d+)\]$/)
        if (sliceMatch) {
            const [, base, startStr, endStr] = sliceMatch
            const baseIndex = this.circuit.wireNames.get(base)
            if (baseIndex !== undefined) {
                const baseValue = this.values[baseIndex]
                const start = parseInt(startStr, 10)
                const end = parseInt(endStr, 10)
                const mask = (1 << (end - start + 1)) - 1
                return (baseValue >> start) & mask
            }
        }

        return 0
    }

    loadRom(data: Uint8Array | number[], nodeId?: string): void {
        const dataArray = data instanceof Uint8Array ? data : new Uint8Array(data)

        if (nodeId) {
            const rom = this.romData.get(nodeId)
            if (rom) {
                rom.set(dataArray.slice(0, rom.length))
            }
        } else {
            // Load into all ROMs
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
        // Evaluation in topological order with proper clock edge handling
        //
        // OPTIMIZATION: Use precomputed typed arrays to avoid Map lookups
        // and property access in the hot path.

        const values = this.values
        const dffState = this.dffState
        const dffPrevClock = this.dffPrevClock
        const dffOutputWires = this.dffOutputWires
        const dffInputD = this.dffInputD
        const dffInputClk = this.dffInputClk
        const dffCount = dffState.length

        // 1. Output current latched values from DFFs
        for (let i = 0; i < dffCount; i++) {
            values[dffOutputWires[i]] = dffState[i]
        }

        // 2. Output current memory values (async read)
        this.evaluateMemoryReads(values)

        // 3. Evaluate all combinational nodes in sorted order
        for (const node of this.sortResult.combinationalOrder) {
            this.evaluateNode(node, values)
        }

        // 4. Handle clock edges for DFFs - inline for performance
        //    Only set needsReevaluate if output value actually changes
        let needsReevaluate = false
        for (let i = 0; i < dffCount; i++) {
            const clk = values[dffInputClk[i]]
            const prevClk = dffPrevClock[i]
            if (prevClk === 0 && clk === 1) {
                const newValue = values[dffInputD[i]]
                if (dffState[i] !== newValue) {
                    dffState[i] = newValue
                    needsReevaluate = true
                }
            }
            dffPrevClock[i] = clk
        }

        // Handle RAM writes
        for (const node of this.sortResult.memoryNodes) {
            if (node.type === 'ram') {
                if (this.handleRamWrite(node, values)) {
                    needsReevaluate = true
                }
            }
        }

        // 5. Only re-evaluate if DFF/RAM outputs actually changed
        if (needsReevaluate) {
            for (let i = 0; i < dffCount; i++) {
                values[dffOutputWires[i]] = dffState[i]
            }
            this.evaluateMemoryReads(values)
            for (const node of this.sortResult.combinationalOrder) {
                this.evaluateNode(node, values)
            }
        }
    }

    private evaluateMemoryReads(values: Int32Array): void {
        for (const node of this.sortResult.memoryNodes) {
            if (node.type === 'rom') {
                const addr = values[node.inputs[0]]
                const rom = this.romData.get(node.id)
                values[node.outputs[0]] = rom && addr < rom.length ? rom[addr] : 0
            } else if (node.type === 'ram') {
                const addr = values[node.inputs[0]]
                const ram = this.ramState.get(node.id)
                values[node.outputs[0]] = ram && addr < ram.length ? ram[addr] : 0
            }
        }
    }

    private evaluateNode(node: FlatNode, values: Int32Array): void {
        switch (node.type) {
            case 'const':
                values[node.outputs[0]] = node.constValue ?? 0
                break

            case 'nand': {
                const a = values[node.inputs[0]]
                const b = values[node.inputs[1]]
                values[node.outputs[0]] = (~(a & b)) & node.mask!
                break
            }

            case 'index': {
                const val = values[node.inputs[0]]
                values[node.outputs[0]] = (val >> node.bitIndex!) & 1
                break
            }

            case 'slice': {
                const val = values[node.inputs[0]]
                values[node.outputs[0]] = (val >> node.sliceStart!) & node.mask!
                break
            }

            case 'concat': {
                let result = 0
                let shift = 0
                const inputWidths = node.inputWidths!

                // Process from last (low bits) to first (high bits)
                for (let i = node.inputs.length - 1; i >= 0; i--) {
                    const val = values[node.inputs[i]]
                    const width = inputWidths[i]
                    const mask = (1 << width) - 1
                    result |= (val & mask) << shift
                    shift += width
                }
                values[node.outputs[0]] = result
                break
            }

            // Input and output nodes don't need evaluation
            case 'input':
            case 'output':
                break
        }
    }

    private handleRamWrite(node: FlatNode, values: Int32Array): boolean {
        const ramIdx = this.ramIndex.get(node.id)
        if (ramIdx === undefined) return false

        const addr = values[node.inputs[0]]
        const data = values[node.inputs[1]]
        const write = values[node.inputs[2]]
        const clk = values[node.inputs[3]]
        const prevClk = this.ramPrevClock[ramIdx]

        let hadEdge = false
        const ram = this.ramState.get(node.id)
        if (ram) {
            // Write on rising clock edge when write is high
            if (prevClk === 0 && clk === 1) {
                hadEdge = true
                if (write === 1 && addr < ram.length) {
                    ram[addr] = data & 0xFF
                }
            }
            this.ramPrevClock[ramIdx] = clk
        }
        return hadEdge
    }

    run(cycles: number): void {
        for (let i = 0; i < cycles; i++) {
            this.step()
        }
    }

    reset(): void {
        this.values.fill(0)
        this.dffState.fill(0)
        this.dffPrevClock.fill(0)
        this.ramPrevClock.fill(0)
        this.lastMemAddr.fill(-1)

        for (const [, ram] of this.ramState) {
            ram.fill(0)
        }
    }

    getAllWires(): Map<string, number> {
        const result = new Map<string, number>()
        for (const [name, index] of this.circuit.wireNames) {
            result.set(name, this.values[index])
        }
        return result
    }

    // Debugging helpers
    getCircuitStats(): {
        wireCount: number
        combinationalNodeCount: number
        sequentialNodeCount: number
        memoryNodeCount: number
        hasCycles: boolean
    } {
        return {
            wireCount: this.circuit.wireCount,
            combinationalNodeCount: this.sortResult.combinationalOrder.length,
            sequentialNodeCount: this.sortResult.sequentialNodes.length,
            memoryNodeCount: this.sortResult.memoryNodes.length,
            hasCycles: this.sortResult.hasCycles
        }
    }
}
