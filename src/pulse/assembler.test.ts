import { describe, it, expect } from 'vitest'
import { assemble, assembleToBinary } from './assembler'

describe('Pulse Assembler', () => {

// ============================================================================
// LOAD INSTRUCTION ENCODING TESTS
// ============================================================================

  describe('load instruction encoding', () => {
    it('assembles LDA immediate', () => {
      const result = assemble('.org $0200\nLDA #$42')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.program.origin).toBe(0x0200)
      expect(Array.from(result.program.binary)).toEqual([0xA9, 0x42])
    })

    it('assembles LDA immediate with zero', () => {
      const result = assemble('.org $0200\nLDA #$00')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xA9, 0x00])
    })

    it('assembles LDA immediate with max value', () => {
      const result = assemble('.org $0200\nLDA #$FF')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xA9, 0xFF])
    })

    it('assembles LDA absolute', () => {
      const result = assemble('.org $0200\nLDA $1234')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xAD, 0x34, 0x12])
    })

    it('assembles LDX immediate', () => {
      const result = assemble('.org $0200\nLDX #$FF')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xA2, 0xFF])
    })

    it('assembles LDX absolute', () => {
      const result = assemble('.org $0200\nLDX $ABCD')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xAE, 0xCD, 0xAB])
    })

    it('assembles LDY immediate', () => {
      const result = assemble('.org $0200\nLDY #$10')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xA0, 0x10])
    })

    it('assembles LDY absolute', () => {
      const result = assemble('.org $0200\nLDY $5678')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xAC, 0x78, 0x56])
    })
  })

// ============================================================================
// STORE INSTRUCTION ENCODING TESTS
// ============================================================================

  describe('store instruction encoding', () => {
    it('assembles STA absolute', () => {
      const result = assemble('.org $0200\nSTA $F030')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x8D, 0x30, 0xF0])
    })

    it('assembles STX absolute', () => {
      const result = assemble('.org $0200\nSTX $0010')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x8E, 0x10, 0x00])
    })

    it('assembles STY absolute', () => {
      const result = assemble('.org $0200\nSTY $0020')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x8C, 0x20, 0x00])
    })

    it('assembles store to zero page address', () => {
      const result = assemble('.org $0200\nSTA $00FF')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x8D, 0xFF, 0x00])
    })

    it('assembles store to high address', () => {
      const result = assemble('.org $0200\nSTA $FFFF')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x8D, 0xFF, 0xFF])
    })
  })

// ============================================================================
// ARITHMETIC INSTRUCTION ENCODING TESTS
// ============================================================================

  describe('arithmetic instruction encoding', () => {
    it('assembles ADC immediate', () => {
      const result = assemble('.org $0200\nADC #$01')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x69, 0x01])
    })

    it('assembles ADC absolute', () => {
      const result = assemble('.org $0200\nADC $1000')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x6D, 0x00, 0x10])
    })

    it('assembles SBC immediate', () => {
      const result = assemble('.org $0200\nSBC #$01')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xE9, 0x01])
    })

    it('assembles SBC absolute', () => {
      const result = assemble('.org $0200\nSBC $2000')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xED, 0x00, 0x20])
    })
  })

// ============================================================================
// LOGIC INSTRUCTION ENCODING TESTS
// ============================================================================

  describe('logic instruction encoding', () => {
    it('assembles AND immediate', () => {
      const result = assemble('.org $0200\nAND #$0F')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x29, 0x0F])
    })

    it('assembles AND absolute', () => {
      const result = assemble('.org $0200\nAND $3000')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x2D, 0x00, 0x30])
    })

    it('assembles ORA immediate', () => {
      const result = assemble('.org $0200\nORA #$F0')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x09, 0xF0])
    })

    it('assembles ORA absolute', () => {
      const result = assemble('.org $0200\nORA $4000')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x0D, 0x00, 0x40])
    })

    it('assembles EOR immediate', () => {
      const result = assemble('.org $0200\nEOR #$FF')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x49, 0xFF])
    })

    it('assembles EOR absolute', () => {
      const result = assemble('.org $0200\nEOR $5000')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x4D, 0x00, 0x50])
    })
  })

// ============================================================================
// COMPARE INSTRUCTION ENCODING TESTS
// ============================================================================

  describe('compare instruction encoding', () => {
    it('assembles CMP immediate', () => {
      const result = assemble('.org $0200\nCMP #$42')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xC9, 0x42])
    })

    it('assembles CMP absolute', () => {
      const result = assemble('.org $0200\nCMP $6000')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xCD, 0x00, 0x60])
    })

    it('assembles CPX immediate', () => {
      const result = assemble('.org $0200\nCPX #$00')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xE0, 0x00])
    })

    it('assembles CPY immediate', () => {
      const result = assemble('.org $0200\nCPY #$FF')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xC0, 0xFF])
    })
  })

// ============================================================================
// JUMP INSTRUCTION ENCODING TESTS
// ============================================================================

  describe('jump instruction encoding', () => {
    it('assembles JMP absolute', () => {
      const result = assemble('.org $0200\nJMP $1234')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x4C, 0x34, 0x12])
    })

    it('assembles JSR absolute', () => {
      const result = assemble('.org $0200\nJSR $4000')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x20, 0x00, 0x40])
    })

    it('assembles RTS implied', () => {
      const result = assemble('.org $0200\nRTS')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x60])
    })
  })

// ============================================================================
// BRANCH INSTRUCTION ENCODING TESTS
// ============================================================================

  describe('branch instruction encoding', () => {
    it('assembles BEQ forward', () => {
      const source = `.org $0200
    BEQ target
    NOP
target:
    RTS`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      // BEQ offset: target ($0204) - next PC ($0202) = +2, but skip over NOP = +1
      expect(Array.from(result.program.binary)).toEqual([
        0xF0, 0x01,  // BEQ +1
        0xEA,        // NOP
        0x60,        // RTS
      ])
    })

    it('assembles BNE forward', () => {
      const source = `.org $0200
    BNE skip
    NOP
skip:
    RTS`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([
        0xD0, 0x01,  // BNE +1
        0xEA,        // NOP
        0x60,        // RTS
      ])
    })

    it('assembles BCC forward', () => {
      const source = `.org $0200
    BCC skip
    NOP
skip:
    RTS`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([
        0x90, 0x01,  // BCC +1
        0xEA,        // NOP
        0x60,        // RTS
      ])
    })

    it('assembles BCS forward', () => {
      const source = `.org $0200
    BCS skip
    NOP
skip:
    RTS`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([
        0xB0, 0x01,  // BCS +1
        0xEA,        // NOP
        0x60,        // RTS
      ])
    })

    it('assembles BNE backward', () => {
      const source = `.org $0200
loop:
    DEX
    BNE loop`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      // BNE offset: loop ($0200) - next PC ($0203) = -3
      expect(Array.from(result.program.binary)).toEqual([
        0xCA,        // DEX
        0xD0, 0xFD,  // BNE -3 (0xFD = -3 as signed byte)
      ])
    })

    it('assembles branch with zero offset', () => {
      const source = `.org $0200
target:
    BEQ target`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      // BEQ to itself: target ($0200) - next PC ($0202) = -2
      expect(Array.from(result.program.binary)).toEqual([
        0xF0, 0xFE,  // BEQ -2
      ])
    })

    it('errors on branch out of range forward', () => {
      let source = '.org $0200\n    BNE far\n'
      for (let i = 0; i < 130; i++) {
        source += '    NOP\n'
      }
      source += 'far:\n    RTS'

      const result = assemble(source)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error.message).toContain('out of range')
    })

    it('errors on branch out of range backward', () => {
      let source = '.org $0200\nstart:\n'
      for (let i = 0; i < 130; i++) {
        source += '    NOP\n'
      }
      source += '    BNE start\n'

      const result = assemble(source)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error.message).toContain('out of range')
    })
  })

// ============================================================================
// REGISTER OPERATION INSTRUCTION ENCODING TESTS
// ============================================================================

  describe('register operation encoding', () => {
    it('assembles INX', () => {
      const result = assemble('.org $0200\nINX')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xE8])
    })

    it('assembles INY', () => {
      const result = assemble('.org $0200\nINY')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xC8])
    })

    it('assembles DEX', () => {
      const result = assemble('.org $0200\nDEX')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xCA])
    })

    it('assembles DEY', () => {
      const result = assemble('.org $0200\nDEY')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x88])
    })
  })

// ============================================================================
// TRANSFER INSTRUCTION ENCODING TESTS
// ============================================================================

  describe('transfer instruction encoding', () => {
    it('assembles TAX', () => {
      const result = assemble('.org $0200\nTAX')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xAA])
    })

    it('assembles TAY', () => {
      const result = assemble('.org $0200\nTAY')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xA8])
    })

    it('assembles TXA', () => {
      const result = assemble('.org $0200\nTXA')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x8A])
    })

    it('assembles TYA', () => {
      const result = assemble('.org $0200\nTYA')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x98])
    })

    it('assembles TXS', () => {
      const result = assemble('.org $0200\nTXS')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x9A])
    })

    it('assembles TSX', () => {
      const result = assemble('.org $0200\nTSX')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xBA])
    })
  })

// ============================================================================
// STACK INSTRUCTION ENCODING TESTS
// ============================================================================

  describe('stack instruction encoding', () => {
    it('assembles PHA', () => {
      const result = assemble('.org $0200\nPHA')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x48])
    })

    it('assembles PLA', () => {
      const result = assemble('.org $0200\nPLA')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x68])
    })

    it('assembles PHP', () => {
      const result = assemble('.org $0200\nPHP')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x08])
    })

    it('assembles PLP', () => {
      const result = assemble('.org $0200\nPLP')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x28])
    })
  })

// ============================================================================
// FLAG INSTRUCTION ENCODING TESTS
// ============================================================================

  describe('flag instruction encoding', () => {
    it('assembles SEC', () => {
      const result = assemble('.org $0200\nSEC')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x38])
    })

    it('assembles CLC', () => {
      const result = assemble('.org $0200\nCLC')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x18])
    })

    it('assembles SEI', () => {
      const result = assemble('.org $0200\nSEI')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x78])
    })

    it('assembles CLI', () => {
      const result = assemble('.org $0200\nCLI')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x58])
    })
  })

// ============================================================================
// MISC INSTRUCTION ENCODING TESTS
// ============================================================================

  describe('misc instruction encoding', () => {
    it('assembles NOP', () => {
      const result = assemble('.org $0200\nNOP')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xEA])
    })

    it('assembles BRK', () => {
      const result = assemble('.org $0200\nBRK')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x00])
    })

    it('assembles HLT', () => {
      const result = assemble('.org $0200\nHLT')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x02])
    })
  })

// ============================================================================
// LABEL RESOLUTION TESTS
// ============================================================================

  describe('label resolution', () => {
    it('resolves forward label', () => {
      const source = `
.org $0200
    JMP end
    NOP
end:
    RTS
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      // JMP to $0204 (after JMP and NOP)
      expect(Array.from(result.program.binary)).toEqual([
        0x4C, 0x04, 0x02,  // JMP $0204
        0xEA,              // NOP
        0x60,              // RTS
      ])
    })

    it('resolves backward label', () => {
      const source = `
.org $0200
loop:
    NOP
    JMP loop
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      // JMP back to $0200
      expect(Array.from(result.program.binary)).toEqual([
        0xEA,              // NOP
        0x4C, 0x00, 0x02,  // JMP $0200
      ])
    })

    it('provides symbol table', () => {
      const source = `
.org $0200
start:
    NOP
middle:
    NOP
end:
    RTS
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.program.symbols.get('start')).toBe(0x0200)
      expect(result.program.symbols.get('middle')).toBe(0x0201)
      expect(result.program.symbols.get('end')).toBe(0x0202)
    })

    it('resolves multiple labels', () => {
      const source = `
.org $0200
a:
b:
c:
    NOP
d:
    RTS
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.program.symbols.get('a')).toBe(0x0200)
      expect(result.program.symbols.get('b')).toBe(0x0200)
      expect(result.program.symbols.get('c')).toBe(0x0200)
      expect(result.program.symbols.get('d')).toBe(0x0201)
    })
  })

// ============================================================================
// CONSTANT TESTS
// ============================================================================

  describe('constants', () => {
    it('resolves constant in instruction', () => {
      const source = `
LED_PORT = $F030
.org $0200
    STA LED_PORT
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(Array.from(result.program.binary)).toEqual([0x8D, 0x30, 0xF0])
      expect(result.program.symbols.get('LED_PORT')).toBe(0xF030)
    })

    it('resolves constant in immediate', () => {
      const source = `
VALUE = $42
.org $0200
    LDA #VALUE
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(Array.from(result.program.binary)).toEqual([0xA9, 0x42])
    })

    it('resolves multiple constants', () => {
      const source = `
PORT_A = $F000
PORT_B = $F001
VALUE = $55
.org $0200
    LDA #VALUE
    STA PORT_A
    STA PORT_B
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(Array.from(result.program.binary)).toEqual([
        0xA9, 0x55,        // LDA #$55
        0x8D, 0x00, 0xF0,  // STA $F000
        0x8D, 0x01, 0xF0,  // STA $F001
      ])
    })

    it('resolves decimal constant', () => {
      const source = `
VALUE = 255
.org $0200
    LDA #VALUE
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xA9, 0xFF])
    })
  })

// ============================================================================
// DIRECTIVE TESTS
// ============================================================================

  describe('directives', () => {
    it('handles .org', () => {
      const source = `
.org $0200
    NOP
.org $0300
    RTS
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.program.origin).toBe(0x0200)
      // Binary should cover from $0200 to $0300
      expect(result.program.binary[0]).toBe(0xEA)  // NOP at $0200
      expect(result.program.binary[0x100]).toBe(0x60)  // RTS at $0300
    })

    it('handles multiple .org directives', () => {
      const source = `
.org $0200
    LDA #$01
.org $0300
    LDA #$02
.org $0400
    LDA #$03
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.program.binary[0]).toBe(0xA9)      // LDA at $0200
      expect(result.program.binary[1]).toBe(0x01)
      expect(result.program.binary[0x100]).toBe(0xA9) // LDA at $0300
      expect(result.program.binary[0x101]).toBe(0x02)
      expect(result.program.binary[0x200]).toBe(0xA9) // LDA at $0400
      expect(result.program.binary[0x201]).toBe(0x03)
    })

    it('handles .word', () => {
      const source = `
.org $FFFC
.word $0200
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      // Little-endian word
      expect(Array.from(result.program.binary)).toEqual([0x00, 0x02])
    })

    it('handles .word with symbol', () => {
      const source = `
.org $0200
start:
    NOP
.org $FFFC
.word start
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      // Word at $FFFC should point to $0200
      const wordOffset = 0xFFFC - 0x0200
      expect(result.program.binary[wordOffset]).toBe(0x00)
      expect(result.program.binary[wordOffset + 1]).toBe(0x02)
    })

    it('handles .word with multiple values', () => {
      const source = `
.org $FFFA
.word $1111
.word $2222
.word $3333
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(Array.from(result.program.binary)).toEqual([
        0x11, 0x11,  // $1111
        0x22, 0x22,  // $2222
        0x33, 0x33,  // $3333
      ])
    })

    it('handles .byte', () => {
      const source = `
.org $0200
.byte $48, $45, $4C, $4C, $4F
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(Array.from(result.program.binary)).toEqual([0x48, 0x45, 0x4C, 0x4C, 0x4F])
    })

    it('handles .byte with single value', () => {
      const source = `
.org $0200
.byte $42
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0x42])
    })

    it('handles .byte with decimal values', () => {
      const source = `
.org $0200
.byte 0, 1, 2, 3, 255
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0, 1, 2, 3, 255])
    })

    it('handles .db directive (alias for .byte)', () => {
      const source = `
.org $0200
.db $AA, $BB, $CC
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([0xAA, 0xBB, 0xCC])
    })
  })

// ============================================================================
// SOURCE MAP TESTS
// ============================================================================

  describe('source map', () => {
    it('tracks instruction addresses to lines', () => {
      const source = `
.org $0200
LDA #1
STA $F030
RTS
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.program.sourceMap.get(0x0200)).toBe(3)  // LDA
      expect(result.program.sourceMap.get(0x0202)).toBe(4)  // STA
      expect(result.program.sourceMap.get(0x0205)).toBe(5)  // RTS
    })

    it('tracks instructions across multiple .org', () => {
      const source = `
.org $0200
NOP
.org $0300
NOP
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.program.sourceMap.get(0x0200)).toBe(3)
      expect(result.program.sourceMap.get(0x0300)).toBe(5)
    })
  })

// ============================================================================
// FULL PROGRAM TESTS
// ============================================================================

  describe('full programs', () => {
    it('assembles LED demo program', () => {
      const source = `
; LED Demo
LED_PORT = $F030

.org $0200
main:
    LDA #1
    STA LED_PORT
    LDA #0
    STA LED_PORT
    JMP main

.org $FFFC
.word main
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) {
        console.log('Error:', result.error)
        return
      }

      // Check symbols
      expect(result.program.symbols.get('LED_PORT')).toBe(0xF030)
      expect(result.program.symbols.get('main')).toBe(0x0200)

      // Check code at $0200
      const code = Array.from(result.program.binary.slice(0, 13))
      expect(code).toEqual([
        0xA9, 0x01,        // LDA #1
        0x8D, 0x30, 0xF0,  // STA $F030
        0xA9, 0x00,        // LDA #0
        0x8D, 0x30, 0xF0,  // STA $F030
        0x4C, 0x00, 0x02,  // JMP $0200
      ])

      // Check reset vector at $FFFC
      const vectorOffset = 0xFFFC - 0x0200
      expect(result.program.binary[vectorOffset]).toBe(0x00)
      expect(result.program.binary[vectorOffset + 1]).toBe(0x02)
    })

    it('assembles delay loop', () => {
      const source = `
.org $0200
delay:
    LDX #$FF
delay_loop:
    DEX
    BNE delay_loop
    RTS
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(Array.from(result.program.binary)).toEqual([
        0xA2, 0xFF,  // LDX #$FF
        0xCA,        // DEX
        0xD0, 0xFD,  // BNE delay_loop (-3)
        0x60,        // RTS
      ])
    })

    it('assembles counter program', () => {
      const source = `
OUTPUT = $F000
.org $0200
start:
    LDA #0
loop:
    STA OUTPUT
    CLC
    ADC #1
    JMP loop
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(Array.from(result.program.binary)).toEqual([
        0xA9, 0x00,        // LDA #0
        0x8D, 0x00, 0xF0,  // STA $F000
        0x18,              // CLC
        0x69, 0x01,        // ADC #1
        0x4C, 0x02, 0x02,  // JMP loop ($0202)
      ])
    })

    it('assembles subroutine with JSR/RTS', () => {
      const source = `
.org $0200
main:
    JSR sub
    HLT

sub:
    INX
    INY
    RTS
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(Array.from(result.program.binary)).toEqual([
        0x20, 0x04, 0x02,  // JSR sub ($0204)
        0x02,              // HLT
        0xE8,              // INX
        0xC8,              // INY
        0x60,              // RTS
      ])
    })

    it('assembles stack operations', () => {
      const source = `
.org $0200
    LDA #$42
    PHA
    LDA #$00
    PLA
    HLT
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(Array.from(result.program.binary)).toEqual([
        0xA9, 0x42,  // LDA #$42
        0x48,        // PHA
        0xA9, 0x00,  // LDA #$00
        0x68,        // PLA
        0x02,        // HLT
      ])
    })
  })

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

  describe('error handling', () => {
    it('errors on undefined symbol', () => {
      const source = '.org $0200\nJMP undefined'
      const result = assemble(source)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error.message).toContain('Undefined symbol')
    })

    it('errors on undefined symbol in immediate', () => {
      const source = '.org $0200\nLDA #UNDEFINED'
      const result = assemble(source)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error.message).toContain('Undefined symbol')
    })

    it('errors on undefined symbol in .word', () => {
      const source = '.org $0200\n.word undefined_label'
      const result = assemble(source)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error.message).toContain('Undefined symbol')
    })

    it('errors on lex error', () => {
      const source = '.org $0200\nLDA @'
      const result = assemble(source)
      expect(result.ok).toBe(false)
    })

    it('provides line number in error', () => {
      const source = `.org $0200
NOP
NOP
JMP undefined
`
      const result = assemble(source)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error.line).toBe(4)
    })
  })

// ============================================================================
// EDGE CASES
// ============================================================================

  describe('edge cases', () => {
    it('handles empty source', () => {
      const result = assemble('')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.program.binary.length).toBe(0)
    })

    it('handles source with only constants', () => {
      const result = assemble('VALUE = $42\nOTHER = $00')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.program.binary.length).toBe(0)
      expect(result.program.symbols.get('VALUE')).toBe(0x42)
    })

    it('handles source with only labels', () => {
      const result = assemble('.org $0200\nstart:\nend:')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.program.binary.length).toBe(0)
    })

    it('handles comments only', () => {
      const result = assemble('; comment 1\n; comment 2')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.program.binary.length).toBe(0)
    })

    it('handles case insensitive mnemonics', () => {
      const result = assemble('.org $0200\nlda #$42\nsta $F030')
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(Array.from(result.program.binary)).toEqual([
        0xA9, 0x42,
        0x8D, 0x30, 0xF0,
      ])
    })
  })

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

  describe('assembleToBinary helper', () => {
    it('returns binary directly', () => {
      const binary = assembleToBinary('.org $0200\nNOP')
      expect(binary).not.toBeNull()
      expect(binary).toEqual(new Uint8Array([0xEA]))
    })

    it('returns null on error', () => {
      const binary = assembleToBinary('INVALID')
      expect(binary).toBeNull()
    })

    it('returns null on undefined symbol', () => {
      const binary = assembleToBinary('.org $0200\nJMP undefined')
      expect(binary).toBeNull()
    })
  })

// ============================================================================
// STRESS TESTS
// ============================================================================

  describe('stress tests', () => {
    it('assembles many NOPs', () => {
      let source = '.org $0200\n'
      for (let i = 0; i < 100; i++) {
        source += 'NOP\n'
      }
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.program.binary.length).toBe(100)
      expect(result.program.binary.every(b => b === 0xEA)).toBe(true)
    })

    it('assembles program with many labels', () => {
      let source = '.org $0200\n'
      for (let i = 0; i < 50; i++) {
        source += `label${i}:\n    NOP\n`
      }
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.program.symbols.size).toBe(50)
    })

    it('assembles large data block', () => {
      let source = '.org $0200\n.byte '
      const values = []
      for (let i = 0; i < 100; i++) {
        values.push(`$${i.toString(16).toUpperCase().padStart(2, '0')}`)
      }
      source += values.join(', ')

      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.program.binary.length).toBe(100)
      for (let i = 0; i < 100; i++) {
        expect(result.program.binary[i]).toBe(i)
      }
    })
  })
})
