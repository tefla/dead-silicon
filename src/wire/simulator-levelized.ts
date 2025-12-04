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

    // State for sequential elements
    private prevClock: Map<string, number>  // DFF/RAM node id -> previous clock value
    private dffState: Map<string, number>   // DFF node id -> latched value
    private ramState: Map<string, Uint8Array>  // RAM node id -> memory contents
    private romData: Map<string, Uint8Array>   // ROM node id -> data contents

    // Precomputed data for fast evaluation
    private inputIndices: Map<string, number>  // Input name -> wire index
    private outputIndices: Map<string, number> // Output name -> wire index

    constructor(module: CompiledModule, modules: Map<string, CompiledModule> = new Map()) {
        // Flatten the circuit
        this.circuit = flatten(module, modules)

        // Topologically sort for single-pass evaluation
        this.sortResult = topologicalSort(this.circuit)

        // Allocate wire storage
        this.values = new Int32Array(this.circuit.wireCount)

        // Initialize state maps
        this.prevClock = new Map()
        this.dffState = new Map()
        this.ramState = new Map()
        this.romData = new Map()

        // Build input/output index maps
        this.inputIndices = new Map()
        for (const input of this.circuit.inputs) {
            this.inputIndices.set(input.name, input.index)
        }

        this.outputIndices = new Map()
        for (const output of this.circuit.outputs) {
            this.outputIndices.set(output.name, output.index)
        }

        // Initialize RAM and ROM
        for (const ram of this.circuit.ramNodes) {
            const size = 1 << (ram.addrWidth ?? 8)
            this.ramState.set(ram.id, new Uint8Array(size))
        }

        for (const rom of this.circuit.romNodes) {
            const size = 1 << (rom.addrWidth ?? 8)
            this.romData.set(rom.id, new Uint8Array(size))
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
        // The key insight: after a clock edge, DFF outputs change, which requires
        // re-evaluating combinational logic. We track if any edge occurred and
        // do a second pass if needed.

        const values = this.values

        // 1. First, output the current latched values from DFFs
        //    This makes the previous clock cycle's values available to combinational logic
        for (const node of this.sortResult.sequentialNodes) {
            values[node.outputs[0]] = this.dffState.get(node.id) ?? 0
        }

        // 2. Output current memory values (async read)
        this.evaluateMemoryReads(values)

        // 3. Evaluate all combinational nodes in sorted order
        for (const node of this.sortResult.combinationalOrder) {
            this.evaluateNode(node, values)
        }

        // 4. Handle clock edges for DFFs and RAM writes
        let anyEdge = false
        for (const node of this.sortResult.sequentialNodes) {
            if (this.latchDff(node, values)) {
                anyEdge = true
            }
        }

        for (const node of this.sortResult.memoryNodes) {
            if (node.type === 'ram') {
                if (this.handleRamWrite(node, values)) {
                    anyEdge = true
                }
            }
        }

        // 5. If any clock edge occurred, update outputs and re-evaluate
        if (anyEdge) {
            for (const node of this.sortResult.sequentialNodes) {
                values[node.outputs[0]] = this.dffState.get(node.id) ?? 0
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
                const mask = node.width >= 32 ? 0xFFFFFFFF : (1 << node.width) - 1
                values[node.outputs[0]] = (~(a & b)) & mask
                break
            }

            case 'index': {
                const val = values[node.inputs[0]]
                values[node.outputs[0]] = (val >> node.bitIndex!) & 1
                break
            }

            case 'slice': {
                const val = values[node.inputs[0]]
                const width = node.sliceEnd! - node.sliceStart! + 1
                const mask = (1 << width) - 1
                values[node.outputs[0]] = (val >> node.sliceStart!) & mask
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

    private latchDff(node: FlatNode, values: Int32Array): boolean {
        const d = values[node.inputs[0]]
        const clk = values[node.inputs[1]]
        const prevClk = this.prevClock.get(node.id) ?? 0

        let hadEdge = false

        // Rising edge detection - latch new value
        if (prevClk === 0 && clk === 1) {
            this.dffState.set(node.id, d)
            hadEdge = true
        }

        this.prevClock.set(node.id, clk)
        return hadEdge
    }

    private handleRamWrite(node: FlatNode, values: Int32Array): boolean {
        const addr = values[node.inputs[0]]
        const data = values[node.inputs[1]]
        const write = values[node.inputs[2]]
        const clk = values[node.inputs[3]]
        const prevClk = this.prevClock.get(node.id) ?? 0

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
            this.prevClock.set(node.id, clk)
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
        this.prevClock.clear()
        this.dffState.clear()

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
