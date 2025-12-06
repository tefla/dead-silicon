import * as monaco from 'monaco-editor'

export function registerVSCodeTheme() {
  monaco.editor.defineTheme('vscode-dark-custom', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      // Comments - green
      { token: 'comment', foreground: '6A9955' },

      // Keywords (module, mnemonics) - blue
      { token: 'keyword', foreground: '569CD6' },
      { token: 'keyword.mnemonic', foreground: '569CD6', fontStyle: 'bold' },

      // Primitives (nand, dff, concat) - purple
      { token: 'keyword.primitive', foreground: 'C586C0' },

      // Directives (.org, .byte) - purple
      { token: 'keyword.directive', foreground: 'C586C0' },

      // Operators (->)
      { token: 'keyword.operator', foreground: 'C586C0' },

      // Register indexing (,X ,Y)
      { token: 'keyword.register', foreground: '4FC1FF' },

      // Labels - teal
      { token: 'type.identifier', foreground: '4EC9B0' },

      // Bus size (:8, :16)
      { token: 'type.size', foreground: '4EC9B0' },

      // Identifiers - light blue
      { token: 'identifier', foreground: '9CDCFE' },

      // Variable references
      { token: 'variable.name', foreground: '9CDCFE' },

      // Numbers - light green
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'number.hex', foreground: 'B5CEA8' },
      { token: 'number.binary', foreground: 'B5CEA8' },

      // Delimiters
      { token: 'delimiter', foreground: 'D4D4D4' },
      { token: 'delimiter.bracket', foreground: 'FFD700' },
      { token: 'delimiter.parenthesis', foreground: 'D4D4D4' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#cccccc',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#c6c6c6',
      'editor.selectionBackground': '#264f78',
      'editor.inactiveSelectionBackground': '#3a3d41',
      'editor.lineHighlightBackground': '#282828',
      'editorCursor.foreground': '#aeafad',
      'editor.findMatchBackground': '#515c6a',
      'editor.findMatchHighlightBackground': '#ea5c0055',
    },
  })
}
