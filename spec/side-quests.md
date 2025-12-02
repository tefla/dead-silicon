# Dead Silicon — Side Quests

## Overview

Side quests are optional mini-projects that let players experiment with Wire and Pulse outside the main narrative. They're simpler, self-contained, and great for:

- Learning the languages before tackling story puzzles
- Testing that the toolchain works
- Having fun building things

---

## Side Quest 1: Blinking LED

**Available:** End of Day 3
**Difficulty:** Beginner
**Teaches:** Basic Wire modules, clock signals, Pulse I/O

### The Challenge

Make an LED blink on and off at a visible rate (roughly 1 Hz).

### Wire Component: `blinker.wire`

A simple circuit that divides the system clock down to a human-visible rate and outputs to an LED pin.

```wire
; Blinker - divides clock to make an LED blink
; System clock is fast (~1MHz), we need ~1Hz for visible blinking

module counter8(clk) -> q:8:
  ; 8-bit counter, increments on each clock rising edge
  q0 = dff(not(q[0]), clk)
  q1 = dff(xor(q[1], q[0]), clk)
  q2 = dff(xor(q[2], and(q[0], q[1])), clk)
  q3 = dff(xor(q[3], and3(q[0], q[1], q[2])), clk)
  q4 = dff(xor(q[4], and(and(q[0], q[1]), and(q[2], q[3]))), clk)
  q5 = dff(xor(q[5], and(and(q[0], q[1]), and3(q[2], q[3], q[4]))), clk)
  q6 = dff(xor(q[6], and(and3(q[0], q[1], q[2]), and3(q[3], q[4], q[5]))), clk)
  q7 = dff(xor(q[7], and(and3(q[0], q[1], q[2]), and(and3(q[3], q[4], q[5]), q[6]))), clk)
  q = concat(q7, q6, q5, q4, q3, q2, q1, q0)

module blinker(clk) -> led:
  ; Chain multiple counters for bigger division
  stage1 = counter8(clk)
  stage2 = counter8(stage1[7])
  stage3 = counter8(stage2[7])

  ; Use high bit of final stage as LED output
  ; This divides clock by 2^24 (~16 million)
  ; 1MHz / 16M = ~0.06 Hz (slow blink)
  ; Adjust which bit to use for different speeds
  led = stage3[7]
```

**Simpler version for testing:**

```wire
; Simple blinker - just toggles on each clock
; Good for testing, too fast to see in real life

module simple_blinker(clk) -> led:
  led = dff(not(led), clk)
```

### Pulse Component: `led_demo.pulse`

A firmware that manually controls the LED via I/O, demonstrating software-controlled blinking.

```asm
; LED Demo - Software-controlled blinking
; Memory map: 0xF030 = LED output register

LED_PORT = $F030
DELAY_COUNT = $FF    ; Adjust for blink speed

reset:
    LDX #$FF
    TXS              ; Init stack

main_loop:
    ; Turn LED on
    LDA #1
    STA LED_PORT

    ; Delay
    JSR delay

    ; Turn LED off
    LDA #0
    STA LED_PORT

    ; Delay
    JSR delay

    JMP main_loop

delay:
    ; Simple nested loop delay
    LDX #DELAY_COUNT
delay_outer:
    LDY #DELAY_COUNT
delay_inner:
    DEY
    BNE delay_inner
    DEX
    BNE delay_outer
    RTS

; Vectors
.org $FFFC
.word reset        ; Reset vector
.word reset        ; IRQ vector (unused)
```

### Testing

**Wire only (hardware blinker):**
```typescript
const result = createSimulator(blinkerSource, 'simple_blinker')
const sim = result.simulator

// Toggle clock and watch LED
for (let i = 0; i < 10; i++) {
  sim.setInput('clk', 0)
  sim.step()
  console.log(`Cycle ${i}, clk=0, led=${sim.getOutput('led')}`)

  sim.setInput('clk', 1)
  sim.step()
  console.log(`Cycle ${i}, clk=1, led=${sim.getOutput('led')}`)
}
```

**Expected output:**
```
Cycle 0, clk=0, led=0
Cycle 0, clk=1, led=1
Cycle 1, clk=0, led=1
Cycle 1, clk=1, led=0
Cycle 2, clk=0, led=0
Cycle 2, clk=1, led=1
...
```

### Variations

1. **Two LEDs alternating** - Add a second output that's the inverse
2. **Speed control** - Add an input to select different blink rates
3. **Pattern blinker** - Blink in a pattern (SOS in morse code?)
4. **PWM dimming** - Use pulse width modulation for variable brightness

---

## Side Quest 2: Binary Counter Display

**Available:** End of Day 4
**Difficulty:** Beginner-Intermediate
**Teaches:** Multi-bit outputs, display I/O

### The Challenge

Display a counting binary number on 8 LEDs.

### Wire: `counter_display.wire`

```wire
module counter_display(clk, reset) -> leds:8:
  ; Counter that resets to 0 when reset is high
  next = mux8(reset, adder8(count, 1, 0).sum, 0)
  count = dff8(next, clk)
  leds = count
```

### Pulse: `counter_demo.pulse`

```asm
; Binary counter displayed on LEDs
LED_PORT = $F030

reset:
    LDX #$FF
    TXS
    LDA #0

count_loop:
    STA LED_PORT     ; Display current count
    JSR delay
    ADD #1           ; Increment (wraps at 256)
    JMP count_loop

delay:
    ; ... same as before
```

---

## Side Quest 3: Button Debouncer

**Available:** End of Day 4
**Difficulty:** Intermediate
**Teaches:** Input handling, edge detection, timing

### The Challenge

Physical buttons "bounce" - they make multiple contacts when pressed. Build a debouncer that outputs a clean single pulse per button press.

### Wire: `debouncer.wire`

```wire
; Debouncer - filters out button bounce
; Requires button to be stable for N clock cycles

module debouncer(btn, clk) -> clean:
  ; Shift register captures last 4 samples
  s0 = dff(btn, clk)
  s1 = dff(s0, clk)
  s2 = dff(s1, clk)
  s3 = dff(s2, clk)

  ; Output high only when all samples are high
  clean = and(and(s0, s1), and(s2, s3))

module edge_detect(signal, clk) -> pulse:
  ; Outputs single pulse on rising edge
  prev = dff(signal, clk)
  pulse = and(signal, not(prev))

module button_handler(btn, clk) -> pressed:
  debounced = debouncer(btn, clk)
  pressed = edge_detect(debounced, clk)
```

---

## Side Quest 4: Seven-Segment Display

**Available:** End of Day 5
**Difficulty:** Intermediate
**Teaches:** Lookup tables, display encoding

### The Challenge

Convert a 4-bit number (0-15) to seven-segment display output.

### Wire: `seven_seg.wire`

```wire
; Seven-segment decoder
; Segments: a(top), b(top-right), c(bottom-right), d(bottom),
;           e(bottom-left), f(top-left), g(middle)
; Output is active-high (1 = segment on)

module seven_seg(digit:4) -> segments:7:
  ; This would ideally use a ROM lookup, but we can build with gates
  ; Each segment is a function of the 4 input bits

  d0 = digit[0]
  d1 = digit[1]
  d2 = digit[2]
  d3 = digit[3]

  ; Segment a (top): on for 0,2,3,5,6,7,8,9,A,C,E,F
  seg_a = or(or(and(not(d3), not(d2)), and(d2, d1)),
             or(and(d3, not(d0)), and(not(d1), not(d0))))

  ; ... (similar logic for other segments)
  ; In practice, use ROM for cleaner implementation:
  ; segments = rom_7seg(digit)

  segments = concat(seg_g, seg_f, seg_e, seg_d, seg_c, seg_b, seg_a)
```

---

## Side Quest 5: Simple ALU

**Available:** End of Day 3
**Difficulty:** Intermediate
**Teaches:** ALU design, operation selection

### The Challenge

Build a simple ALU that can ADD, SUB, AND, OR, XOR based on an operation code.

### Wire: `simple_alu.wire`

```wire
module simple_alu(a:8, b:8, op:3) -> (result:8, zero, carry):
  ; op: 000=ADD, 001=SUB, 010=AND, 011=OR, 100=XOR

  add_out = adder8(a, b, 0)
  sub_out = adder8(a, not8(b), 1)  ; a + ~b + 1 = a - b
  and_out = and8(a, b)
  or_out = or8(a, b)
  xor_out = xor8(a, b)

  ; Select result based on op
  result = mux8_5(op, add_out.sum, sub_out.sum, and_out, or_out, xor_out)

  ; Flags
  zero = eq8(result, 0)
  carry = mux(op[0], add_out.cout, sub_out.cout)  ; carry only for ADD/SUB
```

---

## Side Quest 6: UART Transmitter

**Available:** End of Day 5
**Difficulty:** Advanced
**Teaches:** Serial communication, state machines, timing

### The Challenge

Build a simple UART transmitter that can send bytes serially.

### Wire: `uart_tx.wire`

```wire
; UART Transmitter
; 8N1 format: 1 start bit, 8 data bits, 1 stop bit, no parity

module uart_tx(data:8, send, clk) -> (tx, busy):
  ; State: 0=idle, 1-9=sending bits, 10=stop bit

  ; Shift register holds data being sent
  ; Start bit is 0, stop bit is 1
  ; We shift out LSB first

  ; ... (state machine implementation)
```

---

## Implementation Notes

### Adding Side Quests to the Game

Side quests live in a separate section of the file browser:

```
├── cpu/           (story files)
├── mem/
├── io/
├── firmware/
└── playground/    (side quests)
    ├── blinker.wire
    ├── led_demo.pulse
    └── README.txt
```

### Sandbox Mode

Side quests run in a sandbox that's separate from the main FPGA:

- Own clock source
- Simple I/O (LEDs, buttons, display)
- No effect on story progression
- Can't break anything

### UI Integration

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Story Mode]  [▼ Playground]                                       │
├───────────────┬─────────────────────────────────────────────────────┤
│ PLAYGROUND    │  ┌─ blinker.wire ─────────────────────────────────┐ │
│               │  │ module simple_blinker(clk) -> led:             │ │
│ > Blinker     │  │   led = dff(not(led), clk)                     │ │
│   Counter     │  │                                                │ │
│   Debouncer   │  └────────────────────────────────────────────────┘ │
│   7-Segment   │                                                     │
│   ALU         │  ┌─ SIMULATION ───────────────────────────────────┐ │
│               │  │  CLK: ▓░▓░▓░▓░▓░▓░▓░▓░                         │ │
│               │  │  LED: ░▓░▓░▓░▓░▓░▓░▓░                         │ │
│               │  │                                                │ │
│               │  │  [▶ Run]  [⏸ Pause]  [⏭ Step]  Speed: [===●]  │ │
│               │  └────────────────────────────────────────────────┘ │
└───────────────┴─────────────────────────────────────────────────────┘
```

---

## Future Side Quest Ideas

- **Traffic light controller** - State machine with timed transitions
- **Dice roller** - Random number generator using LFSR
- **Music player** - Simple tone generator with PWM
- **VGA signal generator** - If we add display simulation
- **Game of Life cell** - Cellular automaton logic
- **Morse code encoder** - Text to morse blinker
- **Calculator** - Multi-digit arithmetic with display

---

_Document version: 1.0_
_Last updated: December 2025_
