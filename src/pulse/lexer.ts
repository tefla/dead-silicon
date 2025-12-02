// Pulse Assembly Lexer
// Tokenizes Pulse assembly source code (6502-style)

export type TokenType =
  | 'MNEMONIC'    // LDA, STA, JMP, etc.
  | 'IMMEDIATE'   // #$FF or #255
  | 'ADDRESS'     // $F030 (hex address/value)
  | 'NUMBER'      // Plain decimal number
  | 'IDENT'       // Symbol/label reference
  | 'LABEL'       // label: (with colon)
  | 'DIRECTIVE'   // .org, .word, .byte
  | 'EQUALS'      // = for constant definitions
  | 'COMMA'       // , for indexed addressing
  | 'NEWLINE'     // Line terminator
  | 'EOF'

// Valid mnemonics (case-insensitive)
const MNEMONICS = new Set([
  'LDA', 'LDX', 'LDY',
  'STA', 'STX', 'STY',
  'ADC', 'SBC', 'AND', 'ORA', 'EOR',
  'CMP', 'CPX', 'CPY',
  'JMP', 'JSR', 'RTS',
  'JEQ', 'JNE', 'BEQ', 'BNE', 'BCC', 'BCS',
  'INX', 'INY', 'DEX', 'DEY',
  'PHA', 'PLA', 'PHP', 'PLP',
  'TAX', 'TAY', 'TXA', 'TYA', 'TXS', 'TSX',
  'SEC', 'CLC', 'SEI', 'CLI',
  'NOP', 'BRK', 'HLT',
])

export interface Token {
  type: TokenType
  value: string
  line: number
  column: number
}

export interface LexerError {
  message: string
  line: number
  column: number
}

export type LexResult =
  | { ok: true; tokens: Token[] }
  | { ok: false; error: LexerError }

export function lex(source: string): LexResult {
  const tokens: Token[] = []
  let pos = 0
  let line = 1
  let column = 1

  const peek = (offset = 0): string => source[pos + offset] ?? ''
  const advance = (): string => {
    const ch = source[pos++]
    if (ch === '\n') {
      line++
      column = 1
    } else {
      column++
    }
    return ch
  }

  const makeToken = (type: TokenType, value: string, startCol: number, startLine: number = line): Token => ({
    type,
    value,
    line: startLine,
    column: startCol,
  })

  const skipComment = (): void => {
    while (pos < source.length && peek() !== '\n') {
      advance()
    }
  }

  const readWhile = (predicate: (ch: string) => boolean): string => {
    let result = ''
    while (pos < source.length && predicate(peek())) {
      result += advance()
    }
    return result
  }

  const isAlpha = (ch: string): boolean => /[a-zA-Z_]/.test(ch)
  const isAlphaNum = (ch: string): boolean => /[a-zA-Z0-9_]/.test(ch)
  const isDigit = (ch: string): boolean => /[0-9]/.test(ch)
  const isHexDigit = (ch: string): boolean => /[0-9a-fA-F]/.test(ch)

  while (pos < source.length) {
    const ch = peek()
    const startCol = column
    const startLine = line

    // Skip whitespace (except newlines)
    if (ch === ' ' || ch === '\t') {
      advance()
      continue
    }

    // Handle newlines
    if (ch === '\n') {
      advance()
      // Only emit if we have tokens on this line (skip blank lines)
      if (tokens.length > 0 && tokens[tokens.length - 1].type !== 'NEWLINE') {
        tokens.push(makeToken('NEWLINE', '\n', startCol, startLine))
      }
      continue
    }

    // Skip comments (both ; and //)
    if (ch === ';' || (ch === '/' && peek(1) === '/')) {
      skipComment()
      continue
    }

    // Directives (.org, .word, .byte)
    if (ch === '.') {
      advance()
      const directive = readWhile(isAlpha)
      tokens.push(makeToken('DIRECTIVE', '.' + directive.toLowerCase(), startCol, startLine))
      continue
    }

    // Immediate mode (#$FF or #123 or #symbol)
    if (ch === '#') {
      advance()
      const immStartCol = column

      if (peek() === '$') {
        // Hex immediate: #$FF
        advance()
        const hex = readWhile(isHexDigit)
        if (hex.length === 0) {
          return {
            ok: false,
            error: { message: 'Expected hex digits after #$', line: startLine, column: startCol },
          }
        }
        tokens.push(makeToken('IMMEDIATE', '#$' + hex.toUpperCase(), startCol, startLine))
      } else if (isDigit(peek())) {
        // Decimal immediate: #123
        const num = readWhile(isDigit)
        tokens.push(makeToken('IMMEDIATE', '#' + num, startCol, startLine))
      } else if (isAlpha(peek())) {
        // Symbol immediate: #SYMBOL
        const sym = readWhile(isAlphaNum)
        tokens.push(makeToken('IMMEDIATE', '#' + sym, startCol, startLine))
      } else {
        return {
          ok: false,
          error: { message: 'Expected value after #', line: startLine, column: startCol },
        }
      }
      continue
    }

    // Hex address/value ($F030)
    if (ch === '$') {
      advance()
      const hex = readWhile(isHexDigit)
      if (hex.length === 0) {
        return {
          ok: false,
          error: { message: 'Expected hex digits after $', line: startLine, column: startCol },
        }
      }
      tokens.push(makeToken('ADDRESS', '$' + hex.toUpperCase(), startCol, startLine))
      continue
    }

    // Equals sign (for constant definitions)
    if (ch === '=') {
      advance()
      tokens.push(makeToken('EQUALS', '=', startCol, startLine))
      continue
    }

    // Comma (for indexed addressing)
    if (ch === ',') {
      advance()
      tokens.push(makeToken('COMMA', ',', startCol, startLine))
      continue
    }

    // Decimal numbers
    if (isDigit(ch)) {
      const num = readWhile(isDigit)
      tokens.push(makeToken('NUMBER', num, startCol, startLine))
      continue
    }

    // Identifiers, mnemonics, and labels
    if (isAlpha(ch)) {
      const ident = readWhile(isAlphaNum)
      const upper = ident.toUpperCase()

      // Check if it's a label (followed by :)
      if (peek() === ':') {
        advance() // consume the colon
        tokens.push(makeToken('LABEL', ident, startCol, startLine))
        continue
      }

      // Check if it's a mnemonic
      if (MNEMONICS.has(upper)) {
        tokens.push(makeToken('MNEMONIC', upper, startCol, startLine))
        continue
      }

      // Otherwise it's an identifier (symbol reference)
      tokens.push(makeToken('IDENT', ident, startCol, startLine))
      continue
    }

    // Unknown character
    return {
      ok: false,
      error: {
        message: `Unexpected character: '${ch}'`,
        line: startLine,
        column: startCol,
      },
    }
  }

  // Ensure we end with a newline token if there's content
  if (tokens.length > 0 && tokens[tokens.length - 1].type !== 'NEWLINE') {
    tokens.push(makeToken('NEWLINE', '\n', column, line))
  }

  tokens.push(makeToken('EOF', '', column, line))
  return { ok: true, tokens }
}
