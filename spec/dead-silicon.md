# Dead Silicon

## Project Specification v2 — LangJam GameJam 2025

---

## 1. Executive Summary

### The Pitch

> "We built an HDL called Wire. We designed a CPU in it. We wrote firmware in our assembly language, Pulse. You connect to a broken prototype machine via serial terminal, fix corrupted hardware AND buggy software, and uncover what's hidden inside."

### The Game

You've gained access to an experimental FPGA-based computer. The system is damaged — hardware bugs, corrupted circuits, sabotaged firmware, locked partitions. Using your PC, you write Wire and Pulse fixes, flash them to the remote system, slowly bringing it back to life and uncovering its secrets.

Some bugs are accidents. Some look deliberate. That's part of the mystery.

### Languages Created

| Language  | Purpose                       | Who Writes It                                         |
| --------- | ----------------------------- | ----------------------------------------------------- |
| **Wire**  | Hardware Description Language | Player (to fix hardware bugs)                         |
| **Pulse** | Assembly for the FPGA's CPU   | Us (shipped firmware) + Player (to fix software bugs) |

---

## 2. Architecture Overview

### The Two Machines

```
┌─────────────────────────────────────────────────────────────────────┐
│  YOUR PC (Browser)                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                    │
│  │ Code Editor │ │ File Browser│ │ Serial Term │ ←── nice, modern  │
│  │ (Wire/Pulse)│ │ (your work) │ │ (to FPGA)   │                    │
│  └─────────────┘ └─────────────┘ └─────────────┘                    │
│        │                              │                              │
│        └──── flash ───────────────────┘                              │
└───────────────────────────────────────│─────────────────────────────┘
                                        │ serial connection
                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  THE FPGA (Simulated)                                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Hardware Layer (defined in Wire)                            │    │
│  │ - CPU, ALU, registers, memory controller                    │    │
│  │ - Display driver, keyboard input                            │    │
│  │ - Storage controller, crypto unit                           │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Firmware (written in Pulse, pre-loaded)                     │    │
│  │ - Boot sequence, shell, filesystem                          │    │
│  │ - Responds to your serial commands                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ← broken, cryptic, hostile                                         │
└─────────────────────────────────────────────────────────────────────┘
```

### What Each Side Does

| Your PC                                     | The FPGA                  |
| ------------------------------------------- | ------------------------- |
| Comfortable editor with syntax highlighting | Broken, glitchy output    |
| File browser for your Wire/Pulse files      | Limited shell access      |
| `flash <file.wire>` command                 | Reboots with new hardware |
| Modern, helpful                             | Hostile, mysterious       |

---

## 3. Player Experience

### The Loop

```
1. Connect to FPGA via serial terminal
2. Try to do something (read a file, access storage)
3. It fails — error message hints at hardware OR software problem
4. Find/examine the relevant Wire or Pulse file on your PC
5. Identify and fix the bug
6. Flash the fix to FPGA (hardware or firmware)
7. FPGA reboots, try again
8. Success — new area/capability unlocked
9. Explore, find next obstacle, discover story fragments
10. Repeat until you uncover the secret
```

### Example Session (Wire Puzzle)

```
┌─ YOUR PC ──────────────────────────────────────────────────────────┐
│ ┌─ Files ────┐ ┌─ Editor: alu.wire ──────────────────────────────┐ │
│ │            │ │                                                  │ │
│ │ ▼ cpu/     │ │ module alu(a:8, b:8, op:3) -> out:8:             │ │
│ │  alu.wire ●│ │   add_result = adder8(a, b, 0)                   │ │
│ │  regs.wire │ │   sub_result = adder8(a, invert8(b), 0)  ; BUG!  │ │
│ │ decode.wire│ │   ...                                            │ │
│ │ ▼ mem/     │ │                                                  │ │
│ │ ▼ io/      │ └──────────────────────────────────────────────────┘ │
│ │ ▼ firmware/│                                                      │
│ │ shell.pulse│ ┌─ TERMINAL ─────────────────────────────────────┐  │
│ │    fs.pulse│ │ DEAD SILICON v0.1                              │  │
│ └────────────┘ │ BOOT ERROR: ALU SELF-TEST FAILED               │  │
│                │ SUBTRACTION UNIT MALFUNCTION                   │  │
│                │ $ _                                             │  │
└────────────────┴─────────────────────────────────────────────────┴──┘
```

Player realizes: subtraction needs carry-in set to 1 for two's complement.

Fixes alu.wire:
`sub_result = adder8(a, invert8(b), 1)  ; fixed!`

Types in terminal:
`> flash cpu/alu.wire`

FPGA reboots, self-test passes, shell loads.

### Example Session (Pulse Puzzle)

```
┌─ YOUR PC ──────────────────────────────────────────────────────────┐
│ ┌─ Files ────┐ ┌─ Editor: shell.pulse ───────────────────────────┐ │
│ │            │ │                                                  │ │
│ │ ▼ cpu/     │ │ cmd_cat:                                         │ │
│ │ ▼ mem/     │ │     JSR open_file                                │ │
│ │ ▼ io/      │ │     JSR read_byte    ; read first char           │ │
│ │ ▼ firmware/│ │ print_loop:          ; BUG: first char lost!     │ │
│ │shell.pulse●│ │     JSR print_char                               │ │
│ │   fs.pulse │ │     JSR read_byte                                │ │
│ │crypto.pulse│ │     CMP #0                                       │ │
│ └────────────┘ │     JNE print_loop                               │ │
│                │     RTS                                          │ │
│                └──────────────────────────────────────────────────┘ │
│                ┌─ TERMINAL ─────────────────────────────────────┐  │
│                │ $ cat /home/chen/notes/day_01.txt              │  │
│                │ ay 1: The prototype arrived today.             │  │
│                │ ^ missing 'D'!                                 │  │
│                │ $ _                                             │  │
└────────────────┴─────────────────────────────────────────────────┴──┘
```

Player realizes: first byte is read but never printed before the loop.

Fixes shell.pulse by adding `JSR print_char` before `print_loop` label.

Types: `> flash --firmware shell.pulse`

Now `cat` shows complete file contents. The mystery deepens...

---

## 4. Narrative Structure

### The Mystery

The FPGA is an experimental prototype. Someone was using it for something. They're gone now. The system is damaged — maybe intentionally. What were they working on? What's in the encrypted partition?

### Progression Layers

| Layer      | What's Broken            | What You Unlock  | What You Find                   |
| ---------- | ------------------------ | ---------------- | ------------------------------- |
| 1. Boot    | Basic gates, clock       | System boots     | First log fragments             |
| 2. CPU     | ALU, instruction decoder | Shell works      | More logs, hints about storage  |
| 3. Memory  | Controller, addressing   | Read/write works | Filesystem accessible           |
| 4. I/O     | Display driver, keyboard | Full terminal    | Personal notes, encrypted files |
| 5. Storage | Disk controller          | External storage | Research data, the secret       |
| 6. Crypto  | XOR, shift operations    | Decryption       | The truth                       |

### Narrative Beats

Each layer reveals fragments:

- **Layer 1**: "System initializing... Dr. Chen's research terminal"
- **Layer 2**: "Warning: Unauthorized access will be logged"
- **Layer 3**: "File: /home/chen/notes/day_47.txt"
- **Layer 4**: Personal logs — growing paranoid, "they're watching"
- **Layer 5**: Research data — what they were actually building
- **Layer 6**: The reveal — what happened, why it matters

The mystery pulls you forward. The Wire puzzles are the _how_, the story is the _why_.

---

## 5. Wire Language Specification

### 5.1 Syntax

```
module <name>(<inputs>) -> <outputs>:
  <statement>
  <statement>
  ...
```

### 5.2 Port Declarations

```
; single bit (default)
module not(a) -> out:

; multi-bit bus
module add8(a:8, b:8) -> out:8:

; multiple outputs
module half_adder(a, b) -> (sum, carry):
```

### 5.3 Statements

```
; simple assignment
out = nand(a, b)

; using other modules
result = my_module(input1, input2)

; accessing multi-output modules
h1 = half_adder(a, b)
sum = h1.sum
carry = h1.carry
```

### 5.4 Built-in Primitives

| Primitive | Signature                               | Description |
| --------- | --------------------------------------- | ----------- |
| `nand`    | `(a, b) -> out`                         | NAND gate   |
| `dff`     | `(d, clk) -> q`                         | D flip-flop |
| `ram`     | `(addr:N, data:8, write, clk) -> out:8` | RAM block   |
| `rom`     | `(addr:N) -> out:8`                     | ROM block   |

### 5.5 Standard Library

Provided to players (can be examined, learned from):

```
module not(a) -> out:
  out = nand(a, a)

module and(a, b) -> out:
  out = not(nand(a, b))

module or(a, b) -> out:
  out = nand(not(a), not(b))

module xor(a, b) -> out:
  out = and(or(a, b), nand(a, b))

module mux(sel, a, b) -> out:
  out = or(and(not(sel), a), and(sel, b))

module register(d, load, clk) -> out:
  out = dff(mux(load, out, d), clk)

module register8(d:8, load, clk) -> out:8:
  out = dff(mux(load, out, d), clk)

module half_adder(a, b) -> (sum, carry):
  sum = xor(a, b)
  carry = and(a, b)

module full_adder(a, b, cin) -> (sum, cout):
  h1 = half_adder(a, b)
  h2 = half_adder(h1.sum, cin)
  sum = h2.sum
  cout = or(h1.carry, h2.carry)

module adder8(a:8, b:8, cin) -> (sum:8, cout):
  ; ripple carry implementation
  ; ...
```

### 5.6 Bus Operations

```
; Explicit indexing
bit0 = value[0]
nibble = value[0:3]

; Concatenation
full = concat(high:4, low:4)
```

---

## 6. Pulse Language Specification

### 6.1 Overview

This is what the firmware is written in. Players don't write it initially, but they can examine it and fix bugs (it's part of the mystery — "what is this system doing?").

### 6.2 Instruction Set

| Mnemonic      | Description           |
| ------------- | --------------------- |
| `LDA #imm`    | Load immediate into A |
| `LDA addr`    | Load from memory      |
| `LDA addr,X`  | Load indexed          |
| `STA addr`    | Store A               |
| `STA addr,X`  | Store indexed         |
| `ADD #imm`    | A = A + imm           |
| `SUB #imm`    | A = A - imm           |
| `AND #imm`    | A = A & imm           |
| `ORA #imm`    | A = A \| imm          |
| `EOR #imm`    | A = A ^ imm           |
| `CMP #imm`    | Compare, set flags    |
| `JMP addr`    | Jump                  |
| `JEQ addr`    | Jump if zero          |
| `JNE addr`    | Jump if not zero      |
| `JSR addr`    | Jump to subroutine    |
| `RTS`         | Return                |
| `LDX #imm`    | Load X register       |
| `INX` / `DEX` | Increment/decrement X |
| `PHA` / `PLA` | Push/pull A           |

~20 instructions. Enough for a simple shell.

### 6.3 Memory Map

```
0x0000 - 0x00FF    Zero Page
0x0100 - 0x01FF    Stack
0x0200 - 0x0FFF    RAM
0x1000 - 0x1FFF    Filesystem buffer
0x8000 - 0x83FF    Display (32x32 chars)
0xF000 - 0xF0FF    I/O
  0xF000           Serial RX (from your PC)
  0xF001           Serial TX (to your PC)
  0xF002           Serial status
  0xF010           Storage command
  0xF011           Storage status
  0xF020           Crypto in
  0xF021           Crypto out
0xFF00 - 0xFFFF    ROM (boot + firmware)
```

---

## 7. FPGA Firmware

### 7.1 Boot Sequence (~50 lines Pulse)

```
reset:
    ; init stack
    LDX #0xFF
    TXS

    ; clear display
    JSR clear_screen

    ; print boot message
    LDA #<boot_msg
    LDX #>boot_msg
    JSR print_string

    ; hardware self-tests
    JSR test_alu
    JNE boot_fail

    JSR test_memory
    JNE boot_fail

    ; boot success
    LDA #<ok_msg
    JSR print_string
    JMP shell_main

boot_fail:
    LDA #<fail_msg
    JSR print_string
    HLT

boot_msg:
    .db "DEAD SILICON v0.1", 10
    .db "HARDWARE SELF-TEST...", 0
```

### 7.2 Shell (~150 lines Pulse)

Commands the player can type via serial:

| Command       | Function                           |
| ------------- | ---------------------------------- |
| `help`        | List commands                      |
| `ls [path]`   | List directory                     |
| `cat <file>`  | Print file contents                |
| `status`      | Show system status                 |
| `diag <unit>` | Run diagnostics on a hardware unit |
| `reboot`      | Reboot system                      |

The shell is intentionally limited. Some commands fail until you fix the hardware.

### 7.3 Filesystem

Simple flat structure stored in ROM/RAM:

```
/
├── system/
│   ├── boot.log
│   └── config.sys
├── home/
│   └── chen/
│       ├── notes/
│       │   ├── day_01.txt
│       │   ├── day_47.txt
│       │   └── final.txt
│       └── research/
│           ├── data.enc      <- encrypted
│           └── key.txt       <- need crypto unit
└── var/
    └── log/
        └── access.log
```

Files unlock as you fix more hardware.

---

## 8. Puzzle Design

### 8.1 Two Puzzle Types

| Type         | Language | What's Broken           | How Player Fixes                    |
| ------------ | -------- | ----------------------- | ----------------------------------- |
| **Hardware** | Wire     | Circuits, gates, wiring | Edit `.wire` files, flash to FPGA   |
| **Firmware** | Pulse    | Code bugs, logic errors | Edit `.pulse` files, flash firmware |

Some bugs are accidental. Some look... deliberate. This is part of the mystery.

### 8.2 Wire Puzzle Types

| Type                  | Example                               |
| --------------------- | ------------------------------------- |
| **Missing gate**      | OR gate wired as AND                  |
| **Wrong connection**  | Output fed to wrong input             |
| **Missing carry**     | Adder doesn't chain carry             |
| **Off-by-one**        | Counter resets at wrong value         |
| **Timing bug**        | Clock edge wrong                      |
| **Missing inversion** | Forgot to invert for two's complement |
| **Incomplete module** | XOR unit missing entirely             |

### 8.3 Pulse Puzzle Types

| Type                     | Example                                            |
| ------------------------ | -------------------------------------------------- |
| **Off-by-one**           | Loop starts at 1 instead of 0, skipping first item |
| **Wrong comparison**     | `JEQ` instead of `JNE`, logic inverted             |
| **Wrong register**       | Uses X when it should use Y                        |
| **Missing increment**    | Forgot `INX`, infinite loop                        |
| **String handling**      | Null terminator check wrong                        |
| **Intentional sabotage** | Someone commented out a check                      |
| **Hidden feature**       | Backdoor command left by previous user             |

### 8.4 Progression with Both Puzzle Types

| Layer             | Wire Puzzles                       | Pulse Puzzles                           | Narrative Beat                   |
| ----------------- | ---------------------------------- | --------------------------------------- | -------------------------------- |
| **1. Boot**       | Clock divider wrong                | None (can't boot yet)                   | "What is this machine?"          |
| **2. CPU Core**   | ALU subtract broken, decoder wrong | None (shell won't run)                  | System boots, first logs visible |
| **3. Shell**      | None                               | `help` command crashes (stack bug)      | Shell works, can explore         |
| **4. Filesystem** | Memory controller addressing       | `ls` hides dotfiles (intentional?)      | Find hidden `.secret/` directory |
| **5. I/O**        | Serial TX timing, display driver   | `cat` skips first line                  | Read Dr. Chen's notes            |
| **6. Storage**    | Disk controller read strobe        | Path parsing bug (`/a/b` fails)         | Access external storage          |
| **7. Crypto**     | XOR missing, shifter inverted      | Decryption routine has wrong key offset | Decrypt final files              |
| **8. The Truth**  | None                               | Find and use hidden backdoor command    | The reveal                       |

### 8.5 Detailed Puzzle Breakdown

#### Layer 1: Boot (Wire only)

**Problem:** System won't POST. Screen shows garbage.

**Wire Bug:** `clock/divider.wire`

```
module clock_divider(clk_in) -> clk_out:
  counter = counter4(clk_in)
  clk_out = counter[2]  ; BUG: should be counter[3] for correct timing
```

**Symptom:** Display refreshes too fast, unreadable.

**Fix:** Change `counter[2]` to `counter[3]`.

**Unlocks:** System boots to self-test.

---

#### Layer 2: CPU Core (Wire only)

**Problem:** ALU self-test fails. System halts.

**Wire Bug #1:** `cpu/alu.wire`

```
module alu(a:8, b:8, op:3) -> (out:8, zero, carry):
  sub_result = adder8(a, invert8(b), 0)  ; BUG: carry-in should be 1
```

**Symptom:** "ALU SELF-TEST FAILED: SUBTRACTION UNIT MALFUNCTION"

**Fix:** Change `adder8(a, invert8(b), 0)` to `adder8(a, invert8(b), 1)`.

**Wire Bug #2:** `cpu/decode.wire`

```
module decoder(opcode:8) -> (...):
  is_jmp = eq(opcode, 0x50)  ; BUG: JMP is 0x60, not 0x50
```

**Symptom:** Programs crash when they try to jump. Self-test hangs.

**Fix:** Change `0x50` to `0x60`.

**Unlocks:** CPU passes self-test, shell starts loading.

---

#### Layer 3: Shell (Pulse only)

**Problem:** Typing `help` crashes the system.

**Pulse Bug:** `firmware/shell.pulse`

```asm
do_help:
    LDA #<help_text
    LDX #>help_text
    JSR print_string
    ; BUG: missing RTS, falls through into garbage
```

**Symptom:** "help" causes reboot or garbage output.

**Fix:** Add `RTS` after `JSR print_string`.

**Narrative:** First working shell. Player can now type `ls`, see filesystem.

**Discovery:** System logs mention "Dr. Chen" and "prototype research".

---

#### Layer 4: Filesystem (Wire + Pulse)

**Problem:** `ls` shows some directories but not all. Something's hidden.

**Pulse Bug (intentional sabotage):** `firmware/filesystem.pulse`

```asm
list_dir:
    ; ... loop through entries ...
    LDA (entry_ptr),Y    ; first char of filename
    CMP #'.'
    JEQ skip_entry       ; BUG: intentionally hiding dotfiles!
    ; ...
skip_entry:
    ; ...
```

**Symptom:** `/home/chen/` appears empty, but logs reference files there.

**Clue:** Access log shows "MODIFIED: filesystem.pulse" with recent timestamp.

**Fix:** Remove or comment out the dotfile check.

**Discovery:** `.secret/` directory revealed. Contains `readme.txt`: "They're monitoring the main partition. Moved everything here."

**Wire Bug:** `mem/controller.wire` — needed to access extended memory where `.secret/` lives.

```
module mem_controller(addr:16, ...) -> (...):
  bank = addr[14:15]
  offset = addr[0:13]
  ; BUG: bank bits swapped
  physical = concat(bank[0], bank[1], offset)  ; should be bank[1], bank[0]
```

**Symptom:** Reading from `.secret/` returns garbage.

**Fix:** Swap bank bit order.

---

#### Layer 5: I/O (Wire + Pulse)

**Problem:** Can see files in `.secret/`, but `cat` output is wrong.

**Pulse Bug:** `firmware/shell.pulse`

```asm
cmd_cat:
    JSR open_file
    JSR read_byte      ; read first char
    ; BUG: falls through without printing first byte
print_loop:
    JSR print_char
    JSR read_byte
    CMP #0
    JNE print_loop
    RTS
```

**Symptom:** Every file is missing its first character. "ay 47: Something is wrong" instead of "Day 47: Something is wrong".

**Fix:** Move `JSR print_char` before the loop, or restructure.

**Wire Bug:** `io/display.wire` — characters occasionally corrupted.

```
module display_driver(char:8, x:6, y:5, write, clk) -> (...):
  ; BUG: latching on wrong clock edge
  char_reg = register8(char, write, clk)  ; should be not(clk) for setup time
```

**Fix:** Change clock edge.

**Narrative:** Can finally read Dr. Chen's notes clearly.

**Discovery:** Notes reveal growing paranoia. "Day 31: Found access logs I didn't make. Someone else is using the system at night."

---

#### Layer 6: Storage (Wire + Pulse)

**Problem:** Notes reference "external research data" but `ls /mnt/storage` fails.

**Wire Bug:** `storage/disk.wire`

```
module disk_controller(cmd:8, addr:16, clk) -> (data:8, ready):
  ; BUG: read strobe too short, data not stable
  read_strobe = and(is_read, clk)  ; needs to hold for 2 cycles
```

**Symptom:** "STORAGE READ ERROR: DATA INVALID"

**Fix:** Add proper timing/hold circuit.

**Pulse Bug:** `firmware/filesystem.pulse`

```asm
parse_path:
    ; handles "/home" fine
    ; BUG: doesn't handle multiple slashes correctly
    LDA path,X
    CMP #'/'
    JEQ found_slash
    INX
    JMP parse_path
found_slash:
    ; stores index but doesn't advance past slash
    ; next iteration finds same slash again = infinite loop
```

**Symptom:** `ls /mnt/storage/data` hangs.

**Fix:** Add `INX` after `found_slash` to advance past the slash.

**Discovery:** External storage contains `research_data.enc` and `experiments.log`. The log is readable: details of the project, references to encrypted findings.

---

#### Layer 7: Crypto (Wire + Pulse)

**Problem:** `research_data.enc` is encrypted. Crypto unit doesn't work.

**Wire Bug #1:** `crypto/xor.wire` — file is empty!

```
; TODO: implement XOR unit
; - Chen
```

**Task:** Player must implement XOR from gates.

```
module xor8(a:8, b:8) -> out:8:
  out = and(or(a, b), nand(a, b))  ; player writes this
```

**Wire Bug #2:** `crypto/shift.wire`

```
module shifter(val:8, left) -> out:8:
  ; BUG: left/right inverted
  out = mux(left, shift_right(val), shift_left(val))  ; backwards!
```

**Fix:** Swap the mux inputs.

**Pulse Bug:** `firmware/crypto.pulse`

```asm
decrypt:
    LDA key_offset
    ADD #1            ; BUG: should be ADD #0, offset already correct
    STA key_offset    ; key stream is off by one, garbage output
```

**Symptom:** Decryption produces garbage.

**Fix:** Remove the errant `ADD #1`.

**Discovery:** Decrypted files reveal what Dr. Chen was working on. The mystery unfolds.

---

#### Layer 8: The Truth (Pulse only)

**Problem:** One last encrypted file. Standard decrypt doesn't work. Different key?

**Discovery:** In Chen's notes, a cryptic reference: "Left myself a way back in. The old command still works."

**Pulse Investigation:** Player examines shell source, finds:

```asm
parse_command:
    ; ... normal commands ...

    ; Hidden backdoor (commented but functional due to assembler quirk)
    LDA input_buffer
    CMP #'~'
    JNE not_backdoor
    JSR backdoor_handler    ; What's this?
not_backdoor:
```

**The backdoor:** Typing `~reveal` runs a hidden routine that:

1. Uses a different decryption key
2. Outputs the final file

**The Reveal:** The truth about what happened. Why the system was damaged. What Dr. Chen discovered.

(Left intentionally vague — the actual story content is up to you!)

---

### 8.6 Clue System

Players aren't left stranded:

| Clue Type             | How It Works                                                |
| --------------------- | ----------------------------------------------------------- |
| **Error messages**    | Hardware failures show which module: "ALU SELF-TEST FAILED" |
| **`diag` command**    | `diag cpu` shows: "ADD: PASS, SUB: FAIL, CMP: PASS"         |
| **Access logs**       | `/var/log/access.log` shows what was modified and when      |
| **Comments in code**  | Dr. Chen left notes: `; TODO: fix this later - Chen`        |
| **Cross-references**  | Notes mention files, files reference hardware               |
| **Progressive hints** | After N minutes stuck, offer optional hint                  |

### 8.7 Distinguishing Bugs from Sabotage

Part of the mystery is figuring out what's accidental vs. intentional:

| Accidental Bugs          | Intentional Sabotage                       |
| ------------------------ | ------------------------------------------ |
| Clock divider off-by-one | Dotfile hiding in `ls`                     |
| Missing carry in ALU     | `cat` skipping first char (hides headers?) |
| Wrong opcode in decoder  | Backdoor command                           |
| Timing issues            | Modified access timestamps                 |

The player starts thinking "oh, buggy prototype" and gradually realizes "wait, someone did this on purpose."

---

## 9. PC Interface (Browser UI)

### 9.1 Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Dead Silicon Recovery Console]                             [?] [⚙]     │
├───────────────┬─────────────────────────────────────────────────────┤
│ FILES         │ EDITOR                                              │
│               │                                                     │
│ ▼ cpu/        │ ┌─ alu.wire ──────────────────────────────────────┐  │
│   alu.wire ●   │ │                                                │  │
│   decode.wire  │ │ module alu(a:8, b:8, op:3) -> out:8:           │  │
│   regs.wire    │ │   add_result = adder8(a, b, 0)                 │  │
│ ▼ mem/        │ │   sub_result = adder8(a, invert8(b), 1)        │  │
│   controller.h│ │   and_result = and8(a, b)                      │  │
│ ▼ io/         │ │   or_result = or8(a, b)                        │  │
│   display.wire │ │   out = mux8_4(op, add_result, sub_result, ..  │  │
│   serial.wire  │ │                                                │  │
│ ▼ stdlib/     │ └────────────────────────────────────────────────┘  │
│   gates.wire   │                                                     │
│   adders.wire  │ ┌─ TERMINAL ─────────────────────────────────────┐  │
│               │ │ $ cat /home/chen/notes/day_01.txt              │  │
│               │ │ Day 1. The new FPGA prototype arrived today.   │  │
│               │ │ Performance is incredible. Starting tests.     │  │
│ [+ New File]  │ │                                                │  │
│               │ │ $ _                                            │  │
└───────────────┴─┴────────────────────────────────────────────────┴──┘
│ [▶ Flash]  [↻ Reboot]  Status: Connected @ 115200                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 Features

| Feature          | Description                                         |
| ---------------- | --------------------------------------------------- |
| **File tree**    | Browse Wire/Pulse files, see which are modified (●) |
| **Code editor**  | Syntax highlighting, error underlining              |
| **Terminal**     | Serial connection to FPGA                           |
| **Flash button** | Compile and upload current file                     |
| **Reboot**       | Reset FPGA to test changes                          |
| **Status bar**   | Connection state, last error                        |

### 9.3 Commands (PC side)

Typed in terminal, handled by PC:

| Command                         | Action                                   |
| ------------------------------- | ---------------------------------------- |
| `connect`                       | Open serial connection to FPGA           |
| `disconnect`                    | Close connection                         |
| `flash <file.wire>`             | Compile Wire and upload to FPGA hardware |
| `flash --firmware <file.pulse>` | Assemble Pulse and upload firmware       |
| `reboot`                        | Restart FPGA                             |
| `help`                          | Show PC commands                         |

All other input passes through to the FPGA shell.

---

## 10. Technical Implementation

### 10.1 TypeScript Structure

```
src/
├── wire/
│   ├── lexer.ts           # Tokenize Wire source
│   ├── parser.ts          # Build AST
│   ├── compiler.ts        # AST -> gate graph
│   └── simulator.ts       # Evaluate gates
│
├── pulse/
│   ├── assembler.ts       # Pulse -> binary
│   └── disassembler.ts    # For debug/display
│
├── fpga/
│   ├── cpu.ts             # CPU simulation (runs on gate output)
│   ├── memory.ts          # Memory subsystem
│   └── io.ts              # Serial, display, storage
│
├── ui/
│   ├── editor.ts          # CodeMirror wrapper
│   ├── terminal.ts        # xterm.js wrapper
│   ├── filetree.ts        # File browser
│   └── app.ts             # Main app shell
│
├── game/
│   ├── levels.ts          # Level definitions (bugs, unlocks)
│   ├── narrative.ts       # Story text, logs
│   └── progress.ts        # Save/load state
│
└── assets/
    ├── wire/              # Starting Wire files (with bugs)
    ├── pulse/             # Firmware source
    └── fs/                # Virtual filesystem contents
```

### 10.2 Key Classes

```typescript
// Wire compilation pipeline
class WireCompiler {
  compile(source: string): GateGraph;
}

class GateSimulator {
  graph: GateGraph;
  state: Map<string, number>;

  step(): void;
  run(cycles: number): void;
  getOutput(name: string): number;
  setInput(name: string, value: number): void;
}

// FPGA system
class FPGA {
  hardware: GateSimulator; // Current Wire design
  cpu: CPUState;
  memory: Uint8Array;

  boot(): void;
  tick(): void;
  serialIn(char: number): void;
  serialOut(): number | null;
}

// Game state
class Game {
  fpga: FPGA;
  files: VirtualFS; // Player's Wire/Pulse files
  level: number;
  unlockedFiles: Set<string>;

  flash(filename: string): CompileResult;
  reboot(): void;
}
```

### 10.3 Libraries

| Library        | Purpose                              |
| -------------- | ------------------------------------ |
| **CodeMirror** | Code editor with syntax highlighting |
| **xterm.js**   | Terminal emulator                    |
| **Vite**       | Build tooling                        |

---

## 11. Content Needed

### 11.1 Wire Files (with bugs)

| File                  | Module        | Bug                            | Layer |
| --------------------- | ------------- | ------------------------------ | ----- |
| `clock/divider.wire`  | Clock divider | Counter bit wrong              | 1     |
| `cpu/alu.wire`        | ALU           | Subtraction missing carry      | 2     |
| `cpu/decode.wire`     | Decoder       | JMP opcode wrong               | 2     |
| `mem/controller.wire` | Memory        | Bank bits swapped              | 4     |
| `io/display.wire`     | Display       | Clock edge wrong               | 5     |
| `storage/disk.wire`   | Disk          | Read strobe timing             | 6     |
| `crypto/xor.wire`     | XOR unit      | Empty file (player implements) | 7     |
| `crypto/shift.wire`   | Shifter       | Direction inverted             | 7     |

### 11.2 Pulse Files (with bugs)

| File                        | Function        | Bug                           | Layer |
| --------------------------- | --------------- | ----------------------------- | ----- |
| `firmware/shell.pulse`      | Help command    | Missing RTS                   | 3     |
| `firmware/shell.pulse`      | Cat command     | Skips first byte              | 5     |
| `firmware/filesystem.pulse` | List directory  | Hides dotfiles (intentional)  | 4     |
| `firmware/filesystem.pulse` | Path parsing    | Infinite loop on nested paths | 6     |
| `firmware/crypto.pulse`     | Decrypt routine | Key offset wrong              | 7     |
| `firmware/shell.pulse`      | Backdoor        | Hidden `~reveal` command      | 8     |

### 11.3 Narrative Files

| File                             | Layer | Contents                                                 |
| -------------------------------- | ----- | -------------------------------------------------------- |
| `/system/boot.log`               | 2     | Hardware init, timestamps, "Dr. Chen Research Terminal"  |
| `/var/log/access.log`            | 3     | Access times, shows "filesystem.pulse MODIFIED" recently |
| `/home/chen/.secret/readme.txt`  | 4     | "Moved everything here. They're watching."               |
| `/home/chen/notes/day_01.txt`    | 5     | Excitement about new FPGA prototype                      |
| `/home/chen/notes/day_12.txt`    | 5     | Strange behavior noticed, unexplained reboots            |
| `/home/chen/notes/day_31.txt`    | 5     | "Found access logs I didn't make"                        |
| `/home/chen/notes/day_47.txt`    | 5     | Full paranoia, "encrypting everything"                   |
| `/home/chen/notes/final.txt`     | 6     | Cryptic last entry, hints at backdoor                    |
| `/mnt/storage/experiments.log`   | 6     | Research details, what they were building                |
| `/mnt/storage/research_data.enc` | 7     | Encrypted findings                                       |
| `/mnt/storage/truth.enc`         | 8     | The final reveal (needs backdoor key)                    |

### 11.4 Firmware Breakdown

| Component                        | Lines (est.)     | Contains Bugs?              |
| -------------------------------- | ---------------- | --------------------------- |
| Boot sequence                    | 50               | No                          |
| Shell command parser             | 100              | Yes (help crash)            |
| Commands (ls, cat, status, diag) | 200              | Yes (cat bug, dotfile hide) |
| Filesystem / path handling       | 100              | Yes (path parsing)          |
| Print/string utilities           | 50               | No                          |
| Crypto routines                  | 80               | Yes (key offset)            |
| Backdoor handler                 | 30               | Feature, not bug            |
| **Total**                        | ~610 lines Pulse |                             |

---

## 12. Development Timeline

### Day 1: Foundation

- [ ] Wire lexer and parser
- [ ] Basic gate simulator (nand, dff)
- [ ] Test with simple circuits

### Day 2: Wire Complete

- [ ] Full gate simulation
- [ ] Standard library modules
- [ ] Wire compiler (fast mode)
- [ ] Unit tests

### Day 3: CPU & Assembler

- [ ] Design CPU in Wire
- [ ] Assembler for Pulse
- [ ] CPU passes basic tests

### Day 4: FPGA System

- [ ] Memory, serial I/O
- [ ] Boot sequence runs
- [ ] Shell responds to commands

### Day 5: Browser UI

- [ ] Editor with syntax highlighting
- [ ] Terminal emulator
- [ ] File browser
- [ ] Flash/reboot commands

### Day 6: Puzzles & Narrative

- [ ] Bug injection in Wire files
- [ ] Write narrative content (logs, notes)
- [ ] Level progression logic
- [ ] Unlocking mechanism

### Day 7: Polish & Submit

- [ ] Playtest, fix issues
- [ ] Tutorial/hints
- [ ] Write blog post
- [ ] Record demo video
- [ ] Submit

---

## 13. The Pitch to Judges

**Languages we created:**

1. **Wire** — A hardware description language for defining digital circuits
2. **Pulse** — An assembly language for the CPU we designed in Wire

**What we built with them:**

- A complete CPU architecture, defined in Wire
- A working firmware (boot sequence, shell, filesystem, crypto), written in Pulse
- A mystery game where you fix corrupted hardware AND buggy firmware to uncover secrets

**The technical achievement:**

Every gate in the FPGA is simulated. The CPU is defined in Wire. The firmware is assembled from Pulse. When you type a command in the terminal, it travels through our serial port implementation, into our CPU, through our instruction decoder, and executes on our ALU — all defined in Wire, all running code we wrote in Pulse.

**Both languages are gameplay:**

- Wire puzzles: Fix circuits to get hardware working
- Pulse puzzles: Fix code to get software working
- Some bugs are accidents. Some are sabotage. Figuring out which is part of the mystery.

**The game:**

It's not just a tech demo. There's a mystery. Someone was here before you. The system is damaged — both the hardware and the software. Some damage looks deliberate. What were they hiding? What happened to them? Fix the circuits, fix the code, find the truth.

---

_Document version: 2.0_
_Last updated: December 2025_
