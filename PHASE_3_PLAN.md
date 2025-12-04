# Phase 3: Instruction Set Expansion

**Goal**: Expand from 4 to 10+ instructions with ALU, flags, and X register

**Current State**: cpu_minimal.wire has 4 instructions (LDA, STA, JMP, HLT) - 1199/1199 tests passing

---

## Phase 3.1: Foundation (Target: 7 instructions)

### New Components Needed:
1. **X Register** - 8-bit register (like A register)
2. **Flag Register** - 4 bits initially (C, Z, N, V)
3. **ALU Integration** - Already have alu8.wire, need to wire it up
4. **Relative Addressing** - For branches (PC + signed offset)

### Instructions to Add (3 new):

| Instruction | Opcode | Bytes | Description | Priority |
|-------------|--------|-------|-------------|----------|
| LDX #imm    | 0xA2   | 2     | Load X with immediate | HIGH |
| ADC #imm    | 0x69   | 2     | Add with carry to A | HIGH |
| BEQ rel     | 0xF0   | 2     | Branch if Z=1 | HIGH |

**Total after 3.1**: 7 instructions (4 existing + 3 new)

### State Machine Changes:
- Add FETCH_REL state for relative addressing
- Add EXEC_ADC state for ALU operations
- Modify DECODE to handle new instruction types

### Decoder Changes:
- Add detection for 0xA2 (LDX)
- Add detection for 0x69 (ADC)
- Add detection for 0xF0 (BEQ)
- Add output signals: `is_ldx`, `is_adc`, `is_beq`, `needs_rel`

---

## Phase 3.2: Extended Operations (Target: 10 instructions)

### Instructions to Add (3 more):

| Instruction | Opcode | Bytes | Description |
|-------------|--------|-------|-------------|
| STX $addr   | 0x8E   | 3     | Store X to memory |
| SBC #imm    | 0xE9   | 2     | Subtract with carry from A |
| BNE rel     | 0xD0   | 2     | Branch if Z=0 |

**Total after 3.2**: 10 instructions

### Additional Features:
- Full flag support (C, Z, N, V)
- Subtraction with borrow
- Both conditional branches (equal/not equal)

---

## Phase 3.3: Polish & Optimization (Target: 12-13 instructions)

### Optional Additions:

| Instruction | Opcode | Bytes | Description |
|-------------|--------|-------|-------------|
| CMP #imm    | 0xC9   | 2     | Compare A (set flags, don't store) |
| INX         | 0xE8   | 1     | Increment X |
| DEX         | 0xCA   | 1     | Decrement X |

---

## Implementation Strategy

### Step 1: X Register (Simplest)
- Copy A register pattern
- Add x_out output
- Add register8 for X with appropriate load signal
- Test LDX #imm (should be very similar to LDA #imm)

### Step 2: Flag Register
- Create 4-bit flag register (C, Z, N, V)
- Wire ALU flag outputs to register
- Add flag_load signal
- Test flag setting/clearing

### Step 3: ALU Integration
- Wire ALU into datapath
- Add alu_result:8 and alu_flags:4
- Mux between alu_result and data_in for A register load
- Test ADC #imm

### Step 4: Relative Addressing
- Add signed_offset:8 input
- Add branch_offset:16 calculation (sign-extend + add to PC)
- Add FETCH_REL state for loading offset
- Add branch_taken signal from flags
- Test BEQ rel

### Step 5: Complete Set
- Add remaining instructions one by one
- Test each thoroughly
- Ensure all state transitions work

---

## Testing Strategy

For each new instruction:
1. Basic functionality test (does it work at all?)
2. Edge cases (0x00, 0xFF, boundary conditions)
3. Flag setting tests (correct flags after operation)
4. Integration tests (multiple instructions in sequence)
5. State machine tests (correct state transitions)

Target: ~150-200 tests total by end of Phase 3

---

## Success Criteria

Phase 3.1 Complete:
- [ ] 7 instructions working
- [ ] X register operations (LDX)
- [ ] Basic arithmetic (ADC)
- [ ] Basic branching (BEQ)
- [ ] ~130-150 tests passing

Phase 3.2 Complete:
- [ ] 10 instructions working
- [ ] Full arithmetic (ADC, SBC)
- [ ] Both branches (BEQ, BNE)
- [ ] ~150-180 tests passing

Phase 3.3 Complete:
- [ ] 12-13 instructions working
- [ ] Comparison (CMP)
- [ ] Register inc/dec (INX, DEX)
- [ ] ~180-200 tests passing
