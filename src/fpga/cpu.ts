// Pulse CPU Simulator
// 6502-style CPU execution

import { IO_PORTS, VECTORS, isIOAddress } from './memory'

export interface CPUFlags {
  C: boolean  // Carry
  Z: boolean  // Zero
  I: boolean  // Interrupt disable
  D: boolean  // Decimal mode (not implemented)
  B: boolean  // Break
  V: boolean  // Overflow
  N: boolean  // Negative
}

export interface CPUState {
  A: number   // Accumulator
  X: number   // X index register
  Y: number   // Y index register
  SP: number  // Stack pointer
  PC: number  // Program counter
  flags: CPUFlags
  halted: boolean
  cycles: number  // Total cycles executed
}

export interface IOHandler {
  read(addr: number): number
  write(addr: number, value: number): void
}

export class CPU {
  state: CPUState
  private memory: Uint8Array
  private io: IOHandler

  constructor(memory: Uint8Array, io?: IOHandler) {
    this.memory = memory
    this.io = io ?? {
      read: () => 0,
      write: () => {},
    }
    this.state = this.initialState()
  }

  private initialState(): CPUState {
    return {
      A: 0,
      X: 0,
      Y: 0,
      SP: 0xFF,
      PC: 0,
      flags: {
        C: false,
        Z: false,
        I: true,
        D: false,
        B: false,
        V: false,
        N: false,
      },
      halted: false,
      cycles: 0,
    }
  }

  // Reset CPU and read reset vector
  reset(): void {
    this.state = this.initialState()
    const lo = this.readByte(VECTORS.RESET)
    const hi = this.readByte(VECTORS.RESET + 1)
    this.state.PC = (hi << 8) | lo
  }

  // Read byte from memory or I/O
  readByte(addr: number): number {
    addr &= 0xFFFF
    if (isIOAddress(addr)) {
      return this.io.read(addr)
    }
    return this.memory[addr]
  }

  // Write byte to memory or I/O
  writeByte(addr: number, value: number): void {
    addr &= 0xFFFF
    value &= 0xFF
    if (isIOAddress(addr)) {
      this.io.write(addr, value)
    } else {
      this.memory[addr] = value
    }
  }

  // Read 16-bit word (little-endian)
  readWord(addr: number): number {
    const lo = this.readByte(addr)
    const hi = this.readByte(addr + 1)
    return (hi << 8) | lo
  }

  // Fetch next byte and increment PC
  private fetch(): number {
    const value = this.readByte(this.state.PC)
    this.state.PC = (this.state.PC + 1) & 0xFFFF
    return value
  }

  // Fetch 16-bit word and increment PC by 2
  private fetchWord(): number {
    const lo = this.fetch()
    const hi = this.fetch()
    return (hi << 8) | lo
  }

  // Push byte to stack
  private push(value: number): void {
    this.writeByte(0x0100 + this.state.SP, value & 0xFF)
    this.state.SP = (this.state.SP - 1) & 0xFF
  }

  // Push 16-bit word to stack (high byte first)
  private pushWord(value: number): void {
    this.push((value >> 8) & 0xFF)
    this.push(value & 0xFF)
  }

  // Pull byte from stack
  private pull(): number {
    this.state.SP = (this.state.SP + 1) & 0xFF
    return this.readByte(0x0100 + this.state.SP)
  }

  // Pull 16-bit word from stack
  private pullWord(): number {
    const lo = this.pull()
    const hi = this.pull()
    return (hi << 8) | lo
  }

  // Update N and Z flags based on value
  private updateNZ(value: number): void {
    this.state.flags.Z = (value & 0xFF) === 0
    this.state.flags.N = (value & 0x80) !== 0
  }

  // Execute one instruction
  step(): void {
    if (this.state.halted) return

    const opcode = this.fetch()
    this.execute(opcode)
    this.state.cycles++
  }

  // Run until halted or max cycles
  run(maxCycles: number = 10000): void {
    while (!this.state.halted && this.state.cycles < maxCycles) {
      this.step()
    }
  }

  private execute(opcode: number): void {
    switch (opcode) {
      // LDA - Load Accumulator
      case 0xA9: { // LDA #imm
        this.state.A = this.fetch()
        this.updateNZ(this.state.A)
        break
      }
      case 0xAD: { // LDA abs
        const addr = this.fetchWord()
        this.state.A = this.readByte(addr)
        this.updateNZ(this.state.A)
        break
      }

      // LDX - Load X Register
      case 0xA2: { // LDX #imm
        this.state.X = this.fetch()
        this.updateNZ(this.state.X)
        break
      }
      case 0xAE: { // LDX abs
        const addr = this.fetchWord()
        this.state.X = this.readByte(addr)
        this.updateNZ(this.state.X)
        break
      }

      // LDY - Load Y Register
      case 0xA0: { // LDY #imm
        this.state.Y = this.fetch()
        this.updateNZ(this.state.Y)
        break
      }
      case 0xAC: { // LDY abs
        const addr = this.fetchWord()
        this.state.Y = this.readByte(addr)
        this.updateNZ(this.state.Y)
        break
      }

      // STA - Store Accumulator
      case 0x8D: { // STA abs
        const addr = this.fetchWord()
        this.writeByte(addr, this.state.A)
        break
      }

      // STX - Store X Register
      case 0x8E: { // STX abs
        const addr = this.fetchWord()
        this.writeByte(addr, this.state.X)
        break
      }

      // STY - Store Y Register
      case 0x8C: { // STY abs
        const addr = this.fetchWord()
        this.writeByte(addr, this.state.Y)
        break
      }

      // ADD (ADC) - Add with Carry
      case 0x69: { // ADC #imm
        const value = this.fetch()
        const carry = this.state.flags.C ? 1 : 0
        const result = this.state.A + value + carry
        this.state.flags.C = result > 0xFF
        this.state.flags.V = ((~(this.state.A ^ value) & (this.state.A ^ result)) & 0x80) !== 0
        this.state.A = result & 0xFF
        this.updateNZ(this.state.A)
        break
      }

      // SUB (SBC) - Subtract with Carry
      case 0xE9: { // SBC #imm
        const value = this.fetch()
        const carry = this.state.flags.C ? 0 : 1
        const result = this.state.A - value - carry
        this.state.flags.C = result >= 0
        this.state.flags.V = ((this.state.A ^ value) & (this.state.A ^ result) & 0x80) !== 0
        this.state.A = result & 0xFF
        this.updateNZ(this.state.A)
        break
      }

      // AND - Logical AND
      case 0x29: { // AND #imm
        this.state.A &= this.fetch()
        this.updateNZ(this.state.A)
        break
      }

      // ORA - Logical OR
      case 0x09: { // ORA #imm
        this.state.A |= this.fetch()
        this.updateNZ(this.state.A)
        break
      }

      // EOR - Logical XOR
      case 0x49: { // EOR #imm
        this.state.A ^= this.fetch()
        this.updateNZ(this.state.A)
        break
      }

      // CMP - Compare Accumulator
      case 0xC9: { // CMP #imm
        const value = this.fetch()
        const result = this.state.A - value
        this.state.flags.C = this.state.A >= value
        this.updateNZ(result & 0xFF)
        break
      }

      // CPX - Compare X Register
      case 0xE0: { // CPX #imm
        const value = this.fetch()
        const result = this.state.X - value
        this.state.flags.C = this.state.X >= value
        this.updateNZ(result & 0xFF)
        break
      }

      // CPY - Compare Y Register
      case 0xC0: { // CPY #imm
        const value = this.fetch()
        const result = this.state.Y - value
        this.state.flags.C = this.state.Y >= value
        this.updateNZ(result & 0xFF)
        break
      }

      // JMP - Jump
      case 0x4C: { // JMP abs
        this.state.PC = this.fetchWord()
        break
      }

      // JSR - Jump to Subroutine
      case 0x20: { // JSR abs
        const addr = this.fetchWord()
        // Push return address - 1 (PC already points past operand)
        this.pushWord(this.state.PC - 1)
        this.state.PC = addr
        break
      }

      // RTS - Return from Subroutine
      case 0x60: {
        this.state.PC = this.pullWord() + 1
        break
      }

      // BEQ - Branch if Equal (Z=1)
      case 0xF0: {
        const offset = this.fetch()
        if (this.state.flags.Z) {
          this.branch(offset)
        }
        break
      }

      // BNE - Branch if Not Equal (Z=0)
      case 0xD0: {
        const offset = this.fetch()
        if (!this.state.flags.Z) {
          this.branch(offset)
        }
        break
      }

      // BCC - Branch if Carry Clear
      case 0x90: {
        const offset = this.fetch()
        if (!this.state.flags.C) {
          this.branch(offset)
        }
        break
      }

      // BCS - Branch if Carry Set
      case 0xB0: {
        const offset = this.fetch()
        if (this.state.flags.C) {
          this.branch(offset)
        }
        break
      }

      // INX - Increment X
      case 0xE8: {
        this.state.X = (this.state.X + 1) & 0xFF
        this.updateNZ(this.state.X)
        break
      }

      // INY - Increment Y
      case 0xC8: {
        this.state.Y = (this.state.Y + 1) & 0xFF
        this.updateNZ(this.state.Y)
        break
      }

      // DEX - Decrement X
      case 0xCA: {
        this.state.X = (this.state.X - 1) & 0xFF
        this.updateNZ(this.state.X)
        break
      }

      // DEY - Decrement Y
      case 0x88: {
        this.state.Y = (this.state.Y - 1) & 0xFF
        this.updateNZ(this.state.Y)
        break
      }

      // TAX - Transfer A to X
      case 0xAA: {
        this.state.X = this.state.A
        this.updateNZ(this.state.X)
        break
      }

      // TAY - Transfer A to Y
      case 0xA8: {
        this.state.Y = this.state.A
        this.updateNZ(this.state.Y)
        break
      }

      // TXA - Transfer X to A
      case 0x8A: {
        this.state.A = this.state.X
        this.updateNZ(this.state.A)
        break
      }

      // TYA - Transfer Y to A
      case 0x98: {
        this.state.A = this.state.Y
        this.updateNZ(this.state.A)
        break
      }

      // TXS - Transfer X to SP
      case 0x9A: {
        this.state.SP = this.state.X
        break
      }

      // TSX - Transfer SP to X
      case 0xBA: {
        this.state.X = this.state.SP
        this.updateNZ(this.state.X)
        break
      }

      // PHA - Push Accumulator
      case 0x48: {
        this.push(this.state.A)
        break
      }

      // PLA - Pull Accumulator
      case 0x68: {
        this.state.A = this.pull()
        this.updateNZ(this.state.A)
        break
      }

      // SEC - Set Carry
      case 0x38: {
        this.state.flags.C = true
        break
      }

      // CLC - Clear Carry
      case 0x18: {
        this.state.flags.C = false
        break
      }

      // SEI - Set Interrupt Disable
      case 0x78: {
        this.state.flags.I = true
        break
      }

      // CLI - Clear Interrupt Disable
      case 0x58: {
        this.state.flags.I = false
        break
      }

      // NOP - No Operation
      case 0xEA: {
        break
      }

      // BRK - Break
      case 0x00: {
        this.state.halted = true
        break
      }

      // HLT - Halt (unofficial)
      case 0x02: {
        this.state.halted = true
        break
      }

      default:
        // Unknown opcode - halt
        console.warn(`Unknown opcode: 0x${opcode.toString(16).padStart(2, '0')} at PC=0x${(this.state.PC - 1).toString(16)}`)
        this.state.halted = true
        break
    }
  }

  // Handle relative branch
  private branch(offset: number): void {
    // Convert to signed offset
    if (offset & 0x80) {
      offset = offset - 256
    }
    this.state.PC = (this.state.PC + offset) & 0xFFFF
  }
}

// Simple I/O handler for LED demo
export class SimpleIO implements IOHandler {
  ledState: number = 0
  serialIn: number[] = []
  serialOut: number[] = []

  read(addr: number): number {
    switch (addr) {
      case IO_PORTS.LED:
        return this.ledState
      case IO_PORTS.SERIAL_RX:
        return this.serialIn.shift() ?? 0
      case IO_PORTS.SERIAL_STATUS:
        return this.serialIn.length > 0 ? 1 : 0
      default:
        return 0
    }
  }

  write(addr: number, value: number): void {
    switch (addr) {
      case IO_PORTS.LED:
        this.ledState = value
        break
      case IO_PORTS.SERIAL_TX:
        this.serialOut.push(value)
        break
    }
  }
}
