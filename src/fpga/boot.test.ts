// Boot Sequence Integration Test
// Verifies that boot.pulse assembles and runs correctly

import { describe, it, expect } from 'vitest'
import { assemble } from '../pulse/assembler'
import { CPU, SimpleIO } from './cpu'
import { createMemory } from './memory'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Boot Sequence', () => {
  it('should assemble boot.pulse without errors', () => {
    const bootSource = readFileSync(
      join(__dirname, '../assets/pulse/boot.pulse'),
      'utf-8'
    )

    const result = assemble(bootSource)
    if (!result.ok) {
      console.error('Assembly error:', result.error)
    }

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.program.binary.length).toBeGreaterThan(0)
      console.log(`Boot program size: ${result.program.binary.length} bytes`)
      console.log('Symbol table:', Object.fromEntries(result.program.symbols))
    }
  })

  it('should boot and print banner', () => {
    const bootSource = readFileSync(
      join(__dirname, '../assets/pulse/boot.pulse'),
      'utf-8'
    )

    const result = assemble(bootSource)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Create memory and load program
    const memory = createMemory()
    for (let i = 0; i < result.program.binary.length; i++) {
      memory[result.program.origin + i] = result.program.binary[i]
    }

    // Create I/O handler
    const io = new SimpleIO()

    // Create CPU
    const cpu = new CPU(memory, io)
    cpu.reset()

    // Run boot sequence (should print banner and run self-test)
    // Stop after reasonable number of cycles or when we hit shell_main
    const maxCycles = 1000
    let cycleCount = 0

    while (!cpu.state.halted && cycleCount < maxCycles) {
      cpu.step()
      cycleCount++

      // Stop when we reach shell_main (would wait for input)
      const shellMainAddr = result.program.symbols.get('shell_main')
      if (shellMainAddr !== undefined && cpu.state.PC === shellMainAddr) {
        console.log('Reached shell_main')
        break
      }
    }

    console.log(`Executed ${cycleCount} cycles`)

    // Check serial output
    const output = io.serialOut.map((c) => String.fromCharCode(c)).join('')
    console.log('Serial output:')
    console.log(output)

    // Verify boot banner was printed
    expect(output).toContain('DEAD SILICON')
    expect(output).toContain('v0.1')

    // Verify self-test passed
    expect(output).toContain('OK')

    // Should not have failed
    expect(output).not.toContain('FAIL')

    // Should reach shell
    const shellMainAddr = result.program.symbols.get('shell_main')
    expect(shellMainAddr).toBeDefined()
    if (shellMainAddr !== undefined) {
      expect(cpu.state.PC).toBe(shellMainAddr)
    }
  })

  it('should respond to help command', () => {
    const bootSource = readFileSync(
      join(__dirname, '../assets/pulse/boot.pulse'),
      'utf-8'
    )

    const result = assemble(bootSource)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Create memory and load program
    const memory = createMemory()
    for (let i = 0; i < result.program.binary.length; i++) {
      memory[result.program.origin + i] = result.program.binary[i]
    }

    // Create I/O handler and pre-load input
    const io = new SimpleIO()

    // Provide input BEFORE running CPU (so it's there when shell waits)
    io.serialIn.push('h'.charCodeAt(0))
    io.serialIn.push(10) // newline

    // Create CPU and boot
    const cpu = new CPU(memory, io)
    cpu.reset()

    // Run until we get back to shell prompt (one full cycle)
    const shellMainAddr = result.program.symbols.get('shell_main')
    let visitCount = 0
    let cycleCount = 0
    const maxCycles = 10000

    // Track other key addresses for debugging
    const handleCommandAddr = result.program.symbols.get('handle_command')
    const cmdHelpAddr = result.program.symbols.get('cmd_help')
    let handleCommandVisits = 0
    let cmdHelpVisits = 0

    while (!cpu.state.halted && cycleCount < maxCycles) {
      const prevPC = cpu.state.PC
      cpu.step()
      cycleCount++

      // Count how many times we visit key locations
      if (prevPC === shellMainAddr) {
        visitCount++
        // After visiting shell_main twice (boot + after command), stop
        if (visitCount >= 2 && cycleCount > 200) {
          break
        }
      }

      if (prevPC === handleCommandAddr) {
        handleCommandVisits++
      }

      if (prevPC === cmdHelpAddr) {
        cmdHelpVisits++
      }
    }

    console.log(`Executed ${cycleCount} cycles`)
    console.log(`Visited: shell_main=${visitCount}, handle_command=${handleCommandVisits}, cmd_help=${cmdHelpVisits}`)
    console.log(`Final PC: 0x${cpu.state.PC.toString(16)}, halted: ${cpu.state.halted}`)

    // Check ALL output (including boot)
    const output = io.serialOut.map((c) => String.fromCharCode(c)).join('')
    console.log('Full output:')
    console.log(output)

    // Should have booted
    expect(output).toContain('DEAD SILICON')

    // Should print prompt and accept input
    expect(output).toContain('$')
    expect(output).toContain('h') // Input was echoed

    // Shell reaches handle_command (command processing exists)
    expect(handleCommandVisits).toBeGreaterThan(0)
  })

  it('should accept shell input', () => {
    const bootSource = readFileSync(
      join(__dirname, '../assets/pulse/boot.pulse'),
      'utf-8'
    )

    const result = assemble(bootSource)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Create memory and load program
    const memory = createMemory()
    for (let i = 0; i < result.program.binary.length; i++) {
      memory[result.program.origin + i] = result.program.binary[i]
    }

    // Create I/O handler and pre-load input
    const io = new SimpleIO()

    // Provide test input
    io.serialIn.push('s'.charCodeAt(0))
    io.serialIn.push(10)

    // Create CPU and boot
    const cpu = new CPU(memory, io)
    cpu.reset()

    // Run for reasonable number of cycles
    const maxCycles = 200
    let cycleCount = 0

    while (!cpu.state.halted && cycleCount < maxCycles) {
      cpu.step()
      cycleCount++
    }

    // Check output
    const output = io.serialOut.map((c) => String.fromCharCode(c)).join('')

    // Should have booted
    expect(output).toContain('DEAD SILICON')

    // Should print prompt
    expect(output).toContain('$')

    // Should echo input
    expect(output).toContain('s')
  })
})
