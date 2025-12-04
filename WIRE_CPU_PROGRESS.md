# Wire CPU Implementation Progress

**Goal:** Build a complete 6502-style CPU in Wire HDL that executes Pulse assembly programs

**Start Date:** 2025-12-04
**Strategy:** Incremental development with comprehensive testing at each step

---

## Phase 1: Foundation Components (Days 1-2)

### 1.1: 16-bit Building Blocks ✅
- [x] `register16.wire` - 16-bit register with enable
  - [x] Write tests (6 tests)
  - [x] Implement module
  - [x] Verify all tests pass
- [x] `adder16.wire` - 16-bit ripple carry adder
  - [x] Write tests (10 tests: basic, carry, overflow)
  - [x] Implement module (chains two adder8 modules)
  - [x] Verify all tests pass
  - [x] Fixed compiler bug: member access width lookup now resolves aliases
- [x] `mux16.wire` - 16-bit 2-to-1 multiplexer
  - [x] Write tests (7 tests: selection, toggling, patterns)
  - [x] Implement module (uses mux8 for each byte)
  - [x] Created `mux8.wire` as building block
  - [x] Verify all tests pass
- [x] `inc16.wire` - 16-bit incrementer (for PC)
  - [x] Write tests (6 tests: increments, carry, wraparound)
  - [x] Implement module (uses adder16 with constant 1)
  - [x] Verify all tests pass

### 1.2: Extended ALU ✅
- [x] `alu8.wire` - 8-bit ALU with 5 operations
  - [x] Write tests (ADD, SUB, AND, OR, XOR)
  - [x] Implement module
  - [x] Test flag generation (Z, N, C, V)
  - [x] Verify all tests pass (66 new tests)

### 1.3: Multi-Way Multiplexers ✅
- [x] `mux4way8.wire` - 4-to-1 mux (8-bit)
  - [x] Write tests (10 tests)
  - [x] Implement module
  - [x] Verify all tests pass
- [x] `mux8way8.wire` - 8-to-1 mux (8-bit)
  - [x] Write tests (15 tests)
  - [x] Implement module
  - [x] Verify all tests pass

**Phase 1 Complete When:**
- [x] All components tested individually
- [x] ~40-50 unit tests passing (122 CPU component tests!)
- [x] Components ready for CPU integration

---

## Phase 2: Minimal CPU - 4 Instructions (Days 3-4)

### 2.1: Instruction Fetch Unit
- [x] `fetch.wire` - PC + instruction register
  - [x] Write tests
  - [x] Implement module
  - [x] Verify all tests pass

### 2.2: Instruction Decoder (Minimal)
- [x] `decode_minimal.wire` - Decode 4 instructions
  - [x] Write tests
  - [x] Implement module
  - [x] Verify all tests pass

### 2.3: Minimal CPU Integration
- [x] `cpu_minimal.wire` - 4-instruction CPU
  - [x] Write integration tests
  - [x] Implement state machine
  - [x] Test: LDA #imm
  - [x] Test: STA $addr
  - [x] Test: JMP $addr
  - [x] Test: HLT
  - [x] Test: Complete programs

**Phase 2 Complete When:**
- [x] Minimal CPU executes simple programs
- [x] ~80-100 tests passing

---

## Phase 3: Expand to 10 Instructions (Days 5-6)

### 3.1: Foundation (Complete)
- [x] Instruction set expanded to 7 ops: LDA, LDX, ADC, STA, JMP, BEQ, HLT
- [x] Decoder updated with relative branch path
- [x] X register and flag register (C, Z, N, V) integrated
- [x] FETCH_REL state and ALU execution path implemented
- [x] Tests passing for new instructions

### 3.2: Extended Operations ✅
- [x] Add STX $addr (5 tests)
- [x] Add SBC #imm (6 tests)
- [x] Add BNE rel (5 tests)
- [x] Extend flag behaviors for SBC/branches
- [x] Write and verify tests (16 new tests)

### 3.3: Polish & Extras ✅
- [x] CMP #imm (7 tests)
- [x] INX (5 tests)
- [x] DEX (6 tests)
- [x] Additional branch/regression tests

**Phase 3 Complete When:**
- [x] 13 instructions working (LDA, LDX, ADC, SBC, CMP, STA, STX, JMP, BEQ, BNE, INX, DEX, HLT)
- [x] 230 CPU component tests passing (1315 total project tests)
- [x] Arithmetic, comparison, and branching work

---

## Phase 4: Complete Instruction Set (Days 7-9)

### 4.1: Logic Instructions (Day 7)
- [ ] AND #imm
- [ ] ORA #imm
- [ ] EOR #imm

### 4.2: Register Operations (Day 8)
- [ ] INX, DEX, INY, DEY
- [ ] TAX, TAY, TXA, TYA

### 4.3: Stack Operations (Day 9)
- [ ] Stack pointer register
- [ ] PHA, PLA
- [ ] JSR, RTS

**Phase 4 Complete When:**
- [ ] 25+ instructions implemented
- [ ] ~180-200 tests passing
- [ ] Full instruction set working

---

## Phase 5: Memory Interface & Integration (Days 10-11)

### 5.1: RAM Module
- [ ] `ram.wire` - 64KB RAM
- [ ] Write/read cycle tests
- [ ] Address decoding tests

### 5.2: Reset Vector
- [ ] Implement proper 6502-style reset vector at $FFFC/$FFFD
- [ ] CPU reads reset vector on startup
- [ ] (Currently using PC=0 for simplicity in Phase 2)

### 5.3: Full System Integration
- [ ] `system.wire` - CPU + RAM + I/O
- [ ] Run Pulse test programs
- [ ] Compare to TypeScript CPU
- [ ] Verify all 183 existing tests pass

**Phase 5 Complete When:**
- [ ] Full system runs Pulse programs
- [ ] All existing tests migrated
- [ ] Output matches TypeScript CPU

---

## Phase 6: Boot Sequence & Shell (Days 12-13)

### 6.1: Load Boot Program
- [ ] Assemble boot.pulse
- [ ] Load into RAM at correct address
- [ ] Set reset vector
- [ ] Test boot sequence

### 6.2: I/O System
- [ ] `io.wire` - Serial + LED
- [ ] Test serial TX/RX
- [ ] Test LED control
- [ ] Verify terminal output

**Phase 6 Complete When:**
- [ ] Boot prints banner
- [ ] Shell accepts commands
- [ ] Full system operational
- [ ] 200+ tests passing

---

## Test Statistics

| Phase | Unit Tests | Integration Tests | Total |
|-------|-----------|-------------------|-------|
| 1     | ~40       | 0                 | ~40   |
| 2     | ~60       | ~20               | ~80   |
| 3     | ~80       | ~40               | ~120  |
| 4     | ~100      | ~80               | ~180  |
| 5     | ~120      | ~100              | ~220  |
| 6     | ~130      | ~120              | ~250  |

---

## Current Status

**Active Phase:** Phase 4 (complete instruction set)
**Current Task:** Logic instructions (AND, ORA, EOR)
**Tests Passing:** 1328 total (230 CPU component tests + 13 WASM tests)
**Last Updated:** 2025-12-04

### Recent Accomplishments
- 🔥 **WASM Simulator**: Compiles circuits to WebAssembly for maximum efficiency
  - **202 KHz** - 28x faster than levelized, 2272x faster than interpreter
  - Uses Binaryen.js for runtime WASM bytecode generation
  - All wire values in WASM linear memory for fast i32 operations
  - Imports shared memory for JS/WASM interop
  - 13 new tests covering all circuit operations
- 🚀 **Levelized Optimization**: ~94x faster than interpreter (8.5 KHz vs 91 Hz)
  - Typed array storage for DFF state (avoids Map lookups)
  - Precomputed DFF wire indices for tight loops
  - Skip re-evaluation when DFF values don't change
  - Precomputed masks for NAND and slice operations
- ✅ **Phase 3 Complete!** 13 instructions working (LDA, LDX, ADC, SBC, CMP, STA, STX, JMP, BEQ, BNE, INX, DEX, HLT)
- 📦 **Phase 3.3**: CMP, INX, DEX with 18 new tests
- 📦 **Phase 3.2**: STX, SBC, BNE with 16 new tests
- ✅ **Phase 3.1 Complete!** 7 instructions working
- 🔧 **Bug Fix**: Fixed trailing space in simulator wire resolution
- ✅ **Phase 2 Complete!** Minimal CPU with state machine
- ✅ **Phase 1 Complete!** All foundation components built
