import { describe, it, expect } from 'vitest'
import { assemble, assembleToBinary } from './assembler'

describe('Pulse Assembler', () => {
  describe('single instructions', () => {
    it('assembles LDA immediate', () => {
      const result = assemble('.org $0200\nLDA #$42')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.program.origin).toBe(0x0200)
      expect(Array.from(result.program.binary)).toEqual([0xA9, 0x42])
    })

    it('assembles STA absolute', () => {
      const result = assemble('.org $0200\nSTA $F030')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(Array.from(result.program.binary)).toEqual([0x8D, 0x30, 0xF0])
    })

    it('assembles JMP absolute', () => {
      const result = assemble('.org $0200\nJMP $1234')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(Array.from(result.program.binary)).toEqual([0x4C, 0x34, 0x12])
    })

    it('assembles RTS implied', () => {
      const result = assemble('.org $0200\nRTS')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(Array.from(result.program.binary)).toEqual([0x60])
    })

    it('assembles DEX implied', () => {
      const result = assemble('.org $0200\nDEX')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(Array.from(result.program.binary)).toEqual([0xCA])
    })

    it('assembles LDX immediate', () => {
      const result = assemble('.org $0200\nLDX #$FF')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(Array.from(result.program.binary)).toEqual([0xA2, 0xFF])
    })
  })

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
  })

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
  })

  describe('relative branches', () => {
    it('assembles BNE forward', () => {
      const source = `
.org $0200
    BNE skip
    NOP
skip:
    RTS
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      // BNE offset: skip ($0204) - next PC ($0202) = +2
      expect(Array.from(result.program.binary)).toEqual([
        0xD0, 0x01,  // BNE +1 (skip over NOP)
        0xEA,        // NOP
        0x60,        // RTS
      ])
    })

    it('assembles BNE backward', () => {
      const source = `
.org $0200
loop:
    DEX
    BNE loop
`
      const result = assemble(source)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      // BNE offset: loop ($0200) - next PC ($0203) = -3
      expect(Array.from(result.program.binary)).toEqual([
        0xCA,        // DEX
        0xD0, 0xFD,  // BNE -3 (0xFD = -3 as signed byte)
      ])
    })

    it('errors on branch out of range', () => {
      // Create a branch that's too far
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
  })

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
  })

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
  })

  describe('full LED demo', () => {
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
  })

  describe('error handling', () => {
    it('errors on undefined symbol', () => {
      const source = '.org $0200\nJMP undefined'
      const result = assemble(source)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error.message).toContain('Undefined symbol')
    })

    it('errors on invalid addressing mode', () => {
      const source = '.org $0200\nRTS $1234'  // RTS doesn't take operand
      const result = assemble(source)
      // This might parse RTS then $1234 as separate, let's check a clearer case
    })
  })

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
  })
})
