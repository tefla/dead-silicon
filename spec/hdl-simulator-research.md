# Building a high-performance web-based HDL simulator

A browser-based Verilog simulator targeting 6502-scale complexity (thousands of gates) is achievable using a combination of **levelized event-driven compiled simulation**, **WebAssembly for compute kernels**, and **intelligent activity-based optimization**. The most successful existing implementation—8bitworkshop—demonstrates ~2x speedup with WASM over optimized JavaScript, while academic research on LECSIM shows **8-77x speedups** over naive event-driven simulation through compiled levelized scheduling.

The recommended architecture combines JavaScript for orchestration and UI with a WASM compute kernel (preferably Rust via wasm-bindgen), implements levelized gate scheduling for combinational logic, and uses event-driven handling only for sequential elements. This hybrid approach minimizes overhead while maintaining the flexibility needed for Verilog's timing semantics.

## The simulation strategy determines everything

The choice between event-driven and cycle-based simulation has profound performance implications. **Event-driven simulation** evaluates gates only when inputs change, using a priority queue to schedule events—ideal for low-activity circuits where perhaps only 10-20% of gates toggle per cycle. **Cycle-based simulation** evaluates the entire design every clock edge, trading timing accuracy for raw speed.

For a 6502-class CPU, the **levelized event-driven approach** offers the best tradeoff. Research from the LECSIM project demonstrates that zero-delay simulation with levelized event scheduling eliminates most unnecessary gate evaluations:

| Benchmark Circuit | Event-Driven (Gates Evaluated) | Levelized Event-Driven | Improvement |
|-------------------|-------------------------------|------------------------|-------------|
| C6288 (124 levels) | 100% | 4% | 25x fewer |
| Average across ISCAS | 100% | 33-50% | 2-3x fewer |

Professional simulators exploit this: **Verilator** compiles Verilog to optimized C++, achieving 10x speedup over standalone SystemC and **100x over interpreted simulators** like Icarus Verilog. It sacrifices X/Z state support and intra-cycle timing for pure two-state cycle-accurate simulation. For educational tools requiring X-propagation visibility, a four-state model with 2 bits per signal remains viable at moderate performance cost.

The key insight from Icarus Verilog's architecture is its three-tiered event system: propagation events (signal changes through the functor network), assignment events (non-blocking assignments from behavioral code), and thread schedule events. Its skip-list event queue provides efficient ordered event extraction. For browser implementation, a binary heap priority queue achieves O(log n) operations with straightforward JavaScript:

```javascript
// Core event loop structure
while (!eventQueue.isEmpty()) {
  const event = eventQueue.pop();
  if (event.cancelled) continue;
  currentTime = event.time;
  event.signal.value = event.newValue;
  for (const dependent of event.signal.fanout) {
    const output = dependent.evaluate();
    if (output !== dependent.currentOutput) {
      eventQueue.push({ time: currentTime + dependent.delay,
                        signal: dependent.output, newValue: output });
    }
  }
}
```

## Levelization enables compiled simulation

Levelization assigns each gate a level number through topological sorting, ensuring all inputs to any gate are computed before that gate executes. This **static scheduling** eliminates event queue overhead entirely for combinational logic. The algorithm runs in O(V + E) time using either Kahn's BFS approach or DFS post-ordering.

For sequential circuits with feedback, the solution is to **break at flip-flops**: treat flip-flop outputs as primary inputs and inputs as primary outputs. The resulting combinational "cones" are levelizable. Simulation proceeds in two phases: evaluate all combinational logic in levelized order, then update flip-flop states at clock edges.

Verilator's internal architecture demonstrates production-quality compiled simulation. Its pipeline transforms Verilog through parsing, AST construction, multiple optimization passes (V3Const for constant folding, V3Inline for module merging, V3Gate for logic optimization), and finally C++ code generation. Key optimizations include:

- **Design flattening**: All modules expanded into one unified module
- **Wire elimination**: Unused signals removed via static analysis
- **Two-state simulation**: 1 bit per signal instead of 2, enabling native bitwise operations
- **Scheduling at compile time**: No runtime gate-type decoding

The generated C++ compiles to machine code where gate evaluations become simple bitwise operations—an AND gate compiles to a single CPU instruction rather than a function call through a dispatch table.

## WebAssembly provides near-native browser performance

WASM offers **2-10x improvement** over JavaScript for compute-intensive simulation workloads, with the strongest gains in bitwise operations—exactly what logic simulation requires. Mozilla research shows WASM runs at 45-55% of native speed, compared to JavaScript's ~50-100% of native for optimized numeric code (thanks to V8's aggressive JIT).

Three toolchains target WASM with different tradeoffs:

| Toolchain | Performance | Binary Size | Learning Curve | Best For |
|-----------|-------------|-------------|----------------|----------|
| **Rust + wasm-bindgen** | Excellent | Medium | High | New projects, safety-critical |
| **Emscripten (C/C++)** | Excellent | Large | Medium | Porting existing code |
| **AssemblyScript** | Good | Smallest | Low | Prototyping, JS teams |

For a new HDL simulator, **Rust with wasm-pack** is recommended. Memory safety without garbage collection eliminates entire classes of simulation bugs, and the wasm-bindgen ecosystem provides excellent JavaScript interop:

```rust
#[wasm_bindgen]
pub fn simulate_cycles(signals: &mut [u32], gates: &[u32], cycles: u32) -> u32 {
    let mut event_count = 0;
    for _ in 0..cycles {
        event_count += evaluate_levelized(signals, gates);
    }
    event_count
}
```

**8bitworkshop** represents the most complete browser-based HDL simulation with WASM, using a Verilator 4-based backend. Their benchmarks show consistent ~2x improvement over JavaScript translation—significant but below the 10x sometimes expected. This is because V8's TurboFan already optimizes JavaScript aggressively for predictable numeric patterns.

WASM SIMD (128-bit vectors, available in Chrome 91+ and Firefox 89+) offers additional parallelization. With `v128` operations on packed i32x4, four 32-bit signals evaluate simultaneously per instruction. For bit-packed simulation where each word represents 32 parallel test vectors, this provides substantial throughput gains.

The recommended architecture separates concerns cleanly:

```
┌─────────────────────────────────────────────┐
│                JavaScript                    │
│  - UI/Canvas rendering                       │
│  - HDL parsing and elaboration              │
│  - Simulation control (start/stop/step)     │
│  - Waveform display                         │
└──────────────────┬──────────────────────────┘
                   ▼
         SharedArrayBuffer (signal memory)
                   │
└──────────────────┼──────────────────────────┘
┌──────────────────▼──────────────────────────┐
│            WASM Compute Kernel              │
│  - Levelized gate evaluation                │
│  - Event queue processing                   │
│  - Delta cycle handling                     │
└─────────────────────────────────────────────┘
```

## BDDs are overkill for simulation but valuable for verification

Binary Decision Diagrams provide canonical Boolean function representation, enabling O(1) equivalence checking via pointer comparison. However, for pure simulation workloads, BDD construction overhead rarely justifies the investment.

The **binary-decision-diagram** npm package (~5,900 weekly downloads) offers JavaScript BDD manipulation with truth table construction, minimization, and variable ordering optimization. For WASM integration, Rust's **biodivine-lib-bdd** provides thread-safe BDD operations compilable to WASM.

Variable ordering is critical: the same function can have linear or exponential node count depending on order. For (x₁ ∧ x₂) ∨ (x₃ ∧ x₄) ∨ (x₅ ∧ x₆), interleaving the variables badly produces O(2ⁿ) nodes versus O(n) with natural ordering. Dynamic reordering via sifting (moving each variable to its optimal position) helps but costs O(n² × |BDD|) per sweep.

**Memory estimates for BDD-based approaches**:
- Per-node: ~20-32 bytes (variable index, child pointers, reference count)
- 1,000 gates with good structure: 10K-100K nodes (~200KB-3MB)
- 10,000 gates: 100K-10M nodes (~2MB-320MB)—may exceed browser limits

For 6502-scale simulation, **direct gate-level simulation outperforms BDDs**. BDDs become valuable for formal verification (checking equivalence between implementations) or exhaustive analysis (all input combinations), but not cycle-by-cycle simulation.

## Existing implementations reveal key architectural patterns

**DigitalJS** (734 GitHub stars) demonstrates effective browser-based simulation using Yosys as a synthesis backend. Circuits flow from SystemVerilog through Yosys to JSON, then into a JavaScript simulation engine. The JSON format with `devices`, `connectors`, and `subcircuits` keys provides clean serialization. Performance bottlenecks stemmed from JointJS's DOM manipulation—newer versions addressed this with optimized rendering.

**Visual6502** simulates the actual 6502 at transistor level using ~20,000 polygon components photographed from the die. Its JavaScript simulator runs at ~1 cycle/second with full visualization—a million times slower than the real chip. A Verilator-based version achieves ~4kHz, while FPGA implementations hit real-time 1MHz. This demonstrates the performance hierarchy clearly: interpreted JS < compiled JS < Verilator C++ < hardware.

**hdl-js** (89 stars) provides the most complete JavaScript HDL solution with parser, emulator, and test infrastructure compatible with nand2tetris format. Its Pin abstraction with events, CompositeGate for HDL-defined modules, and SystemClock for synchronous simulation offer a clean reference architecture.

**Logisim-Evolution** uses an event-driven Propagator managing a signal queue, but users report practical tick rates of only ~3.5kHz—far below the advertised maximum. Mouse position affecting simulation speed reveals tight coupling between UI and simulation threads.

Key lessons from existing implementations:
- **JSON circuit format** enables easy serialization and debugging
- **Separation of simulation engine from visualization** is essential for performance
- **Canvas/WebGL rendering** outperforms DOM manipulation significantly
- **Hierarchical subcircuit support** is mandatory for managing complexity
- **Explicit simulation start/stop** (Digital's approach) prevents accidental cycles

## Hybrid strategies and activity optimization provide final gains

The LECSIM approach combines levelized scheduling with event-driven flexibility. Rather than maintaining a global event queue, it compiles local scheduling into each gate's evaluation code. Activity tracking enables skipping entire regions: if a subcircuit's inputs haven't changed, skip its evaluation entirely.

For 6502 simulation, expect **<2% activity rate**—most of the CPU is idle on any given cycle. Activity-based optimization can skip the inactive 98%:

```javascript
class ActivityTracker {
  shouldSkipRegion(regionNodes) {
    return regionNodes.every(n => this.getActivityRate(n) < 0.01);
  }
}
```

**Incremental compilation** supports rapid iteration. Track dependencies at module granularity (~20-30 modules for 6502), hash each module's netlist, and recompile only changed modules. The LiveSim project demonstrates <1 second time from code change to running simulation through hot binary reloading.

**Memoization** helps selectively. Instruction decoders benefit (256 opcodes, repeated patterns), but ALUs with varying operands have low hit rates. LRU caches of 4-16KB provide meaningful speedup for decoder-heavy workloads.

For browser UI responsiveness, time-slice simulation across `requestAnimationFrame` callbacks:

```javascript
async runSimulation() {
  while (this.running) {
    for (let i = 0; i < this.batchSize && this.running; i++) {
      this.step();
    }
    await new Promise(r => requestAnimationFrame(r)); // Yield to UI
  }
}
```

Web Workers enable parallel partition evaluation. With `SharedArrayBuffer` and `Atomics` for synchronization, 4-8 workers can evaluate independent circuit partitions simultaneously. Partition boundaries should minimize wire crossings; the Fiduccia-Mattheyses heuristic provides balanced partitions.

## Recommended implementation approach

For a 6502-scale Verilog simulator, target these performance characteristics:

| Metric | Target | Notes |
|--------|--------|-------|
| Simulation clock | 1-2 MHz equivalent | 1-2M cycles/second |
| Gate evaluations/cycle | 500-1000 | With activity optimization |
| Time budget/cycle | 0.5-1µs | Including JS overhead |
| Memory footprint | <50MB | Signal arrays + compiled code |

**Phase 1: Core Engine**
- Implement levelized event-driven simulation with compiled evaluation
- Use JSON circuit format similar to DigitalJS
- Parse Verilog subset or use Yosys JSON output
- Build in JavaScript first, profile, identify hotspots

**Phase 2: WASM Optimization**
- Port gate evaluation kernel to Rust with wasm-bindgen
- Implement SharedArrayBuffer for zero-copy signal access
- Add SIMD acceleration for parallel bit operations
- Target 2-3x improvement over JS baseline

**Phase 3: Advanced Features**
- Web Worker parallelization with circuit partitioning
- Incremental compilation for rapid iteration
- Progressive display with batched UI updates
- Activity-based region skipping

The combination of levelized compiled simulation, WASM compute kernels, and activity-aware optimization should achieve **10-50x improvement** over naive interpreted event-driven simulation—sufficient for real-time 6502 emulation in a browser at usable speeds.
