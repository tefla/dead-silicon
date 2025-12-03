import * as monaco from 'monaco-editor'

export function registerWireLanguage() {
  // Register the language
  monaco.languages.register({ id: 'wire' })

  // Set the token provider
  monaco.languages.setMonarchTokensProvider('wire', {
    keywords: ['module'],
    operators: ['->', ':', '=', ',', '(', ')', '[', ']', '.'],

    tokenizer: {
      root: [
        // Comments
        [/;.*$/, 'comment'],

        // Module keyword
        [/\bmodule\b/, 'keyword'],

        // Identifiers
        [/[a-z_][a-zA-Z0-9_]*/, 'identifier'],

        // Numbers
        [/[0-9]+/, 'number'],

        // Operators
        [/->/, 'keyword.operator'],
        [/:/, 'type.delimiter'],
        [/=/, 'operator'],
        [/[(),\[\].]/, 'delimiter'],

        // Whitespace
        [/\s+/, 'white'],
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
  })
}
