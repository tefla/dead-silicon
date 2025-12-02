import { describe, it, expect, beforeEach } from 'vitest'
import { CPU, SimpleIO } from './cpu'
import { createMemory, VECTORS, IO_PORTS } from './memory'
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

  describe('initialization', () => {
    it('starts with zeroed registers', () => {
      expect(cpu.state.A).toBe(0)
      expect(cpu.state.X).toBe(0)
      expect(cpu.state.Y).toBe(0)
    })

    it('reads reset vector on reset', () => {
      loadProgram([0xEA], 0x0200)  // NOP
      cpu.reset()
      expect(cpu.state.PC).toBe(0x0200)
    })
  })

  describe('load instructions', () => {
    it('LDA immediate', () => {
      loadProgram([0xA9, 0x42])  // LDA #$42
      cpu.reset()
      cpu.step()
      expect(cpu.state.A).toBe(0x42)
      expect(cpu.state.flags.Z).toBe(false)
      expect(cpu.state.flags.N).toBe(false)
    })

    it('LDA sets Z flag when zero', () => {
      loadProgram([0xA9, 0x00])  // LDA #0
      cpu.reset()
      cpu.step()
      expect(cpu.state.flags.Z).toBe(true)
    })

    it('LDA sets N flag when negative', () => {
      loadProgram([0xA9, 0x80])  // LDA #$80
      cpu.reset()
      cpu.step()
      expect(cpu.state.flags.N).toBe(true)
    })

    it('LDX immediate', () => {
      loadProgram([0xA2, 0xFF])  // LDX #$FF
      cpu.reset()
      cpu.step()
      expect(cpu.state.X).toBe(0xFF)
    })

    it('LDY immediate', () => {
      loadProgram([0xA0, 0x10])  // LDY #$10
      cpu.reset()
      cpu.step()
      expect(cpu.state.Y).toBe(0x10)
    })
  })

  describe('store instructions', () => {
    it('STA absolute', () => {
      loadProgram([0xA9, 0x42, 0x8D, 0x00, 0x03])  // LDA #$42; STA $0300
      cpu.reset()
      cpu.step()  // LDA
      cpu.step()  // STA
      expect(memory[0x0300]).toBe(0x42)
    })

    it('STA to I/O port', () => {
      loadProgram([0xA9, 0x01, 0x8D, 0x30, 0xF0])  // LDA #1; STA $F030 (LED)
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(io.ledState).toBe(1)
    })
  })

  describe('increment/decrement', () => {
    it('DEX decrements X', () => {
      loadProgram([0xA2, 0x10, 0xCA])  // LDX #$10; DEX
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.X).toBe(0x0F)
    })

    it('DEX wraps from 0 to 255', () => {
      loadProgram([0xA2, 0x00, 0xCA])  // LDX #0; DEX
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.X).toBe(0xFF)
      expect(cpu.state.flags.N).toBe(true)
    })

    it('DEY decrements Y', () => {
      loadProgram([0xA0, 0x10, 0x88])  // LDY #$10; DEY
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.Y).toBe(0x0F)
    })

    it('INX increments X', () => {
      loadProgram([0xA2, 0x10, 0xE8])  // LDX #$10; INX
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.X).toBe(0x11)
    })
  })

  describe('branches', () => {
    it('BNE branches when Z=0', () => {
      // LDX #1; DEX; BNE -2 (back to DEX)
      loadProgram([0xA2, 0x02, 0xCA, 0xD0, 0xFD])
      cpu.reset()
      cpu.step()  // LDX #2
      expect(cpu.state.X).toBe(2)

      cpu.step()  // DEX (X=1)
      expect(cpu.state.X).toBe(1)
      expect(cpu.state.flags.Z).toBe(false)

      cpu.step()  // BNE (should branch back)
      expect(cpu.state.PC).toBe(0x0202)  // Back to DEX

      cpu.step()  // DEX (X=0)
      expect(cpu.state.X).toBe(0)
      expect(cpu.state.flags.Z).toBe(true)

      cpu.step()  // BNE (should not branch)
      expect(cpu.state.PC).toBe(0x0205)  // Past BNE
    })

    it('BEQ branches when Z=1', () => {
      loadProgram([0xA9, 0x00, 0xF0, 0x02, 0xA9, 0xFF, 0xA9, 0x42])
      // LDA #0; BEQ +2; LDA #$FF; LDA #$42
      cpu.reset()
      cpu.step()  // LDA #0
      cpu.step()  // BEQ (should branch)
      expect(cpu.state.PC).toBe(0x0206)  // Skipped to LDA #$42
    })
  })

  describe('jumps', () => {
    it('JMP absolute', () => {
      loadProgram([0x4C, 0x10, 0x02])  // JMP $0210
      cpu.reset()
      cpu.step()
      expect(cpu.state.PC).toBe(0x0210)
    })

    it('JSR and RTS', () => {
      // Main: JSR sub; NOP
      // Sub: LDA #$42; RTS
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

      cpu.step()  // LDA #$42
      expect(cpu.state.A).toBe(0x42)

      cpu.step()  // RTS
      expect(cpu.state.PC).toBe(0x0203)  // After JSR

      cpu.step()  // NOP
      expect(cpu.state.PC).toBe(0x0204)
    })
  })

  describe('stack', () => {
    it('PHA and PLA', () => {
      loadProgram([0xA9, 0x42, 0x48, 0xA9, 0x00, 0x68])
      // LDA #$42; PHA; LDA #0; PLA
      cpu.reset()
      cpu.step()  // LDA #$42
      cpu.step()  // PHA
      expect(memory[0x01FF]).toBe(0x42)  // Stack grows down from $1FF

      cpu.step()  // LDA #0
      expect(cpu.state.A).toBe(0)

      cpu.step()  // PLA
      expect(cpu.state.A).toBe(0x42)
    })
  })

  describe('compare', () => {
    it('CMP sets flags correctly', () => {
      loadProgram([0xA9, 0x10, 0xC9, 0x10])  // LDA #$10; CMP #$10
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.flags.Z).toBe(true)
      expect(cpu.state.flags.C).toBe(true)
    })

    it('CMP A > value', () => {
      loadProgram([0xA9, 0x20, 0xC9, 0x10])  // LDA #$20; CMP #$10
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.flags.Z).toBe(false)
      expect(cpu.state.flags.C).toBe(true)
    })

    it('CMP A < value', () => {
      loadProgram([0xA9, 0x10, 0xC9, 0x20])  // LDA #$10; CMP #$20
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.flags.Z).toBe(false)
      expect(cpu.state.flags.C).toBe(false)
    })
  })

  describe('arithmetic', () => {
    it('ADD (ADC) without carry', () => {
      loadProgram([0x18, 0xA9, 0x10, 0x69, 0x05])  // CLC; LDA #$10; ADC #$05
      cpu.reset()
      cpu.step()  // CLC
      cpu.step()  // LDA
      cpu.step()  // ADC
      expect(cpu.state.A).toBe(0x15)
    })

    it('ADD with overflow sets carry', () => {
      loadProgram([0x18, 0xA9, 0xFF, 0x69, 0x02])  // CLC; LDA #$FF; ADC #$02
      cpu.reset()
      cpu.step()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x01)
      expect(cpu.state.flags.C).toBe(true)
    })
  })

  describe('logic', () => {
    it('AND immediate', () => {
      loadProgram([0xA9, 0xFF, 0x29, 0x0F])  // LDA #$FF; AND #$0F
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x0F)
    })

    it('ORA immediate', () => {
      loadProgram([0xA9, 0xF0, 0x09, 0x0F])  // LDA #$F0; ORA #$0F
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0xFF)
    })

    it('EOR immediate', () => {
      loadProgram([0xA9, 0xFF, 0x49, 0x0F])  // LDA #$FF; EOR #$0F
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0xF0)
    })
  })

  describe('transfer', () => {
    it('TAX transfers A to X', () => {
      loadProgram([0xA9, 0x42, 0xAA])  // LDA #$42; TAX
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.X).toBe(0x42)
    })

    it('TXA transfers X to A', () => {
      loadProgram([0xA2, 0x42, 0x8A])  // LDX #$42; TXA
      cpu.reset()
      cpu.step()
      cpu.step()
      expect(cpu.state.A).toBe(0x42)
    })
  })

  describe('halt', () => {
    it('BRK halts CPU', () => {
      loadProgram([0x00])  // BRK
      cpu.reset()
      cpu.step()
      expect(cpu.state.halted).toBe(true)
    })

    it('HLT halts CPU', () => {
      loadProgram([0x02])  // HLT
      cpu.reset()
      cpu.step()
      expect(cpu.state.halted).toBe(true)
    })
  })

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

      // Run until first STA
      cpu.step()  // LDA #1
      cpu.step()  // STA LED_PORT
      expect(io.ledState).toBe(1)

      cpu.step()  // LDA #0
      cpu.step()  // STA LED_PORT
      expect(io.ledState).toBe(0)
    })
  })
})
