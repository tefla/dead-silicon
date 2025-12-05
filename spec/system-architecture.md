# Wire System Architecture

## Overview

Instead of implementing complex routines in Wire HDL, we use a ROM-based architecture where:
- **Hardware (Wire)**: Minimal CPU + memory bus + I/O peripherals
- **Firmware (Pulse)**: Boot code, shell, utilities in ROM

This mirrors real 6502 systems (Apple II, C64, NES).

## Memory Map

```
$0000-$00FF  Zero Page RAM (256 bytes) - fast access
$0100-$01FF  Stack RAM (256 bytes) - hardware stack
$0200-$3FFF  General RAM (~16KB)
$4000-$7FFF  [Reserved/Expansion]
$8000-$800F  I/O Registers (memory-mapped)
$C000-$FFFF  ROM (16KB) - firmware/BIOS
```

### I/O Register Map ($8000-$800F)

```
$8000  SERIAL_STATUS  (R)   - Bit 0: RX ready, Bit 1: TX busy
$8001  SERIAL_DATA    (R/W) - Read: RX byte, Write: TX byte
$8002  LED_CTRL       (W)   - LED on/off control
$8003  TIMER_LO       (R)   - Timer low byte
$8004  TIMER_HI       (R)   - Timer high byte
$8005-$800F [Reserved]
```

### ROM Layout ($C000-$FFFF)

```
$C000  Entry point (boot code starts here)
...    Boot routines, shell, utilities
$FFF0  [Reserved]
$FFFA  NMI vector (not implemented yet)
$FFFC  RESET vector -> $C000
$FFFE  IRQ vector (not implemented yet)
```

## Hardware Modules

### 1. Address Decoder (`addr_decode.wire`)
Decodes high address bits to select memory region:
- `sel_zp`   - Zero page ($00xx)
- `sel_stack` - Stack ($01xx)
- `sel_ram`  - General RAM ($02xx-$3Fxx)
- `sel_io`   - I/O ($80xx)
- `sel_rom`  - ROM ($C0xx-$FFxx)

### 2. System Module (`system.wire`)
Top-level module connecting:
- CPU (cpu_minimal)
- ROM (16KB, preloaded with firmware)
- RAM (16KB)
- I/O controller
- Address decoder

### 3. I/O Controller (`io_ctrl.wire`)
Simple memory-mapped I/O:
- Serial TX/RX with status register
- LED control register
- Timer (optional)

## Boot Sequence

1. Reset asserted
2. CPU initializes (PC=0, SP=$FF, etc.)
3. Reset released
4. CPU reads reset vector from $FFFC/$FFFD
5. PC loads with vector value (e.g., $C000)
6. CPU begins executing ROM code
7. ROM code initializes system, runs shell

## Implementation Steps

1. **Phase 1: Basic ROM Boot**
   - Create address decoder
   - Create minimal system module (CPU + ROM only)
   - Implement reset vector reading
   - Test with trivial ROM program

2. **Phase 2: Add RAM**
   - Integrate RAM module
   - Test read/write to RAM from ROM code

3. **Phase 3: Add I/O**
   - Implement I/O controller
   - Test serial output from ROM code

4. **Phase 4: Full Boot**
   - Load real boot.pulse into ROM
   - Run full boot sequence
   - Shell prompt working

## Changes to CPU

The CPU needs one change: **read reset vector on startup**.

Current behavior: PC starts at 0
New behavior: PC loads from $FFFC/$FFFD after reset

This requires:
- New states for reading reset vector (2 bytes)
- Or: Initialize PC to $FFFC and let first instruction be JMP (indirect)

Simpler approach: Just initialize PC to $FFFC-2 and have ROM contain:
```
$FFFA: JMP $C000  ; At $FFFC (3 bytes: 4C 00 C0)
```

Actually, cleanest: Add reset vector fetch states to CPU.
