import * as monaco from 'monaco-editor'

// Wire HDL built-in primitives and common modules
const PRIMITIVES = ['nand', 'dff', 'concat']
const KEYWORDS = ['module']

export function registerWireLanguage() {
  // Register the language
  monaco.languages.register({ id: 'wire' })

  // Set the token provider
  monaco.languages.setMonarchTokensProvider('wire', {
    keywords: KEYWORDS,
    primitives: PRIMITIVES,

    tokenizer: {
      root: [
        // Comments (semicolon style)
        [/;.*$/, 'comment'],

        // Module keyword
        [/\bmodule\b/, 'keyword'],

        // Primitives (nand, dff, concat)
        [/\b(nand|dff|concat)\b/, 'keyword.primitive'],

        // Bus width specifier :8, :16, etc
        [/:(\d+)/, 'type.size'],

        // Arrow operator
        [/->/, 'keyword.operator'],

        // Numbers
        [/\b\d+\b/, 'number'],

        // Identifiers (must come after keywords/primitives)
        [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],

        // Bus index [0], [7:0]
        [/\[/, 'delimiter.bracket', '@busIndex'],

        // Other operators and delimiters
        [/[=()]/, 'delimiter'],
        [/[,.]/, 'delimiter'],

        // Whitespace
        [/\s+/, 'white'],
      ],

      busIndex: [
        [/\d+/, 'number'],
        [/:/, 'delimiter'],
        [/\]/, 'delimiter.bracket', '@pop'],
      ],
    },
  })

  // Language configuration
  monaco.languages.setLanguageConfiguration('wire', {
    comments: {
      lineComment: ';',
    },
    brackets: [
      ['(', ')'],
      ['[', ']'],
    ],
    autoClosingPairs: [
      { open: '(', close: ')' },
      { open: '[', close: ']' },
    ],
    surroundingPairs: [
      { open: '(', close: ')' },
      { open: '[', close: ']' },
    ],
    indentationRules: {
      increaseIndentPattern: /:\s*$/,
      decreaseIndentPattern: /^\s*$/,
    },
  })
}
