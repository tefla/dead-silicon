import type { CompiledModule, Node } from './compiler'
import type { ISimulator } from './simulator'
import { TypedArraySimulator } from './simulator-typed'

export class JITSimulator implements ISimulator {
    private module: CompiledModule
    private modules: Map<string, CompiledModule>

    // Maps wire names to indices in the values array
    private wireMap: Map<string, number>
    private values: Int32Array

    // State storage
    private prevClock: Map<string, number>
    private dffState: Map<string, number>
    private ramState: Map<string, Uint8Array>
    private romData: Map<string, Uint8Array>
    private subSimulators: Map<string, ISimulator>

    // The compiled step function
    private compiledStep: (() => void) | null = null

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

        // Also map aliases
        for (const [alias, source] of module.aliases) {
            let resolvedSource = source
            while (module.aliases.has(resolvedSource)) {
                resolvedSource = module.aliases.get(resolvedSource)!
            }
            if (this.wireMap.has(resolvedSource)) {
                this.wireMap.set(alias, this.wireMap.get(resolvedSource)!)
            }
        }

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

        this.compile()
    }

    private compile() {
        // Generate JS code for the step function
        // We will create a function that takes (values, prevClock, dffState, ramState, romData, subSimulators)
        // and performs the simulation logic.

        const lines: string[] = []
        lines.push('"use strict";')

        // Helper to get wire index
        const getIdx = (name: string) => {
            const idx = this.wireMap.get(name)
            if (idx === undefined) throw new Error(`Unknown wire: ${name}`)
            return idx
        }

        // We need to handle sub-simulators and state
        // We will bind 'this' to the function so we can access class members

        lines.push('const values = this.values;')
        lines.push('const prevClock = this.prevClock;')
        lines.push('const dffState = this.dffState;')
        lines.push('const ramState = this.ramState;')
        lines.push('const romData = this.romData;')
        lines.push('const subSimulators = this.subSimulators;')

        // Identify DFF output indices for stability check
        const dffOutputIndices = new Set<number>()
        for (const node of this.module.nodes) {
            if (node.type === 'dff') {
                for (const out of node.outputs) {
                    const idx = this.wireMap.get(out)
                    if (idx !== undefined) dffOutputIndices.add(idx)
                }
            }
        }

        lines.push('const maxIterations = 100;')
        lines.push('let stable = false;')
        lines.push('const numWires = values.length;')
        lines.push('const oldValues = new Int32Array(numWires);')

        lines.push('for (let iter = 0; iter < maxIterations; iter++) {')
        lines.push('  oldValues.set(values);')

        // Generate code for each node
        for (const node of this.module.nodes) {
            switch (node.type) {
                case 'const':
                    if (node.constValue !== undefined && node.outputs.length > 0) {
                        lines.push(`  values[${getIdx(node.outputs[0])}] = ${node.constValue};`)
                    }
                    break

                case 'output':
                    // Output nodes are no-ops in simulation as the wire value is already computed
                    break

                case 'nand': {
                    const a = getIdx(node.inputs[0])
                    const b = getIdx(node.inputs[1])
                    const out = getIdx(node.outputs[0])
                    const mask = node.width >= 32 ? 0xFFFFFFFF : (1 << node.width) - 1
                    lines.push(`  values[${out}] = (~(values[${a}] & values[${b}])) & ${mask};`)
                    break
                }

                case 'index': {
                    const val = getIdx(node.inputs[0])
                    const out = getIdx(node.outputs[0])
                    lines.push(`  values[${out}] = (values[${val}] >> ${node.bitIndex}) & 1;`)
                    break
                }

                case 'slice': {
                    const val = getIdx(node.inputs[0])
                    const out = getIdx(node.outputs[0])
                    const width = node.sliceEnd! - node.sliceStart! + 1
                    const mask = (1 << width) - 1
                    lines.push(`  values[${out}] = (values[${val}] >> ${node.sliceStart}) & ${mask};`)
                    break
                }

                case 'concat': {
                    const out = getIdx(node.outputs[0])
                    let expr = '0'
                    let shift = 0
                    for (let i = node.inputs.length - 1; i >= 0; i--) {
                        const val = getIdx(node.inputs[i])
                        const width = node.inputWidths![i]
                        const mask = (1 << width) - 1
                        expr = `(${expr} | ((values[${val}] & ${mask}) << ${shift}))`
                        shift += width
                    }
                    lines.push(`  values[${out}] = ${expr};`)
                    break
                }

                case 'dff': {
                    const d = getIdx(node.inputs[0])
                    const clk = getIdx(node.inputs[1])
                    const out = getIdx(node.outputs[0])
                    const nodeId = JSON.stringify(node.id)

                    lines.push(`  {`)
                    lines.push(`    const d = values[${d}];`)
                    lines.push(`    const clk = values[${clk}];`)
                    lines.push(`    const prev = prevClock.get(${nodeId}) ?? 0;`)
                    lines.push(`    if (prev === 0 && clk === 1) {`)
                    lines.push(`      dffState.set(${nodeId}, d);`)
                    lines.push(`    }`)
                    lines.push(`    prevClock.set(${nodeId}, clk);`)
                    lines.push(`    values[${out}] = dffState.get(${nodeId}) ?? 0;`)
                    lines.push(`  }`)
                    break
                }

                case 'ram': {
                    const addr = getIdx(node.inputs[0])
                    const data = getIdx(node.inputs[1])
                    const write = getIdx(node.inputs[2])
                    const clk = getIdx(node.inputs[3])
                    const out = getIdx(node.outputs[0])
                    const nodeId = JSON.stringify(node.id)

                    lines.push(`  {`)
                    lines.push(`    const addr = values[${addr}];`)
                    lines.push(`    const data = values[${data}];`)
                    lines.push(`    const write = values[${write}];`)
                    lines.push(`    const clk = values[${clk}];`)
                    lines.push(`    const prev = prevClock.get(${nodeId}) ?? 0;`)
                    lines.push(`    const ram = ramState.get(${nodeId});`)
                    lines.push(`    if (ram) {`)
                    lines.push(`      if (prev === 0 && clk === 1 && write === 1) {`)
                    lines.push(`        if (addr < ram.length) ram[addr] = data & 0xFF;`)
                    lines.push(`      }`)
                    lines.push(`      prevClock.set(${nodeId}, clk);`)
                    lines.push(`      values[${out}] = (addr < ram.length) ? ram[addr] : 0;`)
                    lines.push(`    }`)
                    lines.push(`  }`)
                    break
                }

                case 'rom': {
                    const addr = getIdx(node.inputs[0])
                    const out = getIdx(node.outputs[0])
                    const nodeId = JSON.stringify(node.id)

                    lines.push(`  {`)
                    lines.push(`    const addr = values[${addr}];`)
                    lines.push(`    const rom = romData.get(${nodeId});`)
                    lines.push(`    values[${out}] = (rom && addr < rom.length) ? rom[addr] : 0;`)
                    lines.push(`  }`)
                    break
                }

                case 'module': {
                    if (!node.moduleName) break
                    const subModule = this.modules.get(node.moduleName)
                    if (!subModule) break
                    const nodeId = JSON.stringify(node.id)

                    lines.push(`  {`)
                    lines.push(`    let subSim = subSimulators.get(${nodeId});`)
                    lines.push(`    if (!subSim) {`)
                    // Note: We need to pass the class constructor, but we can't easily inject it into new Function
                    // So we'll assume we can call a method on 'this' to create it, or use a factory
                    // For simplicity, we'll assume the subSimulators map is pre-populated or we handle it carefully
                    // Actually, we can just use the existing logic but it's tricky in generated code.
                    // Let's rely on the fact that we can access 'this.createSubSimulator' if we define it
                    lines.push(`      subSim = this.createSubSimulator(${nodeId}, "${node.moduleName}");`)
                    lines.push(`    }`)

                    // Set inputs
                    for (let i = 0; i < node.inputs.length && i < subModule.inputs.length; i++) {
                        const inIdx = getIdx(node.inputs[i])
                        lines.push(`    subSim.setInput("${subModule.inputs[i].name}", values[${inIdx}]);`)
                    }

                    lines.push(`    subSim.step();`)

                    // Get outputs
                    const baseOutput = node.outputs[0]
                    for (let i = 0; i < subModule.outputs.length; i++) {
                        const outputName = subModule.outputs[i].name
                        // We need to handle the case where the output wire might not be mapped if it's not used
                        // But getIdx throws if not found.
                        // In the compiler, we ensure all outputs are wires.

                        // Field access wire
                        const fieldName = `${baseOutput}.${outputName}`
                        if (this.wireMap.has(fieldName)) {
                            lines.push(`    values[${getIdx(fieldName)}] = subSim.getOutput("${outputName}");`)
                        }

                        // Direct output wire
                        if (i < node.outputs.length) {
                            const outName = node.outputs[i]
                            if (this.wireMap.has(outName)) {
                                lines.push(`    values[${getIdx(outName)}] = subSim.getOutput("${outputName}");`)
                            }
                        }
                    }
                    lines.push(`  }`)
                    break
                }
            }
        }

        // Stability check
        lines.push('  stable = true;')
        lines.push('  for (let i = 0; i < numWires; i++) {')
        lines.push('    if (oldValues[i] !== values[i]) {')

        // Check if it's a DFF output
        if (dffOutputIndices.size > 0) {
            const indices = Array.from(dffOutputIndices).join(',')
            lines.push(`      if (![${indices}].includes(i)) {`)
            lines.push('        stable = false;')
            lines.push('        break;')
            lines.push('      }')
        } else {
            lines.push('      stable = false;')
            lines.push('      break;')
        }

        lines.push('    }')
        lines.push('  }')
        lines.push('  if (stable) break;')
        lines.push('}')

        try {
            this.compiledStep = new Function(lines.join('\n')).bind(this)
        } catch (e) {
            console.error('Failed to compile JIT function:', e)
            console.log(lines.join('\n'))
        }
    }

    // Helper for generated code
    createSubSimulator(nodeId: string, moduleName: string): ISimulator {
        const subModule = this.modules.get(moduleName)!
        const subSim = new JITSimulator(subModule, this.modules)
        this.subSimulators.set(nodeId, subSim)
        return subSim
    }

    setInput(name: string, value: number): void {
        const index = this.wireMap.get(name)
        if (index !== undefined) {
            this.values[index] = value
        }
    }

    getOutput(name: string): number {
        const index = this.wireMap.get(name)
        return index !== undefined ? this.values[index] : 0
    }

    getWire(name: string): number {
        const index = this.wireMap.get(name)
        if (index !== undefined) return this.values[index]

        // Fallback for complex lookups (same as TypedArray)
        return this.resolveComplexWire(name)
    }

    private resolveComplexWire(name: string): number {
        // Copy-paste from TypedArraySimulator or share utility
        const indexMatch = name.match(/^(.+)\[(\d+)\]$/)
        if (indexMatch) {
            const [, base, indexStr] = indexMatch
            const baseIndex = this.wireMap.get(base)
            if (baseIndex !== undefined) {
                const baseValue = this.values[baseIndex]
                const index = parseInt(indexStr, 10)
                return (baseValue >> index) & 1
            }
        }

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
        if (this.compiledStep) {
            this.compiledStep()
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
        for (const [, ram] of this.ramState) ram.fill(0)
        for (const [, subSim] of this.subSimulators) subSim.reset()
    }

    getAllWires(): Map<string, number> {
        const result = new Map<string, number>()
        for (const [name, index] of this.wireMap) {
            result.set(name, this.values[index])
        }
        return result
    }
}
