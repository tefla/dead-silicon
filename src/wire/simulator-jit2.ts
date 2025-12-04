// JIT Simulator v2 - Compiles flattened circuit to optimized JavaScript function
// Uses topological sort for single-pass evaluation (no iteration)
// Generates inline code for all operations, eliminating switch/loop overhead

import type { CompiledModule } from './compiler'
import type { ISimulator } from './simulator'
import { flatten, type FlattenedCircuit, type FlatNode } from './flatten'
import { topologicalSort, type TopologicalSortResult } from './topological-sort'

export class JIT2Simulator implements ISimulator {
    private circuit: FlattenedCircuit
    private sortResult: TopologicalSortResult

    // Wire values stored in a typed array
    private values: Int32Array

    // DFF state in typed arrays
    private dffState: Int32Array
    private dffPrevClock: Int32Array

    // RAM/ROM state
    private ramState: Map<string, Uint8Array>
    private romData: Map<string, Uint8Array>
    private ramPrevClock: Map<string, number>

    // Precomputed indices
    private inputIndices: Map<string, number>
    private outputIndices: Map<string, number>
    private dffIndices: Map<string, number>

    // The JIT-compiled step function
    private compiledStep: ((values: Int32Array, dffState: Int32Array, dffPrevClock: Int32Array, roms: Uint8Array[], rams: Uint8Array[], ramPrevClocks: Int32Array) => void) | null = null

    // Arrays for passing to compiled function (avoid Map lookups)
    private romsArray: Uint8Array[] = []
    private ramsArray: Uint8Array[] = []
    private ramPrevClocksArray: Int32Array = new Int32Array(0)

    constructor(module: CompiledModule, modules: Map<string, CompiledModule> = new Map()) {
        // Flatten the circuit
        this.circuit = flatten(module, modules)

        // Topologically sort for single-pass evaluation
        this.sortResult = topologicalSort(this.circuit)

        // Allocate wire storage
        this.values = new Int32Array(this.circuit.wireCount)

        // Build DFF index map and allocate state arrays
        this.dffIndices = new Map()
        const dffCount = this.sortResult.sequentialNodes.length
        for (let i = 0; i < dffCount; i++) {
            this.dffIndices.set(this.sortResult.sequentialNodes[i].id, i)
        }
        this.dffState = new Int32Array(dffCount)
        this.dffPrevClock = new Int32Array(dffCount)

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

        // Build input/output index maps
        this.inputIndices = new Map()
        for (const input of this.circuit.inputs) {
            this.inputIndices.set(input.name, input.index)
        }

        this.outputIndices = new Map()
        for (const output of this.circuit.outputs) {
            this.outputIndices.set(output.name, output.index)
        }

        // Compile the step function
        this.compile()
    }

    private compile(): void {
        const seqNodes = this.sortResult.sequentialNodes
        const memNodes = this.sortResult.memoryNodes

        // Build ROM/RAM arrays for direct indexing (avoid Map lookups in hot path)
        const romIds = memNodes.filter(n => n.type === 'rom').map(n => n.id)
        const ramIds = memNodes.filter(n => n.type === 'ram').map(n => n.id)

        // Generate a SINGLE function for combinational evaluation
        // This will be called 1-2 times per step (once normally, once if clock edges)
        const combLines: string[] = []
        combLines.push('"use strict";')

        // 1. Output current DFF values
        for (let i = 0; i < seqNodes.length; i++) {
            combLines.push(`values[${seqNodes[i].outputs[0]}] = dffState[${i}];`)
        }

        // 2. Memory reads
        memNodes.forEach((node) => {
            if (node.type === 'rom') {
                const romIdx = romIds.indexOf(node.id)
                combLines.push(`values[${node.outputs[0]}] = roms[${romIdx}][values[${node.inputs[0]}]] || 0;`)
            } else if (node.type === 'ram') {
                const ramIdx = ramIds.indexOf(node.id)
                combLines.push(`values[${node.outputs[0]}] = rams[${ramIdx}][values[${node.inputs[0]}]] || 0;`)
            }
        })

        // 3. Combinational nodes
        for (const node of this.sortResult.combinationalOrder) {
            this.emitNodeEvaluation(node, combLines)
        }

        // Compile the combinational function
        const combFn = new Function('values', 'dffState', 'roms', 'rams', combLines.join('\n'))

        // Generate the edge detection function (smaller, runs less often)
        const edgeLines: string[] = []
        edgeLines.push('"use strict";')
        edgeLines.push('let anyChange = false;')

        // DFF clock edges
        for (let i = 0; i < seqNodes.length; i++) {
            const node = seqNodes[i]
            edgeLines.push(`if (dffPrevClock[${i}] === 0 && values[${node.inputs[1]}] === 1) {`)
            edgeLines.push(`  const d = values[${node.inputs[0]}];`)
            edgeLines.push(`  if (dffState[${i}] !== d) { dffState[${i}] = d; anyChange = true; }`)
            edgeLines.push(`}`)
            edgeLines.push(`dffPrevClock[${i}] = values[${node.inputs[1]}];`)
        }

        // RAM writes
        ramIds.forEach((ramId, ramIdx) => {
            const node = memNodes.find(n => n.id === ramId)!
            edgeLines.push(`if (ramPrevClocks[${ramIdx}] === 0 && values[${node.inputs[3]}] === 1 && values[${node.inputs[2]}] === 1) {`)
            edgeLines.push(`  rams[${ramIdx}][values[${node.inputs[0]}]] = values[${node.inputs[1]}] & 0xFF;`)
            edgeLines.push(`  anyChange = true;`)
            edgeLines.push(`}`)
            edgeLines.push(`ramPrevClocks[${ramIdx}] = values[${node.inputs[3]}];`)
        })

        edgeLines.push('return anyChange;')

        const edgeFn = new Function('values', 'dffState', 'dffPrevClock', 'rams', 'ramPrevClocks', edgeLines.join('\n'))

        // Build ROM/RAM arrays
        const romsArray = romIds.map(id => this.romData.get(id)!)
        const ramsArray = ramIds.map(id => this.ramState.get(id)!)
        const ramPrevClocksArray = new Int32Array(ramIds.length)

        // Store arrays and functions
        this.romsArray = romsArray
        this.ramsArray = ramsArray
        this.ramPrevClocksArray = ramPrevClocksArray
        this.combFn = combFn as any
        this.edgeFn = edgeFn as any
        this.compiledStep = null // Not using single compiled function anymore
    }

    // Split functions for better V8 optimization
    private combFn: ((values: Int32Array, dffState: Int32Array, roms: Uint8Array[], rams: Uint8Array[]) => void) | null = null
    private edgeFn: ((values: Int32Array, dffState: Int32Array, dffPrevClock: Int32Array, rams: Uint8Array[], ramPrevClocks: Int32Array) => boolean) | null = null

    private emitNodeEvaluation(node: FlatNode, lines: string[], indent: string = ''): void {
        switch (node.type) {
            case 'const':
                lines.push(`${indent}values[${node.outputs[0]}] = ${node.constValue ?? 0};`)
                break

            case 'nand': {
                const mask = node.mask ?? ((1 << node.width) - 1)
                lines.push(`${indent}values[${node.outputs[0]}] = (~(values[${node.inputs[0]}] & values[${node.inputs[1]}])) & ${mask};`)
                break
            }

            case 'index':
                lines.push(`${indent}values[${node.outputs[0]}] = (values[${node.inputs[0]}] >> ${node.bitIndex}) & 1;`)
                break

            case 'slice': {
                const mask = node.mask ?? ((1 << (node.sliceEnd! - node.sliceStart! + 1)) - 1)
                lines.push(`${indent}values[${node.outputs[0]}] = (values[${node.inputs[0]}] >> ${node.sliceStart}) & ${mask};`)
                break
            }

            case 'concat': {
                // Generate inline concat expression
                let shift = 0
                const parts: string[] = []
                for (let i = node.inputs.length - 1; i >= 0; i--) {
                    const width = node.inputWidths![i]
                    const mask = (1 << width) - 1
                    parts.push(`((values[${node.inputs[i]}] & ${mask}) << ${shift})`)
                    shift += width
                }
                lines.push(`${indent}values[${node.outputs[0]}] = ${parts.join(' | ')};`)
                break
            }

            case 'input':
            case 'output':
                // No-op
                break
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

        // Try wire names for member access
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
        if (!this.combFn || !this.edgeFn) return

        const values = this.values
        const dffState = this.dffState
        const roms = this.romsArray
        const rams = this.ramsArray

        // 1. Evaluate combinational logic
        this.combFn(values, dffState, roms, rams)

        // 2. Handle clock edges
        const needsReevaluate = this.edgeFn(values, dffState, this.dffPrevClock, rams, this.ramPrevClocksArray)

        // 3. Re-evaluate if any edges triggered
        if (needsReevaluate) {
            this.combFn(values, dffState, roms, rams)
        }
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
        this.ramPrevClocksArray.fill(0)
        for (const ram of this.ramsArray) {
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

    // Debug: get the generated code
    getGeneratedCode(): string {
        return `=== COMB FUNCTION ===\n${this.combFn?.toString() ?? 'null'}\n\n=== EDGE FUNCTION ===\n${this.edgeFn?.toString() ?? 'null'}`
    }
}
