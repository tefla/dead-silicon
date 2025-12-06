// Wire Gate Simulator
// WASM-only simulation of compiled Wire circuits

import type { CompiledModule } from './compiler'

export interface ISimulator {
  setInput(name: string, value: number): void
  getOutput(name: string): number
  getWire(name: string): number
  loadRom(data: Uint8Array | number[], nodeId?: string): void
  readRam(addr: number, nodeId?: string): number
  writeRam(addr: number, value: number, nodeId?: string): void
  step(): void
  run(cycles: number): void
  reset(): void
  getAllWires(): Map<string, number>
}

// Convenience function to compile and create a WASM simulator
import { lex } from './lexer'
import { parse } from './parser'
import { compile, resetNodeCounter } from './compiler'
import { WASMSimulator } from './simulator-wasm'

export type SimulateResult =
  | { ok: true; simulator: ISimulator; modules: Map<string, CompiledModule> }
  | { ok: false; error: string }

export function createSimulator(
  source: string,
  mainModule?: string
): SimulateResult {
  resetNodeCounter()

  const lexResult = lex(source)
  if (!lexResult.ok) {
    return { ok: false, error: `Lex error: ${lexResult.error.message} ` }
  }

  const parseResult = parse(lexResult.tokens)
  if (!parseResult.ok) {
    return { ok: false, error: `Parse error: ${parseResult.error.message} ` }
  }

  const compileResult = compile(parseResult.value)
  if (!compileResult.ok) {
    return { ok: false, error: `Compile error: ${compileResult.error.message} ` }
  }

  // Find the main module
  const modules = compileResult.modules
  let main: CompiledModule | undefined

  if (mainModule) {
    main = modules.get(mainModule)
  } else {
    // Use the last defined module as main
    for (const mod of modules.values()) {
      main = mod
    }
  }

  if (!main) {
    return { ok: false, error: 'No modules found' }
  }

  // WASM is the ONLY simulator
  const simulator: ISimulator = new WASMSimulator(main, modules)

  return {
    ok: true,
    simulator,
    modules,
  }
}
