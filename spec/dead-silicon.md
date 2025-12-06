# Dead Silicon

## Project Specification v2 — LangJam GameJam 2025

---

## 1. Executive Summary

### The Pitch

> "You've crash-landed on a desolate moon. Your Apollo-era spacecraft is damaged. The onboard computer — a primitive but hackable system — is your only hope. Fix the circuits with Wire. Patch the software with Pulse. Survive."

### The Setting

**1973. An alternate timeline.** The Apollo program continued. Missions went further. You're the systems engineer aboard *Cygnus-7*, a deep space survey mission. Something went wrong during orbital insertion. You crashed. The pilot is unconscious. Life support is failing. The onboard guidance computer — a ruggedized system built from discrete logic chips — took damage in the impact.

The good news: you have the computer's schematics and source code. The bad news: half the circuits are fried, the software is corrupted, and you have limited oxygen.

**You're not a pilot. You're an engineer.** And this is exactly what you trained for.

### The Game

Your spacecraft's computer is built from hardware defined in **Wire** (our HDL) and runs firmware written in **Pulse** (our assembly language). The crash damaged both. Systems are offline. Sensors are dark. Life support is running on backup power.

Through your portable diagnostic terminal, you can:
- Examine the damaged circuit schematics (Wire files)
- Read the corrupted firmware code (Pulse files)
- Flash repairs to the spacecraft's computer
- Run diagnostics and test your fixes
- Slowly bring systems back online to survive

**Each system you repair buys you time and reveals more of what went wrong.**

### Languages Created

| Language  | Purpose                       | Who Uses It                                         |
| --------- | ----------------------------- | --------------------------------------------------- |
| **Wire**  | Hardware Description Language | You (to repair damaged circuits)                    |
| **Pulse** | Assembly for the ship's CPU   | NASA engineers (original) + You (to patch software) |

### Why This Works

The Apollo-era setting is perfect for hardware-level puzzles:
- **Period-appropriate technology**: 1970s computers were simple enough to understand at the gate level
- **Life-or-death stakes**: Every repair matters — you're surviving, not just debugging
- **Authentic constraints**: Limited memory, simple instruction sets, discrete logic
- **Discovery through repair**: As you fix systems, you uncover what caused the crash
- **Real engineering**: Apollo astronauts actually had to understand their systems deeply

---

## 2. Architecture Overview

### The Physical Setup

```
┌─────────────────────────────────────────────────────────────────────┐
│  PORTABLE DIAGNOSTIC TERMINAL (Your Interface - Browser)            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                    │
│  │ Schematic   │ │ Code Viewer │ │ System      │                    │
│  │ Editor      │ │ (Pulse ASM) │ │ Console     │ ← battery-powered │
│  │ (Wire HDL)  │ │             │ │             │   portable unit    │
│  └─────────────┘ └─────────────┘ └─────────────┘                    │
│        │                              │                              │
│        └──── umbilical ───────────────┘                              │
└───────────────────────────────────────│─────────────────────────────┘
                                        │ hardwired connection
                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  CYGNUS-7 GUIDANCE COMPUTER (Damaged)                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Hardware Layer (defined in Wire)                            │    │
│  │ - CPU core, ALU, registers                                  │    │
│  │ - Memory controller, I/O bus                                │    │
│  │ - Life support interface, navigation, comms                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Flight Software (written in Pulse)                          │    │
│  │ - Boot sequence, self-test routines                         │    │
│  │ - System monitoring, sensor interfaces                      │    │
│  │ - Navigation calculations, comm protocols                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ← damaged, partially functional, critical to survival              │
└─────────────────────────────────────────────────────────────────────┘
```

### The Spacecraft Systems

| System          | Hardware (Wire)              | Software (Pulse)              | Status at Start |
| --------------- | ---------------------------- | ----------------------------- | --------------- |
| **Core CPU**    | ALU, decoder, registers      | Boot sequence                 | Damaged         |
| **Life Support**| O2 sensor, CO2 scrubber ctrl | Atmosphere monitoring         | Critical        |
| **Power**       | Solar controller, battery    | Power management              | Backup only     |
| **Navigation**  | Star tracker, IMU interface  | Position calculation          | Offline         |
| **Comms**       | Radio controller, encoder    | Signal protocols              | Offline         |
| **Sensors**     | ADC, multiplexer             | Telemetry collection          | Partial         |

### What You're Working With

| Diagnostic Terminal                    | Ship's Computer               |
| -------------------------------------- | ----------------------------- |
| Portable, battery-powered              | Damaged in crash              |
| Has all schematics and source code     | Circuits partially fried      |
| Can simulate repairs before flashing   | Software corrupted            |
| Modern interface for 70s tech          | Your only hope for survival   |

---

## 3. Player Experience

### The Survival Loop

```
1. Check system status — what's critical? (O2 dropping, power failing)
2. Run diagnostics — which component is damaged?
3. Open the schematic (Wire) or code (Pulse) for that system
4. Find the damage — fried gate? corrupted instruction?
5. Repair it using the visual editor or code
6. Flash the fix to the ship's computer
7. System comes online — immediate benefit (more O2, sensors work)
8. New data reveals more about what went wrong
9. New systems become accessible, exposing new damage
10. Survive. Understand. Escape.
```

### Example Session: Life Support Crisis (Wire Puzzle)

```
┌─ DIAGNOSTIC TERMINAL ─────────────────────────────────────────────┐
│ ┌─ Systems ───┐ ┌─ Schematic: o2_sensor.wire ────────────────────┐│
│ │             │ │                                                 ││
│ │ ▼ cpu/      │ │ ; O2 sensor analog-to-digital interface        ││
│ │ ▼ lifesup/  │ │ module o2_sensor(analog:8, clk) -> level:8:    ││
│ │  o2.wire   ●│ │   sampled = dff(analog, clk)                   ││
│ │  co2.wire   │ │   level = sampled[0:6]  ; BUG: should be [0:7] ││
│ │  scrubber   │ │                                                 ││
│ │ ▼ power/    │ └─────────────────────────────────────────────────┘│
│ │ ▼ nav/      │                                                    │
│ └─────────────┘ ┌─ CONSOLE ───────────────────────────────────────┐│
│                 │ CYGNUS-7 DIAGNOSTIC CONSOLE                     ││
│                 │ ══════════════════════════════                  ││
│                 │ WARNING: O2 SENSOR MALFUNCTION                  ││
│                 │ Reading: 47%  (SUSPECT - was 94% at launch)     ││
│                 │                                                 ││
│                 │ > diag lifesup                                  ││
│                 │ O2 SENSOR: FAIL - bit 7 stuck low               ││
│                 │ CO2 SCRUBBER: OFFLINE - awaiting O2 data        ││
│                 │ > _                                             ││
└─────────────────┴─────────────────────────────────────────────────┘│
```

**The problem:** O2 sensor shows 47% when it should show 94%. The reading is exactly half. Diagnostics show "bit 7 stuck low."

**Player realizes:** The slice `[0:6]` only captures 7 bits, not 8. The high bit is being dropped.

**The fix:** Change `level = sampled[0:6]` to `level = sampled[0:7]`

**Flash and reboot:**
```
> flash lifesup/o2.wire
Compiling... OK
Flashing to EEPROM bank 2... OK
System reboot in 3... 2... 1...

CYGNUS-7 GUIDANCE COMPUTER v2.1.4
SELF-TEST: O2 SENSOR: OK (94%)
CO2 SCRUBBER: ONLINE
Life support nominal. Estimated O2: 4 hours 23 minutes.
```

**Reward:** Accurate O2 reading. CO2 scrubber comes online (it was waiting for valid sensor data). You've bought yourself time.

### Example Session: Finding Out What Happened (Pulse Puzzle)

```
┌─ DIAGNOSTIC TERMINAL ─────────────────────────────────────────────┐
│ ┌─ Systems ───┐ ┌─ Code: flight_recorder.pulse ──────────────────┐│
│ │             │ │                                                 ││
│ │ ▼ cpu/      │ │ read_last_entry:                                ││
│ │ ▼ lifesup/  │ │     LDA log_count                               ││
│ │ ▼ storage/  │ │     SUB #1           ; get index of last entry  ││
│ │  recorder●  │ │     TAX                                         ││
│ │  telemetry  │ │     LDA log_base,X   ; BUG: should be log_base  ││
│ │             │ │     JSR print_entry  ; prints garbage           ││
│ │             │ │     RTS                                         ││
│ └─────────────┘ └─────────────────────────────────────────────────┘│
│                 ┌─ CONSOLE ───────────────────────────────────────┐│
│                 │ > flightlog --last                              ││
│                 │                                                 ││
│                 │ ENTRY 47 [CORRUPTED]:                           ││
│                 │ ░░▓▒░ unable to parse ░▒▓░░                     ││
│                 │                                                 ││
│                 │ > diag storage                                  ││
│                 │ FLIGHT RECORDER: READABLE                       ││
│                 │ LAST ENTRY INDEX: 47                            ││
│                 │ > _                                             ││
└─────────────────┴─────────────────────────────────────────────────┘│
```

**The problem:** Flight recorder data is readable but the "last entry" command shows garbage.

**Player investigates:** The storage is fine. The code loads `log_count`, subtracts 1 to get the index... then uses indexed addressing `log_base,X` which adds X to the base twice conceptually. Should just load from `(log_ptr),Y` pattern.

**The fix:** Fix the addressing mode to properly read from the calculated offset.

**After the fix:**
```
> flightlog --last

ENTRY 47 [T+72:14:33]:
PILOT: "Sensor ghost again. Third time this orbit."
NAV: "Adjusting trajectory to compensate."
ENG: "I'm seeing anomalies in the guidance computer. Running diag—"
[TRANSMISSION ENDS]
```

**The mystery deepens:** What sensor ghost? What were they compensating for? The last entry cuts off mid-word. Now you need to get navigation online to understand what they were seeing...

---

## 4. Narrative Structure

### The Mystery

You know the facts: You're the systems engineer on Cygnus-7. You crashed during orbital insertion around an uncharted moon. The pilot is unconscious. The computer is damaged. You need to survive.

But as you repair systems and recover data, questions emerge:
- Why did the guidance computer malfunction during insertion?
- What were those "sensor ghosts" the crew kept seeing?
- Why does the navigation data look... wrong?
- What is that structure on the surface below you?

### The Survival Arc

| Phase | Priority | Systems to Repair | What You Learn |
| ----- | -------- | ----------------- | -------------- |
| **1. IMMEDIATE** | Stay alive | Life support (O2, CO2) | Basic situation assessment |
| **2. STABILIZE** | Assess damage | Power, basic sensors | How bad the crash really was |
| **3. UNDERSTAND** | What happened? | Flight recorder, logs | The crew's final moments |
| **4. ORIENT** | Where are you? | Navigation, star tracker | Your position — and the anomaly |
| **5. CONTACT** | Call for help | Communications, antenna | The signal that's already there |
| **6. DECIDE** | What now? | Full computer restoration | The choice |

### Narrative Beats

**Phase 1 - IMMEDIATE (Life Support)**
```
Systems Online: O2 sensor, CO2 scrubber
Discovery: You have 4 hours of oxygen. The pilot's vitals are stable but critical.
Tone: Urgent, survival-focused. No time for questions.
```

**Phase 2 - STABILIZE (Power & Sensors)**
```
Systems Online: Solar panels, battery monitor, hull sensors
Discovery: Impact damage is severe. You're not taking off without repairs.
The ship's external cameras show... something on the surface. A structure?
Tone: Growing unease. This moon was supposed to be barren.
```

**Phase 3 - UNDERSTAND (Flight Recorder)**
```
Systems Online: Storage, flight recorder, crew logs
Discovery: The crew saw "sensor ghosts" for three days before the crash.
The guidance computer started making unauthorized course corrections.
Then it aimed you directly at this moon.
Tone: Paranoia. The crash wasn't an accident.
```

**Phase 4 - ORIENT (Navigation)**
```
Systems Online: Star tracker, IMU, position calculator
Discovery: You're not where you should be. Not even close.
The guidance computer's "malfunction" brought you here deliberately.
The structure on the surface is emitting a signal.
Tone: Cosmic dread. Something wanted you here.
```

**Phase 5 - CONTACT (Communications)**
```
Systems Online: Radio, signal processor, antenna control
Discovery: There's already a signal. It's been broadcasting for... a long time.
It's not human. But it's clearly meant for humans.
It's instructions. For repairing something.
Tone: First contact. The signal is patient. It's been waiting.
```

**Phase 6 - DECIDE (Full Restoration)**
```
Systems Online: Everything. The ship could fly again.
Choice: The signal wants you to come down. To bring the ship's computer.
You could try to leave. Warn Earth. But the computer might not let you.
Or you could descend. Meet what's been waiting.
Tone: Transcendence or terror. Player's choice.
```

### The Revelation

The "sensor ghosts" weren't malfunctions. Something was probing the ship's computer. Learning it. Then it took control, just enough to guide Cygnus-7 here, to crash-land you close enough to reach the structure, but not so hard you'd all die.

**It's been repairing the guidance computer alongside you.** Every fix you make, it's also making. It's teaching you. Preparing you.

The question isn't whether the computer was sabotaged. It's whether you were rescued or captured.

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

| Type         | Language | What's Damaged           | How Player Repairs                    |
| ------------ | -------- | ------------------------ | ------------------------------------- |
| **Hardware** | Wire     | Fried circuits, broken gates | Edit `.wire` schematics, flash to ship |
| **Software** | Pulse    | Corrupted code, logic errors | Edit `.pulse` code, flash firmware    |

The crash damaged both hardware and software. Some damage is from the impact. Some damage... might not be.

### 8.2 Wire Puzzle Types (Hardware Damage)

| Type                  | Example                               | Survival Context |
| --------------------- | ------------------------------------- | ---------------- |
| **Bit truncation**    | Sensor reading clipped to 7 bits      | O2 shows half actual value |
| **Missing gate**      | OR gate damaged, acts as pass-through | CO2 alarm never triggers |
| **Wrong connection**  | Cross-wired bus lines                 | Sensor data scrambled |
| **Missing carry**     | Adder chain broken                    | Navigation math wrong |
| **Timing bug**        | Clock edge corrupted                  | Data sampled at wrong time |
| **Stuck bits**        | Output always high/low                | System thinks tank is empty |
| **Missing inversion** | Two's complement broken               | Subtraction fails |

### 8.3 Pulse Puzzle Types (Software Corruption)

| Type                     | Example                                | Survival Context |
| ------------------------ | -------------------------------------- | ---------------- |
| **Off-by-one**           | Loop skips first sensor reading        | Missing critical data |
| **Wrong comparison**     | `JEQ` instead of `JNE`                 | Safety check inverted |
| **Corrupted address**    | Wrong memory offset in calculation     | Results are garbage |
| **Missing instruction**  | `RTS` corrupted, falls through         | System crash |
| **Buffer overflow**      | String copy doesn't check length       | Memory corruption |
| **Bit rot**              | Constants changed: 60 became 59        | Timing off by 1.6% |
| **Suspicious changes**   | Code that looks... modified            | Not crash damage? |

### 8.4 Puzzle Progression by Survival Phase

| Phase | Wire Puzzles | Pulse Puzzles | Survival Stakes |
| ----- | ------------ | ------------- | --------------- |
| **1. IMMEDIATE** | O2 sensor bit slice wrong | CO2 scrubber loop off-by-one | Suffocation in 4 hours |
| **2. STABILIZE** | Solar panel comparator broken | Battery calc uses wrong register | Power death in 8 hours |
| **3. UNDERSTAND** | Storage read timing off | Flight log addressing corrupt | Can't read what happened |
| **4. ORIENT** | Star tracker ADC missing bits | Position calc has wrong constants | Don't know where you are |
| **5. CONTACT** | Radio encoder XOR missing | Signal parser has bounds error | Can't send or receive |
| **6. DECIDE** | (All systems restored) | Navigation has... new code? | The choice |

### 8.5 Detailed Puzzle Breakdown (Survival Phases)

#### Phase 1: IMMEDIATE - Life Support

**Situation:** O2 sensor shows 47% when you know the tank was 94% full at launch. The CO2 scrubber won't activate without valid O2 data. You have 4 hours.

**Wire Bug:** `lifesup/o2_sensor.wire`

```
module o2_sensor(analog:8, clk) -> level:8:
  sampled = dff(analog, clk)
  level = sampled[0:6]  ; DAMAGE: should be [0:7], high bit lost
```

**Diagnostics show:** "O2 SENSOR: FAIL - bit 7 stuck low"

**The insight:** 47 is roughly half of 94. The sensor reading is being truncated to 7 bits.

**Fix:** Change `sampled[0:6]` to `sampled[0:7]`

**Pulse Bug:** `lifesup/scrubber.pulse`

```asm
scrub_cycle:
    LDX #0
    ; BUG: starts at sensor 1, skipping sensor 0 (primary O2)
sensor_loop:
    INX                 ; DAMAGE: should be at end of loop
    LDA sensors,X
    JSR process_reading
    CPX #4
    BNE sensor_loop
```

**Symptom:** CO2 scrubber runs but ignores primary O2 sensor.

**Fix:** Move `INX` to end of loop.

**Reward:** Life support stabilizes. O2 estimate: 4+ hours (scrubber working). CO2 scrubber comes online.

---

#### Phase 2: STABILIZE - Power Systems

**Situation:** Running on backup battery. Solar panels should be charging but aren't. Estimated power: 8 hours.

**Wire Bug:** `power/solar_ctrl.wire`

```
module solar_controller(light_level:8, threshold:8) -> charge_enable:
  ; Compare light level to threshold
  diff = adder8(light_level, invert8(threshold), 0)  ; DAMAGE: carry-in should be 1
  charge_enable = diff[7]  ; high bit = light > threshold
```

**Symptom:** Solar charge never enables even in direct sunlight.

**The insight:** Two's complement subtraction requires carry-in of 1.

**Fix:** Change `adder8(..., 0)` to `adder8(..., 1)`

**Pulse Bug:** `power/battery_mon.pulse`

```asm
calc_remaining:
    LDA battery_voltage
    STA temp
    LDA current_draw
    ; BUG: uses X instead of A for division
    LDX #0
    JSR divide         ; divides X/A instead of A/temp
```

**Symptom:** Battery estimate wildly wrong (dividing wrong values).

**Fix:** Correct the register usage.

**Reward:** Solar charging resumes. Power estimate: indefinite (with sunlight).

**Discovery:** External camera comes online. Shows... a structure on the surface below. Geometric. Not natural.

---

#### Phase 3: UNDERSTAND - Flight Recorder

**Situation:** You need to know what happened. The flight recorder has 47 entries but you can only read garbage.

**Wire Bug:** `storage/flash_ctrl.wire`

```
module flash_reader(addr:16, clk) -> (data:8, valid):
  ; Read timing
  read_pulse = and(read_enable, clk)
  ; DAMAGE: data sampled too early, before stable
  data_latch = dff(flash_data, read_pulse)  ; should be delayed
```

**Symptom:** "FLASH READ: DATA CHECKSUM FAIL"

**Fix:** Add delay between read pulse and data latch.

**Pulse Bug:** `storage/flight_log.pulse`

```asm
read_entry:
    LDA entry_num
    ASL             ; multiply by 2 for word address
    ASL             ; multiply by 2 again (x4)
    ; DAMAGE: entry size is 64 bytes, not 4
    ; should multiply by 64 (ASL x6)
    TAX
    LDA log_base,X
```

**Symptom:** Log entries are scrambled, reading wrong offsets.

**Fix:** Add more ASL instructions to calculate correct offset (or use proper multiplication).

**Reward:** Flight recorder readable.

**Discovery - Entry 44:**
```
T+71:02:14 PILOT: "There's that ghost again. Third time."
NAV: "I'm logging it. Bearing 047, range indeterminate."
ENG: "Guidance computer accepted an unscheduled correction."
PILOT: "What? I didn't authorize that."
```

**Discovery - Entry 47 (final):**
```
T+72:14:33 PILOT: "Sensor ghost again. It's moving with us."
NAV: "Adjusting trajectory to compensate for drift."
ENG: "Guidance computer is... I'm seeing unauthorized writes to nav memory—"
[END OF LOG]
```

---

#### Phase 4: ORIENT - Navigation

**Situation:** Where are you? The star tracker is offline. Navigation computer shows impossible coordinates.

**Wire Bug:** `nav/star_tracker.wire`

```
module star_tracker(sensor:12, threshold:8) -> (star_id:8, valid):
  ; ADC interface
  high_bits = sensor[4:11]
  low_bits = sensor[0:3]
  ; DAMAGE: bits in wrong order
  combined = concat(low_bits, high_bits)  ; should be high, low
```

**Symptom:** Star tracker identifies wrong stars. Position makes no sense.

**Fix:** Swap concatenation order.

**Pulse Bug:** `nav/position.pulse`

```asm
calc_position:
    LDA star_angle
    ; Apply correction factor
    ; DAMAGE: constant was modified
    ADD #23            ; should be #47 (original calibration)
    STA corrected_angle
```

**Symptom:** Position calculation off by predictable amount.

**Chilling detail:** This doesn't look like crash damage. The constant was precisely changed.

**Reward:** Navigation online. Position calculated.

**Discovery:** You're not where the mission plan says. You're orbiting an uncharted moon of Saturn. The guidance computer brought you here. Deliberately.

The structure on the surface is directly below your orbit. The "sensor ghost" is coming from it.

---

#### Phase 5: CONTACT - Communications

**Situation:** You need to radio Earth. Or at least try. The comm system is down.

**Wire Bug:** `comms/encoder.wire`

```
module signal_encoder(data:8, key:8) -> encoded:8:
  ; XOR encoding for error correction
  ; DAMAGE: XOR gate is missing/empty
  encoded = data  ; should be: xor8(data, key)
```

**Symptom:** "TRANSMISSION ENCODE FAIL: CHECKSUM INVALID"

**Player task:** Implement XOR8 from basic gates.

```
module xor8(a:8, b:8) -> out:8:
  ; Player must write this
  out = and8(or8(a, b), nand8(a, b))
```

**Pulse Bug:** `comms/signal.pulse`

```asm
parse_signal:
    LDX #0
parse_loop:
    LDA buffer,X
    CMP #$FF         ; end marker
    JEQ done
    JSR decode_byte
    INX
    CPX #64          ; DAMAGE: buffer is 128 bytes, stops too early
    JNE parse_loop
```

**Symptom:** Only receives half of incoming signals.

**Reward:** Radio online.

**Discovery:** There's already a transmission. It's been broadcasting on loop. For a very long time.

It's not in any human language. But the structure is unmistakable: it's instructions. Technical diagrams encoded in the signal. Schematics. For repairing something.

The "sensor ghost" was the signal, probing your computer, learning its architecture. Then it uploaded navigation changes.

**It guided you here.**

---

#### Phase 6: DECIDE - The Choice

**Situation:** All systems online. The ship could fly. The pilot is still unconscious. You have a decision to make.

**The signal:** It's been decoding into clearer instructions. It wants you to descend. To bring your computer. To dock with... something.

**What you find in the code:** Navigation has new subroutines you didn't write. They're not crash damage. They're additions. Elegant ones.

```asm
; This code appeared after the crash
; It wasn't written by NASA
nav_override:
    JSR calc_descent_vector
    JSR lock_target_structure
    ; ... more code ...
    ; ends with: JSR initiate_docking
```

**Your choices:**
1. **Ascend** - Try to break orbit. Warn Earth. But the computer might not let you leave.
2. **Descend** - Follow the signal. See what's been waiting.
3. **Purge** - Wipe the nav computer. Fly manual. Hope you remember how.

**The revelation:** The "crash" wasn't a malfunction. It was a controlled landing. Something has been waiting in this solar system. It found your radio signals decades ago. It's been patient.

Now it's teaching you. Preparing you for something.

---

### 8.6 Clue System

Players aren't left stranded:

| Clue Type               | How It Works                                                |
| ----------------------- | ----------------------------------------------------------- |
| **Status display**      | Shows critical systems: "O2: 47% [!] POWER: BACKUP"         |
| **`diag` command**      | `diag lifesup` shows: "O2 SENSOR: FAIL - bit 7 stuck low"   |
| **Schematic comments**  | NASA engineers left notes: `; ADC interface - 8 bit output` |
| **Flight manual**       | Reference docs explain expected behavior                     |
| **Progressive hints**   | After N minutes stuck, offer optional hint                   |
| **The signal**          | Later phases: the alien signal provides cryptic assistance   |

### 8.7 Distinguishing Crash Damage from... Something Else

Part of the mystery is figuring out what's impact damage vs. something more sinister:

| Crash Damage                  | Suspicious Modifications               |
| ----------------------------- | -------------------------------------- |
| Bit slice truncation          | Navigation constants precisely changed |
| Timing circuits disrupted     | New code subroutines added             |
| Memory corruption (random)    | Systematic code alterations            |
| Physical damage (obvious)     | Changes that "help" guide you somewhere|

The player starts thinking "crash damage" and gradually realizes "something else was here first."

---

## 9. Diagnostic Terminal Interface (Browser UI)

### 9.1 Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  CYGNUS-7 PORTABLE DIAGNOSTIC TERMINAL            [O2: 94%] [PWR: ██████]│
├───────────────┬─────────────────────────────────────────────────────┤
│ SYSTEMS       │ SCHEMATIC VIEWER                                    │
│               │                                                     │
│ ▼ cpu/        │ ┌─ lifesup/o2_sensor.wire ────────────────────────┐  │
│   alu.wire    │ │                                                 │  │
│   decode.wire │ │ ; O2 sensor ADC interface                       │  │
│ ▼ lifesup/    │ │ module o2_sensor(analog:8, clk) -> level:8:     │  │
│  o2.wire    ● │ │   sampled = dff(analog, clk)                    │  │
│  co2.wire     │ │   level = sampled[0:7]  ; fixed!                │  │
│  scrubber     │ │                                                 │  │
│ ▼ power/      │ └─────────────────────────────────────────────────┘  │
│ ▼ nav/        │                                                     │
│ ▼ comms/      │ ┌─ CONSOLE ───────────────────────────────────────┐  │
│               │ │ > diag lifesup                                  │  │
│ ▼ stdlib/     │ │ O2 SENSOR: OK (94%)                             │  │
│   gates.wire  │ │ CO2 SCRUBBER: ONLINE                            │  │
│   adders.wire │ │ ATMOSPHERE: NOMINAL                             │  │
│               │ │                                                 │  │
│               │ │ > status                                        │  │
│               │ │ LIFE SUPPORT: OK    NAV: OFFLINE                │  │
│               │ │ POWER: CHARGING     COMMS: OFFLINE              │  │
│               │ │ > _                                             │  │
└───────────────┴─┴─────────────────────────────────────────────────┴──┘
│ [▶ Flash]  [↻ Reboot]  [⚡ Diag]     Umbilical: CONNECTED           │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 Features

| Feature          | Description                                         |
| ---------------- | --------------------------------------------------- |
| **System tree**  | Browse ship's schematics and code by subsystem      |
| **Visual editor**| Drag-and-drop circuit repair with live simulation   |
| **Code editor**  | Pulse assembly with syntax highlighting             |
| **Console**      | Run diagnostics, check status, flash repairs        |
| **Status bar**   | O2 level, power, connection to ship's computer      |

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

### 10.0 CRITICAL ARCHITECTURE PRINCIPLE

**The simulation IS the validation. No TypeScript puzzle logic.**

When a player fixes a broken circuit:
1. They edit a `.wire` file (e.g., fix bit slice from `[0:6]` to `[0:7]`)
2. They run `flash lifesup/o2_sensor.wire` in the shell
3. boot.pulse handles the flash command, triggers WASM simulator reload
4. The circuit is now correct - O2 sensor reads 94% instead of 47%
5. CO2 scrubber comes online (it was waiting for valid sensor data)

**There is no TypeScript code that checks "is this puzzle solved?"**

The game state changes because the physics of the simulation change. If you fix the O2 sensor, life support works. If you don't, it doesn't. This is what makes the game authentic.

**TypeScript is ONLY for:**
- WASM simulator host (compiling/running Wire HDL)
- React UI shell (displaying terminal, editor, routing serial I/O)
- Loading/saving game state (which files are edited, not "solved")

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

### 11.1 Wire Files (Ship Schematics with Damage)

| File                        | System        | Damage Type                    | Phase |
| --------------------------- | ------------- | ------------------------------ | ----- |
| `lifesup/o2_sensor.wire`    | Life Support  | Bit slice truncated [0:6]      | 1     |
| `lifesup/co2_ctrl.wire`     | Life Support  | Threshold comparator broken    | 1     |
| `power/solar_ctrl.wire`     | Power         | Subtraction missing carry      | 2     |
| `power/battery_mon.wire`    | Power         | ADC timing wrong               | 2     |
| `storage/flash_ctrl.wire`   | Storage       | Read strobe too short          | 3     |
| `nav/star_tracker.wire`     | Navigation    | Bit concatenation reversed     | 4     |
| `comms/encoder.wire`        | Communications| XOR gate missing (player builds)| 5    |
| `comms/antenna_ctrl.wire`   | Communications| Phase calculation wrong        | 5     |

### 11.2 Pulse Files (Flight Software with Corruption)

| File                        | Function           | Corruption                      | Phase |
| --------------------------- | ------------------ | ------------------------------- | ----- |
| `lifesup/scrubber.pulse`    | CO2 scrubber loop  | INX at wrong position           | 1     |
| `power/battery.pulse`       | Remaining calc     | Wrong register for division     | 2     |
| `storage/flight_log.pulse`  | Log entry reader   | Entry size multiplier wrong     | 3     |
| `nav/position.pulse`        | Position calc      | Constant modified (suspicious)  | 4     |
| `comms/signal.pulse`        | Signal parser      | Buffer size check too small     | 5     |
| `nav/guidance.pulse`        | Navigation ctrl    | New code added (alien origin?)  | 6     |

### 11.3 Narrative Content (Flight Recorder Entries)

| Entry | Timestamp   | Content                                                        | Phase |
| ----- | ----------- | -------------------------------------------------------------- | ----- |
| 1-40  | T+0 to T+70 | Normal mission logs, routine operations                        | 3     |
| 41    | T+70:14:22  | "Sensor anomaly detected. Logging for analysis."               | 3     |
| 42    | T+70:31:07  | "Second anomaly. Same bearing. Moving with us?"                | 3     |
| 43    | T+71:02:14  | "Ghost again. Guidance computer accepted unscheduled correction"| 3    |
| 44    | T+71:18:55  | "I didn't authorize that course change."                       | 3     |
| 45    | T+72:03:41  | "We're not on the planned trajectory anymore."                 | 3     |
| 46    | T+72:11:12  | "Running full diagnostic on guidance computer."                | 3     |
| 47    | T+72:14:33  | "I'm seeing unauthorized writes to nav memory—" [ENDS]         | 3     |

### 11.4 Flight Software Breakdown

| Component                        | Lines (est.)     | Contains Corruption?        |
| -------------------------------- | ---------------- | --------------------------- |
| Boot sequence / self-test        | 50               | No                          |
| Diagnostic command handler       | 100              | No                          |
| Life support monitoring          | 80               | Yes (scrubber loop)         |
| Power management                 | 60               | Yes (battery calc)          |
| Storage / flight recorder        | 100              | Yes (entry offset)          |
| Navigation / position            | 120              | Yes (suspicious constant)   |
| Communications / radio           | 80               | Yes (buffer bounds)         |
| Guidance control                 | 100              | Yes (alien additions)       |
| Print/string utilities           | 50               | No                          |
| **Total**                        | ~740 lines Pulse |                             |

---

## 12. Development Progress

### Current Status: Day 5 Complete

**Phase 1-3 Complete: Wire HDL, CPU, and FPGA System Working**

### Day 1: Foundation ✅ COMPLETE
- [x] Wire lexer and parser (135 tests passing)
- [x] Basic gate simulator (nand, dff)
- [x] Test with simple circuits
- [x] Bus operations (concat, indexing)
- [x] Multi-output modules

### Day 2: Wire Complete ✅ COMPLETE
- [x] Full gate simulation with fixed-point iteration
- [x] Standard library modules (gates, arithmetic, registers)
- [x] Wire compiler (AST → gate graph)
- [x] 250+ unit tests passing
- [x] Memory modules (RAM simulation)

### Day 3: CPU & Assembler ✅ COMPLETE
- [x] CPU designed in Wire (cpu_minimal.wire)
- [x] 8-bit ALU with flags (C, Z, N, V)
- [x] Assembler for Pulse (99 tests passing)
- [x] CPU instruction set: LDA, LDX, ADC, STA, JMP, BEQ, HLT
- [x] CPU state machine with 8 states
- [x] 1218 total tests passing

### Day 4: FPGA System ✅ COMPLETE
- [x] Memory subsystem (64KB RAM simulation)
- [x] Serial I/O (stdin/stdout simulation)
- [x] Boot sequence runs (boot.pulse)
- [x] Shell responds to commands (help, status)
- [x] Self-test routines (ALU verification)
- [x] 183 FPGA integration tests passing

### Day 5: Browser UI ✅ COMPLETE
- [x] React + Vite setup
- [x] Terminal emulator (xterm.js integration)
- [x] Visual editor with syntax highlighting
- [x] Real-time CPU simulation in browser
- [x] Interactive playground demonstrating ALU

### Day 6: Puzzles & Narrative 🚧 IN PROGRESS
- [ ] Bug injection in Wire files
- [ ] Write narrative content (logs, notes)
- [ ] Level progression logic
- [ ] Unlocking mechanism

### Day 7: Polish & Submit ⏳ PLANNED
- [ ] Playtest, fix issues
- [ ] Tutorial/hints
- [ ] Write blog post
- [ ] Record demo video
- [ ] Submit

---

## 13. Performance Benchmarks

### CPU Simulation Speed (December 2024)

**Test Configuration:**
- Platform: Node.js v24 with TypeScript
- CPU: Gate-level simulation (Wire HDL)
- Test program: Tight loop (LDA #$00, ADC #$01, JMP loop)

**Results:**
```
Executed:    10,000 CPU cycles
Duration:    119.5 seconds
Speed:       84 cycles/second (84 Hz / 0.08 KHz)
IPS:         ~24 instructions per second
```

**Context:**
- Original 6502: 1-2 MHz (1,000,000-2,000,000 Hz)
- This simulation: 84 Hz
- Speed ratio: ~12,000-24,000× slower than real hardware

**Why It's Slow:**
1. **Gate-level simulation** - Every NAND gate and D flip-flop simulated individually
2. **Fixed-point iteration** - Must iterate until combinational logic stabilizes
3. **TypeScript/JavaScript overhead** - Interpreted language, not compiled
4. **Complex datapath** - CPU has 300+ gates (ALU, decoder, flags, PC, registers)

**Why It's Acceptable:**
- This is a learning/development tool, not a production emulator
- 84 Hz is sufficient for debugging and testing
- Cycle-accurate simulation more important than speed
- Real hardware (FPGA) would be much faster

**Future Optimizations:**
- [ ] Cache gate evaluations
- [ ] Reduce object allocations
- [ ] Compile critical paths to WebAssembly
- [ ] FPGA synthesis for hardware deployment

---

## 14. Development Timeline

### Original 7-Day Plan (Accelerated)

### Day 1: Foundation ✅
- Wire lexer and parser
- Basic gate simulator (nand, dff)
- Test with simple circuits

### Day 2: Wire Complete ✅
- Full gate simulation
- Standard library modules
- Wire compiler (fast mode)
- Unit tests

### Day 3: CPU & Assembler ✅
- Design CPU in Wire
- Assembler for Pulse
- CPU passes basic tests

### Day 4: FPGA System ✅
- Memory, serial I/O
- Boot sequence runs
- Shell responds to commands

### Day 5: Browser UI ✅
- Editor with syntax highlighting
- Terminal emulator
- File browser
- Flash/reboot commands

### Day 6: Puzzles & Narrative 🚧
- Bug injection in Wire files
- Write narrative content (logs, notes)
- Level progression logic
- Unlocking mechanism

### Day 7: Polish & Submit ⏳
- Playtest, fix issues
- Tutorial/hints
- Write blog post
- Record demo video
- Submit

---

## 13. The Pitch to Judges

**The concept:**

> *1973. Your Apollo-era spacecraft has crash-landed on an uncharted moon. The guidance computer is damaged. You're the systems engineer. Fix the circuits. Patch the code. Survive. And figure out why something brought you here.*

**Languages we created:**

1. **Wire** — A hardware description language for defining digital circuits. Players repair damaged circuits by editing Wire schematics.
2. **Pulse** — An assembly language for the ship's CPU. Players patch corrupted flight software by fixing Pulse code.

**Why 1970s space tech?**

- **Authentically simple**: Apollo-era computers were ~4,000 gates. You can understand every transistor.
- **Life-or-death stakes**: You're not debugging — you're surviving. O2 is running out.
- **Real engineering**: Apollo astronauts actually had to understand their systems at this level.
- **Perfect for the jam**: Simple enough to implement, complex enough to be interesting.

**The technical achievement:**

The spacecraft's entire computer is simulated at the gate level. Every circuit is defined in Wire. The flight software is assembled from Pulse. When you run `diag lifesup`, that command travels through our serial port, into our CPU, through our instruction decoder, reads from our sensor interfaces — all defined in Wire, running code written in Pulse.

**Both languages are survival:**

- **Wire puzzles**: Repair the O2 sensor circuit. Fix the solar panel controller. Get the radio encoder working.
- **Pulse puzzles**: Debug the scrubber loop. Fix the flight recorder offset. Patch the signal parser.
- **The mystery**: Some damage is from the crash. Some damage... isn't. Something guided you here.

**The game:**

It's not just a tech demo. There's a mystery wrapped in a survival story. You crashed on a moon that was supposed to be barren. There's a structure on the surface. A signal that's been broadcasting for millennia. And your guidance computer has code in it that you didn't write.

Fix the hardware. Fix the software. Survive long enough to make a choice.

---

_Document version: 3.0_
_Last updated: December 2025_
