// Topological Sort for Flattened Circuits
// Orders gates so that each gate's inputs are computed before the gate itself
// This allows single-pass evaluation without iteration

import type { FlatNode, FlattenedCircuit } from './flatten'

export interface TopologicalSortResult {
    // Ordered nodes for single-pass evaluation
    // Combinational nodes come first, in dependency order
    // DFF, RAM, ROM nodes are handled specially
    combinationalOrder: FlatNode[]

    // Sequential elements (DFFs) - evaluated after combinational logic
    sequentialNodes: FlatNode[]

    // Memory elements - RAM and ROM
    memoryNodes: FlatNode[]

    // Set of wire indices that are DFF outputs (feedback wires)
    // These break the dependency chain and allow single-pass evaluation
    feedbackWires: Set<number>

    // True if the circuit has combinational loops (should not happen in valid circuits)
    hasCycles: boolean
}

/**
 * Perform topological sort on a flattened circuit.
 *
 * The key insight is that DFF outputs are "stable" during combinational evaluation -
 * they only change on clock edges. So we treat DFF outputs as pseudo-inputs
 * that break dependency cycles.
 *
 * This allows us to:
 * 1. Sort combinational logic in dependency order
 * 2. Evaluate all combinational logic in a single pass
 * 3. Update DFF state on clock edges
 */
export function topologicalSort(circuit: FlattenedCircuit): TopologicalSortResult {
    // Identify feedback wires (DFF outputs, RAM outputs, ROM outputs)
    // These wires act as pseudo-inputs that break dependency cycles
    const feedbackWires = new Set<number>()

    for (const dff of circuit.dffNodes) {
        for (const out of dff.outputs) {
            feedbackWires.add(out)
        }
    }

    // RAM and ROM outputs are also feedback (they depend on state, not just inputs)
    for (const ram of circuit.ramNodes) {
        for (const out of ram.outputs) {
            feedbackWires.add(out)
        }
    }

    for (const rom of circuit.romNodes) {
        for (const out of rom.outputs) {
            feedbackWires.add(out)
        }
    }

    // Build dependency graph for combinational nodes only
    // A node depends on another if it reads a wire that the other writes

    // Map from wire index to the node that produces it
    const wireProducer = new Map<number, FlatNode>()
    for (const node of circuit.nodes) {
        // Skip sequential nodes for the combinational graph
        if (node.type === 'dff' || node.type === 'ram' || node.type === 'rom') {
            continue
        }
        for (const out of node.outputs) {
            wireProducer.set(out, node)
        }
    }

    // Separate combinational nodes from sequential ones
    const combinationalNodes: FlatNode[] = []
    const sequentialNodes: FlatNode[] = []
    const memoryNodes: FlatNode[] = []

    for (const node of circuit.nodes) {
        if (node.type === 'dff') {
            sequentialNodes.push(node)
        } else if (node.type === 'ram' || node.type === 'rom') {
            memoryNodes.push(node)
        } else {
            combinationalNodes.push(node)
        }
    }

    // Build adjacency list: node -> nodes that depend on it
    const nodeToId = new Map<FlatNode, number>()
    for (let i = 0; i < combinationalNodes.length; i++) {
        nodeToId.set(combinationalNodes[i], i)
    }

    // Compute in-degree for each combinational node
    // (number of combinational dependencies, excluding feedback wires)
    const inDegree = new Array(combinationalNodes.length).fill(0)
    const dependents: number[][] = combinationalNodes.map(() => [])

    for (let i = 0; i < combinationalNodes.length; i++) {
        const node = combinationalNodes[i]
        for (const inputWire of node.inputs) {
            // Skip feedback wires - they're treated as already-computed
            if (feedbackWires.has(inputWire)) {
                continue
            }

            // Skip module inputs - they're external
            const isModuleInput = circuit.inputs.some(inp => inp.index === inputWire)
            if (isModuleInput) {
                continue
            }

            // Find the node that produces this wire
            const producer = wireProducer.get(inputWire)
            if (producer) {
                const producerId = nodeToId.get(producer)
                if (producerId !== undefined) {
                    inDegree[i]++
                    dependents[producerId].push(i)
                }
            }
        }
    }

    // Kahn's algorithm for topological sort
    const queue: number[] = []
    for (let i = 0; i < combinationalNodes.length; i++) {
        if (inDegree[i] === 0) {
            queue.push(i)
        }
    }

    const sorted: FlatNode[] = []
    while (queue.length > 0) {
        const nodeId = queue.shift()!
        sorted.push(combinationalNodes[nodeId])

        for (const dependentId of dependents[nodeId]) {
            inDegree[dependentId]--
            if (inDegree[dependentId] === 0) {
                queue.push(dependentId)
            }
        }
    }

    // Check for cycles
    const hasCycles = sorted.length !== combinationalNodes.length

    // If there are cycles, include remaining nodes at the end
    // (This shouldn't happen in valid circuits, but handle gracefully)
    if (hasCycles) {
        for (let i = 0; i < combinationalNodes.length; i++) {
            if (inDegree[i] > 0) {
                sorted.push(combinationalNodes[i])
            }
        }
    }

    return {
        combinationalOrder: sorted,
        sequentialNodes,
        memoryNodes,
        feedbackWires,
        hasCycles
    }
}

/**
 * Get the evaluation level of each node (for debugging/visualization).
 * Level 0 = inputs and feedback wires
 * Level N = depends only on nodes at levels < N
 */
export function computeLevels(circuit: FlattenedCircuit): Map<FlatNode, number> {
    const result = topologicalSort(circuit)
    const levels = new Map<FlatNode, number>()

    // Wire levels: the level at which a wire's value is available
    const wireLevel = new Map<number, number>()

    // Inputs are at level 0
    for (const input of circuit.inputs) {
        wireLevel.set(input.index, 0)
    }

    // Feedback wires are at level 0 (their value is from the previous cycle)
    for (const wire of result.feedbackWires) {
        wireLevel.set(wire, 0)
    }

    // Process nodes in topological order
    for (const node of result.combinationalOrder) {
        // Node level is max of input wire levels + 1
        let maxInputLevel = 0
        for (const inputWire of node.inputs) {
            const level = wireLevel.get(inputWire) ?? 0
            maxInputLevel = Math.max(maxInputLevel, level)
        }

        const nodeLevel = maxInputLevel + 1
        levels.set(node, nodeLevel)

        // Update output wire levels
        for (const outputWire of node.outputs) {
            wireLevel.set(outputWire, nodeLevel)
        }
    }

    // Sequential nodes are at level -1 (they're evaluated separately)
    for (const node of result.sequentialNodes) {
        levels.set(node, -1)
    }

    for (const node of result.memoryNodes) {
        levels.set(node, -1)
    }

    return levels
}
