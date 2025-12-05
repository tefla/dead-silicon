import type { Category } from '../types'

export const wireLanguage: Category = {
  id: 'wire-language',
  title: 'Wire Language',
  emoji: '⚡',
  description: 'Learn Wire - the hardware description language for building circuits!',
  articles: [
    {
      id: 'wire-intro',
      title: 'Introduction to Wire',
      emoji: '👋',
      summary: 'What is Wire and why do we use it to fix the spacecraft?',
      difficulty: 'beginner',
      sections: [
        {
          id: 'what-is-wire',
          title: 'What is Wire?',
          content: `
**Wire** is a Hardware Description Language (HDL). Instead of writing software that
runs on a computer, Wire describes the actual *hardware* - the circuits and chips
themselves!

Think of it like this:
- **Software** (Pulse): Instructions that tell the computer what to do
- **Hardware** (Wire): The physical circuits that carry out those instructions

The Cygnus-7 spacecraft's computer is defined entirely in Wire - every gate,
every register, every piece of logic. When something breaks in the hardware,
you'll use Wire to fix it!

## Why "Wire"?

The name comes from what we're describing: **wires** that connect **gates** together.
Each line of Wire code defines a signal (a wire) and what it's connected to.

## Wire is Different from Normal Programming

In most programming languages, instructions run one after another:
\`\`\`
a = 1      // First this
b = a + 1  // Then this
c = b + 1  // Then this
\`\`\`

In Wire, everything happens **at the same time** (in parallel):
\`\`\`
a = nand(x, y)   // These all happen
b = nand(a, z)   // simultaneously on
c = nand(b, w)   // every clock tick!
\`\`\`

This is how real hardware works - all the gates compute their outputs
at the same time!
          `
        }
      ],
      relatedArticles: ['wire-modules', 'wire-primitives']
    },
    {
      id: 'wire-modules',
      title: 'Modules: Building Blocks of Wire',
      emoji: '📦',
      summary: 'Learn how to organize Wire code into reusable modules.',
      difficulty: 'beginner',
      sections: [
        {
          id: 'module-basics',
          title: 'What is a Module?',
          content: `
A **module** in Wire is like a building block or a chip. It has:
- **Inputs**: Signals coming in
- **Outputs**: Signals going out
- **Logic**: What happens inside

Here's the basic syntax:
\`\`\`wire
module name(inputs) -> outputs:
  // logic goes here
\`\`\`

## Example: A Simple NOT Gate

\`\`\`wire
module not_gate(a) -> out:
  out = nand(a, a)
\`\`\`

- **name**: \`not_gate\`
- **inputs**: \`a\` (a single-bit signal)
- **outputs**: \`out\` (a single-bit signal)
- **logic**: \`out\` is the NAND of \`a\` with itself

## Using Modules

Once you define a module, you can use it anywhere:
\`\`\`wire
module double_not(x) -> y:
  temp = not_gate(x)
  y = not_gate(temp)
\`\`\`

This creates a circuit that inverts the signal twice (so y = x).
          `,
          examples: [
            {
              id: 'module-basic',
              title: 'Your First Module',
              language: 'wire',
              code: `module inverter(input) -> output:
  output = nand(input, input)`,
              description: 'A simple inverter module. Input 0 → Output 1, Input 1 → Output 0.'
            }
          ]
        },
        {
          id: 'multi-bit-signals',
          title: 'Multi-Bit Signals (Buses)',
          content: `
Often we need to work with numbers, not just single bits. We can declare
multi-bit signals using a colon and width:

\`\`\`wire
module byte_inverter(data:8) -> result:8:
  // data is 8 bits wide, result is 8 bits wide
\`\`\`

You can access individual bits using brackets:
- \`data[0]\` - The first bit (least significant)
- \`data[7]\` - The eighth bit (most significant)
- \`data[0:3]\` - Bits 0 through 3 (a 4-bit slice)
          `,
          examples: [
            {
              id: 'bus-example',
              title: '8-bit Inverter',
              language: 'wire',
              code: `module invert8(data:8) -> out:8:
  out[0] = nand(data[0], data[0])
  out[1] = nand(data[1], data[1])
  out[2] = nand(data[2], data[2])
  out[3] = nand(data[3], data[3])
  out[4] = nand(data[4], data[4])
  out[5] = nand(data[5], data[5])
  out[6] = nand(data[6], data[6])
  out[7] = nand(data[7], data[7])`,
              description: 'Inverts all 8 bits of the input.'
            }
          ]
        }
      ],
      relatedArticles: ['wire-intro', 'wire-primitives']
    },
    {
      id: 'wire-primitives',
      title: 'Wire Primitives: nand and dff',
      emoji: '🧱',
      summary: 'The two fundamental building blocks in Wire.',
      difficulty: 'beginner',
      sections: [
        {
          id: 'primitives-intro',
          title: 'Only Two Primitives!',
          content: `
Wire has only **two** built-in primitives:

1. **\`nand(a, b)\`** - The NAND gate
2. **\`dff(d, clk)\`** - The D Flip-Flop

Everything else - AND, OR, NOT, adders, the entire CPU - is built from these!

This mirrors how real chips work: complex circuits are built from simple
transistor arrangements that implement basic functions.
          `
        },
        {
          id: 'nand-primitive',
          title: 'The NAND Primitive',
          content: `
\`\`\`wire
output = nand(a, b)
\`\`\`

NAND (Not-AND) truth table:
| a | b | nand(a,b) |
|---|---|-----------|
| 0 | 0 | 1         |
| 0 | 1 | 1         |
| 1 | 0 | 1         |
| 1 | 1 | 0         |

Output is 0 only when BOTH inputs are 1.
          `,
          examples: [
            {
              id: 'nand-demo',
              title: 'NAND Gate Demo',
              language: 'wire',
              code: `module nand_demo(a, b) -> out:
  out = nand(a, b)`,
              description: 'The fundamental NAND gate.'
            }
          ]
        },
        {
          id: 'dff-primitive',
          title: 'The DFF Primitive',
          content: `
\`\`\`wire
output = dff(data, clock)
\`\`\`

The D Flip-Flop stores a bit of memory:
- On each rising edge of \`clock\` (0→1 transition)
- It captures the value of \`data\`
- And holds it at \`output\` until the next clock edge

This is how circuits remember things!
          `,
          examples: [
            {
              id: 'dff-demo',
              title: 'D Flip-Flop Demo',
              language: 'wire',
              code: `module memory_bit(data, clk) -> stored:
  stored = dff(data, clk)`,
              description: 'A single bit of memory. Captures data on clock edge.'
            }
          ]
        }
      ],
      relatedArticles: ['wire-modules', 'wire-stdlib']
    },
    {
      id: 'wire-stdlib',
      title: 'Wire Standard Library',
      emoji: '📚',
      summary: 'Pre-built modules you can use in your circuits.',
      difficulty: 'beginner',
      sections: [
        {
          id: 'stdlib-intro',
          title: 'The Standard Library',
          content: `
The Wire standard library provides pre-built modules for common operations.
These are all built from NAND and DFF - you could build them yourself, but
it's convenient to have them ready to use!

## Basic Gates

| Module | Description |
|--------|-------------|
| \`not(a)\` | Inverts a signal |
| \`and(a, b)\` | AND gate |
| \`or(a, b)\` | OR gate |
| \`xor(a, b)\` | XOR gate (1 if inputs differ) |
| \`nor(a, b)\` | NOR gate (OR + NOT) |
| \`xnor(a, b)\` | XNOR gate (1 if inputs same) |

## Multi-Bit Versions

| Module | Description |
|--------|-------------|
| \`not8(a:8)\` | Invert 8 bits |
| \`and8(a:8, b:8)\` | AND 8 bits |
| \`or8(a:8, b:8)\` | OR 8 bits |
| \`xor8(a:8, b:8)\` | XOR 8 bits |

## Multiplexers

| Module | Description |
|--------|-------------|
| \`mux(sel, a, b)\` | If sel=0, output a; else output b |
| \`mux4(sel:2, a, b, c, d)\` | 4-way multiplexer |
| \`mux8(sel:3, ...)\` | 8-way multiplexer |

## Arithmetic

| Module | Description |
|--------|-------------|
| \`half_adder(a, b)\` | Add 2 bits, output sum and carry |
| \`full_adder(a, b, cin)\` | Add 2 bits + carry in |
| \`adder8(a:8, b:8)\` | Add two 8-bit numbers |
          `
        },
        {
          id: 'mux-detail',
          title: 'Multiplexers Explained',
          content: `
A **multiplexer** (mux) is like a switch that chooses between inputs.

Think of it as: "If the selector is 0, use input A. If it's 1, use input B."

This is incredibly useful for:
- Choosing which register to read
- Selecting operation results
- Routing data through the CPU
          `,
          examples: [
            {
              id: 'mux-example',
              title: 'Multiplexer',
              language: 'wire',
              code: `module mux(sel, a, b) -> out:
  not_sel = nand(sel, sel)
  x = nand(a, not_sel)
  y = nand(b, sel)
  out = nand(x, y)`,
              description: 'A 2-to-1 multiplexer. sel=0 outputs a, sel=1 outputs b.'
            }
          ]
        },
        {
          id: 'adder-detail',
          title: 'Adders Explained',
          content: `
An **adder** adds binary numbers together. Let's start simple:

## Half Adder
Adds two single bits, producing a sum and a carry:
- 0 + 0 = 0, carry 0
- 0 + 1 = 1, carry 0
- 1 + 0 = 1, carry 0
- 1 + 1 = 0, carry 1 (binary 10!)

## Full Adder
Adds two bits PLUS a carry input. This lets you chain adders together
to add larger numbers!
          `,
          examples: [
            {
              id: 'half-adder',
              title: 'Half Adder',
              language: 'wire',
              code: `module half_adder(a, b) -> sum, carry:
  // XOR for sum
  nand_ab = nand(a, b)
  sum = nand(nand(a, nand_ab), nand(b, nand_ab))
  // AND for carry
  carry = nand(nand_ab, nand_ab)`,
              description: 'Adds two bits, producing sum and carry outputs.'
            }
          ]
        }
      ],
      relatedArticles: ['wire-primitives', 'wire-patterns']
    },
    {
      id: 'wire-patterns',
      title: 'Common Wire Patterns',
      emoji: '🎨',
      summary: 'Useful patterns and techniques for Wire programming.',
      difficulty: 'intermediate',
      sections: [
        {
          id: 'register-pattern',
          title: 'Registers with Enable',
          content: `
Sometimes you want a register that only updates when told to:
          `,
          examples: [
            {
              id: 'register-enable',
              title: 'Register with Enable',
              language: 'wire',
              code: `module reg_enable(data, enable, clk) -> out:
  // If enable=1, use new data; else keep old value
  selected = mux(enable, out, data)
  out = dff(selected, clk)

module mux(sel, a, b) -> out:
  not_sel = nand(sel, sel)
  x = nand(a, not_sel)
  y = nand(b, sel)
  out = nand(x, y)`,
              description: 'A register that only updates when enable=1.'
            }
          ]
        },
        {
          id: 'decoder-pattern',
          title: 'Decoders',
          content: `
A **decoder** converts a binary number into one-hot signals.
For example, a 2-to-4 decoder takes 2 bits and activates ONE of 4 outputs:

| Input | Output |
|-------|--------|
| 00    | 0001   |
| 01    | 0010   |
| 10    | 0100   |
| 11    | 1000   |

This is useful for selecting which register to write, which instruction
to execute, etc.
          `,
          examples: [
            {
              id: 'decoder-2to4',
              title: '2-to-4 Decoder',
              language: 'wire',
              code: `module decoder2(sel:2) -> out:4:
  not_s0 = nand(sel[0], sel[0])
  not_s1 = nand(sel[1], sel[1])

  // out[0] when sel = 00
  x0 = nand(not_s1, not_s0)
  out[0] = nand(x0, x0)

  // out[1] when sel = 01
  x1 = nand(not_s1, sel[0])
  out[1] = nand(x1, x1)

  // out[2] when sel = 10
  x2 = nand(sel[1], not_s0)
  out[2] = nand(x2, x2)

  // out[3] when sel = 11
  x3 = nand(sel[1], sel[0])
  out[3] = nand(x3, x3)`,
              description: 'Decodes 2 bits into 4 one-hot outputs.'
            }
          ]
        },
        {
          id: 'comparator-pattern',
          title: 'Comparators',
          content: `
Comparing numbers is essential for conditionals. Here's how to check if
an 8-bit number is zero:
          `,
          examples: [
            {
              id: 'zero-check',
              title: 'Zero Detector',
              language: 'wire',
              code: `module is_zero(val:8) -> zero:
  // OR all bits together, then invert
  or01 = or(val[0], val[1])
  or23 = or(val[2], val[3])
  or45 = or(val[4], val[5])
  or67 = or(val[6], val[7])
  or0123 = or(or01, or23)
  or4567 = or(or45, or67)
  any_set = or(or0123, or4567)
  // If no bits set, it's zero
  zero = nand(any_set, any_set)

module or(a, b) -> out:
  na = nand(a, a)
  nb = nand(b, b)
  out = nand(na, nb)`,
              description: 'Outputs 1 if the 8-bit input is zero.'
            }
          ]
        }
      ],
      relatedArticles: ['wire-stdlib', 'cpu-basics']
    }
  ]
}
