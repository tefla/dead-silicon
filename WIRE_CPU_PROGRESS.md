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

### 4.1: Logic Instructions ✅
- [x] AND #imm (5 tests)
- [x] ORA #imm (5 tests)
- [x] EOR #imm (6 tests)

### 4.2: Register Operations ✅
- [x] INX, DEX (already done in Phase 3)
- [x] LDY #imm (4 tests)
- [x] STY $addr (2 tests)
- [x] INY (4 tests)
- [x] DEY (6 tests)
- [x] TAX (4 tests)
- [x] TAY (4 tests)
- [x] TXA (4 tests)
- [x] TYA (4 tests)

### 4.3: Stack Operations ✅
- [x] Stack pointer register (SP, 8-bit, initialized to $FF)
- [x] PHA - Push A to stack (10 tests)
- [x] PLA - Pull A from stack
- [x] JSR - Jump to subroutine (pushes return address)
- [x] RTS - Return from subroutine (pops return address)

**Phase 4 Complete When:**
- [x] 28 instructions implemented (LDA, LDX, LDY, ADC, SBC, CMP, AND, ORA, EOR, STA, STX, STY, JMP, JSR, RTS, BEQ, BNE, INX, DEX, INY, DEY, TAX, TAY, TXA, TYA, PHA, PLA, HLT)
- [x] 310+ CPU component tests passing
- [x] JSR/RTS for subroutine calls

---

## Phase 5: ROM-Based System Architecture (Days 10-11)

Uses external ROM for firmware instead of implementing routines in Wire HDL.
See `spec/system-architecture.md` for full details.

### Memory Map
```
$0000-$00FF  Zero Page RAM (256 bytes) - fast access
$0100-$01FF  Stack RAM (256 bytes) - hardware stack
$0200-$3FFF  General RAM (~16KB)
$4000-$7FFF  [Reserved/Expansion]
$8000-$800F  I/O Registers (memory-mapped)
$C000-$FFFF  ROM (16KB) - firmware/BIOS
```

### 5.1: Address Decoder ✅
- [x] `addr_decode.wire` - Decodes address to select memory region
- [x] sel_zp ($00xx), sel_stack ($01xx), sel_ram ($02xx-$3Fxx)
- [x] sel_io ($80xx), sel_rom ($C0xx-$FFxx)
- [x] Write tests for all memory regions (7 tests)

### 5.2: System Module ✅
- [x] `system.wire` - Top-level connecting CPU + ROM + RAM + I/O
- [x] Memory handled externally (test harness provides ROM/RAM)
- [x] Address decoder integrated for chip select signals
- [x] 5 system integration tests passing

### 5.3: Reset Vector ✅
- [x] ROM contains reset vector at $FFFC/$FFFD → $C000
- [x] CPU reads reset vector on startup (states 20→21→22→0)
- [x] Boot code starts executing from ROM
- [x] 23-state machine with 3-state reset sequence to avoid DFF race condition

### 5.4: Basic Boot Test ✅
- [x] ROM program execution (JMP $C000, execute in ROM)
- [x] RAM program execution (LDA, PHA, HLT)
- [x] CPU fetches from correct memory regions
- [x] Stack operations write to $01xx

**Phase 5 Complete When:**
- [x] CPU boots from ROM reset vector
- [x] ROM code can read/write RAM
- [x] Address decoder correctly routes all regions

---

## Phase 6: Boot Sequence & Shell (Days 12-13)

### 6.1: I/O Controller ✅
- [x] `io_ctrl.wire` - Memory-mapped I/O at $8000-$800F
  - [x] $8000 SERIAL_STATUS (R) - Bit 0: RX ready, Bit 1: TX busy
  - [x] $8001 SERIAL_DATA (R/W) - Read: RX byte, Write: TX byte
  - [x] $8002 LED_CTRL (W) - LED on/off control
- [x] TX logic with tx_valid pulse and tx_busy flag
- [x] RX logic with rx_ready flag
- [x] 10 I/O controller tests passing

### 6.2: Boot Program ✅
- [x] `boot_minimal.pulse` - Minimal boot using 28 implemented instructions
- [x] Assembles to ROM at $C000 with reset vector at $FFFC
- [x] Turns LED on, prints "OK\n" to serial, turns LED off, halts
- [x] Boot sequence integration tests (3 tests passing)
  - [x] Fixed missing `pcWire` dependency in test harness
  - [x] CPU boots from reset vector at $C000
  - [x] Executes boot program and outputs "OK\n"
  - [x] LED turns on then off during boot

### 6.3: Full System Integration ✅
- [x] CPU + I/O controller + ROM boot sequence
- [x] Serial output capture
- [x] LED state verification

**Phase 6 Complete When:**
- [x] Boot prints banner via serial
- [x] LED toggles during boot
- [x] Full system integration tests passing (323 CPU component tests)

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

**Active Phase:** Phase 6 Complete! 🎉
**Current Task:** Ready for Phase 7 (Extended addressing modes)
**Tests Passing:** 1472 total (323 CPU component tests)
**Last Updated:** 2025-12-05

### Recent Accomplishments
- ✅ **Phase 6 Complete!** Boot sequence and full system integration
  - Fixed missing `pcWire` dependency in Boot Sequence tests
  - All 323 CPU component tests passing
  - CPU boots from reset vector, executes boot program, outputs "OK\n"
- ✅ **I/O Controller Complete!** Memory-mapped I/O at $8000-$800F
  - Serial TX/RX with status flags (tx_busy, rx_ready)
  - LED control register
  - 10 new tests for all I/O operations
- ✅ **Boot Program Created!** `boot_minimal.pulse`
  - Assembles to ROM with reset vector at $FFFC
  - Uses only 28 implemented instructions
  - Prints "OK\n" to serial and toggles LED
- ✅ **Phase 5 Complete!** ROM-based system architecture
  - Address decoder routes all memory regions correctly
  - Reset vector reads from $FFFC/$FFFD
  - 23-state machine with 3-state reset sequence (20→21→22→0)
  - Fixed DFF race condition with registered reset_hi value
- ✅ **PHA/PLA Complete!** Stack push/pull for A register - 10 tests (26 total instructions!)
  - Added Stack Pointer (SP) register, initialized to 0xFF on reset
  - Proper 6502 semantics: PHA writes then decrements, PLA increments then reads
  - Fixed simulator timing: memory writes use pre-clock-edge values
  - 12-state machine with separate PUSH, PUSH_DEC, PULL_INC, PULL_READ states
- ✅ **Transfer Instructions Complete!** TAX, TAY, TXA, TYA - 16 tests
- ✅ **Y Register Complete!** LDY, STY, INY, DEY - 16 tests
- ✅ **Phase 4.1 Complete!** Logic instructions (AND, ORA, EOR) - 16 tests
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
