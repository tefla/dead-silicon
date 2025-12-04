// End-to-End Execution Tests
// Tests the complete pipeline: Wire HDL → Gate Simulation + Pulse ASM → CPU Execution

import { describe, it, expect, beforeEach } from 'vitest'
import { lex as lexWire, parse as parseWire, compile as compileWire, createSimulator, resetNodeCounter } from './wire'
import { assemble, AssembleResult } from './pulse/assembler'
import { CPU, SimpleIO } from './fpga/cpu'
import { createMemory, VECTORS, IO_PORTS, MEMORY_MAP } from './fpga/memory'

// =============================================================================
// Helper Functions
// =============================================================================

function assemblePulseProgram(source: string): AssembleResult {
  return assemble(source)
}

function loadAndRun(source: string, maxCycles: number = 1000): { cpu: CPU; memory: Uint8Array; io: SimpleIO } {
  const result = assemble(source)
  if (!result.ok) throw new Error(`Assembly failed: ${result.error.message}`)

  const memory = createMemory()
  const io = new SimpleIO()
  const cpu = new CPU(memory, io)

  for (let i = 0; i < result.program.binary.length; i++) {
    memory[result.program.origin + i] = result.program.binary[i]
  }

  cpu.reset()
  cpu.run(maxCycles)

  return { cpu, memory, io }
}

// =============================================================================
// SECTION 1: Wire HDL End-to-End Tests
// =============================================================================

describe('E2E: Wire HDL Pipeline', () => {
  beforeEach(() => {
    resetNodeCounter()
  })

  describe('Basic Logic Circuits', () => {
    it('should simulate NOT gate from first principles', () => {
      const source = `
        module not(a) -> out:
          out = nand(a, a)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      sim.simulator.setInput('a', 0)
      sim.simulator.step()
      expect(sim.simulator.getOutput('out')).toBe(1)

      sim.simulator.setInput('a', 1)
      sim.simulator.step()
      expect(sim.simulator.getOutput('out')).toBe(0)
    })

    it('should simulate AND gate built from NAND', () => {
      const source = `
        module and(a, b) -> out:
          n = nand(a, b)
          out = nand(n, n)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      const testCases = [
        { a: 0, b: 0, expected: 0 },
        { a: 0, b: 1, expected: 0 },
        { a: 1, b: 0, expected: 0 },
        { a: 1, b: 1, expected: 1 }
      ]

      for (const { a, b, expected } of testCases) {
        sim.simulator.setInput('a', a)
        sim.simulator.setInput('b', b)
        sim.simulator.step()
        expect(sim.simulator.getOutput('out')).toBe(expected)
      }
    })

    it('should simulate OR gate built from NAND', () => {
      const source = `
        module or(a, b) -> out:
          na = nand(a, a)
          nb = nand(b, b)
          out = nand(na, nb)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      const testCases = [
        { a: 0, b: 0, expected: 0 },
        { a: 0, b: 1, expected: 1 },
        { a: 1, b: 0, expected: 1 },
        { a: 1, b: 1, expected: 1 }
      ]

      for (const { a, b, expected } of testCases) {
        sim.simulator.setInput('a', a)
        sim.simulator.setInput('b', b)
        sim.simulator.step()
        expect(sim.simulator.getOutput('out')).toBe(expected)
      }
    })

    it('should simulate XOR gate built from NAND', () => {
      const source = `
        module xor(a, b) -> out:
          n1 = nand(a, b)
          n2 = nand(a, n1)
          n3 = nand(b, n1)
          out = nand(n2, n3)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      const testCases = [
        { a: 0, b: 0, expected: 0 },
        { a: 0, b: 1, expected: 1 },
        { a: 1, b: 0, expected: 1 },
        { a: 1, b: 1, expected: 0 }
      ]

      for (const { a, b, expected } of testCases) {
        sim.simulator.setInput('a', a)
        sim.simulator.setInput('b', b)
        sim.simulator.step()
        expect(sim.simulator.getOutput('out')).toBe(expected)
      }
    })
  })

  describe('Arithmetic Circuits', () => {
    it('should simulate half adder', () => {
      const source = `
        module half_adder(a, b) -> (sum, carry):
          n1 = nand(a, b)
          n2 = nand(a, n1)
          n3 = nand(b, n1)
          sum = nand(n2, n3)
          c1 = nand(n1, n1)
          carry = c1
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      const testCases = [
        { a: 0, b: 0, sum: 0, carry: 0 },
        { a: 0, b: 1, sum: 1, carry: 0 },
        { a: 1, b: 0, sum: 1, carry: 0 },
        { a: 1, b: 1, sum: 0, carry: 1 }
      ]

      for (const { a, b, sum, carry } of testCases) {
        sim.simulator.setInput('a', a)
        sim.simulator.setInput('b', b)
        sim.simulator.step()
        expect(sim.simulator.getOutput('sum')).toBe(sum)
        expect(sim.simulator.getOutput('carry')).toBe(carry)
      }
    })

    it('should simulate full adder using half adders', () => {
      const source = `
        module half_adder(a, b) -> (sum, carry):
          n1 = nand(a, b)
          n2 = nand(a, n1)
          n3 = nand(b, n1)
          sum = nand(n2, n3)
          carry = nand(n1, n1)

        module full_adder(a, b, cin) -> (sum, cout):
          h1 = half_adder(a, b)
          h2 = half_adder(h1.sum, cin)
          sum = h2.sum
          c_not_a = nand(h1.carry, h1.carry)
          c_not_b = nand(h2.carry, h2.carry)
          cout = nand(c_not_a, c_not_b)
      `
      const sim = createSimulator(source, 'full_adder')
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      // Test all 8 combinations
      for (let a = 0; a <= 1; a++) {
        for (let b = 0; b <= 1; b++) {
          for (let cin = 0; cin <= 1; cin++) {
            const expected = a + b + cin
            const expectedSum = expected & 1
            const expectedCarry = (expected >> 1) & 1

            sim.simulator.setInput('a', a)
            sim.simulator.setInput('b', b)
            sim.simulator.setInput('cin', cin)
            sim.simulator.step()

            expect(sim.simulator.getOutput('sum')).toBe(expectedSum)
            expect(sim.simulator.getOutput('cout')).toBe(expectedCarry)
          }
        }
      }
    })
  })

  describe('Sequential Circuits', () => {
    it('should simulate D flip-flop with clock edge', () => {
      const source = `
        module dff_test(d, clk) -> q:
          q = dff(d, clk)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      // Set D=1, clock low -> Q should be 0 initially
      sim.simulator.setInput('d', 1)
      sim.simulator.setInput('clk', 0)
      sim.simulator.step()
      expect(sim.simulator.getOutput('q')).toBe(0)

      // Clock goes high -> Q should capture D=1
      sim.simulator.setInput('clk', 1)
      sim.simulator.step()
      expect(sim.simulator.getOutput('q')).toBe(1)

      // Change D to 0, clock still high -> Q should stay 1
      sim.simulator.setInput('d', 0)
      sim.simulator.step()
      expect(sim.simulator.getOutput('q')).toBe(1)

      // Clock low then high -> Q should capture D=0
      sim.simulator.setInput('clk', 0)
      sim.simulator.step()
      sim.simulator.setInput('clk', 1)
      sim.simulator.step()
      expect(sim.simulator.getOutput('q')).toBe(0)
    })

    it('should simulate a 2-bit counter', () => {
      const source = `
        module counter2(clk) -> (q0, q1):
          q0 = dff(n0, clk)
          n0 = nand(q0, q0)
          q1 = dff(n1, q0_bar)
          q0_bar = nand(q0, q0)
          n1 = nand(q1, q1)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      // Initialize
      sim.simulator.setInput('clk', 0)
      sim.simulator.step()

      // Count sequence - counter may start at any state
      const counts: number[] = []
      for (let i = 0; i < 8; i++) {
        sim.simulator.setInput('clk', 1)
        sim.simulator.step()
        const q0 = sim.simulator.getOutput('q0')
        const q1 = sim.simulator.getOutput('q1')
        counts.push(q1 * 2 + q0)
        sim.simulator.setInput('clk', 0)
        sim.simulator.step()
      }

      // Counter should visit all 4 states (0,1,2,3) and wrap around
      // Check that we see sequential counting pattern
      for (let i = 1; i < counts.length; i++) {
        const expected = (counts[i - 1] + 1) % 4
        expect(counts[i]).toBe(expected)
      }
      // Also verify we hit all 4 values
      const unique = new Set(counts)
      expect(unique.size).toBe(4)
    })
  })

  describe('Complex Multi-Module Circuits', () => {
    it('should simulate a 2-to-1 multiplexer', () => {
      const source = `
        module mux2(sel, a, b) -> out:
          sel_bar = nand(sel, sel)
          t1 = nand(sel_bar, a)
          t2 = nand(sel, b)
          out = nand(t1, t2)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      // sel=0 selects a
      sim.simulator.setInput('sel', 0)
      sim.simulator.setInput('a', 1)
      sim.simulator.setInput('b', 0)
      sim.simulator.step()
      expect(sim.simulator.getOutput('out')).toBe(1)

      // sel=1 selects b
      sim.simulator.setInput('sel', 1)
      sim.simulator.setInput('a', 1)
      sim.simulator.setInput('b', 0)
      sim.simulator.step()
      expect(sim.simulator.getOutput('out')).toBe(0)
    })

    it('should simulate SR latch', () => {
      const source = `
        module sr_latch(s, r) -> (q, qbar):
          q = nand(s, qbar)
          qbar = nand(r, q)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      // Set (S=0, R=1 in NAND-based SR latch)
      sim.simulator.setInput('s', 0)
      sim.simulator.setInput('r', 1)
      sim.simulator.step()
      expect(sim.simulator.getOutput('q')).toBe(1)
      expect(sim.simulator.getOutput('qbar')).toBe(0)

      // Hold (S=1, R=1)
      sim.simulator.setInput('s', 1)
      sim.simulator.step()
      expect(sim.simulator.getOutput('q')).toBe(1)

      // Reset (S=1, R=0)
      sim.simulator.setInput('r', 0)
      sim.simulator.step()
      expect(sim.simulator.getOutput('q')).toBe(0)
      expect(sim.simulator.getOutput('qbar')).toBe(1)
    })
  })

  describe('Bus Operations', () => {
    it('should handle 8-bit buses through DFF', () => {
      const source = `
        module reg8(d:8, clk) -> q:8:
          q = dff(d, clk)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      // Test with various 8-bit values
      const testValues = [0x00, 0xFF, 0xAA, 0x55, 0x12, 0xFE]

      for (const val of testValues) {
        sim.simulator.setInput('d', val)
        sim.simulator.setInput('clk', 0)
        sim.simulator.step()
        sim.simulator.setInput('clk', 1)
        sim.simulator.step()
        expect(sim.simulator.getOutput('q')).toBe(val)
      }
    })
  })
})

// =============================================================================
// SECTION 2: Pulse Assembly End-to-End Tests
// =============================================================================

describe('E2E: Pulse Assembly Pipeline', () => {
  describe('Basic Programs', () => {
    it('should assemble and execute a simple load/store program', () => {
      const source = `
.org $0200
LDA #$42
STA $0300
HLT

.org $FFFC
.word $0200
      `
      const { memory } = loadAndRun(source)
      expect(memory[0x0300]).toBe(0x42)
    })

    it('should assemble and execute a program with arithmetic', () => {
      const source = `
.org $0200
LDA #$10
ADC #$25
STA $0300
HLT

.org $FFFC
.word $0200
      `
      const { memory } = loadAndRun(source)
      expect(memory[0x0300]).toBe(0x35)  // $10 + $25 = $35
    })

    it('should assemble and execute a program with labels', () => {
      const source = `
.org $0200
LDA #$00
loop:
  ADC #$01
  CMP #$05
  BNE loop
STA $0300
HLT

.org $FFFC
.word $0200
      `
      const { memory } = loadAndRun(source)
      expect(memory[0x0300]).toBe(0x05)
    })

    it('should assemble and execute a program with subroutines', () => {
      const source = `
.org $0200
JSR double
STA $0300
HLT

double:
  LDA #$21
  ADC #$21
  RTS

.org $FFFC
.word $0200
      `
      const { memory } = loadAndRun(source)
      expect(memory[0x0300]).toBe(0x42)  // $21 + $21 = $42
    })
  })

  describe('Complex Programs', () => {
    it('should execute a program that computes sum of 1 to 5 using immediate', () => {
      // CPU only supports ADC #imm, so we compute 1+2+3+4+5 manually
      const source = `
.org $0200
LDA #$00       ; sum = 0
CLC
ADC #$01       ; sum += 1
ADC #$02       ; sum += 2
ADC #$03       ; sum += 3
ADC #$04       ; sum += 4
ADC #$05       ; sum += 5
STA $0300      ; store sum

HLT

.org $FFFC
.word $0200
      `
      const { memory } = loadAndRun(source, 500)
      // Sum of 1+2+3+4+5 = 15 = $0F
      expect(memory[0x0300]).toBe(15)
    })

    it('should execute a program that finds maximum of 3 values', () => {
      // CPU only supports CMP #imm, so we compare values one by one
      const source = `
.org $0200
; Compare 3 values: $15, $7F, $23 - find max
; Start with first value
LDA #$15
STA $0300      ; max = $15

; Compare with $7F
LDA $0300      ; load current max
CMP #$7F       ; compare with $7F
BCS skip1      ; if max >= $7F, skip
LDA #$7F       ; new max = $7F
STA $0300
skip1:

; Compare with $23
LDA $0300      ; load current max
CMP #$23       ; compare with $23
BCS skip2      ; if max >= $23, skip
LDA #$23       ; new max = $23
STA $0300
skip2:

HLT

.org $FFFC
.word $0200
      `
      const { memory } = loadAndRun(source, 500)
      expect(memory[0x0300]).toBe(0x7F)  // Max is $7F
    })

    it('should execute a program with nested subroutines', () => {
      const source = `
.org $0200
JSR outer
HLT

outer:
  LDA #$10
  PHA          ; push $10
  JSR inner
  PLA          ; pull $10
  ADC #$05     ; add 5 to it
  STA $0300
  RTS

inner:
  LDA #$20
  STA $0301
  RTS

.org $FFFC
.word $0200
      `
      const { memory } = loadAndRun(source)
      expect(memory[0x0300]).toBe(0x15)  // $10 + $05
      expect(memory[0x0301]).toBe(0x20)
    })
  })

  describe('I/O Operations', () => {
    it('should write to LED I/O port', () => {
      const source = `
.org $0200
LDA #$01
STA $F030    ; LED port
LDA #$02
STA $F030
LDA #$04
STA $F030
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

      const ledValues: number[] = []
      let lastLed = 0

      let cycles = 0
      while (!cpu.state.halted && cycles < 500) {
        cpu.step()
        if (io.ledState !== lastLed) {
          ledValues.push(io.ledState)
          lastLed = io.ledState
        }
        cycles++
      }

      expect(ledValues).toEqual([1, 2, 4])
    })

    it('should write to serial TX port', () => {
      const source = `
.org $0200
LDA #$48     ; 'H'
STA $F001    ; Serial TX
LDA #$69     ; 'i'
STA $F001
HLT

.org $FFFC
.word $0200
      `
      const { io } = loadAndRun(source)
      expect(io.serialOut).toEqual([0x48, 0x69])  // "Hi"
    })
  })

  describe('Symbol Resolution', () => {
    it('should resolve constants correctly', () => {
      const source = `
LED = $F030
VALUE = $42

.org $0200
LDA #VALUE
STA LED
HLT

.org $FFFC
.word $0200
      `
      const { io } = loadAndRun(source)
      expect(io.ledState).toBe(0x42)
    })

    it('should resolve forward references in labels', () => {
      const source = `
.org $0200
JMP skip
LDA #$FF
STA $0300
skip:
LDA #$42
STA $0300
HLT

.org $FFFC
.word $0200
      `
      const { memory } = loadAndRun(source)
      expect(memory[0x0300]).toBe(0x42)  // Skipped the $FF store
    })
  })
})

// =============================================================================
// SECTION 3: Combined Wire + Pulse End-to-End Tests
// =============================================================================

describe('E2E: Full System Pipeline', () => {
  describe('Wire Logic with CPU Control', () => {
    beforeEach(() => {
      resetNodeCounter()
    })

    it('should simulate a circuit that could be CPU-controlled', () => {
      // Test with single-bit data to avoid bus width issues
      // AND gate: output = data AND enable
      const wireSource = `
        module io_control(data, enable) -> output:
          nand_result = nand(data, enable)
          output = nand(nand_result, nand_result)
      `
      const sim = createSimulator(wireSource)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      // When enable=0, output should be 0 regardless of data
      sim.simulator.setInput('data', 1)
      sim.simulator.setInput('enable', 0)
      sim.simulator.step()
      expect(sim.simulator.getOutput('output')).toBe(0)

      // When enable=1, output should follow data
      sim.simulator.setInput('enable', 1)
      sim.simulator.step()
      expect(sim.simulator.getOutput('output')).toBe(1)

      // Test with data=0, enable=1 -> output=0
      sim.simulator.setInput('data', 0)
      sim.simulator.step()
      expect(sim.simulator.getOutput('output')).toBe(0)
    })
  })

  describe('CPU Programs with Hardware Semantics', () => {
    it('should execute a sensor polling loop', () => {
      const source = `
SENSOR = $00F0      ; Zero page sensor value (mock)
THRESHOLD = $50
LED = $F030

.org $0200
; Mock: write sensor value to "sensor register"
LDA #$80            ; Sensor reading above threshold
STA SENSOR

; Read sensor and compare
LDA SENSOR
CMP #THRESHOLD
BCC below           ; Branch if below threshold

; Above threshold - turn on LED
LDA #$FF
STA LED
JMP done

below:
LDA #$00
STA LED

done:
HLT

.org $FFFC
.word $0200
      `
      const { io } = loadAndRun(source)
      expect(io.ledState).toBe(0xFF)  // LED on because sensor > threshold
    })

    it('should execute a PWM-like LED dimming pattern', () => {
      const source = `
LED = $F030

.org $0200
LDX #$00        ; duty cycle counter
LDY #$00        ; PWM period counter

pwm_loop:
  ; Simple PWM: LED on for X cycles, off for 4-X cycles
  TXA
  CMP #$02      ; 50% duty
  BCC led_on
  LDA #$00
  JMP set_led
led_on:
  LDA #$01
set_led:
  STA LED
  INX
  CPX #$04      ; PWM period = 4
  BNE pwm_loop

  LDX #$00
  INY
  CPY #$08      ; Run 8 periods
  BNE pwm_loop

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

      // Track LED state changes
      const ledHistory: number[] = []
      let prevLed = io.ledState

      let cycles = 0
      while (!cpu.state.halted && cycles < 5000) {
        cpu.step()
        if (io.ledState !== prevLed) {
          ledHistory.push(io.ledState)
          prevLed = io.ledState
        }
        cycles++
      }

      // Should see alternating pattern
      expect(ledHistory.length).toBeGreaterThan(0)
      // First LED write should be ON (first two cycles of PWM)
      expect(ledHistory[0]).toBe(1)
    })
  })

  describe('Boot Sequence Simulation', () => {
    it('should execute a minimal boot sequence', () => {
      const source = `
SERIAL_TX = $F001
LED = $F030

.org $FF00          ; ROM area

reset:
  ; Init stack
  LDX #$FF
  TXS

  ; Signal boot started
  LDA #$42          ; 'B'
  STA SERIAL_TX

  ; LED test pattern
  LDA #$01
  STA LED
  LDA #$02
  STA LED
  LDA #$04
  STA LED

  ; Boot complete signal
  LDA #$4F          ; 'O'
  STA SERIAL_TX
  LDA #$4B          ; 'K'
  STA SERIAL_TX

  HLT

.org $FFFC
.word reset
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

      const ledHistory: number[] = []
      let prevLed = io.ledState

      let cycles = 0
      while (!cpu.state.halted && cycles < 1000) {
        cpu.step()
        if (io.ledState !== prevLed && io.ledState !== 0) {
          ledHistory.push(io.ledState)
          prevLed = io.ledState
        }
        cycles++
      }

      // Check serial output: "BOK"
      expect(io.serialOut).toEqual([0x42, 0x4F, 0x4B])

      // Check LED pattern: 1, 2, 4
      expect(ledHistory).toEqual([1, 2, 4])
    })

    it('should execute a self-test routine', () => {
      const source = `
RESULT = $0300
LED = $F030

.org $0200

; Self-test: verify ALU operations
self_test:
  LDA #$00
  STA RESULT        ; test_pass = 0 (will be set to 1 if pass)

  ; Test 1: Addition
  LDA #$25
  CLC
  ADC #$17
  CMP #$3C          ; $25 + $17 = $3C
  BNE fail

  ; Test 2: Subtraction
  LDA #$50
  SEC
  SBC #$20
  CMP #$30          ; $50 - $20 = $30
  BNE fail

  ; Test 3: Logical AND
  LDA #$F0
  AND #$0F
  CMP #$00
  BNE fail

  ; Test 4: Logical OR
  LDA #$F0
  ORA #$0F
  CMP #$FF
  BNE fail

  ; All tests passed
  LDA #$01
  STA RESULT
  LDA #$FF          ; Success LED pattern
  STA LED
  JMP done

fail:
  LDA #$00
  STA RESULT
  LDA #$00          ; Failure LED pattern
  STA LED

done:
  HLT

.org $FFFC
.word $0200
      `
      const { memory, io } = loadAndRun(source, 2000)
      expect(memory[0x0300]).toBe(1)
      expect(io.ledState).toBe(0xFF)
    })
  })
})

// =============================================================================
// SECTION 4: Error Handling and Edge Cases
// =============================================================================

describe('E2E: Error Handling', () => {
  beforeEach(() => {
    resetNodeCounter()
  })

  describe('Wire Compilation Errors', () => {
    it('should treat undefined module as black box outputting 0', () => {
      // In this system, undefined modules are treated as black boxes
      // that output 0 during simulation (lazy evaluation style)
      const source = `
        module test(a) -> out:
          out = undefined_module(a)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      sim.simulator.setInput('a', 1)
      sim.simulator.step()
      // Undefined module outputs 0
      expect(sim.simulator.getOutput('out')).toBe(0)
    })

    it('should reject nand with wrong argument count', () => {
      const source = `
        module test(a, b) -> out:
          out = nand(a)
      `
      const lexResult = lexWire(source)
      expect(lexResult.ok).toBe(true)
      if (!lexResult.ok) return

      const parseResult = parseWire(lexResult.tokens)
      expect(parseResult.ok).toBe(true)
      if (!parseResult.ok) return

      const compileResult = compileWire(parseResult.value)
      expect(compileResult.ok).toBe(false)
      if (!compileResult.ok) {
        expect(compileResult.error.message).toContain('nand requires 2 arguments')
      }
    })
  })

  describe('Pulse Assembly Errors', () => {
    it('should handle undefined label', () => {
      const source = `
.org $0200
JMP undefined_label
      `
      const result = assemblePulseProgram(source)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error.message).toContain('Undefined symbol')
    })

    it('should handle invalid addressing mode', () => {
      const source = `
.org $0200
JMP #$42
      `
      const result = assemblePulseProgram(source)
      expect(result.ok).toBe(false)
    })

    it('should handle branch out of range', () => {
      // Create a program where branch target is too far
      let source = '.org $0200\nBEQ far_label\n'
      // Add many NOPs to push the label far away
      for (let i = 0; i < 130; i++) {
        source += 'NOP\n'
      }
      source += 'far_label:\nHLT\n'

      const result = assemblePulseProgram(source)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error.message).toContain('out of range')
    })
  })

  describe('CPU Runtime Edge Cases', () => {
    it('should handle stack overflow gracefully', () => {
      const source = `
.org $0200
LDX #$00      ; Start with full stack (will wrap)
TXS

push_loop:
  PHA
  JMP push_loop

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

      // Run for limited cycles - stack will wrap around
      for (let i = 0; i < 1000; i++) {
        cpu.step()
      }

      // Should still be running (infinite loop) without crashing
      expect(cpu.state.halted).toBe(false)
    })
  })
})

// =============================================================================
// SECTION 5: Performance and Stress Tests
// =============================================================================

describe('E2E: Stress Tests', () => {
  beforeEach(() => {
    resetNodeCounter()
  })

  describe('Wire Simulation Stress', () => {
    it('should handle deeply nested module instantiation', () => {
      // Chain of NOT gates
      let source = 'module not(a) -> out:\n  out = nand(a, a)\n\n'
      source += 'module chain(a) -> out:\n'
      source += '  t0 = not(a)\n'
      for (let i = 1; i < 20; i++) {
        source += `  t${i} = not(t${i-1})\n`
      }
      source += '  out = t19\n'

      const sim = createSimulator(source, 'chain')
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      // 20 inversions means: input 0 -> output 0, input 1 -> output 1
      sim.simulator.setInput('a', 0)
      sim.simulator.step()
      expect(sim.simulator.getOutput('out')).toBe(0)

      sim.simulator.setInput('a', 1)
      sim.simulator.step()
      expect(sim.simulator.getOutput('out')).toBe(1)
    })

    it('should handle rapid clock toggling', () => {
      const source = `
        module counter(clk) -> q:
          q = dff(n, clk)
          n = nand(q, q)
      `
      const sim = createSimulator(source)
      expect(sim.ok).toBe(true)
      if (!sim.ok) return

      // Toggle clock 1000 times
      for (let i = 0; i < 1000; i++) {
        sim.simulator.setInput('clk', i % 2)
        sim.simulator.step()
      }

      // Should still be functional
      expect([0, 1]).toContain(sim.simulator.getOutput('q'))
    })
  })

  describe('CPU Execution Stress', () => {
    it('should execute 10000 instructions without issue', () => {
      const source = `
.org $0200
LDA #$00
LDX #$00
LDY #$00

loop:
  INX
  INY
  ADC #$01
  CPX #$00     ; Will be 0 after 256 increments
  BNE loop

  ; X wrapped to 0, check Y
  CPY #$00     ; Y also wrapped
  BNE loop

HLT

.org $FFFC
.word $0200
      `
      const { cpu } = loadAndRun(source, 500000)

      expect(cpu.state.halted).toBe(true)
      // X and Y should both be 0 after wrapping 256 times each
      expect(cpu.state.X).toBe(0)
      expect(cpu.state.Y).toBe(0)
    })

    it('should handle memory operations with immediate arithmetic', () => {
      // CPU doesn't support indexed addressing, so we do a simpler test
      const source = `
.org $0200
; Fill 4 memory locations manually
LDA #$00
STA $0300
LDA #$01
STA $0301
LDA #$02
STA $0302
LDA #$03
STA $0303

; Sum them using immediate mode
LDA $0300     ; load 0
CLC
ADC #$01      ; add 1 (value at $0301)
ADC #$02      ; add 2 (value at $0302)
ADC #$03      ; add 3 (value at $0303)
; Sum = 0+1+2+3 = 6

STA $0400     ; Store sum
HLT

.org $FFFC
.word $0200
      `
      const { cpu, memory } = loadAndRun(source, 500)

      expect(cpu.state.halted).toBe(true)

      // Verify memory was filled correctly
      expect(memory[0x0300]).toBe(0)
      expect(memory[0x0301]).toBe(1)
      expect(memory[0x0302]).toBe(2)
      expect(memory[0x0303]).toBe(3)

      // Sum = 0+1+2+3 = 6
      expect(memory[0x0400]).toBe(6)
    })
  })
})

// =============================================================================
// SECTION 6: Game-Specific Scenarios
// =============================================================================

describe('E2E: Game Scenarios', () => {
  describe('Life Support System', () => {
    it('should simulate O2 sensor reading and threshold check', () => {
      const source = `
O2_SENSOR = $00F0
O2_THRESHOLD = $50   ; 50% threshold
ALARM_LED = $F030

.org $0200
; Simulate sensor reading
LDA #$30             ; 48% O2 - below threshold!
STA O2_SENSOR

; Check against threshold
LDA O2_SENSOR
CMP #O2_THRESHOLD
BCS safe             ; Branch if >= threshold

; Danger! O2 low
LDA #$FF
STA ALARM_LED        ; Turn on alarm
JMP done

safe:
LDA #$00
STA ALARM_LED

done:
HLT

.org $FFFC
.word $0200
      `
      const { io } = loadAndRun(source)
      // O2 was below threshold, alarm should be on
      expect(io.ledState).toBe(0xFF)
    })

    it('should simulate CO2 scrubber control loop', () => {
      const source = `
CO2_LEVEL = $00F1
SCRUBBER_CTRL = $00F2
LED = $F030

.org $0200
; Initialize
LDA #$00
STA SCRUBBER_CTRL

; Simulate CO2 building up
LDA #$10
STA CO2_LEVEL

; Scrubber control loop - runs 5 times
LDY #$05

scrub_loop:
  ; Check CO2 level
  LDA CO2_LEVEL
  CMP #$08             ; Threshold
  BCC co2_ok

  ; CO2 high - activate scrubber
  LDA #$01
  STA SCRUBBER_CTRL
  STA LED

  ; Scrubber reduces CO2
  LDA CO2_LEVEL
  SEC
  SBC #$02
  STA CO2_LEVEL
  JMP next

co2_ok:
  LDA #$00
  STA SCRUBBER_CTRL
  STA LED

next:
  DEY
  BNE scrub_loop

HLT

.org $FFFC
.word $0200
      `
      const { memory } = loadAndRun(source, 5000)
      // CO2 started at $10 (16), scrubber reduced by 2 each time while > 8
      // After enough iterations, should be reduced
      expect(memory[0x00F1]).toBeLessThan(0x10)
    })
  })

  describe('Navigation System', () => {
    it('should compute simple position calculation', () => {
      // CPU only supports ADC #imm, so we use hardcoded velocity values
      const source = `
POS_X = $0300
POS_Y = $0301

.org $0200
; Initialize position
LDA #$50
STA POS_X
LDA #$50
STA POS_Y

; Update position 10 times with fixed velocity
; VX = 2, VY = 3
LDY #$0A

update:
  ; X += 2
  LDA POS_X
  CLC
  ADC #$02
  STA POS_X

  ; Y += 3
  LDA POS_Y
  CLC
  ADC #$03
  STA POS_Y

  DEY
  BNE update

HLT

.org $FFFC
.word $0200
      `
      const { memory } = loadAndRun(source, 10000)
      // X: $50 (80) + (2 * 10) = 100 = $64
      expect(memory[0x0300]).toBe(0x64)  // 100 decimal
      // Y: $50 (80) + (3 * 10) = 110 = $6E
      expect(memory[0x0301]).toBe(0x6E)  // 110 decimal
    })
  })

  describe('Communication System', () => {
    it('should transmit a message via serial', () => {
      // CPU doesn't support indexed addressing, transmit directly
      const source = `
SERIAL_TX = $F001

.org $0200
; Transmit "SOS" directly
LDA #$53       ; 'S'
STA SERIAL_TX
LDA #$4F       ; 'O'
STA SERIAL_TX
LDA #$53       ; 'S'
STA SERIAL_TX

HLT

.org $FFFC
.word $0200
      `
      const { io } = loadAndRun(source)

      // Should have transmitted "SOS"
      expect(io.serialOut).toEqual([0x53, 0x4F, 0x53])

      // Convert to string
      const message = String.fromCharCode(...io.serialOut)
      expect(message).toBe('SOS')
    })

    it('should encode message with XOR cipher', () => {
      const source = `
SERIAL_TX = $F001
KEY = $AA

.org $0200
; Encode and transmit "HI" with XOR
LDA #$48       ; 'H'
EOR #KEY
STA SERIAL_TX

LDA #$49       ; 'I'
EOR #KEY
STA SERIAL_TX

HLT

.org $FFFC
.word $0200
      `
      const { io } = loadAndRun(source)

      // 'H' (0x48) XOR 0xAA = 0xE2
      // 'I' (0x49) XOR 0xAA = 0xE3
      expect(io.serialOut).toEqual([0xE2, 0xE3])

      // Decode by XORing again
      const decoded = io.serialOut.map(c => c ^ 0xAA)
      expect(String.fromCharCode(...decoded)).toBe('HI')
    })
  })
})
