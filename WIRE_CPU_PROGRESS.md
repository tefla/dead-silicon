# Wire CPU Implementation Progress

**Goal:** Build a complete 6502-style CPU in Wire HDL that executes Pulse assembly programs

**Start Date:** 2025-12-04
**Strategy:** Incremental development with comprehensive testing at each step

---

## Phase 1: Foundation Components (Days 1-2)

### 1.1: 16-bit Building Blocks
- [ ] `register16.wire` - 16-bit register with enable
  - [ ] Write tests
  - [ ] Implement module
  - [ ] Verify all tests pass
- [ ] `adder16.wire` - 16-bit ripple carry adder
  - [ ] Write tests
  - [ ] Implement module
  - [ ] Verify all tests pass
- [ ] `mux16.wire` - 16-bit 2-to-1 multiplexer
  - [ ] Write tests
  - [ ] Implement module
  - [ ] Verify all tests pass
- [ ] `inc16.wire` - 16-bit incrementer (for PC)
  - [ ] Write tests
  - [ ] Implement module
  - [ ] Verify all tests pass

### 1.2: Extended ALU
- [ ] `alu8.wire` - 8-bit ALU with 5 operations
  - [ ] Write tests (ADD, SUB, AND, OR, XOR)
  - [ ] Implement module
  - [ ] Test flag generation (Z, N, C, V)
  - [ ] Verify all tests pass

### 1.3: Multi-Way Multiplexers
- [ ] `mux4way8.wire` - 4-to-1 mux (8-bit)
  - [ ] Write tests
  - [ ] Implement module
  - [ ] Verify all tests pass
- [ ] `mux8way8.wire` - 8-to-1 mux (8-bit)
  - [ ] Write tests
  - [ ] Implement module
  - [ ] Verify all tests pass

**Phase 1 Complete When:**
- [ ] All components tested individually
- [ ] ~40-50 unit tests passing
- [ ] Components ready for CPU integration

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

**Active Phase:** Phase 1.1
**Current Task:** Building register16.wire
**Tests Passing:** 0 / ~250 target
**Last Updated:** 2025-12-04
