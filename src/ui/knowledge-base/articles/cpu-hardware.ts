import type { Category } from '../types'

export const cpuHardware: Category = {
  id: 'cpu-hardware',
  title: 'CPU & Hardware',
  emoji: '🖥️',
  description: 'Understand how the Cygnus-7 CPU works at the circuit level!',
  articles: [
    {
      id: 'cpu-basics',
      title: 'How a CPU Works',
      emoji: '🧠',
      summary: 'The brain of the computer - fetch, decode, execute!',
      difficulty: 'beginner',
      sections: [
        {
          id: 'cpu-overview',
          title: 'What Does a CPU Do?',
          content: `
A CPU (Central Processing Unit) is the "brain" of a computer. But unlike your
brain, it can only do very simple things - it just does them REALLY fast!

A CPU:
1. **Fetches** an instruction from memory
2. **Decodes** what the instruction means
3. **Executes** the instruction
4. Repeats forever!

This is called the **Fetch-Decode-Execute cycle**.

## The Simplicity is the Point

Each instruction does ONE tiny thing:
- Add two numbers
- Load a value from memory
- Compare two values
- Jump to a different location

Complex programs are just millions of these tiny steps!
          `
        },
        {
          id: 'fetch-decode-execute',
          title: 'The Fetch-Decode-Execute Cycle',
          content: `
Let's walk through what happens for each instruction:

## 1. FETCH

The CPU looks at the **Program Counter (PC)** - a register that holds the
address of the next instruction.

\`\`\`
PC = 0x8000  →  Memory at 0x8000 contains: 0xA9 0x42
\`\`\`

The CPU reads 0xA9 from memory. This is the **opcode** (operation code).

## 2. DECODE

The CPU figures out what 0xA9 means.

0xA9 = "LDA immediate" (Load Accumulator with the next byte)

The CPU knows it needs to read one more byte for the value.

## 3. EXECUTE

The CPU:
- Reads the next byte (0x42)
- Puts it in the A register
- Updates PC to point to the next instruction

\`\`\`
A = 0x42
PC = 0x8002 (advanced past the instruction)
\`\`\`

Then it starts over with FETCH!
          `
        },
        {
          id: 'cpu-state-machine',
          title: 'The CPU as a State Machine',
          content: `
Remember state machines from the logic section? The CPU is one big state machine!

Each clock cycle, the CPU is in a specific state:

\`\`\`
FETCH_OPCODE → FETCH_OPERAND → DECODE → EXECUTE → ...
    ↑________________________________________________|
\`\`\`

Some instructions need more states:
- Load/Store need memory access states
- Branches need to check flags and maybe update PC
- JSR needs to push the return address

The Cygnus-7 CPU uses about 12 different states!
          `
        }
      ],
      relatedArticles: ['cpu-registers', 'cpu-alu']
    },
    {
      id: 'cpu-registers',
      title: 'CPU Registers',
      emoji: '📋',
      summary: 'The CPU\'s scratch pads for holding values.',
      difficulty: 'beginner',
      sections: [
        {
          id: 'what-are-registers',
          title: 'What are Registers?',
          content: `
**Registers** are tiny, super-fast storage locations inside the CPU.

Think of them as the CPU's "hands" - it can only work with what it's holding!
To do math on memory values, you first have to load them into registers.

## Why Not Just Use Memory?

Memory is SLOW compared to registers. Accessing memory might take several
clock cycles, but registers are instant.

Also, the ALU (the math unit) is directly connected to registers. The CPU
is literally wired to do math on register values!
          `
        },
        {
          id: 'cygnus-registers',
          title: 'The Cygnus-7 Registers',
          content: `
The Cygnus-7 has these registers:

## A - The Accumulator (8-bit)

The main "working" register. Almost all math happens here:
- Addition, subtraction
- Logic operations (AND, OR, XOR)
- Comparisons

\`\`\`pulse
LDA #$10    ; A = 16
ADC #$05    ; A = A + 5 = 21
\`\`\`

## X and Y - Index Registers (8-bit each)

Used for counting and indexing into arrays:

\`\`\`pulse
LDX #$00      ; X = 0
LDA $2000,X   ; Load from address (0x2000 + X)
INX           ; X = X + 1
\`\`\`

## SP - Stack Pointer (8-bit)

Points to the top of the stack (in page $01).
Starts at $FF and grows downward.

## PC - Program Counter (16-bit)

Holds the address of the next instruction to fetch.
Automatically increments as instructions are executed.
Branch/jump instructions change it directly.
          `
        },
        {
          id: 'status-register',
          title: 'The Status Register (Flags)',
          content: `
The CPU tracks information about the last operation in **flags**:

| Flag | Name | Meaning |
|------|------|---------|
| **Z** | Zero | Last result was zero |
| **N** | Negative | Last result had bit 7 set (negative in signed math) |
| **C** | Carry | Addition overflowed past 8 bits |
| **V** | Overflow | Signed arithmetic overflow |

## How Flags Are Used

After a comparison or math operation, flags are set automatically:

\`\`\`pulse
LDA #$05
CMP #$05    ; Compare A with 5
            ; Z=1 (equal!), N=0, C=1
BEQ equal   ; Branch if Z=1 (they were equal)
\`\`\`

Flags let the CPU make decisions!
          `
        },
        {
          id: 'register-wire',
          title: 'Registers in Wire',
          content: `
In the Wire HDL, registers are built from D flip-flops!

An 8-bit register is just 8 DFFs that update together:
          `,
          examples: [
            {
              id: 'register-wire-example',
              title: '8-bit Register with Load Enable',
              language: 'wire',
              code: `module register8(data:8, load, clk) -> out:8:
  // Mux: if load=1, use new data; else keep old value
  in0 = mux(load, out[0], data[0])
  in1 = mux(load, out[1], data[1])
  in2 = mux(load, out[2], data[2])
  in3 = mux(load, out[3], data[3])
  in4 = mux(load, out[4], data[4])
  in5 = mux(load, out[5], data[5])
  in6 = mux(load, out[6], data[6])
  in7 = mux(load, out[7], data[7])

  // DFFs to store the value
  out[0] = dff(in0, clk)
  out[1] = dff(in1, clk)
  out[2] = dff(in2, clk)
  out[3] = dff(in3, clk)
  out[4] = dff(in4, clk)
  out[5] = dff(in5, clk)
  out[6] = dff(in6, clk)
  out[7] = dff(in7, clk)

module mux(sel, a, b) -> out:
  not_sel = nand(sel, sel)
  x = nand(a, not_sel)
  y = nand(b, sel)
  out = nand(x, y)`,
              description: 'An 8-bit register that only updates when load=1.'
            }
          ]
        }
      ],
      relatedArticles: ['cpu-basics', 'cpu-alu']
    },
    {
      id: 'cpu-alu',
      title: 'The ALU: Arithmetic Logic Unit',
      emoji: '🔢',
      summary: 'The calculator inside the CPU.',
      difficulty: 'intermediate',
      sections: [
        {
          id: 'what-is-alu',
          title: 'What is the ALU?',
          content: `
The **ALU** (Arithmetic Logic Unit) is the part of the CPU that does math
and logic operations.

It takes two inputs (usually A register and a value from memory) and
produces a result based on the operation selected.

## ALU Operations

| Operation | Description |
|-----------|-------------|
| ADD | A + B (with carry) |
| SUB | A - B (with borrow) |
| AND | A & B (bitwise AND) |
| OR | A \\| B (bitwise OR) |
| XOR | A ^ B (bitwise XOR) |
| PASS | Output B unchanged |

## ALU Outputs

- **Result**: The 8-bit answer
- **Zero flag**: Set if result is 0
- **Negative flag**: Set if bit 7 of result is 1
- **Carry flag**: Set if addition overflowed
- **Overflow flag**: Set if signed overflow occurred
          `
        },
        {
          id: 'alu-wire',
          title: 'Building an ALU in Wire',
          content: `
The ALU combines adders and logic gates with multiplexers to select the
operation:
          `,
          examples: [
            {
              id: 'simple-alu',
              title: 'Simplified 1-bit ALU',
              language: 'wire',
              code: `module alu1(a, b, op:2, cin) -> result, cout:
  // Operations:
  // 00 = AND
  // 01 = OR
  // 10 = XOR
  // 11 = ADD

  // Logic operations
  and_result = and(a, b)
  or_result = or(a, b)
  xor_result = xor(a, b)

  // Addition (full adder)
  sum = xor(xor(a, b), cin)
  cout = or(and(a, b), and(xor(a, b), cin))

  // Select result based on op
  sel0 = mux(op[0], and_result, or_result)
  sel1 = mux(op[0], xor_result, sum)
  result = mux(op[1], sel0, sel1)

module and(a, b) -> out:
  x = nand(a, b)
  out = nand(x, x)

module or(a, b) -> out:
  out = nand(nand(a, a), nand(b, b))

module xor(a, b) -> out:
  n = nand(a, b)
  out = nand(nand(a, n), nand(b, n))

module mux(sel, a, b) -> out:
  ns = nand(sel, sel)
  out = nand(nand(a, ns), nand(b, sel))`,
              description: 'A 1-bit ALU slice. Chain 8 of these for an 8-bit ALU!'
            }
          ]
        },
        {
          id: 'alu-flags',
          title: 'Computing Flags',
          content: `
The ALU also computes the status flags:

## Zero Flag
OR all the result bits together, then invert. If no bits are set, result is zero!

## Negative Flag
Just bit 7 of the result. In two's complement, bit 7 indicates negative.

## Carry Flag
The carry-out from the most significant bit adder.

## Overflow Flag
For signed math: overflow occurs when adding two positives gives negative,
or adding two negatives gives positive.

\`\`\`
V = (A[7] == B[7]) && (A[7] != Result[7])
\`\`\`
          `
        }
      ],
      relatedArticles: ['cpu-registers', 'memory-map']
    },
    {
      id: 'memory-map',
      title: 'Memory Map',
      emoji: '🗺️',
      summary: 'How the 64KB address space is organized.',
      difficulty: 'intermediate',
      sections: [
        {
          id: 'address-space',
          title: 'The Address Space',
          content: `
The Cygnus-7 CPU has a 16-bit address bus, meaning it can address 65,536
bytes (64KB) of memory.

But not all of that is RAM! Different address ranges map to different things:

## Memory Map

| Address Range | Size | Purpose |
|---------------|------|---------|
| $0000-$00FF | 256 bytes | **Zero Page** - Fast access RAM |
| $0100-$01FF | 256 bytes | **Stack** - For JSR/RTS and PHA/PLA |
| $0200-$0FFF | 3.5 KB | **General RAM** |
| $1000-$1FFF | 4 KB | **Filesystem Buffer** |
| $8000-$83FF | 1 KB | **Display Memory** - 32×32 characters |
| $F000-$F0FF | 256 bytes | **I/O Ports** - Hardware interfaces |
| $FF00-$FFFF | 256 bytes | **ROM** - Boot code and firmware |
          `
        },
        {
          id: 'zero-page',
          title: 'Zero Page',
          content: `
The **Zero Page** ($0000-$00FF) is special because:

1. **Faster access**: Only need 1 byte for the address instead of 2
2. **Shorter instructions**: \`LDA $10\` is 2 bytes vs \`LDA $0010\` is 3 bytes
3. **Special addressing modes**: Some CPUs have zero-page-only modes

Use zero page for frequently accessed variables!
          `
        },
        {
          id: 'stack',
          title: 'The Stack',
          content: `
The **Stack** ($0100-$01FF) is a special region managed by the SP register.

It grows **downward**: SP starts at $FF, and each push decreases it.

\`\`\`
Before PHA (SP = $FF):
$01FF: [empty]
$01FE: [empty]

After PHA with A=$42 (SP = $FE):
$01FF: $42 ← pushed value
$01FE: [empty] ← SP points here now
\`\`\`

The stack is used for:
- **JSR/RTS**: Storing return addresses
- **PHA/PLA**: Temporarily saving registers
- **Interrupts**: Saving CPU state
          `
        },
        {
          id: 'io-ports',
          title: 'I/O Ports',
          content: `
The **I/O region** ($F000-$F0FF) is where hardware devices appear:

| Address | Device |
|---------|--------|
| $F000 | Serial TX (write to send character) |
| $F001 | Serial RX (read to receive character) |
| $F002 | Serial Status (bit 0 = data available) |
| $F010-$F01F | Storage controller |
| $F020-$F02F | Crypto interface |

To print a character to the terminal:
\`\`\`pulse
LDA #$48      ; 'H'
STA $F000     ; Send to serial output
\`\`\`
          `
        },
        {
          id: 'memory-wire',
          title: 'Memory in Wire',
          content: `
Memory is implemented using the \`ram\` and \`rom\` primitives:
          `,
          examples: [
            {
              id: 'ram-usage',
              title: 'RAM Module',
              language: 'wire',
              code: `module memory_system(addr:16, data_in:8, write, clk) -> data_out:8:
  // RAM for lower addresses
  ram_out = ram(addr[0:12], data_in, write, clk)

  // ROM for high addresses (read-only)
  rom_out = rom(addr[0:7])

  // Select based on high address bits
  is_rom = and(addr[15], addr[14])  // $C000+ is ROM
  data_out = mux8(is_rom, ram_out, rom_out)

module and(a, b) -> out:
  x = nand(a, b)
  out = nand(x, x)

module mux8(sel, a:8, b:8) -> out:8:
  ns = nand(sel, sel)
  out[0] = nand(nand(a[0], ns), nand(b[0], sel))
  out[1] = nand(nand(a[1], ns), nand(b[1], sel))
  out[2] = nand(nand(a[2], ns), nand(b[2], sel))
  out[3] = nand(nand(a[3], ns), nand(b[3], sel))
  out[4] = nand(nand(a[4], ns), nand(b[4], sel))
  out[5] = nand(nand(a[5], ns), nand(b[5], sel))
  out[6] = nand(nand(a[6], ns), nand(b[6], sel))
  out[7] = nand(nand(a[7], ns), nand(b[7], sel))`,
              description: 'A memory system that combines RAM and ROM.'
            }
          ]
        }
      ],
      relatedArticles: ['cpu-alu', 'io-system']
    },
    {
      id: 'io-system',
      title: 'I/O Systems',
      emoji: '🔌',
      summary: 'How the CPU communicates with the outside world.',
      difficulty: 'intermediate',
      sections: [
        {
          id: 'io-overview',
          title: 'Input/Output Overview',
          content: `
The CPU can't directly sense temperature, display text, or store files.
It needs **I/O devices** (Input/Output) to interact with the world!

On the Cygnus-7, I/O is **memory-mapped**: devices appear as memory addresses.
Reading/writing those addresses communicates with hardware.

## Memory-Mapped I/O

\`\`\`pulse
; To output a character
LDA #$41      ; ASCII 'A'
STA $F000     ; Write to serial TX port

; To read a character
LDA $F001     ; Read from serial RX port
\`\`\`

The hardware "listens" at address $F000 and sends the byte out!
          `
        },
        {
          id: 'serial-io',
          title: 'Serial Communication',
          content: `
The spacecraft terminal uses **serial communication** - sending data
one bit at a time over a wire.

## Serial Ports

| Address | Name | Description |
|---------|------|-------------|
| $F000 | TX | Write here to send a character |
| $F001 | RX | Read here to receive a character |
| $F002 | Status | Bit 0: RX data available |

## Sending Data

\`\`\`pulse
; Print "HI" to terminal
LDA #$48      ; 'H'
STA $F000
LDA #$49      ; 'I'
STA $F000
\`\`\`

## Receiving Data

\`\`\`pulse
; Wait for and read a character
wait:
  LDA $F002   ; Check status
  AND #$01    ; Mask bit 0
  BEQ wait    ; If 0, no data, keep waiting
  LDA $F001   ; Data available! Read it
\`\`\`
          `
        },
        {
          id: 'display-io',
          title: 'Display Output',
          content: `
The spacecraft has a 32×32 character display. Each character is stored
in display memory ($8000-$83FF).

## Display Layout

\`\`\`
Address $8000: Row 0, Column 0
Address $8001: Row 0, Column 1
...
Address $801F: Row 0, Column 31
Address $8020: Row 1, Column 0
...
\`\`\`

## Writing to Display

\`\`\`pulse
; Write 'A' to top-left corner
LDA #$41
STA $8000

; Write 'B' to position (5, 2)
; Address = $8000 + (row * 32) + col
; = $8000 + (2 * 32) + 5 = $8045
LDA #$42
STA $8045
\`\`\`
          `
        },
        {
          id: 'sensors',
          title: 'Ship Sensors',
          content: `
Various spacecraft sensors are mapped to I/O addresses:

| Address | Sensor |
|---------|--------|
| $F010 | O₂ Level (0-255) |
| $F011 | CO₂ Level (0-255) |
| $F012 | Temperature |
| $F013 | Pressure |
| $F020 | Power Level |
| $F030 | Navigation Data |

## Reading Sensors

\`\`\`pulse
; Check oxygen level
LDA $F010
CMP #$20      ; Is it below 32?
BCC danger    ; If so, DANGER!
\`\`\`

When hardware malfunctions, sensor readings may be wrong. You'll need to
fix the circuits (in Wire) that interface with these sensors!
          `
        }
      ],
      relatedArticles: ['memory-map', 'cpu-basics']
    }
  ]
}
