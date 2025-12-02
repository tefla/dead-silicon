// Wire Language Parser
// Parses tokens into an AST

import type { Token, TokenType } from './lexer'
import type { Module, Port, Statement, Expr } from './ast'
import { ident, call, member, index, slice, num } from './ast'

export interface ParseError {
  message: string
  line: number
  column: number
}

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ParseError }

class Parser {
  private pos = 0
  private tokens: Token[]

  constructor(tokens: Token[]) {
    // Filter out NEWLINE and INDENT tokens for simpler parsing
    // We use : to delimit the module header from body
    this.tokens = tokens.filter(t => t.type !== 'NEWLINE' && t.type !== 'INDENT')
  }

  private peek(offset = 0): Token {
    const idx = this.pos + offset
    if (idx >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1] // EOF
    }
    return this.tokens[idx]
  }

  private advance(): Token {
    const token = this.peek()
    if (token.type !== 'EOF') {
      this.pos++
    }
    return token
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type
  }

  private match(...types: TokenType[]): Token | null {
    for (const type of types) {
      if (this.check(type)) {
        return this.advance()
      }
    }
    return null
  }

  private expect(type: TokenType, message: string): ParseResult<Token> {
    const token = this.peek()
    if (token.type === type) {
      return { ok: true, value: this.advance() }
    }
    return {
      ok: false,
      error: {
        message: `${message}, got ${token.type} '${token.value}'`,
        line: token.line,
        column: token.column,
      },
    }
  }

  private error(message: string): ParseError {
    const token = this.peek()
    return {
      message,
      line: token.line,
      column: token.column,
    }
  }

  // Parse a complete module
  parseModule(): ParseResult<Module> {
    // module <name>(<inputs>) -> <outputs>:
    const moduleKw = this.expect('MODULE', 'Expected "module"')
    if (!moduleKw.ok) return moduleKw

    const nameToken = this.expect('IDENT', 'Expected module name')
    if (!nameToken.ok) return nameToken
    const name = nameToken.value.value

    const lparen = this.expect('LPAREN', 'Expected "("')
    if (!lparen.ok) return lparen

    const inputs = this.parsePortList()
    if (!inputs.ok) return inputs

    const rparen = this.expect('RPAREN', 'Expected ")"')
    if (!rparen.ok) return rparen

    const arrow = this.expect('ARROW', 'Expected "->"')
    if (!arrow.ok) return arrow

    const outputs = this.parseOutputs()
    if (!outputs.ok) return outputs

    const colon = this.expect('COLON', 'Expected ":"')
    if (!colon.ok) return colon

    // Parse statements until EOF or next module
    const statements: Statement[] = []
    while (!this.check('EOF') && !this.check('MODULE')) {
      const stmt = this.parseStatement()
      if (!stmt.ok) return stmt
      statements.push(stmt.value)
    }

    return {
      ok: true,
      value: { name, inputs: inputs.value, outputs: outputs.value, statements },
    }
  }

  // Parse comma-separated port list
  private parsePortList(): ParseResult<Port[]> {
    const ports: Port[] = []

    if (this.check('RPAREN')) {
      return { ok: true, value: ports }
    }

    do {
      const port = this.parsePort()
      if (!port.ok) return port
      ports.push(port.value)
    } while (this.match('COMMA'))

    return { ok: true, value: ports }
  }

  // Parse a single port: name or name:width
  // Must look ahead to distinguish port width (:8) from module body colon (:)
  private parsePort(): ParseResult<Port> {
    const nameToken = this.expect('IDENT', 'Expected port name')
    if (!nameToken.ok) return nameToken
    const name = nameToken.value.value

    let width = 1
    // Only consume colon if followed by a number (width specifier)
    if (this.check('COLON') && this.peek(1).type === 'NUMBER') {
      this.advance() // consume colon
      const widthToken = this.advance() // consume number
      width = this.parseNumber(widthToken.value)
    }

    return { ok: true, value: { name, width } }
  }

  // Parse outputs: either single port or (port, port, ...)
  private parseOutputs(): ParseResult<Port[]> {
    if (this.match('LPAREN')) {
      const ports = this.parsePortList()
      if (!ports.ok) return ports
      const rparen = this.expect('RPAREN', 'Expected ")"')
      if (!rparen.ok) return rparen
      return ports
    }

    // Single output
    const port = this.parsePort()
    if (!port.ok) return port
    return { ok: true, value: [port.value] }
  }

  // Parse a statement: target = expr
  private parseStatement(): ParseResult<Statement> {
    const targetToken = this.expect('IDENT', 'Expected assignment target')
    if (!targetToken.ok) return targetToken
    const target = targetToken.value.value

    const equals = this.expect('EQUALS', 'Expected "="')
    if (!equals.ok) return equals

    const expr = this.parseExpr()
    if (!expr.ok) return expr

    return { ok: true, value: { target, expr: expr.value } }
  }

  // Parse an expression
  private parseExpr(): ParseResult<Expr> {
    return this.parsePrimary()
  }

  // Parse primary expression with postfix operations
  private parsePrimary(): ParseResult<Expr> {
    const token = this.peek()

    // Number literal
    if (token.type === 'NUMBER') {
      this.advance()
      return { ok: true, value: num(this.parseNumber(token.value)) }
    }

    // Identifier (possibly with call, member access, or indexing)
    if (token.type === 'IDENT') {
      this.advance()
      let expr: Expr = ident(token.value)

      // Handle postfix operations
      while (true) {
        // Function call
        if (this.match('LPAREN')) {
          const args: Expr[] = []
          if (!this.check('RPAREN')) {
            do {
              const arg = this.parseExpr()
              if (!arg.ok) return arg
              args.push(arg.value)
            } while (this.match('COMMA'))
          }
          const rparen = this.expect('RPAREN', 'Expected ")"')
          if (!rparen.ok) return rparen

          // Convert to call expression
          if (expr.kind === 'ident') {
            expr = call(expr.name, args)
          } else {
            return { ok: false, error: this.error('Can only call identifiers') }
          }
        }
        // Member access
        else if (this.match('DOT')) {
          const fieldToken = this.expect('IDENT', 'Expected field name')
          if (!fieldToken.ok) return fieldToken
          expr = member(expr, fieldToken.value.value)
        }
        // Indexing or slicing
        else if (this.match('LBRACKET')) {
          const startToken = this.expect('NUMBER', 'Expected index')
          if (!startToken.ok) return startToken
          const start = this.parseNumber(startToken.value.value)

          if (this.match('COLON')) {
            // Slice: [start:end]
            const endToken = this.expect('NUMBER', 'Expected end index')
            if (!endToken.ok) return endToken
            const end = this.parseNumber(endToken.value.value)
            expr = slice(expr, start, end)
          } else {
            // Single index: [index]
            expr = index(expr, start)
          }

          const rbracket = this.expect('RBRACKET', 'Expected "]"')
          if (!rbracket.ok) return rbracket
        }
        else {
          break
        }
      }

      return { ok: true, value: expr }
    }

    return {
      ok: false,
      error: this.error(`Unexpected token: ${token.type} '${token.value}'`),
    }
  }

  private parseNumber(value: string): number {
    if (value.startsWith('0x') || value.startsWith('0X')) {
      return parseInt(value, 16)
    }
    return parseInt(value, 10)
  }

  // Parse multiple modules from source
  parseModules(): ParseResult<Module[]> {
    const modules: Module[] = []

    while (!this.check('EOF')) {
      const module = this.parseModule()
      if (!module.ok) return module
      modules.push(module.value)
    }

    return { ok: true, value: modules }
  }
}

export function parse(tokens: Token[]): ParseResult<Module[]> {
  const parser = new Parser(tokens)
  return parser.parseModules()
}

export function parseModule(tokens: Token[]): ParseResult<Module> {
  const parser = new Parser(tokens)
  return parser.parseModule()
}
