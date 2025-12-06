import * as monaco from 'monaco-editor'

// 6502-style mnemonics supported by our CPU
const MNEMONICS = [
  // Load/Store
  'LDA', 'LDX', 'LDY', 'STA', 'STX', 'STY',
  // Arithmetic
  'ADC', 'SBC', 'AND', 'ORA', 'EOR',
  // Compare
  'CMP', 'CPX', 'CPY',
  // Branch/Jump
  'JMP', 'JSR', 'RTS', 'RTI',
  'BEQ', 'BNE', 'BCC', 'BCS', 'BMI', 'BPL', 'BVC', 'BVS',
  // Increment/Decrement
  'INC', 'INX', 'INY', 'DEC', 'DEX', 'DEY',
  // Transfer
  'TAX', 'TAY', 'TXA', 'TYA', 'TXS', 'TSX',
  // Stack
  'PHA', 'PLA', 'PHP', 'PLP',
  // Flags
  'SEC', 'CLC', 'SEI', 'CLI', 'SED', 'CLD', 'CLV',
  // Shift/Rotate
  'ASL', 'LSR', 'ROL', 'ROR',
  // Other
  'NOP', 'BRK', 'HLT', 'BIT',
]

export function registerPulseLanguage() {
  // Register the language
  monaco.languages.register({ id: 'pulse' })

  // Set the token provider
  monaco.languages.setMonarchTokensProvider('pulse', {
    keywords: MNEMONICS,
    ignoreCase: false,

    tokenizer: {
      root: [
        // Comments (semicolon style)
        [/;.*$/, 'comment'],

        // Directives (.org, .byte, .word, .text, .define)
        [/\.(org|byte|word|db|dw|text|ascii|asciiz|define|equ)\b/, 'keyword.directive'],

        // Labels (identifier followed by colon, NOT on same line as instruction)
        [/^[a-zA-Z_][a-zA-Z0-9_]*:/, 'type.identifier'],

        // Mnemonics (3-letter uppercase words)
        [/\b[A-Z]{3}\b/, {
          cases: {
            '@keywords': 'keyword.mnemonic',
            '@default': 'identifier',
          },
        }],

        // Immediate hex (#$FF or #$FFFF)
        [/#\$[0-9A-Fa-f]+/, 'number.hex'],

        // Immediate decimal (#123)
        [/#\d+/, 'number'],

        // Address/value hex ($F000)
        [/\$[0-9A-Fa-f]+/, 'number.hex'],

        // Binary (%10101010)
        [/%[01]+/, 'number.binary'],

        // Label references (identifiers used as operands)
        [/[a-zA-Z_][a-zA-Z0-9_]*/, 'variable.name'],

        // Decimal numbers
        [/\d+/, 'number'],

        // Indexing (,X or ,Y)
        [/,[XY]\b/, 'keyword.register'],

        // Operators and delimiters
        [/[=,+\-*\/]/, 'delimiter'],
        [/[()]/, 'delimiter.parenthesis'],

        // Whitespace
        [/\s+/, 'white'],
      ],
    },
  })

  // Language configuration
  monaco.languages.setLanguageConfiguration('pulse', {
    comments: {
      lineComment: ';',
    },
    brackets: [
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '(', close: ')' },
    ],
  })
}
