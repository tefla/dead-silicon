import type { Category } from '../types'

export const pulseLanguage: Category = {
  id: 'pulse-language',
  title: 'Pulse Language',
  emoji: '💓',
  description: 'Learn Pulse - the assembly language for programming the spacecraft CPU!',
  articles: [
    {
      id: 'pulse-intro',
      title: 'Introduction to Pulse',
      emoji: '👋',
      summary: 'What is assembly language and how does Pulse work?',
      difficulty: 'beginner',
      sections: [
        {
          id: 'what-is-assembly',
          title: 'What is Assembly Language?',
          content: `
**Pulse** is an assembly language - the lowest level of programming before
you're just writing raw binary!

Think of it like this:
- **High-level languages** (Python, JavaScript): "Make me a sandwich"
- **Assembly language** (Pulse): "Get bread. Get knife. Open jar. Spread peanut butter..."
- **Machine code**: 01001011 10110100 00011011...

Assembly gives you direct control over the CPU. Each instruction does exactly
ONE simple thing:
- Load a value
- Add two numbers
- Jump to a different location
- Store a value in memory

The CPU doesn't understand words like "add" though. It only understands numbers!
The assembler converts Pulse code into those numbers (machine code).

## Why Learn Assembly?

In Dead Silicon, the spacecraft's firmware is written in Pulse. When software
bugs cause problems, you'll need to read and fix Pulse code!

Also, understanding assembly helps you truly understand how computers work
at their core.
          `
        },
        {
          id: 'pulse-cpu',
          title: 'The Cygnus-7 CPU',
          content: `
The spacecraft runs on a simple 8-bit CPU inspired by the famous 6502
(which powered the Apple II, NES, Commodore 64, and more!).

## Registers

The CPU has a few "scratch pads" called **registers** for holding values:

| Register | Name | Size | Purpose |
|----------|------|------|---------|
| **A** | Accumulator | 8-bit | Main math register |
| **X** | X Index | 8-bit | Counter/index |
| **Y** | Y Index | 8-bit | Counter/index |
| **SP** | Stack Pointer | 8-bit | Points to stack top |
| **PC** | Program Counter | 16-bit | Current instruction address |

## Flags

The CPU also tracks status **flags** that reflect the last operation:

| Flag | Name | Set When |
|------|------|----------|
| **Z** | Zero | Result was zero |
| **N** | Negative | Result had bit 7 set |
| **C** | Carry | Addition overflowed / Subtraction borrowed |
| **V** | Overflow | Signed arithmetic overflow |

These flags are used for conditional branching!
          `
        }
      ],
      relatedArticles: ['pulse-instructions', 'pulse-addressing']
    },
    {
      id: 'pulse-instructions',
      title: 'Pulse Instructions',
      emoji: '📝',
      summary: 'The complete instruction set of the Cygnus-7 CPU.',
      difficulty: 'beginner',
      sections: [
        {
          id: 'load-store',
          title: 'Load and Store',
          content: `
These instructions move data between registers and memory.

## Load Instructions

| Instruction | Description | Example |
|-------------|-------------|---------|
| **LDA** | Load Accumulator | \`LDA #$42\` (A = 0x42) |
| **LDX** | Load X Register | \`LDX $1000\` (X = memory at $1000) |
| **LDY** | Load Y Register | \`LDY #$00\` (Y = 0) |

## Store Instructions

| Instruction | Description | Example |
|-------------|-------------|---------|
| **STA** | Store Accumulator | \`STA $2000\` (memory at $2000 = A) |
| **STX** | Store X Register | \`STX $00\` (zero page $00 = X) |
| **STY** | Store Y Register | \`STY $3000,X\` (memory at $3000+X = Y) |

The **#** symbol means "immediate" - a literal value.
The **$** symbol means hexadecimal (base 16).
          `,
          examples: [
            {
              id: 'load-store-example',
              title: 'Load and Store Demo',
              language: 'pulse',
              code: `; Load immediate values into registers
LDA #$42     ; A = 0x42 (66 decimal)
LDX #$10     ; X = 0x10 (16 decimal)
LDY #$FF     ; Y = 0xFF (255 decimal)

; Store A to memory address $2000
STA $2000

; Store X to zero page address $00
STX $00

HLT          ; Stop CPU`,
              description: 'Loading values into registers and storing them to memory.'
            }
          ]
        },
        {
          id: 'arithmetic',
          title: 'Arithmetic',
          content: `
The CPU can do basic math in the Accumulator (A register).

| Instruction | Description | Example |
|-------------|-------------|---------|
| **ADC** | Add with Carry | \`ADC #$01\` (A = A + 1 + C) |
| **SBC** | Subtract with Borrow | \`SBC #$01\` (A = A - 1 - !C) |
| **CMP** | Compare (A - value) | \`CMP #$42\` (sets flags) |

**Note:** ADC and SBC use the carry flag! Clear it first with SEC/CLC
(or just know it's part of the calculation).
          `,
          examples: [
            {
              id: 'arithmetic-example',
              title: 'Arithmetic Demo',
              language: 'pulse',
              code: `; Add two numbers
LDA #$25     ; A = 37
ADC #$18     ; A = A + 24 = 61 (0x3D)

; Compare with a value
CMP #$40     ; Is A < 64?
; Z flag = 0 (not equal)
; N flag = 1 (result negative, meaning A < $40)

HLT`,
              description: 'Adding numbers and comparing values.'
            }
          ]
        },
        {
          id: 'logic-ops',
          title: 'Logic Operations',
          content: `
Bitwise logic operations on the Accumulator:

| Instruction | Description | Example |
|-------------|-------------|---------|
| **AND** | Bitwise AND | \`AND #$0F\` (keep low nibble) |
| **ORA** | Bitwise OR | \`ORA #$80\` (set bit 7) |
| **EOR** | Bitwise XOR | \`EOR #$FF\` (invert all bits) |
          `,
          examples: [
            {
              id: 'logic-example',
              title: 'Logic Operations Demo',
              language: 'pulse',
              code: `; Masking: Keep only lower 4 bits
LDA #$F7     ; A = 11110111
AND #$0F     ; A = 00000111 (mask off high bits)

; Setting bits
ORA #$80     ; A = 10000111 (set bit 7)

; Toggling bits
EOR #$01     ; A = 10000110 (toggle bit 0)

HLT`,
              description: 'Masking, setting, and toggling bits.'
            }
          ]
        },
        {
          id: 'register-ops',
          title: 'Register Operations',
          content: `
Move data between registers and increment/decrement:

## Transfers

| Instruction | Description |
|-------------|-------------|
| **TAX** | Transfer A to X |
| **TAY** | Transfer A to Y |
| **TXA** | Transfer X to A |
| **TYA** | Transfer Y to A |

## Increment / Decrement

| Instruction | Description |
|-------------|-------------|
| **INX** | X = X + 1 |
| **INY** | Y = Y + 1 |
| **DEX** | X = X - 1 |
| **DEY** | Y = Y - 1 |
          `,
          examples: [
            {
              id: 'register-ops-example',
              title: 'Register Operations Demo',
              language: 'pulse',
              code: `; Use X as a counter
LDX #$05     ; X = 5

loop:
  DEX        ; X = X - 1
  BNE loop   ; If X != 0, keep going

; X is now 0
TXA          ; A = X = 0

HLT`,
              description: 'A countdown loop using DEX.'
            }
          ]
        },
        {
          id: 'branching',
          title: 'Branching and Jumps',
          content: `
Control flow - how to make decisions and loops!

## Unconditional

| Instruction | Description |
|-------------|-------------|
| **JMP** | Jump to address |
| **JSR** | Jump to Subroutine (saves return address) |
| **RTS** | Return from Subroutine |

## Conditional (based on flags)

| Instruction | Branch When |
|-------------|-------------|
| **BEQ** | Z=1 (result was zero / values equal) |
| **BNE** | Z=0 (result was not zero / values differ) |

## How Branching Works

1. Do a comparison (CMP, or DEX/DEY/etc which set flags)
2. Branch based on the result
3. Branch target is a *relative* offset (-128 to +127 bytes)
          `,
          examples: [
            {
              id: 'branching-example',
              title: 'Branching Demo',
              language: 'pulse',
              code: `; Check if a value equals 42
LDA #$2A     ; A = 42

CMP #$2A     ; Compare A with 42
BEQ equal    ; If equal, jump to 'equal'

; This runs if NOT equal
LDA #$00     ; A = 0
JMP done

equal:
LDA #$01     ; A = 1

done:
HLT          ; A is 1 because 42 == 42`,
              description: 'Conditional branching based on comparison.'
            }
          ]
        },
        {
          id: 'stack-ops',
          title: 'Stack Operations',
          content: `
The **stack** is a special area of memory (addresses $0100-$01FF) that
works like a stack of plates - last in, first out!

| Instruction | Description |
|-------------|-------------|
| **PHA** | Push A onto stack |
| **PLA** | Pull (pop) from stack into A |

The stack is used to:
- Save register values temporarily
- Pass parameters to subroutines
- Store return addresses (JSR/RTS)
          `,
          examples: [
            {
              id: 'stack-example',
              title: 'Stack Operations Demo',
              language: 'pulse',
              code: `; Save A, do something, restore A
LDA #$42     ; A = 66

PHA          ; Save A on stack
LDA #$00     ; A = 0 (use for something)

; Do some work...
LDA #$FF     ; A = 255

PLA          ; Restore A from stack
; A is back to 66!

HLT`,
              description: 'Using the stack to save and restore values.'
            }
          ]
        }
      ],
      relatedArticles: ['pulse-intro', 'pulse-addressing']
    },
    {
      id: 'pulse-addressing',
      title: 'Addressing Modes',
      emoji: '📍',
      summary: 'Different ways to specify where data is located.',
      difficulty: 'intermediate',
      sections: [
        {
          id: 'addressing-intro',
          title: 'What are Addressing Modes?',
          content: `
Instructions need to know *where* to get data. Addressing modes are different
ways to specify that location.

Think of it like giving directions:
- "Use the number 42" (immediate)
- "Go to house #200" (absolute)
- "Go to house #200, then walk X doors down" (indexed)
          `
        },
        {
          id: 'immediate-mode',
          title: 'Immediate Mode',
          content: `
The value is written directly in the instruction.

\`\`\`pulse
LDA #$42     ; Load the literal value 0x42 into A
\`\`\`

The **#** symbol indicates immediate mode. The value 0x42 is part of the
instruction itself, not fetched from memory.

**Use when:** You know the exact value at write time.
          `
        },
        {
          id: 'absolute-mode',
          title: 'Absolute Mode',
          content: `
The instruction contains a 16-bit memory address.

\`\`\`pulse
LDA $2000    ; Load the value at memory address 0x2000 into A
STA $3000    ; Store A into memory address 0x3000
\`\`\`

**Use when:** Accessing a specific memory location (variables, I/O ports).
          `
        },
        {
          id: 'indexed-mode',
          title: 'Indexed Mode',
          content: `
Add the X or Y register to a base address.

\`\`\`pulse
LDA $2000,X  ; Load from address (0x2000 + X)
STA $3000,Y  ; Store to address (0x3000 + Y)
\`\`\`

**Use when:** Accessing arrays or tables.
          `,
          examples: [
            {
              id: 'indexed-example',
              title: 'Array Access with Indexed Addressing',
              language: 'pulse',
              code: `; Copy 4 bytes from $2000 to $3000
LDX #$00     ; X = 0 (index)

loop:
  LDA $2000,X  ; Load from source + X
  STA $3000,X  ; Store to dest + X
  INX          ; X++
  CPX #$04     ; Compare X with 4
  BNE loop     ; If X != 4, continue

HLT`,
              description: 'Using X as an index to copy bytes.'
            }
          ]
        },
        {
          id: 'implied-mode',
          title: 'Implied Mode',
          content: `
The instruction doesn't need an operand - it operates on a specific register.

\`\`\`pulse
INX          ; Increment X (no operand needed)
TAX          ; Transfer A to X (registers implied)
RTS          ; Return from subroutine (address on stack)
\`\`\`

**Use when:** The operation is clear from the mnemonic alone.
          `
        },
        {
          id: 'relative-mode',
          title: 'Relative Mode (Branches)',
          content: `
Branch instructions use relative addressing - an offset from the current position.

\`\`\`pulse
BEQ label    ; If Z=1, jump to 'label'
BNE label    ; If Z=0, jump to 'label'
\`\`\`

The assembler calculates the offset automatically. The offset is a signed byte
(-128 to +127), limiting branches to nearby code.

For long jumps, use **JMP** (absolute addressing).
          `
        }
      ],
      relatedArticles: ['pulse-instructions', 'memory-map']
    },
    {
      id: 'pulse-subroutines',
      title: 'Subroutines and the Stack',
      emoji: '🔁',
      summary: 'How to write reusable code with subroutines.',
      difficulty: 'intermediate',
      sections: [
        {
          id: 'subroutines-intro',
          title: 'What are Subroutines?',
          content: `
A **subroutine** is a reusable piece of code. Instead of copying the same
code everywhere, you write it once and "call" it when needed.

\`\`\`pulse
; Main code
JSR my_function   ; Call subroutine
; ... continues here after return

my_function:
  ; Do something useful
  RTS             ; Return to caller
\`\`\`

## How It Works

1. **JSR** (Jump to Subroutine):
   - Pushes the return address onto the stack
   - Jumps to the subroutine

2. **RTS** (Return from Subroutine):
   - Pulls the return address from the stack
   - Jumps back to continue after the JSR
          `,
          examples: [
            {
              id: 'subroutine-example',
              title: 'Subroutine Example',
              language: 'pulse',
              code: `; Main program
LDA #$05
JSR double      ; Call double, A = A * 2
; A is now 10

JSR double      ; Call again
; A is now 20

HLT

; Subroutine: doubles A
double:
  ADC A         ; A = A + A (simplified, assumes C=0)
  RTS           ; Return`,
              description: 'A subroutine that doubles the accumulator.'
            }
          ]
        },
        {
          id: 'stack-frames',
          title: 'Using the Stack for Data',
          content: `
The stack isn't just for return addresses - you can use it to save registers
or pass data!

## Saving Registers

When calling a subroutine, you might want to preserve registers:

\`\`\`pulse
; Save X before calling subroutine
TXA           ; Copy X to A
PHA           ; Push A (which holds X's value)

JSR routine   ; Call subroutine (might trash X)

PLA           ; Pop saved value
TAX           ; Restore X
\`\`\`
          `
        }
      ],
      relatedArticles: ['pulse-instructions', 'pulse-patterns']
    },
    {
      id: 'pulse-patterns',
      title: 'Common Pulse Patterns',
      emoji: '🎨',
      summary: 'Useful code patterns for assembly programming.',
      difficulty: 'intermediate',
      sections: [
        {
          id: 'counting-loop',
          title: 'Counting Loops',
          content: `
The most common pattern - do something N times:
          `,
          examples: [
            {
              id: 'count-up',
              title: 'Count Up Loop',
              language: 'pulse',
              code: `; Count from 0 to 9
LDX #$00       ; X = 0

loop:
  ; Do something with X here
  INX          ; X++
  CPX #$0A     ; Compare with 10
  BNE loop     ; If X != 10, continue

HLT            ; X is now 10`,
              description: 'Loop counting up from 0 to 9.'
            },
            {
              id: 'count-down',
              title: 'Count Down Loop',
              language: 'pulse',
              code: `; Count from 10 down to 0
LDX #$0A       ; X = 10

loop:
  DEX          ; X--
  ; Do something with X here
  BNE loop     ; If X != 0, continue

HLT            ; X is now 0`,
              description: 'Loop counting down (more efficient - BNE is free!).'
            }
          ]
        },
        {
          id: 'memory-fill',
          title: 'Memory Fill',
          content: `
Fill a block of memory with a value:
          `,
          examples: [
            {
              id: 'memfill',
              title: 'Memory Fill',
              language: 'pulse',
              code: `; Fill $2000-$200F with $00
LDA #$00       ; Value to fill
LDX #$10       ; Count (16 bytes)

loop:
  DEX          ; X-- first (so we fill $200F down to $2000)
  STA $2000,X  ; Store A at $2000+X
  BNE loop     ; If X != 0, continue

HLT`,
              description: 'Fill 16 bytes of memory with zeros.'
            }
          ]
        },
        {
          id: 'memory-copy',
          title: 'Memory Copy',
          content: `
Copy bytes from one location to another:
          `,
          examples: [
            {
              id: 'memcpy',
              title: 'Memory Copy',
              language: 'pulse',
              code: `; Copy 8 bytes from $2000 to $3000
LDX #$00       ; Index = 0

loop:
  LDA $2000,X  ; Load from source
  STA $3000,X  ; Store to destination
  INX          ; Next byte
  CPX #$08     ; Done 8 bytes?
  BNE loop

HLT`,
              description: 'Copy 8 bytes from source to destination.'
            }
          ]
        },
        {
          id: 'multiply',
          title: 'Multiplication (No MUL instruction!)',
          content: `
The CPU has no multiply instruction, so we do it with addition:
          `,
          examples: [
            {
              id: 'multiply-example',
              title: 'Multiply by 10',
              language: 'pulse',
              code: `; Multiply A by 10
; A * 10 = A * 8 + A * 2 = (A << 3) + (A << 1)
; We'll use repeated addition instead

TAX            ; Save original in X
LDA #$00       ; Result = 0
LDY #$0A       ; Counter = 10

loop:
  TXA          ; Get original value
  ADC          ; Result += original
  DEY          ; Counter--
  BNE loop

HLT            ; A = original * 10`,
              description: 'Multiply A by 10 using repeated addition.'
            }
          ]
        }
      ],
      relatedArticles: ['pulse-instructions', 'pulse-subroutines']
    }
  ]
}
