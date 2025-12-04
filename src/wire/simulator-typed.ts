// TypedArray Simulator
// Uses typed arrays instead of Maps for wire storage
// Faster than the interpreter but same algorithm (fixed-point iteration)

import type { CompiledModule, Node } from './compiler'
import type { ISimulator } from './simulator'

export class TypedArraySimulator implements ISimulator {
    private module: CompiledModule
    private modules: Map<string, CompiledModule>

    // Maps wire names to indices in the values array
    public wireMap: Map<string, number>
    private values: Int32Array

    // State storage
    private prevClock: Map<string, number>
    private dffState: Map<string, number>
    private ramState: Map<string, Uint8Array>
    private romData: Map<string, Uint8Array>
    private subSimulators: Map<string, ISimulator>

    constructor(module: CompiledModule, modules: Map<string, CompiledModule> = new Map()) {
        this.module = module
        this.modules = modules

        this.wireMap = new Map()
        let wireIndex = 0

        // Map all wires to indices
        for (const [name] of module.wires) {
            if (!this.wireMap.has(name)) {
                this.wireMap.set(name, wireIndex++)
            }
        }

        // Also map aliases to the same indices as their sources
        for (const [alias, source] of module.aliases) {
            let resolvedSource = source
            while (module.aliases.has(resolvedSource)) {
                resolvedSource = module.aliases.get(resolvedSource)!
            }

            if (this.wireMap.has(resolvedSource)) {
                this.wireMap.set(alias, this.wireMap.get(resolvedSource)!)
            }
        }

        // Allocate values array
        this.values = new Int32Array(wireIndex)

        this.prevClock = new Map()
        this.dffState = new Map()
        this.ramState = new Map()
        this.romData = new Map()
        this.subSimulators = new Map()

        // Initialize RAM and ROM
        for (const node of module.nodes) {
            if (node.type === 'ram' && node.addrWidth) {
                const size = 1 << node.addrWidth
                this.ramState.set(node.id, new Uint8Array(size))
            }
            if (node.type === 'rom' && node.addrWidth) {
                const size = 1 << node.addrWidth
                this.romData.set(node.id, new Uint8Array(size))
            }
        }
    }

    setInput(name: string, value: number): void {
        const index = this.wireMap.get(name)
        if (index !== undefined) {
            this.values[index] = value
        }
    }

    getOutput(name: string): number {
        const index = this.wireMap.get(name)
        if (index !== undefined) {
            return this.values[index]
        }

        // Handle member access via alias resolution
        if (name.includes('.')) {
            let resolvedName = name
            const seen = new Set<string>()
            while (this.module.aliases.has(resolvedName) && !seen.has(resolvedName)) {
                seen.add(resolvedName)
                resolvedName = this.module.aliases.get(resolvedName)!
            }
            const resolvedIndex = this.wireMap.get(resolvedName)
            if (resolvedIndex !== undefined) {
                return this.values[resolvedIndex]
            }
        }

        return 0
    }

    getWire(name: string): number {
        const index = this.wireMap.get(name)
        if (index !== undefined) {
            return this.values[index]
        }

        // Handle indexing: "wire[0]"
        const indexMatch = name.match(/^(.+)\[(\d+)\]$/)
        if (indexMatch) {
            const [, base, indexStr] = indexMatch
            const baseIndex = this.wireMap.get(base)
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
            const baseIndex = this.wireMap.get(base)
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
        const maxIterations = 100
        const numWires = this.values.length
        const oldValues = new Int32Array(numWires)

        for (let iter = 0; iter < maxIterations; iter++) {
            oldValues.set(this.values)
            this.evaluateNodes()

            // Check for stability
            let stable = true
            for (let i = 0; i < numWires; i++) {
                if (oldValues[i] !== this.values[i]) {
                    stable = false
                    break
                }
            }

            if (stable) break
        }
    }

    private evaluateNodes(): void {
        for (const node of this.module.nodes) {
            this.evaluateNode(node)
        }
    }

    private evaluateNode(node: Node): void {
        switch (node.type) {
            case 'input':
            case 'output':
                break

            case 'const': {
                if (node.constValue !== undefined && node.outputs.length > 0) {
                    const outIdx = this.wireMap.get(node.outputs[0])
                    if (outIdx !== undefined) {
                        this.values[outIdx] = node.constValue
                    }
                }
                break
            }

            case 'nand': {
                const aIdx = this.wireMap.get(node.inputs[0])
                const bIdx = this.wireMap.get(node.inputs[1])
                const outIdx = this.wireMap.get(node.outputs[0])

                if (aIdx !== undefined && bIdx !== undefined && outIdx !== undefined) {
                    const a = this.values[aIdx]
                    const b = this.values[bIdx]
                    const mask = node.width >= 32 ? 0xFFFFFFFF : (1 << node.width) - 1
                    this.values[outIdx] = (~(a & b)) & mask
                }
                break
            }

            case 'index': {
                const inIdx = this.wireMap.get(node.inputs[0])
                const outIdx = this.wireMap.get(node.outputs[0])

                if (inIdx !== undefined && outIdx !== undefined && node.bitIndex !== undefined) {
                    const value = this.values[inIdx]
                    this.values[outIdx] = (value >> node.bitIndex) & 1
                }
                break
            }

            case 'slice': {
                const inIdx = this.wireMap.get(node.inputs[0])
                const outIdx = this.wireMap.get(node.outputs[0])

                if (inIdx !== undefined && outIdx !== undefined &&
                    node.sliceStart !== undefined && node.sliceEnd !== undefined) {
                    const value = this.values[inIdx]
                    const width = node.sliceEnd - node.sliceStart + 1
                    const mask = (1 << width) - 1
                    this.values[outIdx] = (value >> node.sliceStart) & mask
                }
                break
            }

            case 'concat': {
                const outIdx = this.wireMap.get(node.outputs[0])
                if (outIdx !== undefined && node.inputWidths) {
                    let result = 0
                    let shift = 0

                    for (let i = node.inputs.length - 1; i >= 0; i--) {
                        const inIdx = this.wireMap.get(node.inputs[i])
                        if (inIdx !== undefined) {
                            const value = this.values[inIdx]
                            const width = node.inputWidths[i]
                            const mask = (1 << width) - 1
                            result |= (value & mask) << shift
                            shift += width
                        }
                    }
                    this.values[outIdx] = result
                }
                break
            }

            case 'dff': {
                const dIdx = this.wireMap.get(node.inputs[0])
                const clkIdx = this.wireMap.get(node.inputs[1])
                const outIdx = this.wireMap.get(node.outputs[0])

                if (dIdx !== undefined && clkIdx !== undefined && outIdx !== undefined) {
                    const d = this.values[dIdx]
                    const clk = this.values[clkIdx]
                    const prevClk = this.prevClock.get(node.id) ?? 0

                    if (prevClk === 0 && clk === 1) {
                        this.dffState.set(node.id, d)
                    }
                    this.prevClock.set(node.id, clk)
                    this.values[outIdx] = this.dffState.get(node.id) ?? 0
                }
                break
            }

            case 'ram': {
                const addrIdx = this.wireMap.get(node.inputs[0])
                const dataIdx = this.wireMap.get(node.inputs[1])
                const writeIdx = this.wireMap.get(node.inputs[2])
                const clkIdx = this.wireMap.get(node.inputs[3])
                const outIdx = this.wireMap.get(node.outputs[0])

                if (addrIdx !== undefined && dataIdx !== undefined &&
                    writeIdx !== undefined && clkIdx !== undefined && outIdx !== undefined) {
                    const addr = this.values[addrIdx]
                    const data = this.values[dataIdx]
                    const write = this.values[writeIdx]
                    const clk = this.values[clkIdx]
                    const prevClk = this.prevClock.get(node.id) ?? 0

                    const ram = this.ramState.get(node.id)
                    if (ram) {
                        if (prevClk === 0 && clk === 1 && write === 1) {
                            if (addr < ram.length) {
                                ram[addr] = data & 0xFF
                            }
                        }
                        this.prevClock.set(node.id, clk)
                        this.values[outIdx] = addr < ram.length ? ram[addr] : 0
                    }
                }
                break
            }

            case 'rom': {
                const addrIdx = this.wireMap.get(node.inputs[0])
                const outIdx = this.wireMap.get(node.outputs[0])

                if (addrIdx !== undefined && outIdx !== undefined) {
                    const addr = this.values[addrIdx]
                    const rom = this.romData.get(node.id)
                    this.values[outIdx] = rom && addr < rom.length ? rom[addr] : 0
                }
                break
            }

            case 'module': {
                if (!node.moduleName) break
                const subModule = this.modules.get(node.moduleName)
                if (!subModule) break

                // Get or create sub-simulator
                let subSim = this.subSimulators.get(node.id)
                if (!subSim) {
                    subSim = new TypedArraySimulator(subModule, this.modules)
                    this.subSimulators.set(node.id, subSim)
                }

                // Set inputs
                for (let i = 0; i < node.inputs.length && i < subModule.inputs.length; i++) {
                    const inIdx = this.wireMap.get(node.inputs[i])
                    if (inIdx !== undefined) {
                        subSim.setInput(subModule.inputs[i].name, this.values[inIdx])
                    }
                }

                subSim.step()

                // Get outputs
                const baseOutput = node.outputs[0]
                for (let i = 0; i < subModule.outputs.length; i++) {
                    const outputName = subModule.outputs[i].name
                    const value = subSim.getOutput(outputName)

                    // Set field-based wire
                    const fieldName = `${baseOutput}.${outputName}`
                    const fieldIdx = this.wireMap.get(fieldName)
                    if (fieldIdx !== undefined) {
                        this.values[fieldIdx] = value
                    }

                    // Set direct output wire (for single-output modules)
                    if (i === 0) {
                        const directIdx = this.wireMap.get(baseOutput)
                        if (directIdx !== undefined) {
                            this.values[directIdx] = value
                        }
                    }
                }
                break
            }
        }
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

        for (const [, subSim] of this.subSimulators) {
            subSim.reset()
        }
    }

    getAllWires(): Map<string, number> {
        const result = new Map<string, number>()
        for (const [name, index] of this.wireMap) {
            result.set(name, this.values[index])
        }
        return result
    }
}
