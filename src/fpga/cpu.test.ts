import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CPU, SimpleIO, CPUState, IOHandler } from './cpu'
import { createMemory, VECTORS, IO_PORTS, MEMORY_MAP } from './memory'
import { assemble } from '../pulse/assembler'

describe('CPU', () => {
  let memory: Uint8Array
  let io: SimpleIO
  let cpu: CPU

  beforeEach(() => {
    memory = createMemory()
    io = new SimpleIO()
    cpu = new CPU(memory, io)
  })

  // Helper to load program and set reset vector
  const loadProgram = (bytes: number[], origin: number = 0x0200) => {
    for (let i = 0; i < bytes.length; i++) {
      memory[origin + i] = bytes[i]
    }
    // Set reset vector
    memory[VECTORS.RESET] = origin & 0xFF
    memory[VECTORS.RESET + 1] = (origin >> 8) & 0xFF
  }

  // Helper to assemble and load source
  const loadSource = (source: string) => {
    const result = assemble(source)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Copy binary to memory
    for (let i = 0; i < result.program.binary.length; i++) {
      memory[result.program.origin + i] = result.program.binary[i]
    }
  }

  // ============================================
  // INITIALIZATION AND RESET TESTS
  // ============================================

  describe('initialization', () => {
    it('starts with zeroed registers', () => {
      expect(cpu.state.A).toBe(0)
      expect(cpu.state.X).toBe(0)
      expect(cpu.state.Y).toBe(0)
    })

    it('starts with SP at 0xFF', () => {
      expect(cpu.state.SP).toBe(0xFF)
    })

    it('starts with PC at 0', () => {
      expect(cpu.state.PC).toBe(0)
    })

    it('starts not halted', () => {
      expect(cpu.state.halted).toBe(false)
    })

    it('starts with 0 cycles', () => {
      expect(cpu.state.cycles).toBe(0)
    })

    it('starts with correct flag defaults', () => {
      expect(cpu.state.flags.C).toBe(false)
      expect(cpu.state.flags.Z).toBe(false)
      expect(cpu.state.flags.I).toBe(true)  // Interrupt disable on by default
      expect(cpu.state.flags.D).toBe(false)
      expect(cpu.state.flags.B).toBe(false)
      expect(cpu.state.flags.V).toBe(false)
      expect(cpu.state.flags.N).toBe(false)
    })

    it('reads reset vector on reset', () => {
      loadProgram([0xEA], 0x0200)  // NOP
      cpu.reset()
      expect(cpu.state.PC).toBe(0x0200)
    })

    it('resets registers to initial state', () => {
      // Modify state
      cpu.state.A = 0x42
      cpu.state.X = 0x10
      cpu.state.Y = 0x20
      cpu.state.SP = 0x50
      cpu.state.flags.C = true
      cpu.state.flags.Z = true
      cpu.state.halted = true
      cpu.state.cycles = 100

      loadProgram([0xEA], 0x0300)
      cpu.reset()

      expect(cpu.state.A).toBe(0)
      expect(cpu.state.X).toBe(0)
      expect(cpu.state.Y).toBe(0)
      expect(cpu.state.SP).toBe(0xFF)
      expect(cpu.state.halted).toBe(false)
      expect(cpu.state.cycles).toBe(0)
    })

    it('reads reset vector from high memory address', () => {
      // Reset vector at $FFFC points to $8000
      memory[VECTORS.RESET] = 0x00
      memory[VECTORS.RESET + 1] = 0x80
      cpu.reset()
      expect(cpu.state.PC).toBe(0x8000)
    })

    it('handles reset vector pointing to zero page', () => {
      memory[VECTORS.RESET] = 0x10
      memory[VECTORS.RESET + 1] = 0x00
      cpu.reset()
      expect(cpu.state.PC).toBe(0x0010)
    })
  })

  // ============================================
  // LOAD INSTRUCTION TESTS
  // ============================================

  describe('LDA - Load Accumulator', () => {
    describe('immediate mode', () => {
      it('loads value into A', () => {
        loadProgram([0xA9, 0x42])  // LDA #$42
        cpu.reset()
        cpu.step()
        expect(cpu.state.A).toBe(0x42)
      })

      it('sets Z flag when zero', () => {
        loadProgram([0xA9, 0x00])  // LDA #0
        cpu.reset()
        cpu.step()
        expect(cpu.state.flags.Z).toBe(true)
        expect(cpu.state.flags.N).toBe(false)
      })

      it('sets N flag when negative (bit 7 set)', () => {
        loadProgram([0xA9, 0x80])  // LDA #$80
        cpu.reset()
        cpu.step()
        expect(cpu.state.flags.N).toBe(true)
        expect(cpu.state.flags.Z).toBe(false)
      })

      it('clears N flag when positive', () => {
        cpu.state.flags.N = true
        loadProgram([0xA9, 0x7F])  // LDA #$7F
        cpu.reset()
        cpu.step()
        expect(cpu.state.flags.N).toBe(false)
      })

      it('clears Z flag when non-zero', () => {
        cpu.state.flags.Z = true
        loadProgram([0xA9, 0x01])  // LDA #$01
        cpu.reset()
        cpu.step()
        expect(cpu.state.flags.Z).toBe(false)
      })

      it('loads $FF correctly', () => {
        loadProgram([0xA9, 0xFF])
        cpu.reset()
        cpu.step()
        expect(cpu.state.A).toBe(0xFF)
        expect(cpu.state.flags.N).toBe(true)
        expect(cpu.state.flags.Z).toBe(false)
      })

      it('does not affect other flags', () => {
        cpu.state.flags.C = true
        cpu.state.flags.V = true
        loadProgram([0xA9, 0x42])
        cpu.reset()
        cpu.state.flags.C = true
        cpu.state.flags.V = true
        cpu.step()
        expect(cpu.state.flags.C).toBe(true)
        expect(cpu.state.flags.V).toBe(true)
      })
    })

    describe('absolute mode', () => {
      it('loads value from memory', () => {
        memory[0x0300] = 0x55
        loadProgram([0xAD, 0x00, 0x03])  // LDA $0300
        cpu.reset()
        cpu.step()
        expect(cpu.state.A).toBe(0x55)
      })

      it('loads from zero page', () => {
        memory[0x0010] = 0xAB
        loadProgram([0xAD, 0x10, 0x00])  // LDA $0010
        cpu.reset()
        cpu.step()
        expect(cpu.state.A).toBe(0xAB)
      })

      it('loads from high memory', () => {
        memory[0xFE00] = 0x99
        loadProgram([0xAD, 0x00, 0xFE])  // LDA $FE00
        cpu.reset()
        cpu.step()
        expect(cpu.state.A).toBe(0x99)
      })

      it('sets N/Z flags correctly', () => {
        memory[0x0300] = 0x00
        loadProgram([0xAD, 0x00, 0x03])
        cpu.reset()
        cpu.step()
        expect(cpu.state.flags.Z).toBe(true)

        memory[0x0300] = 0x80
        loadProgram([0xAD, 0x00, 0x03])
        cpu.reset()
        cpu.step()
        expect(cpu.state.flags.N).toBe(true)
      })
    })
  })

  describe('LDX - Load X Register', () => {
    describe('immediate mode', () => {
      it('loads value into X', () => {
        loadProgram([0xA2, 0xFF])  // LDX #$FF
        cpu.reset()
        cpu.step()
        expect(cpu.state.X).toBe(0xFF)
      })

      it('sets Z flag when zero', () => {
        loadProgram([0xA2, 0x00])
        cpu.reset()
        cpu.step()
        expect(cpu.state.flags.Z).toBe(true)
      })

      it('sets N flag when negative', () => {
        loadProgram([0xA2, 0x80])
        cpu.reset()
        cpu.step()
        expect(cpu.state.flags.N).toBe(true)
      })

      it('does not modify A register', () => {
        cpu.state.A = 0x42
        loadProgram([0xA2, 0x10])
        cpu.reset()
        cpu.state.A = 0x42
        cpu.step()
        expect(cpu.state.A).toBe(0x42)
      })
    })

    describe('absolute mode', () => {
      it('loads value from memory', () => {
        memory[0x0400] = 0x77
        loadProgram([0xAE, 0x00, 0x04])  // LDX $0400
        cpu.reset()
        cpu.step()
        expect(cpu.state.X).toBe(0x77)
      })
    })
  })

  describe('LDY - Load Y Register', () => {
    describe('immediate mode', () => {
      it('loads value into Y', () => {
        loadProgram([0xA0, 0x10])  // LDY #$10
        cpu.reset()
        cpu.step()
        expect(cpu.state.Y).toBe(0x10)
      })

      it('sets Z flag when zero', () => {
        loadProgram([0xA0, 0x00])
        cpu.reset()
        cpu.step()
        expect(cpu.state.flags.Z).toBe(true)
      })

      it('sets N flag when negative', () => {
        loadProgram([0xA0, 0xFE])
        cpu.reset()
        cpu.step()
        expect(cpu.state.flags.N).toBe(true)
      })
    })

    describe('absolute mode', () => {
      it('loads value from memory', () => {
        memory[0x0500] = 0x88
        loadProgram([0xAC, 0x00, 0x05])  // LDY $0500
        cpu.reset()
        cpu.step()
        expect(cpu.state.Y).toBe(0x88)
      })
    })
  })

  // ============================================
  // STORE INSTRUCTION TESTS
  // ============================================

  describe('STA - Store Accumulator', () => {
    it('stores A to memory', () => {
      loadProgram([0xA9, 0x42, 0x8D, 0x00, 0x03])  // LDA #$42; STA $0300
      cpu.reset()
      cpu.step()  // LDA
      cpu.step()  // STA
      expect(memory[0x0300]).toBe(0x42)
    })

    it('stores to zero page', () => {
      loadProgram([0xA9, 0xAB, 0x8D, 0x50, 0x00])  // LDA #$AB; STA $0050
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(memory[0x0050]).toBe(0xAB)
    })

    it('does not modify flags', () => {
      cpu.state.flags.Z = true
      cpu.state.flags.N = true
      loadProgram([0xA9, 0x42, 0x8D, 0x00, 0x03])
      cpu.reset()
      cpu.state.flags.Z = true
      cpu.state.flags.N = true
      cpu.step()
      cpu.step()
      expect(cpu.state.flags.Z).toBe(false)  // LDA cleared it, STA doesn't change it
    })

    it('stores to I/O port', () => {
      loadProgram([0xA9, 0x01, 0x8D, 0x30, 0xF0])  // LDA #1; STA $F030 (LED)
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(io.ledState).toBe(1)
    })

    it('stores zero correctly', () => {
      memory[0x0300] = 0xFF
      loadProgram([0xA9, 0x00, 0x8D, 0x00, 0x03])  // LDA #0; STA $0300
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(memory[0x0300]).toBe(0x00)
    })
  })

  describe('STX - Store X Register', () => {
    it('stores X to memory', () => {
      loadProgram([0xA2, 0x33, 0x8E, 0x00, 0x03])  // LDX #$33; STX $0300
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(memory[0x0300]).toBe(0x33)
    })
  })

  describe('STY - Store Y Register', () => {
    it('stores Y to memory', () => {
      loadProgram([0xA0, 0x44, 0x8C, 0x00, 0x03])  // LDY #$44; STY $0300
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(memory[0x0300]).toBe(0x44)
    })
  })

  // ============================================
  // INCREMENT/DECREMENT TESTS
  // ============================================

  describe('INX - Increment X', () => {
    it('increments X by 1', () => {
      loadProgram([0xA2, 0x10, 0xE8])  // LDX #$10; INX
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.X).toBe(0x11)
    })

    it('wraps from 255 to 0', () => {
      loadProgram([0xA2, 0xFF, 0xE8])  // LDX #$FF; INX
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.X).toBe(0x00)
      expect(cpu.state.flags.Z).toBe(true)
      expect(cpu.state.flags.N).toBe(false)
    })

    it('sets N flag at $80', () => {
      loadProgram([0xA2, 0x7F, 0xE8])  // LDX #$7F; INX
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.X).toBe(0x80)
      expect(cpu.state.flags.N).toBe(true)
    })

    it('clears Z flag when non-zero', () => {
      loadProgram([0xA2, 0x00, 0xE8])  // LDX #$00; INX
      cpu.reset()
      cpu.step()  // LDX sets Z
      expect(cpu.state.flags.Z).toBe(true)
      cpu.step()  // INX clears Z
      expect(cpu.state.flags.Z).toBe(false)
    })
  })

  describe('INY - Increment Y', () => {
    it('increments Y by 1', () => {
      loadProgram([0xA0, 0x20, 0xC8])  // LDY #$20; INY
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.Y).toBe(0x21)
    })

    it('wraps from 255 to 0', () => {
      loadProgram([0xA0, 0xFF, 0xC8])  // LDY #$FF; INY
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.Y).toBe(0x00)
      expect(cpu.state.flags.Z).toBe(true)
    })
  })

  describe('DEX - Decrement X', () => {
    it('decrements X by 1', () => {
      loadProgram([0xA2, 0x10, 0xCA])  // LDX #$10; DEX
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.X).toBe(0x0F)
    })

    it('wraps from 0 to 255', () => {
      loadProgram([0xA2, 0x00, 0xCA])  // LDX #0; DEX
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.X).toBe(0xFF)
      expect(cpu.state.flags.N).toBe(true)
      expect(cpu.state.flags.Z).toBe(false)
    })

    it('sets Z flag when reaching zero', () => {
      loadProgram([0xA2, 0x01, 0xCA])  // LDX #1; DEX
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.X).toBe(0x00)
      expect(cpu.state.flags.Z).toBe(true)
      expect(cpu.state.flags.N).toBe(false)
    })

    it('clears N flag at $7F', () => {
      loadProgram([0xA2, 0x80, 0xCA])  // LDX #$80; DEX
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.X).toBe(0x7F)
      expect(cpu.state.flags.N).toBe(false)
    })
  })

  describe('DEY - Decrement Y', () => {
    it('decrements Y by 1', () => {
      loadProgram([0xA0, 0x10, 0x88])  // LDY #$10; DEY
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.Y).toBe(0x0F)
    })

    it('wraps from 0 to 255', () => {
      loadProgram([0xA0, 0x00, 0x88])  // LDY #0; DEY
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.Y).toBe(0xFF)
    })
  })

  // ============================================
  // ARITHMETIC TESTS (ADC, SBC)
  // ============================================

  describe('ADC - Add with Carry', () => {
    it('adds without carry', () => {
      loadProgram([0x18, 0xA9, 0x10, 0x69, 0x05])  // CLC; LDA #$10; ADC #$05
      cpu.reset()
      cpu.step()  // CLC
      cpu.step()  // LDA
      cpu.step()  // ADC
      expect(cpu.state.A).toBe(0x15)
      expect(cpu.state.flags.C).toBe(false)
    })

    it('adds with existing carry', () => {
      loadProgram([0x38, 0xA9, 0x10, 0x69, 0x05])  // SEC; LDA #$10; ADC #$05
      cpu.reset()
      cpu.step()  // SEC
      cpu.step()  // LDA
      cpu.step()  // ADC
      expect(cpu.state.A).toBe(0x16)  // 0x10 + 0x05 + 1
    })

    it('sets carry on overflow past 255', () => {
      loadProgram([0x18, 0xA9, 0xFF, 0x69, 0x02])  // CLC; LDA #$FF; ADC #$02
      cpu.reset()
      cpu.step()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x01)  // (0xFF + 0x02) & 0xFF
      expect(cpu.state.flags.C).toBe(true)
    })

    it('clears carry when no overflow', () => {
      loadProgram([0x38, 0xA9, 0x10, 0x69, 0x05])  // SEC; LDA #$10; ADC #$05
      cpu.reset()
      cpu.step()
      cpu.step()
      cpu.step()
      expect(cpu.state.flags.C).toBe(false)
    })

    it('sets Z flag when result is zero', () => {
      loadProgram([0x18, 0xA9, 0x00, 0x69, 0x00])  // CLC; LDA #0; ADC #0
      cpu.reset()
      cpu.step()
      cpu.step()
      cpu.step()
      expect(cpu.state.flags.Z).toBe(true)
    })

    it('sets N flag when result has bit 7 set', () => {
      loadProgram([0x18, 0xA9, 0x40, 0x69, 0x50])  // CLC; LDA #$40; ADC #$50
      cpu.reset()
      cpu.step()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x90)
      expect(cpu.state.flags.N).toBe(true)
    })

    it('sets overflow flag for positive + positive = negative', () => {
      loadProgram([0x18, 0xA9, 0x50, 0x69, 0x50])  // CLC; LDA #$50; ADC #$50
      cpu.reset()
      cpu.step()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0xA0)  // Should be 160, but interpreted as -96
      expect(cpu.state.flags.V).toBe(true)  // Overflow: pos + pos = neg
    })

    it('sets overflow flag for negative + negative = positive', () => {
      loadProgram([0x18, 0xA9, 0x90, 0x69, 0x90])  // CLC; LDA #$90; ADC #$90
      cpu.reset()
      cpu.step()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x20)  // -112 + -112 = 32 with overflow
      expect(cpu.state.flags.V).toBe(true)
      expect(cpu.state.flags.C).toBe(true)
    })

    it('clears overflow when signs match result', () => {
      loadProgram([0x18, 0xA9, 0x10, 0x69, 0x20])  // CLC; LDA #$10; ADC #$20
      cpu.reset()
      cpu.step()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x30)
      expect(cpu.state.flags.V).toBe(false)
    })

    it('handles $FF + $FF with carry', () => {
      loadProgram([0x38, 0xA9, 0xFF, 0x69, 0xFF])  // SEC; LDA #$FF; ADC #$FF
      cpu.reset()
      cpu.step()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0xFF)  // 255 + 255 + 1 = 511 = 0x1FF, masked to 0xFF
      expect(cpu.state.flags.C).toBe(true)
    })
  })

  describe('SBC - Subtract with Carry', () => {
    it('subtracts with carry set (no borrow)', () => {
      loadProgram([0x38, 0xA9, 0x10, 0xE9, 0x05])  // SEC; LDA #$10; SBC #$05
      cpu.reset()
      cpu.step()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x0B)  // 16 - 5 = 11
      expect(cpu.state.flags.C).toBe(true)  // No borrow needed
    })

    it('subtracts with carry clear (borrow)', () => {
      loadProgram([0x18, 0xA9, 0x10, 0xE9, 0x05])  // CLC; LDA #$10; SBC #$05
      cpu.reset()
      cpu.step()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x0A)  // 16 - 5 - 1 = 10
    })

    it('clears carry when borrow occurs', () => {
      loadProgram([0x38, 0xA9, 0x05, 0xE9, 0x10])  // SEC; LDA #$05; SBC #$10
      cpu.reset()
      cpu.step()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0xF5)  // Wrapped around
      expect(cpu.state.flags.C).toBe(false)  // Borrow occurred
      expect(cpu.state.flags.N).toBe(true)
    })

    it('sets carry when no borrow', () => {
      loadProgram([0x38, 0xA9, 0x50, 0xE9, 0x10])  // SEC; LDA #$50; SBC #$10
      cpu.reset()
      cpu.step()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x40)
      expect(cpu.state.flags.C).toBe(true)
    })

    it('sets Z flag when result is zero', () => {
      loadProgram([0x38, 0xA9, 0x10, 0xE9, 0x10])  // SEC; LDA #$10; SBC #$10
      cpu.reset()
      cpu.step()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x00)
      expect(cpu.state.flags.Z).toBe(true)
    })

    it('sets overflow for positive - negative = negative', () => {
      loadProgram([0x38, 0xA9, 0x50, 0xE9, 0xB0])  // SEC; LDA #$50; SBC #$B0
      cpu.reset()
      cpu.step()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0xA0)  // 80 - (-80) = 160, but wraps negative
      expect(cpu.state.flags.V).toBe(true)
    })

    it('sets overflow for negative - positive = positive', () => {
      loadProgram([0x38, 0xA9, 0x90, 0xE9, 0x50])  // SEC; LDA #$90; SBC #$50
      cpu.reset()
      cpu.step()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x40)  // -112 - 80 = -192, but wraps to 64
      expect(cpu.state.flags.V).toBe(true)
    })
  })

  // ============================================
  // LOGICAL OPERATION TESTS
  // ============================================

  describe('AND - Logical AND', () => {
    it('performs bitwise AND', () => {
      loadProgram([0xA9, 0xFF, 0x29, 0x0F])  // LDA #$FF; AND #$0F
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x0F)
    })

    it('ANDing with zero gives zero', () => {
      loadProgram([0xA9, 0xFF, 0x29, 0x00])  // LDA #$FF; AND #$00
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x00)
      expect(cpu.state.flags.Z).toBe(true)
    })

    it('ANDing with same value preserves value', () => {
      loadProgram([0xA9, 0xAA, 0x29, 0xAA])  // LDA #$AA; AND #$AA
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0xAA)
    })

    it('sets N flag correctly', () => {
      loadProgram([0xA9, 0xFF, 0x29, 0x80])  // LDA #$FF; AND #$80
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x80)
      expect(cpu.state.flags.N).toBe(true)
    })
  })

  describe('ORA - Logical OR', () => {
    it('performs bitwise OR', () => {
      loadProgram([0xA9, 0xF0, 0x09, 0x0F])  // LDA #$F0; ORA #$0F
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0xFF)
    })

    it('ORing with zero preserves value', () => {
      loadProgram([0xA9, 0x42, 0x09, 0x00])  // LDA #$42; ORA #$00
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x42)
    })

    it('ORing zero with zero gives zero', () => {
      loadProgram([0xA9, 0x00, 0x09, 0x00])  // LDA #$00; ORA #$00
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x00)
      expect(cpu.state.flags.Z).toBe(true)
    })

    it('sets N flag when result is negative', () => {
      loadProgram([0xA9, 0x00, 0x09, 0x80])  // LDA #$00; ORA #$80
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.flags.N).toBe(true)
    })
  })

  describe('EOR - Logical XOR', () => {
    it('performs bitwise XOR', () => {
      loadProgram([0xA9, 0xFF, 0x49, 0x0F])  // LDA #$FF; EOR #$0F
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0xF0)
    })

    it('XORing with self gives zero', () => {
      loadProgram([0xA9, 0xAA, 0x49, 0xAA])  // LDA #$AA; EOR #$AA
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x00)
      expect(cpu.state.flags.Z).toBe(true)
    })

    it('XORing with $FF inverts bits', () => {
      loadProgram([0xA9, 0x55, 0x49, 0xFF])  // LDA #$55; EOR #$FF
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0xAA)
    })

    it('XORing with zero preserves value', () => {
      loadProgram([0xA9, 0x42, 0x49, 0x00])  // LDA #$42; EOR #$00
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x42)
    })
  })

  // ============================================
  // COMPARE TESTS
  // ============================================

  describe('CMP - Compare Accumulator', () => {
    it('sets Z and C when equal', () => {
      loadProgram([0xA9, 0x10, 0xC9, 0x10])  // LDA #$10; CMP #$10
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.flags.Z).toBe(true)
      expect(cpu.state.flags.C).toBe(true)  // A >= value
    })

    it('sets C when A > value', () => {
      loadProgram([0xA9, 0x20, 0xC9, 0x10])  // LDA #$20; CMP #$10
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.flags.Z).toBe(false)
      expect(cpu.state.flags.C).toBe(true)
    })

    it('clears C when A < value', () => {
      loadProgram([0xA9, 0x10, 0xC9, 0x20])  // LDA #$10; CMP #$20
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.flags.Z).toBe(false)
      expect(cpu.state.flags.C).toBe(false)
    })

    it('does not modify A', () => {
      loadProgram([0xA9, 0x42, 0xC9, 0x10])  // LDA #$42; CMP #$10
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x42)
    })

    it('sets N flag when result is negative', () => {
      loadProgram([0xA9, 0x05, 0xC9, 0x10])  // LDA #$05; CMP #$10
      cpu.reset()
      cpu.step()
      cpu.step()
      // 0x05 - 0x10 = -11 = 0xF5, which has bit 7 set
      expect(cpu.state.flags.N).toBe(true)
    })

    it('compares $00 with $FF correctly', () => {
      loadProgram([0xA9, 0x00, 0xC9, 0xFF])  // LDA #$00; CMP #$FF
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.flags.C).toBe(false)
      expect(cpu.state.flags.Z).toBe(false)
    })

    it('compares $FF with $00 correctly', () => {
      loadProgram([0xA9, 0xFF, 0xC9, 0x00])  // LDA #$FF; CMP #$00
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.flags.C).toBe(true)
      expect(cpu.state.flags.Z).toBe(false)
    })
  })

  describe('CPX - Compare X Register', () => {
    it('sets flags correctly', () => {
      loadProgram([0xA2, 0x20, 0xE0, 0x10])  // LDX #$20; CPX #$10
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.flags.C).toBe(true)
      expect(cpu.state.flags.Z).toBe(false)
    })

    it('does not modify X', () => {
      loadProgram([0xA2, 0x42, 0xE0, 0x10])
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.X).toBe(0x42)
    })
  })

  describe('CPY - Compare Y Register', () => {
    it('sets flags correctly', () => {
      loadProgram([0xA0, 0x10, 0xC0, 0x10])  // LDY #$10; CPY #$10
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.flags.Z).toBe(true)
      expect(cpu.state.flags.C).toBe(true)
    })

    it('does not modify Y', () => {
      loadProgram([0xA0, 0x42, 0xC0, 0x10])
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.Y).toBe(0x42)
    })
  })

  // ============================================
  // BRANCH TESTS
  // ============================================

  describe('BEQ - Branch if Equal (Z=1)', () => {
    it('branches when Z=1', () => {
      loadProgram([0xA9, 0x00, 0xF0, 0x02, 0xA9, 0xFF, 0xA9, 0x42])
      // LDA #0; BEQ +2; LDA #$FF; LDA #$42
      cpu.reset()
      cpu.step()  // LDA #0, Z=1
      cpu.step()  // BEQ, should branch to LDA #$42
      expect(cpu.state.PC).toBe(0x0206)
    })

    it('does not branch when Z=0', () => {
      loadProgram([0xA9, 0x01, 0xF0, 0x02, 0xA9, 0xFF])
      // LDA #1; BEQ +2; LDA #$FF
      cpu.reset()
      cpu.step()  // LDA #1, Z=0
      cpu.step()  // BEQ, should not branch
      expect(cpu.state.PC).toBe(0x0204)
    })

    it('handles backward branch', () => {
      loadProgram([0xA9, 0x00, 0xF0, 0xFC])  // LDA #0; BEQ -4
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.PC).toBe(0x0200)  // Back to start
    })

    it('handles branch offset of 0', () => {
      loadProgram([0xA9, 0x00, 0xF0, 0x00, 0xA9, 0x42])
      // LDA #0; BEQ +0; LDA #$42
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.PC).toBe(0x0204)  // Just continues
    })

    it('handles maximum forward branch (+127)', () => {
      loadProgram([0xA9, 0x00, 0xF0, 0x7F])  // BEQ +127
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.PC).toBe(0x0204 + 0x7F)
    })

    it('handles maximum backward branch (-128)', () => {
      loadProgram([0xA9, 0x00, 0xF0, 0x80], 0x1000)  // BEQ -128
      cpu.reset()
      cpu.step()
      cpu.step()
      // PC after fetch = 0x1004, then -128 = 0x0F84
      expect(cpu.state.PC).toBe(0x1004 - 128)
    })
  })

  describe('BNE - Branch if Not Equal (Z=0)', () => {
    it('branches when Z=0', () => {
      loadProgram([0xA2, 0x02, 0xCA, 0xD0, 0xFD])
      // LDX #2; DEX; BNE -3
      cpu.reset()
      cpu.step()  // LDX #2
      cpu.step()  // DEX, X=1, Z=0
      cpu.step()  // BNE, should branch back to DEX
      expect(cpu.state.PC).toBe(0x0202)
    })

    it('does not branch when Z=1', () => {
      loadProgram([0xA2, 0x01, 0xCA, 0xD0, 0xFD])
      // LDX #1; DEX; BNE -3
      cpu.reset()
      cpu.step()  // LDX #1
      cpu.step()  // DEX, X=0, Z=1
      cpu.step()  // BNE, should not branch
      expect(cpu.state.PC).toBe(0x0205)
    })

    it('creates delay loop', () => {
      loadProgram([0xA2, 0x03, 0xCA, 0xD0, 0xFD, 0x02])
      // LDX #3; loop: DEX; BNE loop; HLT
      cpu.reset()
      cpu.run()
      expect(cpu.state.X).toBe(0)
      expect(cpu.state.halted).toBe(true)
    })
  })

  describe('BCC - Branch if Carry Clear', () => {
    it('branches when C=0', () => {
      loadProgram([0x18, 0x90, 0x02, 0xEA, 0xEA, 0x02])  // CLC; BCC +2; NOP; NOP; HLT
      cpu.reset()
      cpu.step()  // CLC
      cpu.step()  // BCC
      expect(cpu.state.PC).toBe(0x0205)
    })

    it('does not branch when C=1', () => {
      loadProgram([0x38, 0x90, 0x02, 0xEA, 0xEA])  // SEC; BCC +2; NOP; NOP
      cpu.reset()
      cpu.step()  // SEC
      cpu.step()  // BCC
      expect(cpu.state.PC).toBe(0x0203)
    })
  })

  describe('BCS - Branch if Carry Set', () => {
    it('branches when C=1', () => {
      loadProgram([0x38, 0xB0, 0x02, 0xEA, 0xEA])  // SEC; BCS +2; NOP; NOP
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.PC).toBe(0x0205)
    })

    it('does not branch when C=0', () => {
      loadProgram([0x18, 0xB0, 0x02, 0xEA, 0xEA])  // CLC; BCS +2; NOP; NOP
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.PC).toBe(0x0203)
    })
  })

  // ============================================
  // JUMP TESTS
  // ============================================

  describe('JMP - Jump', () => {
    it('jumps to absolute address', () => {
      loadProgram([0x4C, 0x10, 0x02])  // JMP $0210
      cpu.reset()
      cpu.step()
      expect(cpu.state.PC).toBe(0x0210)
    })

    it('can jump backward', () => {
      loadProgram([0x4C, 0x00, 0x02])  // JMP $0200
      cpu.reset()
      cpu.step()
      expect(cpu.state.PC).toBe(0x0200)
    })

    it('can jump to zero page', () => {
      loadProgram([0x4C, 0x10, 0x00])  // JMP $0010
      cpu.reset()
      cpu.step()
      expect(cpu.state.PC).toBe(0x0010)
    })

    it('can jump to high memory', () => {
      loadProgram([0x4C, 0x00, 0xFF])  // JMP $FF00
      cpu.reset()
      cpu.step()
      expect(cpu.state.PC).toBe(0xFF00)
    })

    it('does not modify any flags', () => {
      cpu.state.flags.Z = true
      cpu.state.flags.C = true
      cpu.state.flags.N = true
      loadProgram([0x4C, 0x10, 0x02])
      cpu.reset()
      cpu.state.flags.Z = true
      cpu.state.flags.C = true
      cpu.state.flags.N = true
      cpu.step()
      expect(cpu.state.flags.Z).toBe(true)
      expect(cpu.state.flags.C).toBe(true)
      expect(cpu.state.flags.N).toBe(true)
    })
  })

  describe('JSR - Jump to Subroutine', () => {
    it('jumps to address and pushes return address', () => {
      loadProgram([0x20, 0x00, 0x03])  // JSR $0300
      cpu.reset()
      cpu.step()
      expect(cpu.state.PC).toBe(0x0300)
      expect(cpu.state.SP).toBe(0xFD)  // Pushed 2 bytes
    })

    it('pushes PC-1 to stack', () => {
      loadProgram([0x20, 0x00, 0x03])  // JSR $0300
      cpu.reset()
      cpu.step()
      // Stack should contain return address - 1 = 0x0202
      const hi = memory[0x01FF]
      const lo = memory[0x01FE]
      expect(hi).toBe(0x02)
      expect(lo).toBe(0x02)
    })
  })

  describe('RTS - Return from Subroutine', () => {
    it('returns to correct address', () => {
      loadProgram([
        0x20, 0x06, 0x02,  // JSR $0206
        0xEA,              // NOP
        0x02,              // HLT
        0x00,              // padding
        0xA9, 0x42,        // LDA #$42
        0x60,              // RTS
      ])
      cpu.reset()
      cpu.step()  // JSR
      expect(cpu.state.PC).toBe(0x0206)
      cpu.step()  // LDA
      cpu.step()  // RTS
      expect(cpu.state.PC).toBe(0x0203)  // After JSR operand
    })

    it('restores stack pointer', () => {
      loadProgram([
        0x20, 0x05, 0x02,  // JSR $0205
        0x02,              // HLT
        0x00,              // padding
        0x60,              // RTS
      ])
      cpu.reset()
      const initialSP = cpu.state.SP
      cpu.step()  // JSR
      expect(cpu.state.SP).toBe(initialSP - 2)
      cpu.step()  // RTS
      expect(cpu.state.SP).toBe(initialSP)
    })

    it('handles nested calls', () => {
      // Main calls Sub1, Sub1 calls Sub2, both return
      memory[0x0300] = 0x20  // JSR $0400
      memory[0x0301] = 0x00
      memory[0x0302] = 0x04
      memory[0x0303] = 0x60  // RTS

      memory[0x0400] = 0xA9  // LDA #$99
      memory[0x0401] = 0x99
      memory[0x0402] = 0x60  // RTS

      loadProgram([0x20, 0x00, 0x03, 0x02])  // JSR $0300; HLT
      cpu.reset()
      cpu.step()  // JSR $0300
      expect(cpu.state.PC).toBe(0x0300)
      cpu.step()  // JSR $0400
      expect(cpu.state.PC).toBe(0x0400)
      cpu.step()  // LDA #$99
      expect(cpu.state.A).toBe(0x99)
      cpu.step()  // RTS (from Sub2)
      expect(cpu.state.PC).toBe(0x0303)
      cpu.step()  // RTS (from Sub1)
      expect(cpu.state.PC).toBe(0x0203)
    })
  })

  // ============================================
  // TRANSFER TESTS
  // ============================================

  describe('TAX - Transfer A to X', () => {
    it('copies A to X', () => {
      loadProgram([0xA9, 0x42, 0xAA])  // LDA #$42; TAX
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.X).toBe(0x42)
    })

    it('does not modify A', () => {
      loadProgram([0xA9, 0x42, 0xAA])
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x42)
    })

    it('sets Z flag when zero', () => {
      loadProgram([0xA9, 0x00, 0xAA])  // LDA #$00; TAX
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.flags.Z).toBe(true)
    })

    it('sets N flag when negative', () => {
      loadProgram([0xA9, 0x80, 0xAA])  // LDA #$80; TAX
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.flags.N).toBe(true)
    })
  })

  describe('TAY - Transfer A to Y', () => {
    it('copies A to Y', () => {
      loadProgram([0xA9, 0x33, 0xA8])  // LDA #$33; TAY
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.Y).toBe(0x33)
    })
  })

  describe('TXA - Transfer X to A', () => {
    it('copies X to A', () => {
      loadProgram([0xA2, 0x42, 0x8A])  // LDX #$42; TXA
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x42)
    })
  })

  describe('TYA - Transfer Y to A', () => {
    it('copies Y to A', () => {
      loadProgram([0xA0, 0x55, 0x98])  // LDY #$55; TYA
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x55)
    })
  })

  describe('TXS - Transfer X to SP', () => {
    it('copies X to SP', () => {
      loadProgram([0xA2, 0x80, 0x9A])  // LDX #$80; TXS
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.SP).toBe(0x80)
    })

    it('does not affect flags', () => {
      loadProgram([0xA2, 0x00, 0x9A])  // LDX #$00; TXS
      cpu.reset()
      cpu.step()
      cpu.state.flags.Z = false  // Clear the Z flag set by LDX
      cpu.step()  // TXS
      expect(cpu.state.flags.Z).toBe(false)  // Should not be modified
    })
  })

  describe('TSX - Transfer SP to X', () => {
    it('copies SP to X', () => {
      loadProgram([0xBA])  // TSX
      cpu.reset()
      cpu.step()
      expect(cpu.state.X).toBe(0xFF)  // Initial SP
    })

    it('sets flags based on SP value', () => {
      cpu.state.SP = 0x00
      loadProgram([0xBA])
      cpu.reset()
      cpu.state.SP = 0x00
      cpu.step()
      expect(cpu.state.X).toBe(0x00)
      expect(cpu.state.flags.Z).toBe(true)
    })
  })

  // ============================================
  // STACK TESTS
  // ============================================

  describe('PHA - Push Accumulator', () => {
    it('pushes A to stack', () => {
      loadProgram([0xA9, 0x42, 0x48])  // LDA #$42; PHA
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(memory[0x01FF]).toBe(0x42)
    })

    it('decrements SP', () => {
      loadProgram([0x48])  // PHA
      cpu.reset()
      const initialSP = cpu.state.SP
      cpu.step()
      expect(cpu.state.SP).toBe(initialSP - 1)
    })

    it('does not affect flags', () => {
      loadProgram([0xA9, 0x00, 0x48])  // LDA #$00; PHA
      cpu.reset()
      cpu.step()  // LDA sets Z
      cpu.state.flags.Z = false
      cpu.step()  // PHA should not affect flags
      expect(cpu.state.flags.Z).toBe(false)
    })

    it('wraps SP from $00 to $FF', () => {
      loadProgram([0x48])  // PHA
      cpu.reset()
      cpu.state.SP = 0x00
      cpu.step()
      expect(cpu.state.SP).toBe(0xFF)
    })
  })

  describe('PLA - Pull Accumulator', () => {
    it('pulls value from stack to A', () => {
      loadProgram([0xA9, 0x42, 0x48, 0xA9, 0x00, 0x68])
      // LDA #$42; PHA; LDA #0; PLA
      cpu.reset()
      cpu.step()  // LDA
      cpu.step()  // PHA
      cpu.step()  // LDA #0
      expect(cpu.state.A).toBe(0)
      cpu.step()  // PLA
      expect(cpu.state.A).toBe(0x42)
    })

    it('increments SP', () => {
      memory[0x01FF] = 0x42
      loadProgram([0x68])  // PLA
      cpu.reset()
      cpu.state.SP = 0xFE
      cpu.step()
      expect(cpu.state.SP).toBe(0xFF)
    })

    it('sets Z flag when pulling zero', () => {
      memory[0x01FF] = 0x00
      loadProgram([0x68])  // PLA
      cpu.reset()
      cpu.state.SP = 0xFE
      cpu.step()
      expect(cpu.state.flags.Z).toBe(true)
    })

    it('sets N flag when pulling negative', () => {
      memory[0x01FF] = 0x80
      loadProgram([0x68])  // PLA
      cpu.reset()
      cpu.state.SP = 0xFE
      cpu.step()
      expect(cpu.state.flags.N).toBe(true)
    })

    it('wraps SP from $FF to $00', () => {
      memory[0x0100] = 0x42
      loadProgram([0x68])  // PLA
      cpu.reset()
      cpu.state.SP = 0xFF
      cpu.step()
      expect(cpu.state.SP).toBe(0x00)
      expect(cpu.state.A).toBe(0x42)
    })
  })

  describe('stack interactions', () => {
    it('LIFO order is correct', () => {
      loadProgram([
        0xA9, 0x11, 0x48,  // LDA #$11; PHA
        0xA9, 0x22, 0x48,  // LDA #$22; PHA
        0xA9, 0x33, 0x48,  // LDA #$33; PHA
        0x68,              // PLA
        0x68,              // PLA
        0x68,              // PLA
      ])
      cpu.reset()
      cpu.step(); cpu.step()  // Push 0x11
      cpu.step(); cpu.step()  // Push 0x22
      cpu.step(); cpu.step()  // Push 0x33
      cpu.step()              // PLA
      expect(cpu.state.A).toBe(0x33)
      cpu.step()              // PLA
      expect(cpu.state.A).toBe(0x22)
      cpu.step()              // PLA
      expect(cpu.state.A).toBe(0x11)
    })
  })

  // ============================================
  // FLAG INSTRUCTION TESTS
  // ============================================

  describe('SEC - Set Carry', () => {
    it('sets carry flag', () => {
      loadProgram([0x38])  // SEC
      cpu.reset()
      expect(cpu.state.flags.C).toBe(false)
      cpu.step()
      expect(cpu.state.flags.C).toBe(true)
    })

    it('does not affect other flags', () => {
      loadProgram([0x38])
      cpu.reset()
      cpu.state.flags.Z = true
      cpu.state.flags.N = true
      cpu.step()
      expect(cpu.state.flags.Z).toBe(true)
      expect(cpu.state.flags.N).toBe(true)
    })
  })

  describe('CLC - Clear Carry', () => {
    it('clears carry flag', () => {
      loadProgram([0x18])  // CLC
      cpu.reset()
      cpu.state.flags.C = true
      cpu.step()
      expect(cpu.state.flags.C).toBe(false)
    })
  })

  describe('SEI - Set Interrupt Disable', () => {
    it('sets interrupt disable flag', () => {
      loadProgram([0x78])  // SEI
      cpu.reset()
      cpu.state.flags.I = false
      cpu.step()
      expect(cpu.state.flags.I).toBe(true)
    })
  })

  describe('CLI - Clear Interrupt Disable', () => {
    it('clears interrupt disable flag', () => {
      loadProgram([0x58])  // CLI
      cpu.reset()
      expect(cpu.state.flags.I).toBe(true)
      cpu.step()
      expect(cpu.state.flags.I).toBe(false)
    })
  })

  // ============================================
  // NOP AND HALT TESTS
  // ============================================

  describe('NOP - No Operation', () => {
    it('does nothing but advance PC', () => {
      loadProgram([0xEA, 0xEA, 0xEA])  // NOP; NOP; NOP
      cpu.reset()
      const initialPC = cpu.state.PC
      cpu.step()
      expect(cpu.state.PC).toBe(initialPC + 1)
    })

    it('does not modify any registers or flags', () => {
      loadProgram([0xA9, 0x42, 0xEA])  // LDA #$42; NOP
      cpu.reset()
      cpu.step()  // LDA
      const state = { ...cpu.state }
      cpu.step()  // NOP
      expect(cpu.state.A).toBe(state.A)
      expect(cpu.state.X).toBe(state.X)
      expect(cpu.state.Y).toBe(state.Y)
    })
  })

  describe('BRK - Break', () => {
    it('halts CPU', () => {
      loadProgram([0x00])  // BRK
      cpu.reset()
      cpu.step()
      expect(cpu.state.halted).toBe(true)
    })
  })

  describe('HLT - Halt', () => {
    it('halts CPU', () => {
      loadProgram([0x02])  // HLT
      cpu.reset()
      cpu.step()
      expect(cpu.state.halted).toBe(true)
    })
  })

  describe('unknown opcode', () => {
    it('halts CPU on unknown opcode', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      loadProgram([0xFF])  // Unknown opcode
      cpu.reset()
      cpu.step()
      expect(cpu.state.halted).toBe(true)
      consoleSpy.mockRestore()
    })
  })

  // ============================================
  // CYCLE COUNTING TESTS
  // ============================================

  describe('cycle counting', () => {
    it('increments cycle count each step', () => {
      loadProgram([0xEA, 0xEA, 0xEA, 0x02])  // NOP; NOP; NOP; HLT
      cpu.reset()
      expect(cpu.state.cycles).toBe(0)
      cpu.step()
      expect(cpu.state.cycles).toBe(1)
      cpu.step()
      expect(cpu.state.cycles).toBe(2)
      cpu.step()
      expect(cpu.state.cycles).toBe(3)
    })

    it('does not count cycles when halted', () => {
      loadProgram([0x02])  // HLT
      cpu.reset()
      cpu.step()  // Execute HLT
      const cycles = cpu.state.cycles
      cpu.step()  // Should not execute (halted)
      expect(cpu.state.cycles).toBe(cycles)
    })
  })

  // ============================================
  // RUN TESTS
  // ============================================

  describe('run()', () => {
    it('runs until halted', () => {
      loadProgram([0xA9, 0x42, 0xA2, 0x10, 0x02])  // LDA #$42; LDX #$10; HLT
      cpu.reset()
      cpu.run()
      expect(cpu.state.halted).toBe(true)
      expect(cpu.state.A).toBe(0x42)
      expect(cpu.state.X).toBe(0x10)
    })

    it('stops at maxCycles', () => {
      loadProgram([0xEA, 0x4C, 0x00, 0x02])  // NOP; JMP $0200 (infinite loop)
      cpu.reset()
      cpu.run(10)
      expect(cpu.state.halted).toBe(false)
      expect(cpu.state.cycles).toBe(10)
    })

    it('stops at default maxCycles', () => {
      loadProgram([0x4C, 0x00, 0x02])  // JMP $0200 (infinite loop)
      cpu.reset()
      cpu.run()  // Default 10000
      expect(cpu.state.cycles).toBe(10000)
    })
  })

  // ============================================
  // I/O TESTS
  // ============================================

  describe('I/O operations', () => {
    it('writes to LED port', () => {
      loadProgram([0xA9, 0xFF, 0x8D, 0x30, 0xF0])  // LDA #$FF; STA $F030
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(io.ledState).toBe(0xFF)
    })

    it('reads from serial status', () => {
      io.serialIn = [0x41]
      loadProgram([0xAD, 0x02, 0xF0])  // LDA $F002 (serial status)
      cpu.reset()
      cpu.step()
      expect(cpu.state.A).toBe(1)  // Data available
    })

    it('reads from serial RX', () => {
      io.serialIn = [0x41, 0x42, 0x43]
      loadProgram([0xAD, 0x00, 0xF0])  // LDA $F000 (serial RX)
      cpu.reset()
      cpu.step()
      expect(cpu.state.A).toBe(0x41)
      expect(io.serialIn.length).toBe(2)  // One consumed
    })

    it('writes to serial TX', () => {
      loadProgram([0xA9, 0x48, 0x8D, 0x01, 0xF0])  // LDA #$48; STA $F001
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(io.serialOut).toEqual([0x48])
    })

    it('reads 0 when no serial data', () => {
      loadProgram([0xAD, 0x00, 0xF0])  // LDA $F000
      cpu.reset()
      cpu.step()
      expect(cpu.state.A).toBe(0)
    })
  })

  describe('SimpleIO', () => {
    it('initializes with default values', () => {
      const simpleIO = new SimpleIO()
      expect(simpleIO.ledState).toBe(0)
      expect(simpleIO.serialIn).toEqual([])
      expect(simpleIO.serialOut).toEqual([])
    })

    it('returns 0 for unknown addresses', () => {
      expect(io.read(0xF099)).toBe(0)
    })
  })

  // ============================================
  // MEMORY ACCESS TESTS
  // ============================================

  describe('memory access', () => {
    it('readByte wraps address to 16 bits', () => {
      memory[0x0042] = 0x99
      const result = cpu.readByte(0x10042)
      expect(result).toBe(0x99)
    })

    it('writeByte wraps address and value', () => {
      cpu.writeByte(0x10300, 0x1FF)
      expect(memory[0x0300]).toBe(0xFF)
    })

    it('readWord reads little-endian', () => {
      memory[0x0300] = 0x34
      memory[0x0301] = 0x12
      expect(cpu.readWord(0x0300)).toBe(0x1234)
    })
  })

  // ============================================
  // ASSEMBLED PROGRAM TESTS
  // ============================================

  describe('assembled programs', () => {
    it('runs simple assembled program', () => {
      loadSource(`
.org $0200
    LDA #$42
    STA $0300
    HLT

.org $FFFC
.word $0200
`)
      cpu.reset()
      cpu.run()

      expect(memory[0x0300]).toBe(0x42)
      expect(cpu.state.halted).toBe(true)
    })

    it('runs delay loop', () => {
      loadSource(`
.org $0200
    LDX #$03
loop:
    DEX
    BNE loop
    HLT

.org $FFFC
.word $0200
`)
      cpu.reset()
      cpu.run()

      expect(cpu.state.X).toBe(0)
      expect(cpu.state.halted).toBe(true)
    })

    it('runs LED toggle', () => {
      loadSource(`
LED_PORT = $F030
.org $0200
    LDA #1
    STA LED_PORT
    LDA #0
    STA LED_PORT
    HLT

.org $FFFC
.word $0200
`)
      cpu.reset()

      cpu.step()  // LDA #1
      cpu.step()  // STA LED_PORT
      expect(io.ledState).toBe(1)

      cpu.step()  // LDA #0
      cpu.step()  // STA LED_PORT
      expect(io.ledState).toBe(0)
    })

    it('runs addition program', () => {
      loadSource(`
.org $0200
    CLC
    LDA #$25
    ADC #$17
    STA $0300
    HLT

.org $FFFC
.word $0200
`)
      cpu.reset()
      cpu.run()

      expect(memory[0x0300]).toBe(0x3C)  // 0x25 + 0x17 = 0x3C
    })

    it('runs multiplication by repeated addition', () => {
      loadSource(`
; Multiply 5 * 3 = 15
.org $0200
    LDA #$00      ; result = 0
    LDX #$03      ; counter = 3
loop:
    CLC
    ADC #$05      ; result += 5
    DEX
    BNE loop
    STA $0300     ; store result
    HLT

.org $FFFC
.word $0200
`)
      cpu.reset()
      cpu.run()

      expect(memory[0x0300]).toBe(15)
    })

    it('runs subroutine to double a value', () => {
      // Note: CPU only supports ADC #imm, not ADC abs
      // So we pass the value in A and return doubled result in A
      loadSource(`
.org $0200
    LDA #$15      ; value to double
    JSR double_it
    STA $0300     ; store result
    HLT

double_it:
    CLC
    ADC #$15      ; Add same value (doubling it)
    RTS

.org $FFFC
.word $0200
`)
      cpu.reset()
      cpu.run()

      expect(memory[0x0300]).toBe(0x2A)  // 0x15 * 2 = 0x2A
    })

    it('runs countdown with serial output', () => {
      loadSource(`
SERIAL_TX = $F001
.org $0200
    LDX #$03
loop:
    TXA
    STA SERIAL_TX
    DEX
    BNE loop
    HLT

.org $FFFC
.word $0200
`)
      cpu.reset()
      cpu.run()

      expect(io.serialOut).toEqual([3, 2, 1])
    })

    it('runs bitwise operations', () => {
      loadSource(`
.org $0200
    LDA #$FF
    AND #$F0     ; A = $F0
    STA $0300
    ORA #$0F     ; A = $FF
    STA $0301
    EOR #$AA     ; A = $55
    STA $0302
    HLT

.org $FFFC
.word $0200
`)
      cpu.reset()
      cpu.run()

      expect(memory[0x0300]).toBe(0xF0)
      expect(memory[0x0301]).toBe(0xFF)
      expect(memory[0x0302]).toBe(0x55)
    })
  })

  // ============================================
  // STRESS TESTS
  // ============================================

  describe('stress tests', () => {
    it('handles long loop', () => {
      loadSource(`
.org $0200
    LDX #$FF
loop:
    DEX
    BNE loop
    HLT

.org $FFFC
.word $0200
`)
      cpu.reset()
      cpu.run(1000)

      expect(cpu.state.X).toBe(0)
      expect(cpu.state.halted).toBe(true)
    })

    it('handles nested loops', () => {
      loadSource(`
.org $0200
    LDY #$03
outer:
    LDX #$05
inner:
    DEX
    BNE inner
    DEY
    BNE outer
    HLT

.org $FFFC
.word $0200
`)
      cpu.reset()
      cpu.run(500)

      expect(cpu.state.X).toBe(0)
      expect(cpu.state.Y).toBe(0)
      expect(cpu.state.halted).toBe(true)
    })

    it('handles many subroutine calls', () => {
      loadSource(`
.org $0200
    LDA #$00
    LDX #$10      ; Call 16 times
loop:
    JSR increment
    DEX
    BNE loop
    STA $0300
    HLT

increment:
    CLC
    ADC #$01
    RTS

.org $FFFC
.word $0200
`)
      cpu.reset()
      cpu.run(500)

      expect(memory[0x0300]).toBe(16)
      expect(cpu.state.halted).toBe(true)
    })

    it('handles rapid flag changes', () => {
      loadSource(`
.org $0200
    LDX #$10
loop:
    SEC
    CLC
    SEC
    CLC
    DEX
    BNE loop
    HLT

.org $FFFC
.word $0200
`)
      cpu.reset()
      cpu.run(500)

      expect(cpu.state.halted).toBe(true)
      expect(cpu.state.flags.C).toBe(false)
    })

    it('handles stack stress', () => {
      loadSource(`
.org $0200
    LDX #$10
push_loop:
    TXA
    PHA
    DEX
    BNE push_loop

    LDY #$10
pull_loop:
    PLA
    DEY
    BNE pull_loop
    STA $0300    ; Last pulled value
    HLT

.org $FFFC
.word $0200
`)
      cpu.reset()
      cpu.run(500)

      // Pushes 16, 15, 14, ... 2, 1 (X=0 exits loop before pushing 0)
      // Pulls in reverse: 1, 2, 3, ..., 15, 16 (last pulled = 16)
      expect(memory[0x0300]).toBe(0x10)  // Last pulled = first pushed = 16
      expect(cpu.state.halted).toBe(true)
    })

    it('handles memory fill', () => {
      // Simple fill test (we don't have indexed addressing modes)
      loadSource(`
.org $0200
    LDA #$AA
    STA $0300
    STA $0301
    STA $0302
    STA $0303
    HLT

.org $FFFC
.word $0200
`)
      cpu.reset()
      cpu.run()

      expect(memory[0x0300]).toBe(0xAA)
      expect(memory[0x0301]).toBe(0xAA)
      expect(memory[0x0302]).toBe(0xAA)
      expect(memory[0x0303]).toBe(0xAA)
    })
  })

  // ============================================
  // EDGE CASE TESTS
  // ============================================

  describe('edge cases', () => {
    it('handles PC wrapping at $FFFF', () => {
      memory[0xFFFF] = 0xA9  // LDA
      memory[0x0000] = 0x42  // #$42
      memory[VECTORS.RESET] = 0xFF
      memory[VECTORS.RESET + 1] = 0xFF
      cpu.reset()
      cpu.step()
      expect(cpu.state.A).toBe(0x42)
    })

    it('handles zero page addressing at boundary', () => {
      memory[0x00FF] = 0x77
      loadProgram([0xAD, 0xFF, 0x00])  // LDA $00FF
      cpu.reset()
      cpu.step()
      expect(cpu.state.A).toBe(0x77)
    })

    it('handles branch at page boundary', () => {
      // Place branch instruction that crosses page boundary
      // LDA #0 at $0200, BEQ +5 at $0202
      // PC after BEQ fetch = $0204, +5 = $0209
      loadProgram([
        0xA9, 0x00,  // LDA #0
        0xF0, 0x05,  // BEQ +5
      ], 0x0200)
      cpu.reset()
      cpu.step()  // LDA #0
      cpu.step()  // BEQ
      // PC was $0204 after fetching operand, +5 = $0209
      expect(cpu.state.PC).toBe(0x0209)
    })

    it('constructor works without IO handler', () => {
      const cpuNoIO = new CPU(memory)
      loadProgram([0xAD, 0x30, 0xF0])  // LDA $F030 (LED port)
      cpuNoIO.reset()
      cpuNoIO.step()
      expect(cpuNoIO.state.A).toBe(0)  // Default handler returns 0
    })

    it('handles all zero memory', () => {
      // Memory is already zeroed - running should execute BRK (opcode 0)
      cpu.reset()
      cpu.step()
      expect(cpu.state.halted).toBe(true)
    })
  })

  // ============================================
  // FLAG BEHAVIOR EDGE CASES
  // ============================================

  describe('flag edge cases', () => {
    it('N and Z flags are mutually exclusive for most operations', () => {
      // Can't be both negative and zero
      loadProgram([0xA9, 0x00])  // LDA #$00
      cpu.reset()
      cpu.step()
      expect(cpu.state.flags.Z).toBe(true)
      expect(cpu.state.flags.N).toBe(false)

      loadProgram([0xA9, 0x80])  // LDA #$80
      cpu.reset()
      cpu.step()
      expect(cpu.state.flags.Z).toBe(false)
      expect(cpu.state.flags.N).toBe(true)
    })

    it('compare sets flags without overflow consideration', () => {
      // CMP doesn't set V flag
      loadProgram([0xA9, 0x80, 0xC9, 0x01])  // LDA #$80; CMP #$01
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.flags.C).toBe(true)  // $80 >= $01
      // V should not be affected by CMP
    })

    it('ADC overflow scenarios', () => {
      // Overflow (V) is set when the signed result is incorrect
      // V = 1 when pos + pos = neg or neg + neg = pos

      // pos + pos = neg: 0x50 + 0x50 = 0xA0 (80 + 80 = 160, but 160 > 127)
      loadProgram([0x18, 0xA9, 0x50, 0x69, 0x50])
      cpu.reset()
      cpu.step()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0xA0)
      expect(cpu.state.flags.V).toBe(true)

      // neg + neg = pos: 0x90 + 0x90 = 0x120 & 0xFF = 0x20
      loadProgram([0x18, 0xA9, 0x90, 0x69, 0x90])
      cpu.reset()
      cpu.step()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x20)
      expect(cpu.state.flags.V).toBe(true)

      // pos + pos = pos: 0x10 + 0x20 = 0x30 (no overflow)
      loadProgram([0x18, 0xA9, 0x10, 0x69, 0x20])
      cpu.reset()
      cpu.step()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x30)
      expect(cpu.state.flags.V).toBe(false)

      // pos + neg = neg: 0x10 + 0x90 = 0xA0 (no overflow, different signs)
      loadProgram([0x18, 0xA9, 0x10, 0x69, 0x90])
      cpu.reset()
      cpu.step()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0xA0)
      expect(cpu.state.flags.V).toBe(false)
    })
  })

  // ============================================
  // BOUNDARY VALUE TESTS
  // ============================================

  describe('boundary values', () => {
    it('handles all register boundary values', () => {
      // A at boundaries
      loadProgram([0xA9, 0x00])  // LDA #$00
      cpu.reset()
      cpu.step()
      expect(cpu.state.A).toBe(0x00)

      loadProgram([0xA9, 0xFF])  // LDA #$FF
      cpu.reset()
      cpu.step()
      expect(cpu.state.A).toBe(0xFF)

      loadProgram([0xA9, 0x7F])  // LDA #$7F (max positive)
      cpu.reset()
      cpu.step()
      expect(cpu.state.A).toBe(0x7F)
      expect(cpu.state.flags.N).toBe(false)

      loadProgram([0xA9, 0x80])  // LDA #$80 (min negative)
      cpu.reset()
      cpu.step()
      expect(cpu.state.A).toBe(0x80)
      expect(cpu.state.flags.N).toBe(true)
    })

    it('handles SP at boundaries', () => {
      // SP wrapping
      loadProgram([0xA2, 0x00, 0x9A, 0x48])  // LDX #$00; TXS; PHA
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.SP).toBe(0x00)
      cpu.step()  // PHA should wrap SP to $FF
      expect(cpu.state.SP).toBe(0xFF)
    })

    it('handles address space boundaries', () => {
      // Read from last byte
      memory[0xFFFF] = 0x42
      loadProgram([0xAD, 0xFF, 0xFF])  // LDA $FFFF
      cpu.reset()
      cpu.step()
      expect(cpu.state.A).toBe(0x42)

      // Read from first byte
      memory[0x0000] = 0x55
      loadProgram([0xAD, 0x00, 0x00])  // LDA $0000
      cpu.reset()
      cpu.step()
      expect(cpu.state.A).toBe(0x55)
    })
  })
})
