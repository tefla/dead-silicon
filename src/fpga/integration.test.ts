// Integration tests for Pulse + CPU
// End-to-end verification that assembled programs run correctly

import { describe, it, expect } from 'vitest'
import { assemble } from '../pulse/assembler'
import { CPU, SimpleIO, IOHandler } from './cpu'
import { createMemory, VECTORS, IO_PORTS, MEMORY_MAP } from './memory'

// Helper to assemble and load a program
function loadAndRun(
  source: string,
  io?: IOHandler,
  maxCycles: number = 1000
): { cpu: CPU; memory: Uint8Array; io: SimpleIO } {
  const result = assemble(source)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error('Assembly failed')

  const memory = createMemory()
  const simpleIO = io instanceof SimpleIO ? io : new SimpleIO()
  const cpu = new CPU(memory, simpleIO)

  for (let i = 0; i < result.program.binary.length; i++) {
    memory[result.program.origin + i] = result.program.binary[i]
  }

  cpu.reset()
  cpu.run(maxCycles)

  return { cpu, memory, io: simpleIO }
}

// ============================================
// BASIC INTEGRATION TESTS
// ============================================

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

// ============================================
// ARITHMETIC INTEGRATION TESTS
// ============================================

describe('Arithmetic Programs', () => {
  it('adds two numbers', () => {
    const { cpu, memory } = loadAndRun(`
.org $0200
    CLC
    LDA #$25
    ADC #$17
    STA $0300
    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0x3C)  // 0x25 + 0x17 = 0x3C
    expect(cpu.state.halted).toBe(true)
  })

  it('subtracts two numbers', () => {
    const { cpu, memory } = loadAndRun(`
.org $0200
    SEC
    LDA #$30
    SBC #$10
    STA $0300
    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0x20)  // 0x30 - 0x10 = 0x20
    expect(cpu.state.halted).toBe(true)
  })

  it('multiplies by repeated addition', () => {
    const { cpu, memory } = loadAndRun(`
; Multiply 7 * 5 = 35
.org $0200
    LDA #$00      ; result = 0
    LDX #$05      ; counter = 5
mult_loop:
    CLC
    ADC #$07      ; result += 7
    DEX
    BNE mult_loop
    STA $0300     ; store result
    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(35)  // 7 * 5 = 35
  })

  it('computes sum of 1 to 5', () => {
    // Sum = 1 + 2 + 3 + 4 + 5 = 15
    // Note: CPU only supports ADC #imm, not ADC abs
    const { cpu, memory } = loadAndRun(`
.org $0200
    LDA #$00
    CLC
    ADC #$01
    CLC
    ADC #$02
    CLC
    ADC #$03
    CLC
    ADC #$04
    CLC
    ADC #$05
    STA $0300     ; result

    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(15)  // 1+2+3+4+5 = 15
  })

  it('handles overflow correctly', () => {
    const { cpu, memory } = loadAndRun(`
.org $0200
    CLC
    LDA #$FF
    ADC #$02      ; 255 + 2 = 257, wraps to 1
    STA $0300     ; Store wrapped result
    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0x01)
    expect(cpu.state.flags.C).toBe(true)  // Carry set
  })

  it('computes 16-bit addition manually', () => {
    // Add $1234 + $5678 = $68AC
    const { cpu, memory } = loadAndRun(`
.org $0200
    ; Low byte: $34 + $78 = $AC with carry
    CLC
    LDA #$34
    ADC #$78
    STA $0300     ; Low byte of result

    ; High byte: $12 + $56 + carry
    LDA #$12
    ADC #$56
    STA $0301     ; High byte of result

    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0xAC)  // Low byte
    expect(memory[0x0301]).toBe(0x68)  // High byte
  })
})

// ============================================
// CONTROL FLOW TESTS
// ============================================

describe('Control Flow', () => {
  it('handles conditional branching', () => {
    const { cpu, memory } = loadAndRun(`
.org $0200
    LDA #$05
    CMP #$05
    BEQ equal
    LDA #$00      ; Should skip this
    JMP done
equal:
    LDA #$FF      ; Should execute this
done:
    STA $0300
    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0xFF)
  })

  it('handles BNE/BEQ loop exit', () => {
    const { cpu, memory } = loadAndRun(`
.org $0200
    LDX #$03
    LDA #$00
loop:
    CLC
    ADC #$10      ; Add 16 each iteration
    DEX
    BNE loop
    STA $0300     ; Should be 0x30 (48)
    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0x30)  // 16 * 3 = 48
    expect(cpu.state.X).toBe(0)
  })

  it('handles BCC/BCS carry branching', () => {
    const { cpu, memory } = loadAndRun(`
.org $0200
    ; Test BCC (branch if carry clear)
    CLC
    BCC cc_taken
    LDA #$00
    JMP next1
cc_taken:
    LDA #$01
next1:
    STA $0300

    ; Test BCS (branch if carry set)
    SEC
    BCS cs_taken
    LDA #$00
    JMP done
cs_taken:
    LDA #$02
done:
    STA $0301
    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0x01)  // BCC taken
    expect(memory[0x0301]).toBe(0x02)  // BCS taken
  })

  it('handles nested subroutines', () => {
    const { cpu, memory } = loadAndRun(`
.org $0200
    LDA #$00
    JSR outer
    STA $0300
    HLT

outer:
    CLC
    ADC #$10
    JSR inner
    RTS

inner:
    CLC
    ADC #$05
    RTS

.org $FFFC
.word $0200
`)
    // outer adds 0x10, calls inner which adds 0x05
    expect(memory[0x0300]).toBe(0x15)  // 16 + 5 = 21
  })

  it('handles deeply nested subroutines', () => {
    const { cpu, memory } = loadAndRun(`
.org $0200
    LDA #$01
    JSR level1
    STA $0300
    HLT

level1:
    CLC
    ADC #$01
    JSR level2
    RTS

level2:
    CLC
    ADC #$01
    JSR level3
    RTS

level3:
    CLC
    ADC #$01
    RTS

.org $FFFC
.word $0200
`)
    // 1 + 1 + 1 + 1 = 4
    expect(memory[0x0300]).toBe(4)
  })
})

// ============================================
// STACK TESTS
// ============================================

describe('Stack Operations', () => {
  it('pushes and pulls correctly', () => {
    const { cpu, memory } = loadAndRun(`
.org $0200
    LDA #$AA
    PHA
    LDA #$BB
    PHA
    LDA #$CC
    PHA

    ; Pull in reverse order
    PLA
    STA $0300     ; Should be $CC
    PLA
    STA $0301     ; Should be $BB
    PLA
    STA $0302     ; Should be $AA

    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0xCC)
    expect(memory[0x0301]).toBe(0xBB)
    expect(memory[0x0302]).toBe(0xAA)
  })

  it('uses stack for temporary storage', () => {
    const { cpu, memory } = loadAndRun(`
.org $0200
    ; Save A
    LDA #$42
    PHA

    ; Do some work
    LDA #$00
    LDX #$05
work:
    CLC
    ADC #$10
    DEX
    BNE work
    STA $0300     ; Store work result

    ; Restore A
    PLA
    STA $0301     ; Store original A

    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0x50)  // Work result (5 * 16)
    expect(memory[0x0301]).toBe(0x42)  // Original A restored
  })

  it('handles stack in subroutines', () => {
    const { cpu, memory } = loadAndRun(`
.org $0200
    LDA #$11
    PHA
    JSR subroutine
    PLA
    STA $0300
    HLT

subroutine:
    LDA #$22
    PHA
    LDA #$33
    PLA           ; Should get $22, not $11
    STA $0301
    RTS

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0x11)  // Original value still on stack
    expect(memory[0x0301]).toBe(0x22)  // Subroutine's push/pull
  })
})

// ============================================
// I/O INTEGRATION TESTS
// ============================================

describe('I/O Operations', () => {
  it('outputs countdown to serial', () => {
    const { io } = loadAndRun(`
SERIAL_TX = $F001

.org $0200
    LDX #$05
countdown:
    TXA
    STA SERIAL_TX
    DEX
    BNE countdown
    HLT

.org $FFFC
.word $0200
`)
    expect(io.serialOut).toEqual([5, 4, 3, 2, 1])
  })

  it('outputs ASCII message', () => {
    const { io } = loadAndRun(`
SERIAL_TX = $F001

.org $0200
    LDA #$48    ; 'H'
    STA SERIAL_TX
    LDA #$45    ; 'E'
    STA SERIAL_TX
    LDA #$4C    ; 'L'
    STA SERIAL_TX
    LDA #$4C    ; 'L'
    STA SERIAL_TX
    LDA #$4F    ; 'O'
    STA SERIAL_TX
    HLT

.org $FFFC
.word $0200
`)
    expect(io.serialOut).toEqual([0x48, 0x45, 0x4C, 0x4C, 0x4F])
    // Convert to string
    const message = String.fromCharCode(...io.serialOut)
    expect(message).toBe('HELLO')
  })

  it('reads serial status', () => {
    const io = new SimpleIO()
    io.serialIn = [0x41, 0x42]  // 'A', 'B' waiting

    const result = assemble(`
SERIAL_STATUS = $F002

.org $0200
    LDA SERIAL_STATUS
    STA $0300         ; Should be 1 (data available)
    HLT

.org $FFFC
.word $0200
`)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const memory = createMemory()
    const cpu = new CPU(memory, io)
    for (let i = 0; i < result.program.binary.length; i++) {
      memory[result.program.origin + i] = result.program.binary[i]
    }
    cpu.reset()
    cpu.run()

    expect(memory[0x0300]).toBe(1)  // Data available
  })

  it('reads serial data', () => {
    const io = new SimpleIO()
    io.serialIn = [0x41, 0x42, 0x43]  // 'A', 'B', 'C'

    const result = assemble(`
SERIAL_RX = $F000

.org $0200
    LDA SERIAL_RX
    STA $0300
    LDA SERIAL_RX
    STA $0301
    LDA SERIAL_RX
    STA $0302
    HLT

.org $FFFC
.word $0200
`)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const memory = createMemory()
    const cpu = new CPU(memory, io)
    for (let i = 0; i < result.program.binary.length; i++) {
      memory[result.program.origin + i] = result.program.binary[i]
    }
    cpu.reset()
    cpu.run()

    expect(memory[0x0300]).toBe(0x41)  // 'A'
    expect(memory[0x0301]).toBe(0x42)  // 'B'
    expect(memory[0x0302]).toBe(0x43)  // 'C'
    expect(io.serialIn.length).toBe(0)  // All consumed
  })

  it('controls LED with patterns', () => {
    const result = assemble(`
LED_PORT = $F030

.org $0200
    LDA #$01
    STA LED_PORT
    LDA #$02
    STA LED_PORT
    LDA #$03
    STA LED_PORT
    LDA #$04
    STA LED_PORT
    HLT

.org $FFFC
.word $0200
`)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const memory = createMemory()
    const io = new SimpleIO()
    const cpu = new CPU(memory, io)

    for (let i = 0; i < result.program.binary.length; i++) {
      memory[result.program.origin + i] = result.program.binary[i]
    }

    // Track LED changes - skip initial 0 state
    const ledValues: number[] = []
    let lastLed = io.ledState  // Start with actual initial state (0)

    cpu.reset()
    for (let i = 0; i < 100 && !cpu.state.halted; i++) {
      cpu.step()
      if (io.ledState !== lastLed && io.ledState !== 0) {
        // Only track non-zero values (our pattern values)
        ledValues.push(io.ledState)
        lastLed = io.ledState
      }
    }

    expect(ledValues).toEqual([1, 2, 3, 4])
  })
})

// ============================================
// LOGIC OPERATION TESTS
// ============================================

describe('Logic Operations', () => {
  it('performs AND masking', () => {
    const { memory } = loadAndRun(`
.org $0200
    LDA #$FF
    AND #$0F      ; Mask lower nibble
    STA $0300

    LDA #$AA
    AND #$F0      ; Mask upper nibble
    STA $0301

    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0x0F)
    expect(memory[0x0301]).toBe(0xA0)
  })

  it('performs OR combining', () => {
    const { memory } = loadAndRun(`
.org $0200
    LDA #$F0
    ORA #$0F      ; Combine nibbles
    STA $0300

    LDA #$00
    ORA #$AA
    STA $0301

    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0xFF)
    expect(memory[0x0301]).toBe(0xAA)
  })

  it('performs XOR operations', () => {
    const { memory } = loadAndRun(`
.org $0200
    ; XOR to invert bits
    LDA #$AA
    EOR #$FF
    STA $0300     ; Should be $55

    ; XOR with self = 0
    LDA #$42
    EOR #$42
    STA $0301     ; Should be 0

    ; Double XOR restores value
    LDA #$37
    EOR #$AA
    EOR #$AA
    STA $0302     ; Should be $37

    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0x55)
    expect(memory[0x0301]).toBe(0x00)
    expect(memory[0x0302]).toBe(0x37)
  })
})

// ============================================
// REGISTER TRANSFER TESTS
// ============================================

describe('Register Transfers', () => {
  it('transfers between all registers', () => {
    const { cpu, memory } = loadAndRun(`
.org $0200
    ; Load A, transfer to X and Y
    LDA #$42
    TAX
    TAY

    ; Store X and Y values
    TXA
    STA $0300
    TYA
    STA $0301

    ; Verify A still has value
    STA $0302

    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0x42)
    expect(memory[0x0301]).toBe(0x42)
    expect(memory[0x0302]).toBe(0x42)
    expect(cpu.state.X).toBe(0x42)
    expect(cpu.state.Y).toBe(0x42)
  })

  it('handles stack pointer transfers', () => {
    const { cpu, memory } = loadAndRun(`
.org $0200
    ; Get current SP
    TSX
    TXA
    STA $0300     ; Store original SP

    ; Set SP to specific value
    LDX #$80
    TXS

    ; Read it back
    TSX
    TXA
    STA $0301

    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0xFF)  // Initial SP
    expect(memory[0x0301]).toBe(0x80)  // Modified SP
  })
})

// ============================================
// COMPARE AND FLAG TESTS
// ============================================

describe('Compare Operations', () => {
  it('compares equal values', () => {
    const { memory } = loadAndRun(`
.org $0200
    LDA #$50
    CMP #$50
    BEQ equal
    LDA #$00
    JMP store
equal:
    LDA #$01
store:
    STA $0300
    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0x01)  // Equal branch taken
  })

  it('compares A > value', () => {
    const { cpu, memory } = loadAndRun(`
.org $0200
    LDA #$80
    CMP #$40
    BCS greater
    LDA #$00
    JMP store
greater:
    LDA #$01
store:
    STA $0300
    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0x01)  // A >= value, carry set
  })

  it('compares A < value', () => {
    const { cpu, memory } = loadAndRun(`
.org $0200
    LDA #$40
    CMP #$80
    BCC less
    LDA #$00
    JMP store
less:
    LDA #$01
store:
    STA $0300
    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0x01)  // A < value, carry clear
  })

  it('uses CPX for loop control', () => {
    const { memory } = loadAndRun(`
.org $0200
    LDA #$00
    LDX #$00
loop:
    CLC
    ADC #$01
    INX
    CPX #$05
    BNE loop
    STA $0300
    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(5)  // Looped 5 times
  })

  it('uses CPY for loop control', () => {
    const { memory } = loadAndRun(`
.org $0200
    LDA #$00
    LDY #$00
loop:
    CLC
    ADC #$02
    INY
    CPY #$04
    BNE loop
    STA $0300
    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(8)  // 2 * 4 = 8
  })
})

// ============================================
// STRESS TESTS
// ============================================

describe('Stress Tests', () => {
  it('handles long computation', () => {
    const { memory, cpu } = loadAndRun(`
.org $0200
    ; Count from 0 to 255
    LDA #$00
    LDX #$00
count:
    CLC
    ADC #$01
    INX
    CPX #$FF
    BNE count
    STA $0300
    HLT

.org $FFFC
.word $0200
`, undefined, 2000)
    expect(memory[0x0300]).toBe(0xFF)  // 255 iterations
  })

  it('handles nested loops', () => {
    const { memory, cpu } = loadAndRun(`
.org $0200
    LDA #$00
    LDY #$03
outer:
    LDX #$05
inner:
    CLC
    ADC #$01
    DEX
    BNE inner
    DEY
    BNE outer
    STA $0300
    HLT

.org $FFFC
.word $0200
`, undefined, 500)
    expect(memory[0x0300]).toBe(15)  // 3 * 5 = 15
  })

  it('handles many subroutine calls', () => {
    const { memory, cpu } = loadAndRun(`
.org $0200
    LDA #$00
    LDX #$20      ; Call 32 times
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
`, undefined, 1000)
    expect(memory[0x0300]).toBe(32)
  })

  it('handles recursive-style calls', () => {
    // Not true recursion (no state), but tests stack depth
    const { memory, cpu } = loadAndRun(`
.org $0200
    LDA #$01
    JSR depth1
    STA $0300
    HLT

depth1:
    CLC
    ADC #$01
    JSR depth2
    RTS

depth2:
    CLC
    ADC #$01
    JSR depth3
    RTS

depth3:
    CLC
    ADC #$01
    JSR depth4
    RTS

depth4:
    CLC
    ADC #$01
    RTS

.org $FFFC
.word $0200
`, undefined, 100)
    expect(memory[0x0300]).toBe(5)  // 1 + 4 increments
  })

  it('handles rapid flag changes', () => {
    const { cpu } = loadAndRun(`
.org $0200
    LDX #$20
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
`, undefined, 500)
    expect(cpu.state.halted).toBe(true)
    expect(cpu.state.flags.C).toBe(false)  // Last was CLC
  })

  it('survives maximum cycle run', () => {
    // Infinite loop that should timeout
    const result = assemble(`
.org $0200
loop:
    NOP
    JMP loop

.org $FFFC
.word $0200
`)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const memory = createMemory()
    const cpu = new CPU(memory)
    for (let i = 0; i < result.program.binary.length; i++) {
      memory[result.program.origin + i] = result.program.binary[i]
    }

    cpu.reset()
    cpu.run(100)

    expect(cpu.state.cycles).toBe(100)
    expect(cpu.state.halted).toBe(false)  // Still running
  })
})

// ============================================
// MEMORY PATTERN TESTS
// ============================================

describe('Memory Patterns', () => {
  it('fills memory region', () => {
    const { memory } = loadAndRun(`
.org $0200
    LDA #$AA
    STA $0300
    STA $0301
    STA $0302
    STA $0303
    STA $0304
    STA $0305
    STA $0306
    STA $0307
    HLT

.org $FFFC
.word $0200
`)
    for (let i = 0; i < 8; i++) {
      expect(memory[0x0300 + i]).toBe(0xAA)
    }
  })

  it('creates alternating pattern', () => {
    const { memory } = loadAndRun(`
.org $0200
    LDA #$55
    STA $0300
    LDA #$AA
    STA $0301
    LDA #$55
    STA $0302
    LDA #$AA
    STA $0303
    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0x55)
    expect(memory[0x0301]).toBe(0xAA)
    expect(memory[0x0302]).toBe(0x55)
    expect(memory[0x0303]).toBe(0xAA)
  })

  it('copies data between locations', () => {
    const { memory } = loadAndRun(`
.org $0200
    ; Set source values
    LDA #$11
    STA $0350
    LDA #$22
    STA $0351
    LDA #$33
    STA $0352

    ; Copy to destination
    LDA $0350
    STA $0360
    LDA $0351
    STA $0361
    LDA $0352
    STA $0362

    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0360]).toBe(0x11)
    expect(memory[0x0361]).toBe(0x22)
    expect(memory[0x0362]).toBe(0x33)
  })
})

// ============================================
// EDGE CASE TESTS
// ============================================

describe('Edge Cases', () => {
  it('handles zero register operations', () => {
    const { cpu, memory } = loadAndRun(`
.org $0200
    LDA #$00
    LDX #$00
    LDY #$00
    TAX
    TAY
    TXA
    TYA
    STA $0300
    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0)
    expect(cpu.state.flags.Z).toBe(true)
  })

  it('handles $FF register operations', () => {
    const { cpu, memory } = loadAndRun(`
.org $0200
    LDA #$FF
    TAX
    TAY
    INX           ; Wrap to 0
    INY           ; Wrap to 0
    TXA
    STA $0300     ; Should be 0
    TYA
    STA $0301     ; Should be 0
    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0)
    expect(memory[0x0301]).toBe(0)
    expect(cpu.state.flags.Z).toBe(true)
  })

  it('handles branch at exact boundary', () => {
    const { cpu, memory } = loadAndRun(`
.org $0200
    LDA #$00
    BEQ skip
    LDA #$FF      ; Should not execute
skip:
    STA $0300
    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0)
  })

  it('handles back-to-back branches', () => {
    const { memory } = loadAndRun(`
.org $0200
    LDA #$00
    BEQ skip1
    LDA #$11
skip1:
    BEQ skip2
    LDA #$22
skip2:
    STA $0300
    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0)
  })

  it('handles empty subroutine', () => {
    const { cpu, memory } = loadAndRun(`
.org $0200
    LDA #$42
    JSR empty_sub
    STA $0300
    HLT

empty_sub:
    RTS

.org $FFFC
.word $0200
`)
    expect(memory[0x0300]).toBe(0x42)
  })
})

// ============================================
// COMBINED FEATURE TESTS
// ============================================

describe('Combined Features', () => {
  it('implements simple counter with I/O', () => {
    const io = new SimpleIO()

    const result = assemble(`
SERIAL_TX = $F001

.org $0200
    LDX #$05
    LDA #$30      ; ASCII '0'
count:
    STA SERIAL_TX
    CLC
    ADC #$01
    DEX
    BNE count
    HLT

.org $FFFC
.word $0200
`)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const memory = createMemory()
    const cpu = new CPU(memory, io)
    for (let i = 0; i < result.program.binary.length; i++) {
      memory[result.program.origin + i] = result.program.binary[i]
    }

    cpu.reset()
    cpu.run()

    // Should output '0', '1', '2', '3', '4'
    expect(io.serialOut).toEqual([0x30, 0x31, 0x32, 0x33, 0x34])
    expect(String.fromCharCode(...io.serialOut)).toBe('01234')
  })

  it('implements echo program simulation', () => {
    const io = new SimpleIO()
    io.serialIn = [0x48, 0x49]  // 'H', 'I'

    const result = assemble(`
SERIAL_RX = $F000
SERIAL_TX = $F001
SERIAL_STATUS = $F002

.org $0200
    ; Read and echo 2 characters
    LDX #$02
loop:
    LDA SERIAL_RX
    STA SERIAL_TX
    DEX
    BNE loop
    HLT

.org $FFFC
.word $0200
`)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const memory = createMemory()
    const cpu = new CPU(memory, io)
    for (let i = 0; i < result.program.binary.length; i++) {
      memory[result.program.origin + i] = result.program.binary[i]
    }

    cpu.reset()
    cpu.run()

    expect(io.serialOut).toEqual([0x48, 0x49])  // Echo back
    expect(io.serialIn.length).toBe(0)  // All consumed
  })

  it('implements simple calculator', () => {
    // Note: CPU only supports ADC #imm and SBC #imm, not memory modes
    const { memory } = loadAndRun(`
.org $0200
    ; Perform addition: 0x25 + 0x17 = 0x3C
    CLC
    LDA #$25
    ADC #$17
    STA $0360     ; Result

    ; Perform subtraction: 0x50 - 0x20 = 0x30
    SEC
    LDA #$50
    SBC #$20
    STA $0361     ; Result

    HLT

.org $FFFC
.word $0200
`)
    expect(memory[0x0360]).toBe(0x3C)  // 0x25 + 0x17
    expect(memory[0x0361]).toBe(0x30)  // 0x50 - 0x20
  })
})
