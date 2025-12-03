import * as monaco from 'monaco-editor'

export function registerVSCodeTheme() {
  monaco.editor.defineTheme('vscode-dark-custom', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955' },
      { token: 'keyword', foreground: '569CD6' },
      { token: 'keyword.operator', foreground: 'C586C0' },
      { token: 'keyword.directive', foreground: 'C586C0' },
      { token: 'identifier', foreground: '9CDCFE' },
      { token: 'type.identifier', foreground: '4EC9B0' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'number.hex', foreground: 'B5CEA8' },
      { token: 'operator', foreground: 'D4D4D4' },
      { token: 'delimiter', foreground: 'D4D4D4' },
      { token: 'type.delimiter', foreground: 'D4D4D4' },
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
