// Event-Driven Wire Gate Simulator
// Uses event propagation for correct handling of feedback loops and module hierarchies

import type { CompiledModule, Node } from './compiler'
import type { ISimulator, SimulatorState } from './simulator'

interface DFFInfo {
  nodeId: string
  dInput: string
  clkInput: string
  output: string
  state: number
  prevClk: number
}

interface ModuleInfo {
  nodeId: string
  simulator: EventDrivenSimulator
  inputWires: string[]
  outputWires: string[]
}

export class EventDrivenSimulator implements ISimulator {
  private module: CompiledModule
  private modules: Map<string, CompiledModule>
  private values: Map<string, number> = new Map()
  private dffs: DFFInfo[] = []
  private subModules: ModuleInfo[] = []
  private ramState: Map<string, Uint8Array> = new Map()
  private romData: Map<string, Uint8Array> = new Map()

  constructor(module: CompiledModule, modules: Map<string, CompiledModule> = new Map()) {
    this.module = module
    this.modules = modules
    this.modules.set(module.name, module)

    // Initialize all wires to 0
    for (const [name] of module.wires) {
      if (!name.includes('.')) {
        this.values.set(name, 0)
      }
    }

    // Collect DFF info
    for (const node of module.nodes) {
      if (node.type === 'dff' && node.inputs.length >= 2) {
        this.dffs.push({
          nodeId: node.id,
          dInput: node.inputs[0],
          clkInput: node.inputs[1],
          output: node.outputs[0],
          state: 0,
          prevClk: 0,
        })
      }
      if (node.type === 'ram' && node.addrWidth) {
        const size = 1 << node.addrWidth
        this.ramState.set(node.id, new Uint8Array(size))
      }
      if (node.type === 'rom' && node.addrWidth) {
        const size = 1 << node.addrWidth
        this.romData.set(node.id, new Uint8Array(size))
      }
      if (node.type === 'module' && node.moduleName) {
        const subModule = modules.get(node.moduleName)
        if (subModule) {
          const subSim = new EventDrivenSimulator(subModule, modules)
          this.subModules.push({
            nodeId: node.id,
            simulator: subSim,
            inputWires: [...node.inputs],
            outputWires: [...node.outputs],
          })
        }
      }
    }
  }

  setInput(name: string, value: number): void {
    this.values.set(name, value)
  }

  getOutput(name: string): number {
    return this.resolveWire(name)
  }

  getWire(name: string): number {
    return this.resolveWire(name)
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

    // Also propagate to sub-modules
    for (const sub of this.subModules) {
      sub.simulator.loadRom(data, nodeId)
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
    // Event-driven simulation with proper DFF handling:
    //
    // 1. Propagate combinational logic until stable (DFFs output current state)
    // 2. Detect rising edges and sample ALL DFF D inputs globally
    // 3. Update ALL DFF states simultaneously
    // 4. Re-propagate combinational logic
    //
    // Key insight: We need to propagate combinational logic to stability
    // BEFORE sampling DFF inputs. This ensures feedback loops settle first.

    const maxIterations = 200

    // Phase 1: Propagate combinational logic to stability
    // DFFs just output their current state, don't sample
    for (let i = 0; i < maxIterations; i++) {
      const changed = this.propagateCombinational()
      if (!changed) break
    }

    // Phase 2: Collect DFF samples from ALL levels (including sub-modules)
    const samples = this.collectDFFSamples()

    // Phase 3: Apply all samples simultaneously
    this.applyDFFSamples(samples)

    // Phase 4: Re-propagate combinational logic
    for (let i = 0; i < maxIterations; i++) {
      const changed = this.propagateCombinational()
      if (!changed) break
    }
  }

  // Propagate combinational logic once. Returns true if any value changed.
  private propagateCombinational(): boolean {
    const oldValues = new Map(this.values)

    // Evaluate all combinational nodes
    for (const node of this.module.nodes) {
      switch (node.type) {
        case 'dff':
          // Just output current state
          this.values.set(node.outputs[0], this.getDFFState(node.id))
          break
        case 'const':
          if (node.constValue !== undefined && node.outputs.length > 0) {
            this.values.set(node.outputs[0], node.constValue)
          }
          break
        case 'nand':
          this.evaluateNand(node)
          break
        case 'index':
          this.evaluateIndex(node)
          break
        case 'slice':
          this.evaluateSlice(node)
          break
        case 'concat':
          this.evaluateConcat(node)
          break
        case 'ram':
          this.evaluateRamRead(node)
          break
        case 'rom':
          this.evaluateRom(node)
          break
        case 'module':
          this.evaluateModuleCombinational(node)
          break
      }
    }

    // Check if any value changed
    for (const [name, value] of this.values) {
      if (oldValues.get(name) !== value) {
        return true
      }
    }
    return false
  }

  // Evaluate module combinationally (no DFF stepping in sub-module)
  private evaluateModuleCombinational(node: Node): void {
    const sub = this.subModules.find(s => s.nodeId === node.id)
    if (!sub) return

    const subModule = this.modules.get(node.moduleName!)
    if (!subModule) return

    // Set inputs
    for (let i = 0; i < node.inputs.length && i < subModule.inputs.length; i++) {
      const value = this.resolveWire(node.inputs[i])
      sub.simulator.setInput(subModule.inputs[i].name, value)
    }

    // Propagate combinational in sub-module until stable
    for (let iter = 0; iter < 50; iter++) {
      const changed = sub.simulator.propagateCombinational()
      if (!changed) break
    }

    // Get outputs
    const baseOutput = node.outputs[0]
    for (let i = 0; i < subModule.outputs.length; i++) {
      const outputName = subModule.outputs[i].name
      const value = sub.simulator.getOutput(outputName)
      this.values.set(`${baseOutput}.${outputName}`, value)
      if (i < node.outputs.length) {
        this.values.set(node.outputs[i], value)
      }
    }
  }

  // Collect DFF samples from this module and all sub-modules
  private collectDFFSamples(): Map<string, { dff: DFFInfo; value: number }> {
    const samples = new Map<string, { dff: DFFInfo; value: number }>()

    // Collect from our DFFs
    for (const dff of this.dffs) {
      const clk = this.resolveWire(dff.clkInput)
      if (dff.prevClk === 0 && clk === 1) {
        // Rising edge - sample D input
        const d = this.resolveWire(dff.dInput)
        samples.set(dff.nodeId, { dff, value: d })
      }
    }

    // Collect from sub-modules recursively
    for (const sub of this.subModules) {
      const subSamples = sub.simulator.collectDFFSamples()
      for (const [key, sample] of subSamples) {
        samples.set(`${sub.nodeId}.${key}`, sample)
      }
    }

    return samples
  }

  // Apply DFF samples and update prevClk
  private applyDFFSamples(samples: Map<string, { dff: DFFInfo; value: number }>): void {
    // Update our DFFs
    for (const dff of this.dffs) {
      const clk = this.resolveWire(dff.clkInput)

      // Apply sampled value if we have one
      const sample = samples.get(dff.nodeId)
      if (sample) {
        dff.state = sample.value
      }

      // Update prev clock
      dff.prevClk = clk

      // Update output
      this.values.set(dff.output, dff.state)
    }

    // Handle RAM writes on rising edge
    for (const node of this.module.nodes) {
      if (node.type === 'ram' && node.inputs.length >= 4) {
        const clk = this.resolveWire(node.inputs[3])
        const prevClk = this.ramState.get(`${node.id}_prevClk`) as unknown as number ?? 0

        if (prevClk === 0 && clk === 1) {
          const write = this.resolveWire(node.inputs[2])
          if (write === 1) {
            const addr = this.resolveWire(node.inputs[0])
            const data = this.resolveWire(node.inputs[1])
            const ram = this.ramState.get(node.id)
            if (ram && addr < ram.length) {
              ram[addr] = data & 0xFF
            }
          }
        }
        // Store prevClk using a hack (convert to unknown first)
        (this.ramState as Map<string, unknown>).set(`${node.id}_prevClk`, clk)
      }
    }

    // Apply to sub-modules
    for (const sub of this.subModules) {
      const subSamples = new Map<string, { dff: DFFInfo; value: number }>()
      for (const [key, sample] of samples) {
        if (key.startsWith(`${sub.nodeId}.`)) {
          const subKey = key.slice(sub.nodeId.length + 1)
          subSamples.set(subKey, sample)
        }
      }
      sub.simulator.applyDFFSamples(subSamples)
    }
  }

  private getDFFState(nodeId: string): number {
    const dff = this.dffs.find(d => d.nodeId === nodeId)
    return dff?.state ?? 0
  }

  private evaluateNand(node: Node): void {
    if (node.inputs.length !== 2 || node.outputs.length !== 1) return
    const a = this.resolveWire(node.inputs[0])
    const b = this.resolveWire(node.inputs[1])
    const width = node.width
    const mask = width >= 32 ? 0xFFFFFFFF : (1 << width) - 1
    const result = (~(a & b)) & mask
    this.values.set(node.outputs[0], result)
  }

  private evaluateIndex(node: Node): void {
    if (node.inputs.length !== 1 || node.outputs.length !== 1) return
    if (node.bitIndex === undefined) return
    const value = this.resolveWire(node.inputs[0])
    const bit = (value >> node.bitIndex) & 1
    this.values.set(node.outputs[0], bit)
  }

  private evaluateSlice(node: Node): void {
    if (node.inputs.length !== 1 || node.outputs.length !== 1) return
    if (node.sliceStart === undefined || node.sliceEnd === undefined) return
    const value = this.resolveWire(node.inputs[0])
    const width = node.sliceEnd - node.sliceStart + 1
    const mask = (1 << width) - 1
    const result = (value >> node.sliceStart) & mask
    this.values.set(node.outputs[0], result)
  }

  private evaluateConcat(node: Node): void {
    if (node.inputs.length < 2 || node.outputs.length !== 1) return
    if (!node.inputWidths) return
    let result = 0
    let shift = 0
    for (let i = node.inputs.length - 1; i >= 0; i--) {
      const value = this.resolveWire(node.inputs[i])
      const width = node.inputWidths[i]
      const mask = (1 << width) - 1
      result |= (value & mask) << shift
      shift += width
    }
    this.values.set(node.outputs[0], result)
  }

  private evaluateRamRead(node: Node): void {
    if (node.inputs.length !== 4 || node.outputs.length !== 1) return
    const addr = this.resolveWire(node.inputs[0])
    const ram = this.ramState.get(node.id)
    const output = ram && addr < ram.length ? ram[addr] : 0
    this.values.set(node.outputs[0], output)
  }

  private evaluateRom(node: Node): void {
    if (node.inputs.length !== 1 || node.outputs.length !== 1) return
    const addr = this.resolveWire(node.inputs[0])
    const rom = this.romData.get(node.id)
    const output = rom && addr < rom.length ? rom[addr] : 0
    this.values.set(node.outputs[0], output)
  }

  private resolveWire(name: string): number {
    let resolvedName = name
    const seen = new Set<string>()
    while (this.module.aliases.has(resolvedName) && !seen.has(resolvedName)) {
      seen.add(resolvedName)
      resolvedName = this.module.aliases.get(resolvedName)!
    }

    const direct = this.values.get(resolvedName)
    if (direct !== undefined) return direct

    if (resolvedName.includes('.')) {
      const dotIndex = resolvedName.indexOf('.')
      const base = resolvedName.slice(0, dotIndex)
      const field = resolvedName.slice(dotIndex + 1)

      const directValue = this.values.get(resolvedName)
      if (directValue !== undefined) return directValue

      let resolvedBase = base
      const baseSeen = new Set<string>()
      while (this.module.aliases.has(resolvedBase) && !baseSeen.has(resolvedBase)) {
        baseSeen.add(resolvedBase)
        resolvedBase = this.module.aliases.get(resolvedBase)!
      }

      const resolvedMember = `${resolvedBase}.${field}`
      return this.values.get(resolvedMember) ?? 0
    }

    const indexMatch = resolvedName.match(/^(.+)\[(\d+)\]$/)
    if (indexMatch) {
      const [, base, indexStr] = indexMatch
      const baseValue = this.resolveWire(base)
      const index = parseInt(indexStr, 10)
      return (baseValue >> index) & 1
    }

    const sliceMatch = resolvedName.match(/^(.+)\[(\d+):(\d+)\]$/)
    if (sliceMatch) {
      const [, base, startStr, endStr] = sliceMatch
      const baseValue = this.resolveWire(base)
      const start = parseInt(startStr, 10)
      const end = parseInt(endStr, 10)
      const mask = (1 << (end - start + 1)) - 1
      return (baseValue >> start) & mask
    }

    return 0
  }

  run(cycles: number): void {
    for (let i = 0; i < cycles; i++) {
      this.step()
    }
  }

  reset(): void {
    this.values.clear()
    for (const [name] of this.module.wires) {
      if (!name.includes('.')) {
        this.values.set(name, 0)
      }
    }
    for (const dff of this.dffs) {
      dff.state = 0
      dff.prevClk = 0
    }
    for (const [, ram] of this.ramState) {
      if (ram instanceof Uint8Array) {
        ram.fill(0)
      }
    }
    for (const sub of this.subModules) {
      sub.simulator.reset()
    }
  }

  getAllWires(): Map<string, number> {
    return new Map(this.values)
  }
}
