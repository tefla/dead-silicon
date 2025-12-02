// Wire Language Lexer
// Tokenizes Wire HDL source code

export type TokenType =
  | 'MODULE'      // module keyword
  | 'ARROW'       // ->
  | 'COLON'       // :
  | 'EQUALS'      // =
  | 'COMMA'       // ,
  | 'LPAREN'      // (
  | 'RPAREN'      // )
  | 'LBRACKET'    // [
  | 'RBRACKET'    // ]
  | 'DOT'         // .
  | 'IDENT'       // identifier
  | 'NUMBER'      // numeric literal
  | 'NEWLINE'     // significant newline (after :)
  | 'INDENT'      // indentation
  | 'EOF'         // end of file

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
  let atLineStart = true
  let inModuleBody = false // Track if we're after a colon (module body)

  const peek = (offset = 0): string => source[pos + offset] ?? ''
  const advance = (): string => {
    const ch = source[pos++]
    if (ch === '\n') {
      line++
      column = 1
      atLineStart = true
    } else {
      column++
      atLineStart = false
    }
    return ch
  }

  const makeToken = (type: TokenType, value: string, startCol: number): Token => ({
    type,
    value,
    line,
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

    // Handle indentation at start of line (in module body)
    if (atLineStart && inModuleBody) {
      if (ch === ' ' || ch === '\t') {
        const indent = readWhile(c => c === ' ' || c === '\t')
        tokens.push(makeToken('INDENT', indent, startCol))
        continue
      }
    }

    // Skip whitespace (but not at line start where it's indentation)
    if (ch === ' ' || ch === '\t') {
      advance()
      continue
    }

    // Handle newlines
    if (ch === '\n') {
      advance()
      // Only emit NEWLINE tokens when we're in module body
      if (inModuleBody) {
        tokens.push(makeToken('NEWLINE', '\n', startCol))
      }
      continue
    }

    // Skip comments
    if (ch === ';') {
      skipComment()
      continue
    }

    // Two-character operators
    if (ch === '-' && peek(1) === '>') {
      advance()
      advance()
      tokens.push(makeToken('ARROW', '->', startCol))
      continue
    }

    // Single-character tokens
    if (ch === ':') {
      advance()
      tokens.push(makeToken('COLON', ':', startCol))
      // After a colon that ends a module declaration, we're in the body
      // We detect this by checking if we're at end of line or have a number (width spec)
      // Actually, simpler: if we see a newline soon after, we're entering body
      inModuleBody = true
      continue
    }

    if (ch === '=') {
      advance()
      tokens.push(makeToken('EQUALS', '=', startCol))
      continue
    }

    if (ch === ',') {
      advance()
      tokens.push(makeToken('COMMA', ',', startCol))
      continue
    }

    if (ch === '(') {
      advance()
      tokens.push(makeToken('LPAREN', '(', startCol))
      continue
    }

    if (ch === ')') {
      advance()
      tokens.push(makeToken('RPAREN', ')', startCol))
      continue
    }

    if (ch === '[') {
      advance()
      tokens.push(makeToken('LBRACKET', '[', startCol))
      continue
    }

    if (ch === ']') {
      advance()
      tokens.push(makeToken('RBRACKET', ']', startCol))
      continue
    }

    if (ch === '.') {
      advance()
      tokens.push(makeToken('DOT', '.', startCol))
      continue
    }

    // Numbers (decimal or hex)
    if (isDigit(ch)) {
      let num = ''
      if (ch === '0' && (peek(1) === 'x' || peek(1) === 'X')) {
        num = advance() + advance() // 0x
        num += readWhile(isHexDigit)
      } else {
        num = readWhile(isDigit)
      }
      tokens.push(makeToken('NUMBER', num, startCol))
      continue
    }

    // Identifiers and keywords
    if (isAlpha(ch)) {
      const ident = readWhile(isAlphaNum)
      if (ident === 'module') {
        tokens.push(makeToken('MODULE', ident, startCol))
        inModuleBody = false // Reset - we're in a new module header
      } else {
        tokens.push(makeToken('IDENT', ident, startCol))
      }
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

  tokens.push(makeToken('EOF', '', column))
  return { ok: true, tokens }
}

// Helper to filter out insignificant tokens for easier parsing
export function filterTokens(tokens: Token[]): Token[] {
  return tokens.filter(t =>
    t.type !== 'NEWLINE' ||
    // Keep newlines that separate statements
    true
  )
}
