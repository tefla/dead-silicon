// Pulse Assembler
// Two-pass assembler: collect symbols, then emit bytes

import { lex } from './lexer'
import { parse } from './parser'
import type { Statement, InstructionStmt, DirectiveStmt } from './parser'
import { getOpcodeInfo, INSTRUCTIONS } from './opcodes'

export interface AssembledProgram {
  binary: Uint8Array
  origin: number
  symbols: Map<string, number>
  sourceMap: Map<number, number>  // address -> source line
}

export interface AssembleError {
  message: string
  line: number
}

export type AssembleResult =
  | { ok: true; program: AssembledProgram }
  | { ok: false; error: AssembleError }

export function assemble(source: string): AssembleResult {
  // Lex
  const lexResult = lex(source)
  if (!lexResult.ok) {
    return {
      ok: false,
      error: { message: lexResult.error.message, line: lexResult.error.line },
    }
  }

  // Parse
  const parseResult = parse(lexResult.tokens)
  if (!parseResult.ok) {
    return {
      ok: false,
      error: { message: parseResult.error.message, line: parseResult.error.line },
    }
  }

  return assembleStatements(parseResult.statements)
}

function assembleStatements(statements: Statement[]): AssembleResult {
  const symbols = new Map<string, number>()
  const sourceMap = new Map<number, number>()
  let origin = 0
  let pc = 0

  // Pass 1: Collect symbols and compute addresses
  for (const stmt of statements) {
    switch (stmt.kind) {
      case 'constant':
        symbols.set(stmt.name, stmt.value)
        break

      case 'label':
        symbols.set(stmt.name, pc)
        break

      case 'directive':
        if (stmt.directive === 'org') {
          const addr = stmt.values[0]
          if (typeof addr !== 'number') {
            return {
              ok: false,
              error: { message: '.org requires numeric address', line: stmt.line },
            }
          }
          if (origin === 0) origin = addr  // Set origin to first .org
          pc = addr
        } else if (stmt.directive === 'word') {
          pc += stmt.values.length * 2
        } else if (stmt.directive === 'byte' || stmt.directive === 'db') {
          pc += stmt.values.length
        }
        break

      case 'instruction': {
        const info = getOpcodeInfo(stmt.mnemonic, stmt.operand.mode)
        if (!info) {
          return {
            ok: false,
            error: {
              message: `Unknown instruction or addressing mode: ${stmt.mnemonic} ${stmt.operand.mode}`,
              line: stmt.line,
            },
          }
        }
        pc += info.bytes
        break
      }
    }
  }

  // Calculate total size needed
  const endAddress = pc
  const size = endAddress - origin

  if (size <= 0) {
    // Empty program or no origin set
    return {
      ok: true,
      program: {
        binary: new Uint8Array(0),
        origin: origin || 0,
        symbols,
        sourceMap,
      },
    }
  }

  // Pass 2: Emit bytes
  const binary = new Uint8Array(size)
  pc = origin

  for (const stmt of statements) {
    switch (stmt.kind) {
      case 'directive':
        if (stmt.directive === 'org') {
          pc = stmt.values[0] as number
        } else if (stmt.directive === 'word') {
          for (const val of stmt.values) {
            const resolved = resolveValue(val, symbols, stmt.line)
            if (!resolved.ok) return resolved
            // Little-endian word
            binary[pc - origin] = resolved.value & 0xFF
            binary[pc - origin + 1] = (resolved.value >> 8) & 0xFF
            pc += 2
          }
        } else if (stmt.directive === 'byte' || stmt.directive === 'db') {
          for (const val of stmt.values) {
            const resolved = resolveValue(val, symbols, stmt.line)
            if (!resolved.ok) return resolved
            binary[pc - origin] = resolved.value & 0xFF
            pc++
          }
        }
        break

      case 'instruction': {
        const result = encodeInstruction(stmt, pc, symbols)
        if (!result.ok) return result

        sourceMap.set(pc, stmt.line)

        for (const byte of result.bytes) {
          binary[pc - origin] = byte
          pc++
        }
        break
      }
    }
  }

  return {
    ok: true,
    program: {
      binary,
      origin,
      symbols,
      sourceMap,
    },
  }
}

function resolveValue(
  value: number | string,
  symbols: Map<string, number>,
  line: number
): { ok: true; value: number } | { ok: false; error: AssembleError } {
  if (typeof value === 'number') {
    return { ok: true, value }
  }

  const resolved = symbols.get(value)
  if (resolved === undefined) {
    return {
      ok: false,
      error: { message: `Undefined symbol: ${value}`, line },
    }
  }
  return { ok: true, value: resolved }
}

function encodeInstruction(
  stmt: InstructionStmt,
  pc: number,
  symbols: Map<string, number>
): { ok: true; bytes: number[] } | { ok: false; error: AssembleError } {
  const info = getOpcodeInfo(stmt.mnemonic, stmt.operand.mode)
  if (!info) {
    return {
      ok: false,
      error: {
        message: `Unknown instruction or addressing mode: ${stmt.mnemonic} ${stmt.operand.mode}`,
        line: stmt.line,
      },
    }
  }

  const bytes: number[] = [info.opcode]

  // Add operand bytes if needed
  if (stmt.operand.value !== undefined) {
    const resolved = resolveValue(stmt.operand.value, symbols, stmt.line)
    if (!resolved.ok) return resolved

    if (stmt.operand.mode === 'relative') {
      // Relative addressing: compute offset from next instruction
      const nextPC = pc + info.bytes
      let offset = resolved.value - nextPC

      // Check range (-128 to +127)
      if (offset < -128 || offset > 127) {
        return {
          ok: false,
          error: {
            message: `Branch target out of range: ${stmt.operand.value} (offset ${offset})`,
            line: stmt.line,
          },
        }
      }

      // Convert to signed byte
      bytes.push(offset & 0xFF)
    } else if (stmt.operand.mode === 'immediate') {
      // Single byte operand
      bytes.push(resolved.value & 0xFF)
    } else if (stmt.operand.mode === 'absolute') {
      // Two byte operand (little-endian)
      bytes.push(resolved.value & 0xFF)
      bytes.push((resolved.value >> 8) & 0xFF)
    }
  }

  return { ok: true, bytes }
}

// Convenience: assemble and return just the binary
export function assembleToBinary(source: string): Uint8Array | null {
  const result = assemble(source)
  if (!result.ok) return null
  return result.program.binary
}
