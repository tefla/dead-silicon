# Dead Silicon - Project Guide

## Vision

Dead Silicon is a game where players repair a malfunctioning spacecraft by fixing broken hardware circuits. The core innovation is that **the game runs on actual simulated hardware** - not fake game logic pretending to be hardware.

The player interacts with a terminal that IS a real CPU running real assembly code. When they fix a circuit, they're editing real Wire HDL that gets compiled and simulated at the gate level.

## Architecture

```
Wire HDL (.wire files)
        │
        ▼
   WASM Compiler
        │
        ▼
   WASM Simulator  ◄── THE ONLY WAY TO EXECUTE CIRCUITS
        │
        ▼
   cpu_minimal.wire (34-instruction 6502-style CPU)
        │
        ▼
   boot.pulse (BIOS/OS in Pulse assembly)
        │
        ▼
   Game Terminal (React UI bridging serial I/O)
```

## Critical Constraint: WASM-Only Simulation

**There is exactly ONE simulator: the WASM simulator.**

- No interpreter fallback
- No alternative strategies
- All Wire HDL execution goes through WASM
- If a test fails, we fix the WASM simulator, not add workarounds

This constraint exists because:
1. Performance: WASM runs at ~18 KHz, fast enough for interactive use
2. Simplicity: One code path, fewer bugs
3. Authenticity: The game's "hardware simulation" claim is real

## Development Approach: TDD

We use Test-Driven Development:

1. **Write a small, focused test** that describes expected behavior
2. **Run the test** - it should fail
3. **Implement the minimum code** to make it pass
4. **Refactor** if needed
5. **Repeat**

Tests should be:
- Small (test one thing)
- Fast (WASM compilation is quick)
- Comprehensive (cover edge cases)

## Current Status

### What Works
- Wire HDL lexer, parser, compiler
- WASM simulator for basic circuits (NAND, DFF, buses)
- cpu_minimal.wire with 34 instructions
- boot.pulse BIOS that boots and runs a shell
- Serial I/O bridging

### What Needs Work (WASM Simulator)
- [ ] ROM primitive support
- [ ] RAM primitive support
- [ ] Multi-output module field access
- [ ] Comprehensive test coverage

## File Structure

```
src/
├── wire/           # Wire HDL toolchain
│   ├── lexer.ts
│   ├── parser.ts
│   ├── compiler.ts
│   ├── simulator.ts      # Entry point (delegates to WASM)
│   ├── simulator-wasm.ts # THE simulator
│   └── memory.ts         # Memory map constants
├── pulse/          # Pulse assembler
├── assets/
│   ├── wire/       # Wire HDL modules (gates, CPU, etc.)
│   └── pulse/      # Pulse assembly programs
├── game/           # Game logic
│   ├── useCPUSimulation.ts  # Runs CPU via WASM
│   └── useGameStore.ts
└── ui/             # React components
```

## Key Files

- `src/wire/simulator-wasm.ts` - The WASM simulator implementation
- `src/assets/wire/cpu_minimal.wire` - The CPU we're simulating
- `src/assets/pulse/boot.pulse` - The OS running on the CPU
- `src/game/useCPUSimulation.ts` - React hook bridging UI to CPU

## Commands

```bash
npm test              # Run all tests
npm run dev           # Start dev server
npm run bench         # Run CPU benchmark
```

## Testing Philosophy

Every feature of the WASM simulator should have tests:

```typescript
// Example: Testing ROM
describe('WASM Simulator ROM', () => {
  it('reads loaded data', () => {
    const sim = createSimulator(`
      module test(addr:8) -> out:8:
        out = rom(addr)
    `)
    sim.loadRom([0x42, 0xFF])
    sim.setInput('addr', 0)
    sim.step()
    expect(sim.getOutput('out')).toBe(0x42)
  })
})
```

## Don't

- Don't add alternative simulators
- Don't skip tests because "WASM doesn't support X" - fix WASM instead
- Don't over-engineer - minimum viable implementation first
- Don't add features without tests
