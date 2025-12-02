// Integration tests for Pulse + CPU
// End-to-end verification that assembled programs run correctly

import { describe, it, expect } from 'vitest'
import { assemble } from '../pulse/assembler'
import { CPU, SimpleIO } from './cpu'
import { createMemory } from './memory'

describe('LED Demo Integration', () => {
  it('blinks LED on and off', () => {
    const source = `
; LED Demo
LED_PORT = $F030

.org $0200
main:
    LDA #1
    STA LED_PORT
    JSR delay
    LDA #0
    STA LED_PORT
    JSR delay
    JMP main

delay:
    LDX #$03      ; Short delay for testing
delay_loop:
    DEX
    BNE delay_loop
    RTS

.org $FFFC
.word main
`
    const result = assemble(source)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const memory = createMemory()
    const io = new SimpleIO()
    const cpu = new CPU(memory, io)

    // Load program into memory
    for (let i = 0; i < result.program.binary.length; i++) {
      memory[result.program.origin + i] = result.program.binary[i]
    }

    cpu.reset()
    expect(cpu.state.PC).toBe(0x0200)

    // Track LED state changes
    const ledHistory: number[] = []
    let lastLed = io.ledState

    // Run until we see LED toggle twice
    for (let i = 0; i < 100 && ledHistory.length < 4; i++) {
      cpu.step()
      if (io.ledState !== lastLed) {
        ledHistory.push(io.ledState)
        lastLed = io.ledState
      }
    }

    // LED should have gone: 0 -> 1 -> 0 -> 1
    expect(ledHistory).toEqual([1, 0, 1, 0])
  })

  it('runs delay loop correctly', () => {
    const source = `
.org $0200
    LDX #$05
loop:
    DEX
    BNE loop
    HLT

.org $FFFC
.word $0200
`
    const result = assemble(source)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const memory = createMemory()
    const cpu = new CPU(memory)

    for (let i = 0; i < result.program.binary.length; i++) {
      memory[result.program.origin + i] = result.program.binary[i]
    }

    cpu.reset()
    cpu.run()

    expect(cpu.state.X).toBe(0)
    expect(cpu.state.halted).toBe(true)
    // LDX + 5*(DEX + BNE) + HLT = 1 + 10 + 1 = 12 cycles
    // But BNE doesn't branch on last iteration, so 1 + 5*2 + 1 = 12
    expect(cpu.state.cycles).toBe(12)
  })

  it('handles JSR/RTS subroutine calls', () => {
    const source = `
.org $0200
    LDA #$00
    JSR increment
    JSR increment
    JSR increment
    HLT

increment:
    CLC
    ADC #1
    RTS

.org $FFFC
.word $0200
`
    const result = assemble(source)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const memory = createMemory()
    const cpu = new CPU(memory)

    for (let i = 0; i < result.program.binary.length; i++) {
      memory[result.program.origin + i] = result.program.binary[i]
    }

    cpu.reset()
    cpu.run()

    expect(cpu.state.A).toBe(3)  // Called increment 3 times
    expect(cpu.state.halted).toBe(true)
  })

  it('serial output works', () => {
    const source = `
SERIAL_TX = $F001

.org $0200
    LDA #$48    ; 'H'
    STA SERIAL_TX
    LDA #$49    ; 'I'
    STA SERIAL_TX
    HLT

.org $FFFC
.word $0200
`
    const result = assemble(source)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const memory = createMemory()
    const io = new SimpleIO()
    const cpu = new CPU(memory, io)

    for (let i = 0; i < result.program.binary.length; i++) {
      memory[result.program.origin + i] = result.program.binary[i]
    }

    cpu.reset()
    cpu.run()

    expect(io.serialOut).toEqual([0x48, 0x49])  // 'H', 'I'
  })
})
