import type { Category } from '../types'

export const logicFundamentals: Category = {
  id: 'logic-fundamentals',
  title: 'Logic Design Fundamentals',
  emoji: '🔌',
  description: 'Learn the basics of digital logic - the building blocks of all computers!',
  articles: [
    {
      id: 'what-is-digital-logic',
      title: 'What is Digital Logic?',
      emoji: '💡',
      summary: 'Everything in a computer is just 1s and 0s. Let\'s see why!',
      difficulty: 'beginner',
      sections: [
        {
          id: 'intro',
          title: 'The World of 1s and 0s',
          content: `
Imagine you have a light switch. It can only be in two positions: **ON** or **OFF**.
There's no "half-on" or "kind of off" - just ON or OFF.

That's exactly how computers work! Instead of ON/OFF, we call these states:
- **1** (ON, TRUE, HIGH)
- **0** (OFF, FALSE, LOW)

This is called **binary** - a system with only two possible values.

## Why Binary?

Think about it: it's really easy to tell if a light is on or off. But imagine trying
to tell the difference between "a little bit bright" and "slightly brighter". That's hard!

Computers use electricity, and it's much easier to detect "electricity flowing" vs
"no electricity" than to measure exact amounts. So we stick with just two states.

## Bits and Bytes

Each 1 or 0 is called a **bit** (short for "binary digit").

8 bits together make a **byte**. A byte can represent 256 different values (0-255).

For example:
- \`00000000\` = 0
- \`00000001\` = 1
- \`00000010\` = 2
- \`11111111\` = 255

The Cygnus-7 spacecraft uses 8-bit and 16-bit values throughout its systems!
          `
        },
        {
          id: 'signals',
          title: 'Signals and Wires',
          content: `
In a computer chip, **wires** carry electrical signals between components.

Each wire carries a single bit - either a 1 or a 0 at any given moment.

When we group multiple wires together, we call it a **bus**. An 8-bit bus has
8 wires, and can carry values from 0 to 255.

In the Wire language, you'll define these signals and connect them together
to build circuits!
          `
        }
      ],
      relatedArticles: ['logic-gates', 'nand-gate']
    },
    {
      id: 'logic-gates',
      title: 'Logic Gates: The Basic Building Blocks',
      emoji: '🚪',
      summary: 'Gates are tiny decision-makers that combine signals in different ways.',
      difficulty: 'beginner',
      sections: [
        {
          id: 'what-are-gates',
          title: 'What Are Logic Gates?',
          content: `
A **logic gate** is like a tiny decision-maker. It takes one or more input signals
and produces an output based on simple rules.

Think of it like this: imagine a bouncer at a club with very specific rules.

## The AND Gate

The AND bouncer says: "You can only come in if you have a ticket AND you're on the list."

Both conditions must be true!

| Input A | Input B | Output |
|---------|---------|--------|
| 0       | 0       | 0      |
| 0       | 1       | 0      |
| 1       | 0       | 0      |
| 1       | 1       | **1**  |

Only when BOTH inputs are 1, the output is 1.

## The OR Gate

The OR bouncer is more relaxed: "You can come in if you have a ticket OR you're on the list."

Either condition works!

| Input A | Input B | Output |
|---------|---------|--------|
| 0       | 0       | 0      |
| 0       | 1       | **1**  |
| 1       | 0       | **1**  |
| 1       | 1       | **1**  |

If at least one input is 1, the output is 1.

## The NOT Gate

The NOT gate is a contrarian - it always does the opposite!

| Input | Output |
|-------|--------|
| 0     | **1**  |
| 1     | **0**  |

It "flips" or "inverts" the signal.
          `
        },
        {
          id: 'try-it',
          title: 'Try It Yourself!',
          content: `
Here's a simple AND gate in the Wire language. Try running it!
          `,
          examples: [
            {
              id: 'and-gate-example',
              title: 'AND Gate',
              language: 'wire',
              code: `module and_test(a, b) -> out:
  nand_ab = nand(a, b)
  out = nand(nand_ab, nand_ab)`,
              description: 'An AND gate built from NAND gates. Try different inputs!'
            }
          ]
        }
      ],
      relatedArticles: ['nand-gate', 'building-with-nand']
    },
    {
      id: 'nand-gate',
      title: 'The NAND Gate: The Universal Gate',
      emoji: '⭐',
      summary: 'One gate to rule them all - you can build ANY logic from NAND gates!',
      difficulty: 'beginner',
      sections: [
        {
          id: 'what-is-nand',
          title: 'What is NAND?',
          content: `
NAND stands for "NOT AND". It's an AND gate followed by a NOT gate.

| Input A | Input B | Output |
|---------|---------|--------|
| 0       | 0       | **1**  |
| 0       | 1       | **1**  |
| 1       | 0       | **1**  |
| 1       | 1       | 0      |

The output is 0 ONLY when both inputs are 1. Otherwise, it's 1.

## Why is NAND Special?

Here's the amazing thing: **you can build ANY logic circuit using only NAND gates!**

This is why NAND is called a "universal gate."

In the Wire language, \`nand\` is one of only two primitive operations (the other is \`dff\`
for memory). Everything else - AND, OR, NOT, XOR, adders, the entire CPU - is built
from NAND gates!

## Building NOT from NAND

To make a NOT gate, just connect both NAND inputs to the same signal:

\`\`\`
NOT(a) = NAND(a, a)
\`\`\`

When a=0: NAND(0,0) = 1 ✓
When a=1: NAND(1,1) = 0 ✓

## Building AND from NAND

AND is just NAND followed by NOT:

\`\`\`
AND(a, b) = NOT(NAND(a, b)) = NAND(NAND(a, b), NAND(a, b))
\`\`\`
          `
        },
        {
          id: 'nand-example',
          title: 'Try It!',
          content: 'Here\'s the NAND gate in action:',
          examples: [
            {
              id: 'nand-basic',
              title: 'NAND Gate',
              language: 'wire',
              code: `module nand_test(a, b) -> out:
  out = nand(a, b)`,
              description: 'The fundamental NAND gate. When both inputs are 1, output is 0.'
            }
          ]
        }
      ],
      relatedArticles: ['logic-gates', 'building-with-nand']
    },
    {
      id: 'building-with-nand',
      title: 'Building Everything from NAND',
      emoji: '🏗️',
      summary: 'See how NOT, AND, OR, and XOR are all built from NAND gates.',
      difficulty: 'intermediate',
      sections: [
        {
          id: 'not-from-nand',
          title: 'NOT from NAND',
          content: `
The simplest conversion - feed the same signal to both inputs:

\`\`\`
NOT(a) = NAND(a, a)
\`\`\`
          `,
          examples: [
            {
              id: 'not-from-nand',
              title: 'NOT Gate',
              language: 'wire',
              code: `module not_gate(a) -> out:
  out = nand(a, a)`,
              description: 'NOT built from a single NAND gate.'
            }
          ]
        },
        {
          id: 'and-from-nand',
          title: 'AND from NAND',
          content: `
AND is NAND followed by NOT (which is also NAND):

\`\`\`
AND(a, b) = NOT(NAND(a, b))
\`\`\`

This takes 2 NAND gates.
          `,
          examples: [
            {
              id: 'and-from-nand',
              title: 'AND Gate',
              language: 'wire',
              code: `module and_gate(a, b) -> out:
  x = nand(a, b)
  out = nand(x, x)`,
              description: 'AND built from 2 NAND gates.'
            }
          ]
        },
        {
          id: 'or-from-nand',
          title: 'OR from NAND',
          content: `
OR requires inverting both inputs first, then NANDing them:

\`\`\`
OR(a, b) = NAND(NOT(a), NOT(b))
\`\`\`

This takes 3 NAND gates.
          `,
          examples: [
            {
              id: 'or-from-nand',
              title: 'OR Gate',
              language: 'wire',
              code: `module or_gate(a, b) -> out:
  not_a = nand(a, a)
  not_b = nand(b, b)
  out = nand(not_a, not_b)`,
              description: 'OR built from 3 NAND gates.'
            }
          ]
        },
        {
          id: 'xor-from-nand',
          title: 'XOR from NAND',
          content: `
XOR (exclusive OR) outputs 1 when the inputs are *different*:

| A | B | XOR |
|---|---|-----|
| 0 | 0 | 0   |
| 0 | 1 | 1   |
| 1 | 0 | 1   |
| 1 | 1 | 0   |

This takes 4 NAND gates:
          `,
          examples: [
            {
              id: 'xor-from-nand',
              title: 'XOR Gate',
              language: 'wire',
              code: `module xor_gate(a, b) -> out:
  nand_ab = nand(a, b)
  x = nand(a, nand_ab)
  y = nand(b, nand_ab)
  out = nand(x, y)`,
              description: 'XOR built from 4 NAND gates. Output is 1 when inputs differ.'
            }
          ]
        }
      ],
      relatedArticles: ['nand-gate', 'flip-flops']
    },
    {
      id: 'flip-flops',
      title: 'Flip-Flops: Memory in Circuits',
      emoji: '🔄',
      summary: 'How circuits remember things using flip-flops.',
      difficulty: 'intermediate',
      sections: [
        {
          id: 'why-memory',
          title: 'Why Do We Need Memory?',
          content: `
Logic gates are great for making decisions, but they have a problem:
they have no memory! The output only depends on the current inputs.

But computers need to **remember** things:
- What instruction are we on?
- What's the current count?
- What was the last key pressed?

This is where **flip-flops** come in!

## What is a Flip-Flop?

A flip-flop is a circuit that can store a single bit (0 or 1). It "remembers"
its value until you tell it to change.

The most common type is the **D Flip-Flop** (DFF):
- **D** (Data): The value you want to store
- **CLK** (Clock): When to store it
- **Q** (Output): The stored value

When the clock "ticks" (goes from 0 to 1), the flip-flop captures whatever
value is on D and holds it at Q.
          `
        },
        {
          id: 'clock-signal',
          title: 'The Clock Signal',
          content: `
The **clock** is like a heartbeat for the circuit. It's a signal that alternates
between 0 and 1 at a regular rate.

\`\`\`
Clock: 0 1 0 1 0 1 0 1 0 1 ...
       ─┘└─┘└─┘└─┘└─┘└─┘└─
\`\`\`

Each "tick" of the clock advances the circuit by one step:
- Flip-flops capture new values
- Counters increment
- The CPU moves to the next instruction

The Cygnus-7's computer runs at a certain clock speed - each tick is one
"cycle" of operation.
          `
        },
        {
          id: 'dff-example',
          title: 'Try It!',
          content: 'Here\'s a D flip-flop in action:',
          examples: [
            {
              id: 'dff-basic',
              title: 'D Flip-Flop',
              language: 'wire',
              code: `module memory_cell(data, clk) -> stored:
  stored = dff(data, clk)`,
              description: 'A single-bit memory cell. The output holds the last value of data when clk ticked.'
            },
            {
              id: 'register-8bit',
              title: '8-bit Register',
              language: 'wire',
              code: `module register8(data:8, clk) -> out:8:
  out[0] = dff(data[0], clk)
  out[1] = dff(data[1], clk)
  out[2] = dff(data[2], clk)
  out[3] = dff(data[3], clk)
  out[4] = dff(data[4], clk)
  out[5] = dff(data[5], clk)
  out[6] = dff(data[6], clk)
  out[7] = dff(data[7], clk)`,
              description: 'Eight flip-flops working together to store a full byte!'
            }
          ]
        }
      ],
      relatedArticles: ['building-with-nand', 'state-machines']
    },
    {
      id: 'state-machines',
      title: 'State Machines: Circuits That Think',
      emoji: '🤖',
      summary: 'How flip-flops and logic combine to create circuits that follow procedures.',
      difficulty: 'intermediate',
      sections: [
        {
          id: 'what-is-state',
          title: 'What is State?',
          content: `
**State** is just a fancy word for "what the circuit is doing right now" or
"where it is in a process."

Think about a traffic light. It has three states:
1. 🔴 Red (STOP)
2. 🟡 Yellow (SLOW DOWN)
3. 🟢 Green (GO)

The light moves through these states in order, spending some time in each one.

## State Machines

A **state machine** is a circuit that:
1. Has a set of possible states
2. Remembers which state it's in (using flip-flops!)
3. Has rules for moving between states

The CPU is a state machine! It goes through states like:
1. **FETCH** - Get the next instruction from memory
2. **DECODE** - Figure out what the instruction means
3. **EXECUTE** - Do the operation
4. **STORE** - Save the result

Then it loops back to FETCH for the next instruction!
          `
        },
        {
          id: 'counter-example',
          title: 'A Simple State Machine: Counter',
          content: `
A counter is one of the simplest state machines. Its states are just numbers:
0, 1, 2, 3, ... and the rule is "add 1 on each clock tick."
          `,
          examples: [
            {
              id: 'counter-4bit',
              title: '4-bit Counter',
              language: 'wire',
              code: `module counter4(clk) -> count:4:
  // Half adder for incrementing
  sum0 = xor(count[0], 1)
  carry0 = and(count[0], 1)

  sum1 = xor(count[1], carry0)
  carry1 = and(count[1], carry0)

  sum2 = xor(count[2], carry1)
  carry2 = and(count[2], carry1)

  sum3 = xor(count[3], carry2)

  // Store the incremented value
  count[0] = dff(sum0, clk)
  count[1] = dff(sum1, clk)
  count[2] = dff(sum2, clk)
  count[3] = dff(sum3, clk)

// Helper modules
module xor(a, b) -> out:
  nand_ab = nand(a, b)
  out = nand(nand(a, nand_ab), nand(b, nand_ab))

module and(a, b) -> out:
  x = nand(a, b)
  out = nand(x, x)`,
              description: 'A 4-bit counter that counts from 0 to 15, then wraps back to 0.'
            }
          ]
        }
      ],
      relatedArticles: ['flip-flops', 'cpu-basics']
    }
  ]
}
