// Pulse Assembly Parser
// Parses tokens into an AST

import type { Token, TokenType } from './lexer'

// AST Types
export interface LabelStmt {
  kind: 'label'
  name: string
  line: number
}

export interface ConstantStmt {
  kind: 'constant'
  name: string
  value: number
  line: number
}

export interface DirectiveStmt {
  kind: 'directive'
  directive: string  // 'org', 'word', 'byte', 'db'
  values: (number | string)[]  // Can be numbers or symbol references
  line: number
}

export type AddressingMode =
  | 'implied'     // RTS
  | 'immediate'   // LDA #$42
  | 'absolute'    // LDA $F030
  | 'relative'    // BNE label (for branches)

export interface Operand {
  mode: AddressingMode
  value?: number | string  // Number or symbol name
}

export interface InstructionStmt {
  kind: 'instruction'
  mnemonic: string
  operand: Operand
  line: number
}

export type Statement = LabelStmt | ConstantStmt | DirectiveStmt | InstructionStmt

export interface ParseError {
  message: string
  line: number
  column: number
}

export type ParseResult =
  | { ok: true; statements: Statement[] }
  | { ok: false; error: ParseError }

// Branch instructions use relative addressing
const BRANCH_MNEMONICS = new Set([
  'BEQ', 'BNE', 'BCC', 'BCS', 'BPL', 'BMI', 'BVC', 'BVS',
])

// Instructions that take no operand
const IMPLIED_MNEMONICS = new Set([
  'RTS', 'RTI', 'BRK', 'NOP', 'HLT',
  'INX', 'INY', 'DEX', 'DEY',
  'TAX', 'TAY', 'TXA', 'TYA', 'TXS', 'TSX',
  'PHA', 'PLA', 'PHP', 'PLP',
  'SEC', 'CLC', 'SEI', 'CLI', 'CLV',
])

export function parse(tokens: Token[]): ParseResult {
  const statements: Statement[] = []
  let pos = 0

  const peek = (): Token => tokens[pos] ?? { type: 'EOF', value: '', line: 0, column: 0 }
  const advance = (): Token => tokens[pos++]
  const check = (type: TokenType): boolean => peek().type === type
  const isAtEnd = (): boolean => check('EOF')

  const error = (message: string, token: Token = peek()): ParseResult => ({
    ok: false,
    error: { message, line: token.line, column: token.column },
  })

  const parseValue = (token: Token): number | string => {
    if (token.type === 'ADDRESS') {
      // $F030 -> 0xF030
      return parseInt(token.value.slice(1), 16)
    }
    if (token.type === 'NUMBER') {
      return parseInt(token.value, 10)
    }
    if (token.type === 'IDENT') {
      return token.value  // Symbol reference, resolved later
    }
    if (token.type === 'IMMEDIATE') {
      const val = token.value.slice(1)  // Remove #
      if (val.startsWith('$')) {
        return parseInt(val.slice(1), 16)
      }
      if (/^\d+$/.test(val)) {
        return parseInt(val, 10)
      }
      return val  // Symbol reference
    }
    return 0
  }

  const parseStatement = (): Statement | null => {
    // Skip newlines
    while (check('NEWLINE')) {
      advance()
    }

    if (isAtEnd()) return null

    const token = peek()

    // Label definition
    if (check('LABEL')) {
      const t = advance()
      return { kind: 'label', name: t.value, line: t.line }
    }

    // Constant definition: IDENT = value
    if (check('IDENT') && tokens[pos + 1]?.type === 'EQUALS') {
      const nameToken = advance()
      advance()  // consume =
      const valueToken = advance()
      const value = parseValue(valueToken)
      if (typeof value === 'string') {
        return error(`Constant must have numeric value, got symbol: ${value}`, valueToken) as any
      }
      return { kind: 'constant', name: nameToken.value, value, line: nameToken.line }
    }

    // Directive: .org, .word, .byte
    if (check('DIRECTIVE')) {
      const directive = advance()
      const directiveName = directive.value.slice(1).toLowerCase()
      const values: (number | string)[] = []

      // Parse values until newline
      while (!check('NEWLINE') && !check('EOF')) {
        const valToken = advance()
        values.push(parseValue(valToken))
        // Skip commas between values
        if (check('COMMA')) advance()
      }

      return {
        kind: 'directive',
        directive: directiveName,
        values,
        line: directive.line,
      }
    }

    // Instruction
    if (check('MNEMONIC')) {
      const mnemonicToken = advance()
      const mnemonic = mnemonicToken.value

      // Check for implied addressing (no operand)
      if (IMPLIED_MNEMONICS.has(mnemonic) || check('NEWLINE') || check('EOF')) {
        return {
          kind: 'instruction',
          mnemonic,
          operand: { mode: 'implied' },
          line: mnemonicToken.line,
        }
      }

      // Parse operand
      const operandToken = advance()
      let operand: Operand

      if (operandToken.type === 'IMMEDIATE') {
        // Immediate mode: #$42 or #label
        operand = {
          mode: 'immediate',
          value: parseValue(operandToken),
        }
      } else if (operandToken.type === 'ADDRESS' || operandToken.type === 'NUMBER') {
        // Absolute or relative mode
        const mode: AddressingMode = BRANCH_MNEMONICS.has(mnemonic) ? 'relative' : 'absolute'
        operand = {
          mode,
          value: parseValue(operandToken),
        }
      } else if (operandToken.type === 'IDENT') {
        // Symbol reference - could be absolute or relative
        const mode: AddressingMode = BRANCH_MNEMONICS.has(mnemonic) ? 'relative' : 'absolute'
        operand = {
          mode,
          value: operandToken.value,
        }
      } else {
        return error(`Unexpected operand: ${operandToken.value}`, operandToken) as any
      }

      // Check for indexed addressing (,X or ,Y) - for future expansion
      if (check('COMMA')) {
        advance()  // consume comma
        const indexToken = advance()
        // For now, just consume it - we'll handle indexed addressing later
      }

      return {
        kind: 'instruction',
        mnemonic,
        operand,
        line: mnemonicToken.line,
      }
    }

    // Unknown token
    return error(`Unexpected token: ${token.type} '${token.value}'`, token) as any
  }

  // Parse all statements
  while (!isAtEnd()) {
    const stmt = parseStatement()
    if (stmt === null) break

    // Check for parse error (returned as any)
    if ('ok' in stmt && stmt.ok === false) {
      return stmt as unknown as ParseResult
    }

    statements.push(stmt)
  }

  return { ok: true, statements }
}
