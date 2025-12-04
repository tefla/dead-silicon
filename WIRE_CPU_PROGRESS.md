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
- [ ] `fetch.wire` - PC + instruction register
  - [ ] Write tests
  - [ ] Implement module
  - [ ] Verify all tests pass

### 2.2: Instruction Decoder (Minimal)
- [ ] `decode_minimal.wire` - Decode 4 instructions
  - [ ] Write tests
  - [ ] Implement module
  - [ ] Verify all tests pass

### 2.3: Minimal CPU Integration
- [ ] `cpu_minimal.wire` - 4-instruction CPU
  - [ ] Write integration tests
  - [ ] Implement state machine
  - [ ] Test: LDA #imm
  - [ ] Test: STA $addr
  - [ ] Test: JMP $addr
  - [ ] Test: HLT
  - [ ] Test: Complete programs

**Phase 2 Complete When:**
- [ ] Minimal CPU executes simple programs
- [ ] ~80-100 tests passing
- [ ] Ready to expand instruction set

---

## Phase 3: Expand to 10 Instructions (Days 5-6)

### 3.1: Extended Decoder
- [ ] Add LDX, STX, ADD, SUB, JEQ, JNE
- [ ] Write tests for new instructions
- [ ] Verify all tests pass

### 3.2: ALU Integration
- [ ] Add flag register (C, Z, N, V)
- [ ] Wire ALU to datapath
- [ ] Test arithmetic operations
- [ ] Test conditional branches

### 3.3: X Register
- [ ] Add X register to datapath
- [ ] Test LDX/STX
- [ ] Verify independence from A

**Phase 3 Complete When:**
- [ ] 10 instructions working
- [ ] ~130-150 tests passing
- [ ] Arithmetic and branching work

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

### 5.2: Full System Integration
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

**Active Phase:** Phase 2
**Current Task:** Phase 1 complete! Ready to build minimal CPU
**Tests Passing:** 566 (122 CPU component tests) / ~250 target
**Last Updated:** 2025-12-04

### Recent Accomplishments
- ✅ **Phase 1 Complete!** All foundation components built
- 📦 **Phase 1.3**: mux4way8, mux8way8 (25 new tests)
- 📦 **Phase 1.2**: alu8, not8, and8, or8, xor8 (66 tests)
- 📦 **Phase 1.1**: register16, adder16, mux8, mux16, inc16
- ✅ **Test Coverage**: 122 CPU component tests, all passing
