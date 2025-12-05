// Wire Language - Hardware Description Language
// Public API

export { lex, type Token, type TokenType, type LexResult } from './lexer'
export { parse, parseModule, type ParseResult, type ParseError } from './parser'
export { compile, resetNodeCounter, type CompiledModule, type Node, type Wire, type CompileResult } from './compiler'
export { Simulator, createSimulator, type SimulatorState, type SimulateResult, type ISimulator } from './simulator'
export * from './ast'
