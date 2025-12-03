import * as monaco from 'monaco-editor'

const MNEMONICS = [
  'LDA', 'LDX', 'LDY', 'STA', 'STX', 'STY',
  'ADC', 'SBC', 'AND', 'ORA', 'EOR',
  'CMP', 'CPX', 'CPY',
  'JMP', 'JSR', 'RTS', 'BEQ', 'BNE', 'BCC', 'BCS',
  'INX', 'INY', 'DEX', 'DEY',
  'TAX', 'TAY', 'TXA', 'TYA', 'TXS', 'TSX',
  'PHA', 'PLA', 'PHP', 'PLP',
  'SEC', 'CLC', 'SEI', 'CLI',
  'NOP', 'BRK', 'HLT',
]

export function registerPulseLanguage() {
  // Register the language
  monaco.languages.register({ id: 'pulse' })

  // Set the token provider
  monaco.languages.setMonarchTokensProvider('pulse', {
    keywords: MNEMONICS,
    directives: ['.org', '.word', '.byte', '.db'],

    tokenizer: {
      root: [
        // Comments
        [/;.*$/, 'comment'],

        // Directives
        [/\.[a-z]+/, 'keyword.directive'],

        // Labels (identifier followed by colon)
        [/[a-z_][a-zA-Z0-9_]*:/, 'type.identifier'],

        // Mnemonics (uppercase 3-letter words)
        [/[A-Z]{3}\b/, {
          cases: {
            '@keywords': 'keyword',
            '@default': 'identifier',
          },
        }],

        // Immediate hex (#$FF)
        [/#\$[0-9A-Fa-f]+/, 'number.hex'],

        // Immediate decimal (#123)
        [/#[0-9]+/, 'number'],

        // Address/value hex ($F030)
        [/\$[0-9A-Fa-f]+/, 'number.hex'],

        // Identifiers
        [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],

        // Numbers
        [/[0-9]+/, 'number'],

        // Operators
        [/[=,]/, 'delimiter'],

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
  })
}
