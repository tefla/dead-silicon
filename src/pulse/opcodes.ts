// Pulse Opcode Definitions
// 6502-style instruction encoding

import type { AddressingMode } from './parser'

export interface OpcodeInfo {
  opcode: number
  bytes: number  // Total instruction size including opcode
}

export interface InstructionDef {
  mnemonic: string
  modes: Partial<Record<AddressingMode, OpcodeInfo>>
}

// Opcode table - using authentic 6502 opcodes where applicable
export const INSTRUCTIONS: Map<string, InstructionDef> = new Map([
  // Load/Store
  ['LDA', {
    mnemonic: 'LDA',
    modes: {
      immediate: { opcode: 0xA9, bytes: 2 },
      absolute: { opcode: 0xAD, bytes: 3 },
    }
  }],
  ['LDX', {
    mnemonic: 'LDX',
    modes: {
      immediate: { opcode: 0xA2, bytes: 2 },
      absolute: { opcode: 0xAE, bytes: 3 },
    }
  }],
  ['LDY', {
    mnemonic: 'LDY',
    modes: {
      immediate: { opcode: 0xA0, bytes: 2 },
      absolute: { opcode: 0xAC, bytes: 3 },
    }
  }],
  ['STA', {
    mnemonic: 'STA',
    modes: {
      absolute: { opcode: 0x8D, bytes: 3 },
    }
  }],
  ['STX', {
    mnemonic: 'STX',
    modes: {
      absolute: { opcode: 0x8E, bytes: 3 },
    }
  }],
  ['STY', {
    mnemonic: 'STY',
    modes: {
      absolute: { opcode: 0x8C, bytes: 3 },
    }
  }],

  // Arithmetic
  ['ADC', {
    mnemonic: 'ADC',
    modes: {
      immediate: { opcode: 0x69, bytes: 2 },
      absolute: { opcode: 0x6D, bytes: 3 },
    }
  }],
  ['SBC', {
    mnemonic: 'SBC',
    modes: {
      immediate: { opcode: 0xE9, bytes: 2 },
      absolute: { opcode: 0xED, bytes: 3 },
    }
  }],

  // Logic
  ['AND', {
    mnemonic: 'AND',
    modes: {
      immediate: { opcode: 0x29, bytes: 2 },
      absolute: { opcode: 0x2D, bytes: 3 },
    }
  }],
  ['ORA', {
    mnemonic: 'ORA',
    modes: {
      immediate: { opcode: 0x09, bytes: 2 },
      absolute: { opcode: 0x0D, bytes: 3 },
    }
  }],
  ['EOR', {
    mnemonic: 'EOR',
    modes: {
      immediate: { opcode: 0x49, bytes: 2 },
      absolute: { opcode: 0x4D, bytes: 3 },
    }
  }],

  // Compare
  ['CMP', {
    mnemonic: 'CMP',
    modes: {
      immediate: { opcode: 0xC9, bytes: 2 },
      absolute: { opcode: 0xCD, bytes: 3 },
    }
  }],
  ['CPX', {
    mnemonic: 'CPX',
    modes: {
      immediate: { opcode: 0xE0, bytes: 2 },
    }
  }],
  ['CPY', {
    mnemonic: 'CPY',
    modes: {
      immediate: { opcode: 0xC0, bytes: 2 },
    }
  }],

  // Jumps
  ['JMP', {
    mnemonic: 'JMP',
    modes: {
      absolute: { opcode: 0x4C, bytes: 3 },
    }
  }],
  ['JSR', {
    mnemonic: 'JSR',
    modes: {
      absolute: { opcode: 0x20, bytes: 3 },
    }
  }],
  ['RTS', {
    mnemonic: 'RTS',
    modes: {
      implied: { opcode: 0x60, bytes: 1 },
    }
  }],

  // Branches (relative addressing)
  ['BEQ', {
    mnemonic: 'BEQ',
    modes: {
      relative: { opcode: 0xF0, bytes: 2 },
    }
  }],
  ['BNE', {
    mnemonic: 'BNE',
    modes: {
      relative: { opcode: 0xD0, bytes: 2 },
    }
  }],
  ['BCC', {
    mnemonic: 'BCC',
    modes: {
      relative: { opcode: 0x90, bytes: 2 },
    }
  }],
  ['BCS', {
    mnemonic: 'BCS',
    modes: {
      relative: { opcode: 0xB0, bytes: 2 },
    }
  }],

  // Register operations
  ['INX', {
    mnemonic: 'INX',
    modes: {
      implied: { opcode: 0xE8, bytes: 1 },
    }
  }],
  ['INY', {
    mnemonic: 'INY',
    modes: {
      implied: { opcode: 0xC8, bytes: 1 },
    }
  }],
  ['DEX', {
    mnemonic: 'DEX',
    modes: {
      implied: { opcode: 0xCA, bytes: 1 },
    }
  }],
  ['DEY', {
    mnemonic: 'DEY',
    modes: {
      implied: { opcode: 0x88, bytes: 1 },
    }
  }],

  // Transfers
  ['TAX', {
    mnemonic: 'TAX',
    modes: {
      implied: { opcode: 0xAA, bytes: 1 },
    }
  }],
  ['TAY', {
    mnemonic: 'TAY',
    modes: {
      implied: { opcode: 0xA8, bytes: 1 },
    }
  }],
  ['TXA', {
    mnemonic: 'TXA',
    modes: {
      implied: { opcode: 0x8A, bytes: 1 },
    }
  }],
  ['TYA', {
    mnemonic: 'TYA',
    modes: {
      implied: { opcode: 0x98, bytes: 1 },
    }
  }],
  ['TXS', {
    mnemonic: 'TXS',
    modes: {
      implied: { opcode: 0x9A, bytes: 1 },
    }
  }],
  ['TSX', {
    mnemonic: 'TSX',
    modes: {
      implied: { opcode: 0xBA, bytes: 1 },
    }
  }],

  // Stack
  ['PHA', {
    mnemonic: 'PHA',
    modes: {
      implied: { opcode: 0x48, bytes: 1 },
    }
  }],
  ['PLA', {
    mnemonic: 'PLA',
    modes: {
      implied: { opcode: 0x68, bytes: 1 },
    }
  }],
  ['PHP', {
    mnemonic: 'PHP',
    modes: {
      implied: { opcode: 0x08, bytes: 1 },
    }
  }],
  ['PLP', {
    mnemonic: 'PLP',
    modes: {
      implied: { opcode: 0x28, bytes: 1 },
    }
  }],

  // Flags
  ['SEC', {
    mnemonic: 'SEC',
    modes: {
      implied: { opcode: 0x38, bytes: 1 },
    }
  }],
  ['CLC', {
    mnemonic: 'CLC',
    modes: {
      implied: { opcode: 0x18, bytes: 1 },
    }
  }],
  ['SEI', {
    mnemonic: 'SEI',
    modes: {
      implied: { opcode: 0x78, bytes: 1 },
    }
  }],
  ['CLI', {
    mnemonic: 'CLI',
    modes: {
      implied: { opcode: 0x58, bytes: 1 },
    }
  }],

  // Misc
  ['NOP', {
    mnemonic: 'NOP',
    modes: {
      implied: { opcode: 0xEA, bytes: 1 },
    }
  }],
  ['BRK', {
    mnemonic: 'BRK',
    modes: {
      implied: { opcode: 0x00, bytes: 1 },
    }
  }],
  ['HLT', {
    mnemonic: 'HLT',
    modes: {
      implied: { opcode: 0x02, bytes: 1 },  // Unofficial opcode, halts CPU
    }
  }],
])

// Get opcode info for a mnemonic and addressing mode
export function getOpcodeInfo(mnemonic: string, mode: AddressingMode): OpcodeInfo | undefined {
  const def = INSTRUCTIONS.get(mnemonic)
  if (!def) return undefined
  return def.modes[mode]
}
