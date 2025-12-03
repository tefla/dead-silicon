/**
 * Auto-layout using Dagre for directed graphs
 */

import Dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'

export interface LayoutOptions {
  direction: 'LR' | 'TB' | 'RL' | 'BT' // Left-Right, Top-Bottom, etc.
  nodeWidth: number
  nodeHeight: number
  nodeSpacing: number
  rankSpacing: number
}

const defaultOptions: LayoutOptions = {
  direction: 'LR', // Left to right (inputs on left, outputs on right)
  nodeWidth: 150,
  nodeHeight: 80,
  nodeSpacing: 50, // Vertical spacing between nodes in same rank
  rankSpacing: 100, // Horizontal spacing between ranks
}

/**
 * Apply Dagre layout to nodes and edges
 * Returns new nodes with updated positions
 */
export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: Partial<LayoutOptions> = {}
): Node[] {
  const opts = { ...defaultOptions, ...options }

  // Create a new directed graph
  const g = new Dagre.graphlib.Graph()

  // Set graph properties
  g.setGraph({
    rankdir: opts.direction,
    nodesep: opts.nodeSpacing,
    ranksep: opts.rankSpacing,
    marginx: 50,
    marginy: 50,
  })

  // Default edge labels
  g.setDefaultEdgeLabel(() => ({}))

  // Add nodes to the graph
  nodes.forEach((node) => {
    // Different sizes for different node types
    let width = opts.nodeWidth
    let height = opts.nodeHeight

    if (node.type === 'input' || node.type === 'output') {
      width = 120
      height = 70
    } else if (node.type === 'gate') {
      width = 100
      height = 80
    }

    g.setNode(node.id, { width, height })
  })

  // Add edges to the graph
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  // Run the layout algorithm
  Dagre.layout(g)

  // Apply the computed positions back to nodes
  return nodes.map((node) => {
    const nodeWithPosition = g.node(node.id)
    if (nodeWithPosition) {
      // Dagre gives center positions, React Flow expects top-left
      const width = nodeWithPosition.width || opts.nodeWidth
      const height = nodeWithPosition.height || opts.nodeHeight

      return {
        ...node,
        position: {
          x: nodeWithPosition.x - width / 2,
          y: nodeWithPosition.y - height / 2,
        },
      }
    }
    return node
  })
}

/**
 * Layout nodes with inputs on left, outputs on right
 * and gates arranged in topological order in between
 */
export function applyCircuitLayout(nodes: Node[], edges: Edge[]): Node[] {
  // Separate nodes by type
  const inputs = nodes.filter((n) => n.type === 'input')
  const outputs = nodes.filter((n) => n.type === 'output')
  const gates = nodes.filter((n) => n.type === 'gate')

  // Use Dagre for the gate layout
  const dagreNodes = applyDagreLayout([...inputs, ...gates, ...outputs], edges, {
    direction: 'LR',
    nodeSpacing: 60,
    rankSpacing: 150,
  })

  return dagreNodes
}

/**
 * Check if layout is needed (all nodes at 0,0 or default positions)
 */
export function needsLayout(nodes: Node[]): boolean {
  if (nodes.length === 0) return false

  // Check if all nodes are at the same position (likely default)
  const firstPos = nodes[0].position
  const allSamePosition = nodes.every(
    (n) =>
      Math.abs(n.position.x - firstPos.x) < 1 &&
      Math.abs(n.position.y - firstPos.y) < 1
  )

  if (allSamePosition && nodes.length > 1) {
    return true
  }

  // Check if positions look like our naive default layout
  // (incrementing y by 120, x by 200)
  let looksDefault = true
  let expectedY = 100
  let expectedX = 50

  for (const node of nodes) {
    if (
      Math.abs(node.position.x - expectedX) > 10 ||
      Math.abs(node.position.y - expectedY) > 10
    ) {
      looksDefault = false
      break
    }
    expectedY += 120
    if (expectedY > 500) {
      expectedY = 100
      expectedX += 200
    }
  }

  return looksDefault
}
