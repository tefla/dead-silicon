// Wire Circuit Flattener
// Inlines all module instances to produce a single flat gate graph
// This eliminates the overhead of sub-simulator calls

import type { CompiledModule, Node, Wire } from './compiler'

export interface FlatNode {
    id: string
    type: 'nand' | 'dff' | 'const' | 'index' | 'slice' | 'concat' | 'ram' | 'rom' | 'input' | 'output'
    inputs: number[]      // Indices into the wire array
    outputs: number[]     // Indices into the wire array
    width: number

    // Type-specific data
    constValue?: number
    bitIndex?: number
    sliceStart?: number
    sliceEnd?: number
    inputWidths?: number[]
    addrWidth?: number

    // OPTIMIZATION: Precomputed mask for NAND and slice operations
    mask?: number
}

export interface FlattenedCircuit {
    // Wire storage - each wire gets a unique index
    wireCount: number
    wireNames: Map<string, number>  // Original wire name -> index (for debugging/inputs/outputs)
    wireWidths: number[]            // Width of each wire

    // Input/output wire indices
    inputs: { name: string; index: number; width: number }[]
    outputs: { name: string; index: number; width: number }[]

    // Flattened nodes - all modules inlined
    nodes: FlatNode[]

    // DFF nodes (need special handling for sequential logic)
    dffNodes: FlatNode[]

    // RAM/ROM nodes (need state)
    ramNodes: FlatNode[]
    romNodes: FlatNode[]
}

let flatWireCounter = 0

function genFlatWireId(): number {
    return flatWireCounter++
}

export function resetFlatWireCounter(): void {
    flatWireCounter = 0
}

/**
 * Flatten a compiled module by inlining all sub-module instances.
 * Returns a flat circuit with no module nodes - only primitive gates.
 */
export function flatten(
    module: CompiledModule,
    allModules: Map<string, CompiledModule>
): FlattenedCircuit {
    resetFlatWireCounter()

    const wireNames = new Map<string, number>()
    const wireWidths: number[] = []
    const nodes: FlatNode[] = []
    const dffNodes: FlatNode[] = []
    const ramNodes: FlatNode[] = []
    const romNodes: FlatNode[] = []

    // Helper to get or create a wire index
    const getWireIndex = (name: string, width: number = 1): number => {
        if (wireNames.has(name)) {
            return wireNames.get(name)!
        }
        const index = genFlatWireId()
        wireNames.set(name, index)
        wireWidths[index] = width
        return index
    }

    // Helper to create a fresh wire (for intermediate values during flattening)
    const freshWire = (width: number = 1): number => {
        const index = genFlatWireId()
        wireWidths[index] = width
        return index
    }

    // Register top-level inputs
    const inputs: { name: string; index: number; width: number }[] = []
    for (const input of module.inputs) {
        const index = getWireIndex(input.name, input.width)
        inputs.push({ name: input.name, index, width: input.width })
    }

    // Process the module recursively first (before registering outputs)
    // This ensures all internal wires are created before we resolve output aliases
    flattenModule(
        module,
        allModules,
        '', // prefix for wire names
        wireNames,
        wireWidths,
        nodes,
        dffNodes,
        ramNodes,
        romNodes,
        getWireIndex,
        freshWire
    )

    // NOW register top-level outputs by following alias chains
    // At this point, all internal wires have been created, so we can resolve
    // the full alias chain to find the actual wire index
    const outputs: { name: string; index: number; width: number }[] = []
    for (const output of module.outputs) {
        // Follow the alias chain to find the actual wire
        let resolved = output.name
        const seen = new Set<string>()
        while (module.aliases.has(resolved) && !seen.has(resolved)) {
            seen.add(resolved)
            resolved = module.aliases.get(resolved)!
        }

        // The resolved wire should have an index from the flattening process
        let index: number
        if (wireNames.has(resolved)) {
            index = wireNames.get(resolved)!
        } else {
            // Fallback: create a new wire (shouldn't happen in correct circuits)
            index = getWireIndex(resolved, output.width)
        }

        // Map the output name to this index as well
        wireNames.set(output.name, index)
        outputs.push({ name: output.name, index, width: output.width })
    }

    return {
        wireCount: flatWireCounter,
        wireNames,
        wireWidths,
        inputs,
        outputs,
        nodes,
        dffNodes,
        ramNodes,
        romNodes
    }
}

function flattenModule(
    module: CompiledModule,
    allModules: Map<string, CompiledModule>,
    prefix: string,
    wireNames: Map<string, number>,
    wireWidths: number[],
    nodes: FlatNode[],
    dffNodes: FlatNode[],
    ramNodes: FlatNode[],
    romNodes: FlatNode[],
    getWireIndex: (name: string, width: number) => number,
    freshWire: (width: number) => number
): void {
    // PHASE 0: Pre-register all named wires (especially outputs and assignment targets)
    // This ensures forward references find the correct wire index
    // Two-pass approach: first register non-field wires, then handle field access aliases
    const fieldAccessWires: [string, number][] = []
    for (const [wireName, width] of module.wires) {
        if (wireName.includes('.')) {
            fieldAccessWires.push([wireName, width])
        } else {
            const prefixedName = prefix ? `${prefix}.${wireName}` : wireName
            if (!wireNames.has(prefixedName)) {
                getWireIndex(prefixedName, width)
            }
        }
    }

    // Second pass: handle field access wires (e.g., "alu.result", "alu.z", "alu.n")
    // These may need to share wire indices with aliased module outputs
    for (const [wireName, width] of fieldAccessWires) {
        const prefixedName = prefix ? `${prefix}.${wireName}` : wireName
        if (!wireNames.has(prefixedName)) {
            let sharedWireIndex: number | undefined
            const dotIdx = wireName.indexOf('.')
            const baseName = wireName.slice(0, dotIdx)
            const fieldName = wireName.slice(dotIdx + 1)

            // Check if baseName is aliased to a module output
            if (module.aliases.has(baseName)) {
                const aliasTarget = module.aliases.get(baseName)!
                const aliasTargetPrefixed = prefix ? `${prefix}.${aliasTarget}` : aliasTarget

                // Find the module node that produces aliasTarget
                for (const node of module.nodes) {
                    if (node.type === 'module' && node.outputs[0] === aliasTarget) {
                        const subModule = allModules.get(node.moduleName!)
                        if (subModule) {
                            // Check ALL outputs, not just the first one
                            for (let i = 0; i < subModule.outputs.length; i++) {
                                if (subModule.outputs[i].name === fieldName) {
                                    if (i === 0) {
                                        // First output: share with the aliasTarget wire itself
                                        if (!wireNames.has(aliasTargetPrefixed)) {
                                            const targetWidth = module.wires.get(aliasTarget) ?? subModule.outputs[0].width
                                            getWireIndex(aliasTargetPrefixed, targetWidth)
                                        }
                                        sharedWireIndex = wireNames.get(aliasTargetPrefixed)!
                                    } else {
                                        // Secondary output: share with aliasTarget.fieldName wire
                                        const aliasTargetFieldPrefixed = prefix
                                            ? `${prefix}.${aliasTarget}.${fieldName}`
                                            : `${aliasTarget}.${fieldName}`
                                        if (!wireNames.has(aliasTargetFieldPrefixed)) {
                                            getWireIndex(aliasTargetFieldPrefixed, subModule.outputs[i].width)
                                        }
                                        sharedWireIndex = wireNames.get(aliasTargetFieldPrefixed)!
                                    }
                                    break
                                }
                            }
                        }
                        break
                    }
                }
            }

            if (sharedWireIndex !== undefined) {
                wireNames.set(prefixedName, sharedWireIndex)
            } else {
                getWireIndex(prefixedName, width)
            }
        }
    }

    // Helper to resolve a wire name with prefix and aliases
    const resolveWire = (name: string): number => {
        // First, resolve any aliases
        let resolved = name
        const seen = new Set<string>()
        while (module.aliases.has(resolved) && !seen.has(resolved)) {
            seen.add(resolved)
            resolved = module.aliases.get(resolved)!
        }

        const prefixedName = prefix ? `${prefix}.${resolved}` : resolved

        // Check if this wire already exists
        if (wireNames.has(prefixedName)) {
            return wireNames.get(prefixedName)!
        }

        // Handle field access patterns: if name is "alu.result" and alu -> alu8_out_3180,
        // also check if "alu8_out_3180.result" exists
        if (resolved.includes('.')) {
            const dotIdx = resolved.indexOf('.')
            const baseName = resolved.slice(0, dotIdx)
            const fieldName = resolved.slice(dotIdx + 1)

            // Try resolving the base name through aliases
            let resolvedBase = baseName
            const seenBase = new Set<string>()
            while (module.aliases.has(resolvedBase) && !seenBase.has(resolvedBase)) {
                seenBase.add(resolvedBase)
                resolvedBase = module.aliases.get(resolvedBase)!
            }

            if (resolvedBase !== baseName) {
                // Base name was aliased, try the transformed name
                const transformedName = `${resolvedBase}.${fieldName}`
                const prefixedTransformed = prefix ? `${prefix}.${transformedName}` : transformedName
                if (wireNames.has(prefixedTransformed)) {
                    return wireNames.get(prefixedTransformed)!
                }
            }
        }

        // Create it with default width (will be updated by the node that produces it)
        const width = module.wires.get(resolved) ?? 1
        const index = getWireIndex(prefixedName, width)
        return index
    }

    // Helper to process a single node
    const processNode = (node: typeof module.nodes[0]): void => {
        switch (node.type) {
            case 'input':
                // Inputs are already registered at the top level or mapped via module instantiation
                break

            case 'output':
                // Outputs just connect wires - the aliasing system handles this
                break

            case 'const': {
                const outIndex = resolveWire(node.outputs[0])
                nodes.push({
                    id: `${prefix}${node.id}`,
                    type: 'const',
                    inputs: [],
                    outputs: [outIndex],
                    width: node.width,
                    constValue: node.constValue
                })
                break
            }

            case 'nand': {
                const inA = resolveWire(node.inputs[0])
                const inB = resolveWire(node.inputs[1])
                const out = resolveWire(node.outputs[0])
                nodes.push({
                    id: `${prefix}${node.id}`,
                    type: 'nand',
                    inputs: [inA, inB],
                    outputs: [out],
                    width: node.width,
                    mask: node.width >= 32 ? 0xFFFFFFFF : (1 << node.width) - 1
                })
                break
            }

            case 'dff': {
                const d = resolveWire(node.inputs[0])
                const clk = resolveWire(node.inputs[1])
                const q = resolveWire(node.outputs[0])
                const dffNode: FlatNode = {
                    id: `${prefix}${node.id}`,
                    type: 'dff',
                    inputs: [d, clk],
                    outputs: [q],
                    width: node.width
                }
                nodes.push(dffNode)
                dffNodes.push(dffNode)
                break
            }

            case 'index': {
                const input = resolveWire(node.inputs[0])
                const out = resolveWire(node.outputs[0])
                nodes.push({
                    id: `${prefix}${node.id}`,
                    type: 'index',
                    inputs: [input],
                    outputs: [out],
                    width: 1,
                    bitIndex: node.bitIndex
                })
                break
            }

            case 'slice': {
                const input = resolveWire(node.inputs[0])
                const out = resolveWire(node.outputs[0])
                const sliceWidth = node.sliceEnd! - node.sliceStart! + 1
                nodes.push({
                    id: `${prefix}${node.id}`,
                    type: 'slice',
                    inputs: [input],
                    outputs: [out],
                    width: node.width,
                    sliceStart: node.sliceStart,
                    sliceEnd: node.sliceEnd,
                    mask: (1 << sliceWidth) - 1
                })
                break
            }

            case 'concat': {
                const inputs = node.inputs.map(name => resolveWire(name))
                const out = resolveWire(node.outputs[0])
                nodes.push({
                    id: `${prefix}${node.id}`,
                    type: 'concat',
                    inputs,
                    outputs: [out],
                    width: node.width,
                    inputWidths: node.inputWidths
                })
                break
            }

            case 'ram': {
                const addr = resolveWire(node.inputs[0])
                const data = resolveWire(node.inputs[1])
                const write = resolveWire(node.inputs[2])
                const clk = resolveWire(node.inputs[3])
                const out = resolveWire(node.outputs[0])
                const ramNode: FlatNode = {
                    id: `${prefix}${node.id}`,
                    type: 'ram',
                    inputs: [addr, data, write, clk],
                    outputs: [out],
                    width: 8,
                    addrWidth: node.addrWidth
                }
                nodes.push(ramNode)
                ramNodes.push(ramNode)
                break
            }

            case 'rom': {
                const addr = resolveWire(node.inputs[0])
                const out = resolveWire(node.outputs[0])
                const romNode: FlatNode = {
                    id: `${prefix}${node.id}`,
                    type: 'rom',
                    inputs: [addr],
                    outputs: [out],
                    width: 8,
                    addrWidth: node.addrWidth
                }
                nodes.push(romNode)
                romNodes.push(romNode)
                break
            }

            case 'module': {
                // This is where the magic happens - inline the sub-module
                const subModule = allModules.get(node.moduleName!)
                if (!subModule) {
                    // Unknown module - skip (will produce 0 output)
                    break
                }

                // Create prefix for the inlined module
                const subPrefix = prefix ? `${prefix}.${node.id}` : node.id

                // Map the sub-module's inputs to our wire indices
                for (let i = 0; i < node.inputs.length && i < subModule.inputs.length; i++) {
                    const ourWire = resolveWire(node.inputs[i])
                    const theirWireName = `${subPrefix}.${subModule.inputs[i].name}`
                    wireNames.set(theirWireName, ourWire)
                }

                // IMPORTANT: Pre-map the sub-module's outputs BEFORE flattening
                // This ensures that when the submodule creates nodes for its outputs,
                // they write to our pre-registered wire, not a new one
                const baseOutput = node.outputs[0]
                for (let i = 0; i < subModule.outputs.length; i++) {
                    const outputName = subModule.outputs[i].name
                    const outputWidth = subModule.outputs[i].width

                    // Follow the alias chain to find the actual internal wire name
                    let resolved = outputName
                    const seen = new Set<string>()
                    while (subModule.aliases.has(resolved) && !seen.has(resolved)) {
                        seen.add(resolved)
                        resolved = subModule.aliases.get(resolved)!
                    }

                    // Our wire that other modules reference (pre-registered in PHASE 0)
                    const ourDirectWire = prefix ? `${prefix}.${baseOutput}` : baseOutput
                    const ourFieldWire = prefix ? `${prefix}.${baseOutput}.${outputName}` : `${baseOutput}.${outputName}`

                    // Check if our output wire was pre-registered (forward reference case)
                    let targetWire: number | undefined
                    if (i === 0 && wireNames.has(ourDirectWire)) {
                        targetWire = wireNames.get(ourDirectWire)!
                    } else if (wireNames.has(ourFieldWire)) {
                        targetWire = wireNames.get(ourFieldWire)!
                    }

                    // Also check aliased names: find any alias X -> baseOutput, then check X.outputName
                    // This handles cases where user wrote "alu.result" but baseOutput is "alu8_out_xxx"
                    if (targetWire === undefined) {
                        for (const [aliasName, aliasTarget] of module.aliases) {
                            if (aliasTarget === baseOutput) {
                                // Found alias: aliasName -> baseOutput
                                const aliasedFieldWire = prefix ? `${prefix}.${aliasName}.${outputName}` : `${aliasName}.${outputName}`
                                if (wireNames.has(aliasedFieldWire)) {
                                    targetWire = wireNames.get(aliasedFieldWire)!
                                    break
                                }
                            }
                        }
                    }

                    // Pre-map the submodule's internal wire to our target wire
                    // This ensures the submodule's producer node writes to our wire
                    if (targetWire !== undefined) {
                        const theirWireName = `${subPrefix}.${resolved}`
                        wireNames.set(theirWireName, targetWire)
                        // Also map the output name directly
                        const theirOutputName = `${subPrefix}.${outputName}`
                        wireNames.set(theirOutputName, targetWire)

                        // Also map using the baseOutput name (which is what resolveWire will look for)
                        // The alias system resolves ha2.sum -> half_adder_out_44.sum
                        // So we need to map prefix.half_adder_out_44.sum -> targetWire
                        const baseOutputWire = prefix ? `${prefix}.${baseOutput}.${outputName}` : `${baseOutput}.${outputName}`
                        wireNames.set(baseOutputWire, targetWire)
                    }
                }

                // Recursively flatten the sub-module
                // Now that outputs are pre-mapped, producers will write to our wires
                flattenModule(
                    subModule,
                    allModules,
                    subPrefix,
                    wireNames,
                    wireWidths,
                    nodes,
                    dffNodes,
                    ramNodes,
                    romNodes,
                    getWireIndex,
                    freshWire
                )

                // Post-process: ensure all output mappings are in place
                for (let i = 0; i < subModule.outputs.length; i++) {
                    const outputName = subModule.outputs[i].name

                    // Follow the alias chain to find the actual wire
                    let resolved = outputName
                    const seen = new Set<string>()
                    while (subModule.aliases.has(resolved) && !seen.has(resolved)) {
                        seen.add(resolved)
                        resolved = subModule.aliases.get(resolved)!
                    }

                    // The resolved wire (with prefix) should now have an index
                    const resolvedWireName = `${subPrefix}.${resolved}`
                    let theirWireIndex: number
                    if (wireNames.has(resolvedWireName)) {
                        theirWireIndex = wireNames.get(resolvedWireName)!
                    } else {
                        // Fallback: create a new wire (shouldn't happen)
                        theirWireIndex = getWireIndex(resolvedWireName, subModule.outputs[i].width)
                    }

                    // Map the output wire name to the resolved wire's index
                    const theirWireName = `${subPrefix}.${outputName}`
                    wireNames.set(theirWireName, theirWireIndex)

                    // Our field access wire (e.g., "alu_out.sum")
                    const ourFieldWire = prefix ? `${prefix}.${baseOutput}.${outputName}` : `${baseOutput}.${outputName}`
                    wireNames.set(ourFieldWire, theirWireIndex)

                    // Also map the direct output if it's the first output
                    if (i === 0) {
                        const ourDirectWire = prefix ? `${prefix}.${baseOutput}` : baseOutput
                        wireNames.set(ourDirectWire, theirWireIndex)
                    }
                }
                break
            }
        }
    }

    // PHASE 1: Process all MODULE nodes first
    // This ensures their output wires are created before primitives try to reference them
    for (const node of module.nodes) {
        if (node.type === 'module') {
            processNode(node)
        }
    }

    // PHASE 2: Process all other nodes
    // Now all module outputs are available for forward references
    for (const node of module.nodes) {
        if (node.type !== 'module') {
            processNode(node)
        }
    }
}
