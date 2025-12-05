import { useCallback, useRef, useState, useEffect, type DragEvent } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { nodeTypes } from './nodes'
import { edgeTypes } from './edges'
import { ComponentPalette } from './ComponentPalette'
import { type GateType } from './types'
import { wireSourceToVisual, extractLayout, visualToAst, astToWireSource, type LayoutData } from './ast-sync'
import { applyCircuitLayout, needsLayout } from './auto-layout'

export interface VisualEditorProps {
  /** Wire source code to load */
  wireSource?: string
  /** Callback when the visual graph changes (for syncing back to code) */
  onWireSourceChange?: (source: string) => void
  /** Layout data from sidecar file */
  layout?: LayoutData
  /** Callback when layout changes (for saving to sidecar) */
  onLayoutChange?: (layout: LayoutData) => void
}

// Simulation helper - evaluates the circuit and returns updated nodes/edges
function evaluateCircuit(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const nodeOutputs = new Map<string, number>()

  // First, get all input values
  nodes.forEach((node) => {
    if (node.type === 'input') {
      nodeOutputs.set(`${node.id}:out`, (node.data as any).value ?? 0)
    }
  })

  // Helper to get input value for a node's port
  const getInputValue = (nodeId: string, handleId: string): number => {
    const edge = edges.find(
      (e) => e.target === nodeId && e.targetHandle === handleId
    )
    if (!edge) return 0
    return nodeOutputs.get(`${edge.source}:${edge.sourceHandle}`) ?? 0
  }

  // Evaluate gates (multiple passes for propagation through chains)
  for (let pass = 0; pass < 10; pass++) {
    nodes.forEach((node) => {
      if (node.type === 'gate') {
        const gateType = (node.data as any).gateType as GateType
        const a = getInputValue(node.id, 'a')
        const b = getInputValue(node.id, 'b')
        const d = getInputValue(node.id, 'd')
        const sel = getInputValue(node.id, 'sel')

        let result = 0
        switch (gateType) {
          case 'nand':
            result = (a & b) === 1 ? 0 : 1
            break
          case 'and':
            result = a & b
            break
          case 'or':
            result = a | b
            break
          case 'not':
            result = a === 1 ? 0 : 1
            break
          case 'xor':
            result = a ^ b
            break
          case 'mux':
            result = sel === 0 ? a : b
            break
          case 'dff':
            result = d
            break
        }
        nodeOutputs.set(`${node.id}:out`, result)
      }
    })
  }

  // Update edges with values
  const newEdges = edges.map((edge) => ({
    ...edge,
    data: {
      ...edge.data,
      value: nodeOutputs.get(`${edge.source}:${edge.sourceHandle}`) ?? 0,
    },
  }))

  // Update nodes with simulation state
  const newNodes = nodes.map((node) => {
    if (node.type === 'output') {
      const inEdge = edges.find(
        (e) => e.target === node.id && e.targetHandle === 'in'
      )
      if (inEdge) {
        const value = nodeOutputs.get(`${inEdge.source}:${inEdge.sourceHandle}`) ?? 0
        return { ...node, data: { ...node.data, value } }
      }
    }
    if (node.type === 'gate') {
      const simState = {
        inputValues: {
          a: getInputValue(node.id, 'a'),
          b: getInputValue(node.id, 'b'),
          d: getInputValue(node.id, 'd'),
          sel: getInputValue(node.id, 'sel'),
          clk: getInputValue(node.id, 'clk'),
        },
        outputValues: {
          out: nodeOutputs.get(`${node.id}:out`) ?? 0,
          q: nodeOutputs.get(`${node.id}:q`) ?? 0,
        },
      }
      return { ...node, data: { ...node.data, simState } }
    }
    return node
  })

  return { nodes: newNodes, edges: newEdges }
}

// Initial demo circuit: NOT gate (a NAND with both inputs tied together)
const initialNodes: Node[] = [
  {
    id: 'input-a',
    type: 'input',
    position: { x: 50, y: 100 },
    data: { name: 'a', width: 1, value: 0 },
  },
  {
    id: 'nand-1',
    type: 'gate',
    position: { x: 250, y: 100 },
    data: { gateType: 'nand', label: 'g1' },
  },
  {
    id: 'output-out',
    type: 'output',
    position: { x: 450, y: 100 },
    data: { name: 'out', width: 1, value: 1 },
  },
]

const initialEdges: Edge[] = [
  {
    id: 'e1',
    source: 'input-a',
    sourceHandle: 'out',
    target: 'nand-1',
    targetHandle: 'a',
    type: 'signal',
    data: { value: 0 },
  },
  {
    id: 'e2',
    source: 'input-a',
    sourceHandle: 'out',
    target: 'nand-1',
    targetHandle: 'b',
    type: 'signal',
    data: { value: 0 },
  },
  {
    id: 'e3',
    source: 'nand-1',
    sourceHandle: 'out',
    target: 'output-out',
    targetHandle: 'in',
    type: 'signal',
    data: { value: 1 },
  },
]

let nodeIdCounter = 100

export function VisualEditor({ wireSource, onWireSourceChange, layout, onLayoutChange }: VisualEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)

  // Track simulation state
  const [simulating, setSimulating] = useState(false)
  const [cycle, setCycle] = useState(0)

  // Track if we've loaded from source
  const [loadedSource, setLoadedSource] = useState<string | undefined>(undefined)

  // Load from wireSource when it changes
  useEffect(() => {
    if (wireSource && wireSource !== loadedSource) {
      const result = wireSourceToVisual(wireSource, layout)
      if ('error' in result) {
        console.error('Failed to parse wire source:', result.error)
        return
      }

      let newNodes = result.nodes

      // Apply auto-layout if no layout provided or nodes need layout
      if (needsLayout(newNodes)) {
        newNodes = applyCircuitLayout(newNodes, result.edges)
      }

      setNodes(newNodes)
      setEdges(result.edges)
      setLoadedSource(wireSource)
      setCycle(0)
      setSimVersion((v) => v + 1)
    }
  }, [wireSource, layout, loadedSource, setNodes, setEdges])

  // Track graph version for sync callbacks
  const [graphVersion, setGraphVersion] = useState(0)
  const prevGraphVersionRef = useRef(0)

  // Sync graph changes back to Wire source
  useEffect(() => {
    // Skip initial render and when we just loaded from source
    if (graphVersion === 0 || graphVersion === prevGraphVersionRef.current) return
    prevGraphVersionRef.current = graphVersion

    if (onWireSourceChange) {
      const ast = visualToAst(nodes, edges, 'visual_circuit')
      const source = astToWireSource(ast)
      onWireSourceChange(source)
    }

    if (onLayoutChange) {
      const layoutData = extractLayout(nodes, 'visual_circuit')
      onLayoutChange(layoutData)
    }
  }, [graphVersion, nodes, edges, onWireSourceChange, onLayoutChange])

  // Increment graph version when nodes/edges change structurally (not just position/values)
  const prevNodesRef = useRef(nodes)
  const prevEdgesRef = useRef(edges)

  useEffect(() => {
    const nodesChanged = nodes.length !== prevNodesRef.current.length ||
      nodes.some((n, i) => {
        const prev = prevNodesRef.current[i]
        if (!prev) return true
        return n.id !== prev.id || n.type !== prev.type ||
          (n.data as any).name !== (prev.data as any).name ||
          (n.data as any).gateType !== (prev.data as any).gateType
      })

    const edgesChanged = edges.length !== prevEdgesRef.current.length ||
      edges.some((e, i) => {
        const prev = prevEdgesRef.current[i]
        if (!prev) return true
        return e.id !== prev.id || e.source !== prev.source || e.target !== prev.target
      })

    if (nodesChanged || edgesChanged) {
      setGraphVersion((v) => v + 1)
    }

    prevNodesRef.current = nodes
    prevEdgesRef.current = edges
  }, [nodes, edges])

  // Track layout changes (node positions)
  const handleNodesChangeWithLayout = useCallback(
    (changes: any) => {
      onNodesChange(changes)

      // Check if any position changes
      const hasPositionChange = changes.some((c: any) => c.type === 'position' && c.dragging === false)
      if (hasPositionChange && onLayoutChange) {
        // Defer to next tick to get updated positions
        setTimeout(() => {
          const layoutData = extractLayout(nodes, 'visual_circuit')
          onLayoutChange(layoutData)
        }, 0)
      }
    },
    [onNodesChange, nodes, onLayoutChange]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge({ ...connection, type: 'signal', data: { value: 0 } }, eds)
      )
    },
    [setEdges]
  )

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow-type')
      const gateType = event.dataTransfer.getData('application/reactflow-gatetype') as GateType

      if (!type || !reactFlowInstance) return

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newId = `${type}-${++nodeIdCounter}`
      let newNode: Node

      switch (type) {
        case 'input':
          newNode = {
            id: newId,
            type: 'input',
            position,
            data: { name: `in${nodeIdCounter}`, width: 1, value: 0 },
          }
          break
        case 'output':
          newNode = {
            id: newId,
            type: 'output',
            position,
            data: { name: `out${nodeIdCounter}`, width: 1, value: 0 },
          }
          break
        case 'gate':
          newNode = {
            id: newId,
            type: 'gate',
            position,
            data: { gateType, label: `g${nodeIdCounter}` },
          }
          break
        default:
          return
      }

      setNodes((nds) => [...nds, newNode])
    },
    [reactFlowInstance, setNodes]
  )

  // Track when we need to re-simulate
  const [simVersion, setSimVersion] = useState(0)

  // Toggle input value
  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      if (node.type === 'input') {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === node.id) {
              const currentValue = (n.data as any).value ?? 0
              return {
                ...n,
                data: { ...n.data, value: currentValue === 0 ? 1 : 0 },
              }
            }
            return n
          })
        )
        // Trigger re-simulation
        setSimVersion((v) => v + 1)
      }
    },
    [setNodes]
  )

  // Run simulation whenever inputs change or connections change
  useEffect(() => {
    const result = evaluateCircuit(nodes, edges)

    // Only update if values actually changed to prevent infinite loops
    const nodesChanged = result.nodes.some((newNode, i) => {
      const oldNode = nodes[i]
      if (!oldNode) return true
      if (newNode.type === 'output') {
        return (newNode.data as any).value !== (oldNode.data as any).value
      }
      if (newNode.type === 'gate') {
        const newSim = (newNode.data as any).simState
        const oldSim = (oldNode.data as any).simState
        if (!oldSim) return true
        return JSON.stringify(newSim) !== JSON.stringify(oldSim)
      }
      return false
    })

    const edgesChanged = result.edges.some((newEdge, i) => {
      const oldEdge = edges[i]
      if (!oldEdge) return true
      return (newEdge.data as any)?.value !== (oldEdge.data as any)?.value
    })

    if (nodesChanged) {
      setNodes(result.nodes)
    }
    if (edgesChanged) {
      setEdges(result.edges)
    }
  }, [simVersion]) // Only re-run when simVersion changes

  // Step simulation
  const handleStep = useCallback(() => {
    setCycle((c) => c + 1)
    setSimVersion((v) => v + 1)
  }, [])

  // Reset
  const handleReset = useCallback(() => {
    setCycle(0)
    setNodes((nds) =>
      nds.map((n) => {
        if (n.type === 'input') {
          return { ...n, data: { ...n.data, value: 0 } }
        }
        return n
      })
    )
    setSimVersion((v) => v + 1)
  }, [setNodes])

  return (
    <div className="flex h-full bg-slate-950">
      <ComponentPalette />

      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-4 gap-4">
          <span className="text-sm font-mono text-slate-400">
            Cycle: <span className="text-cyan-400">{cycle}</span>
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleStep}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-mono rounded transition-colors"
            >
              Step
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm font-mono rounded transition-colors"
            >
              Reset
            </button>
          </div>
          <div className="flex-1" />
          <span className="text-xs text-slate-500">
            Click inputs to toggle | Drag to connect
          </span>
        </div>

        {/* Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChangeWithLayout}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: 'signal' }}
            fitView
            snapToGrid
            snapGrid={[20, 20]}
            className="bg-slate-950"
          >
            <Controls className="!bg-slate-800 !border-slate-700 !rounded-lg" />
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#334155"
            />

            {/* SVG filters for glow effects */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
              <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
            </svg>
          </ReactFlow>
        </div>
      </div>
    </div>
  )
}
