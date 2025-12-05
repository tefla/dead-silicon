// Command handler for Dead Silicon terminal
import { puzzles, puzzlesByPhase, isPhaseComplete } from './puzzles'
import { phases } from './phases'
import { systems, gameFiles } from './files'
import type { Phase } from './types'

export interface CommandResult {
  output: string
  type: 'system' | 'error' | 'success' | 'warning' | 'narrative'
  action?: 'open_file' | 'show_hint' | 'flash'
  actionPayload?: string
}

export function executeCommand(
  input: string,
  currentPhase: Phase,
  solvedPuzzles: string[],
  unlockedFiles: string[]
): CommandResult {
  const parts = input.trim().toLowerCase().split(/\s+/)
  const command = parts[0]
  const args = parts.slice(1)

  switch (command) {
    case 'help':
      return handleHelp()
    case 'status':
      return handleStatus(currentPhase, solvedPuzzles)
    case 'diag':
      return handleDiag(args[0], currentPhase, solvedPuzzles, unlockedFiles)
    case 'flash':
      return handleFlash(args[0])
    case 'hint':
      return handleHint(args[0], currentPhase, solvedPuzzles)
    case 'open':
    case 'edit':
      return handleOpen(args[0], unlockedFiles)
    case 'ls':
      return handleLs(args[0], unlockedFiles)
    case 'cat':
      return handleCat(args[0], unlockedFiles)
    case 'clear':
      return { output: '', type: 'system' }
    default:
      return {
        output: `Unknown command: ${command}\nType 'help' for available commands.`,
        type: 'error'
      }
  }
}

function handleHelp(): CommandResult {
  return {
    type: 'system',
    output: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    DIAGNOSTIC TERMINAL COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  status          Show overall system status
  diag <system>   Run diagnostics on a system
                  Systems: lifesup, power, storage, nav, comms

  ls [path]       List files in directory
  open <file>     Open file in editor
  flash <file>    Compile and flash repair to ship's computer

  hint [puzzle]   Get a hint for current puzzle
  clear           Clear console

  help            Show this help message

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
  }
}

function handleStatus(currentPhase: Phase, solvedPuzzles: string[]): CommandResult {
  const phase = phases[currentPhase]
  const solvedSet = new Set(solvedPuzzles)

  // Build system status display
  const systemStatus: string[] = []
  const systemKeys = ['lifesup', 'power', 'storage', 'nav', 'comms']

  for (const sysKey of systemKeys) {
    const sys = systems[sysKey]
    if (!sys) continue

    // Check if all puzzles for this system are solved
    const systemPuzzles = Object.values(puzzles).filter(p => p.system === sysKey)
    const allSolved = systemPuzzles.length > 0 && systemPuzzles.every(p => solvedSet.has(p.id))
    const anySolved = systemPuzzles.some(p => solvedSet.has(p.id))

    let status: string
    if (allSolved) {
      status = '  OK   '
    } else if (anySolved) {
      status = 'PARTIAL'
    } else if (systemPuzzles.length === 0) {
      status = 'OFFLINE'
    } else {
      status = ' FAIL  '
    }

    // Pad system name
    const name = sys.name.padEnd(15)
    systemStatus.push(`  ${name} [${status}]`)
  }

  return {
    type: 'system',
    output: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                      CYGNUS-7 SYSTEM STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  CURRENT PHASE: ${phase.name} - ${phase.title}
  ${phase.description}

  SYSTEMS:
${systemStatus.join('\n')}

  Type 'diag <system>' for detailed diagnostics.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
  }
}

function handleDiag(
  systemName: string | undefined,
  currentPhase: Phase,
  solvedPuzzles: string[],
  unlockedFiles: string[]
): CommandResult {
  if (!systemName) {
    return {
      type: 'error',
      output: `Usage: diag <system>\nSystems: lifesup, power, storage, nav, comms`
    }
  }

  const sys = systems[systemName]
  if (!sys) {
    return {
      type: 'error',
      output: `Unknown system: ${systemName}\nSystems: lifesup, power, storage, nav, comms`
    }
  }

  const solvedSet = new Set(solvedPuzzles)
  const unlockedSet = new Set(unlockedFiles)

  // Get puzzles for this system
  const systemPuzzles = Object.values(puzzles).filter(p => p.system === systemName)

  if (systemPuzzles.length === 0) {
    return {
      type: 'warning',
      output: `
━━━ ${sys.name} DIAGNOSTICS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  STATUS: OFFLINE
  This system is not yet accessible.
  Complete current phase to unlock.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
    }
  }

  // Build diagnostic output for each puzzle
  const diagnostics: string[] = []
  for (const puzzle of systemPuzzles) {
    const file = gameFiles[puzzle.file]
    const isUnlocked = unlockedSet.has(puzzle.file)
    const isSolved = solvedSet.has(puzzle.id)

    if (!isUnlocked) {
      diagnostics.push(`  ${puzzle.name.toUpperCase()}: [LOCKED]`)
    } else if (isSolved) {
      diagnostics.push(`  ${puzzle.name.toUpperCase()}:\n${puzzle.diagnosticFixed.split('\n').map(l => '    ' + l).join('\n')}`)
    } else {
      diagnostics.push(`  ${puzzle.name.toUpperCase()}:\n${puzzle.diagnostic.split('\n').map(l => '    ' + l).join('\n')}`)
    }
  }

  const allSolved = systemPuzzles.every(p => solvedSet.has(p.id))

  return {
    type: allSolved ? 'success' : 'warning',
    output: `
━━━ ${sys.name} DIAGNOSTICS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${diagnostics.join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
  }
}

function handleFlash(filename: string | undefined): CommandResult {
  if (!filename) {
    return {
      type: 'error',
      output: `Usage: flash <filename>\nExample: flash lifesup/o2_sensor.wire`
    }
  }

  // Normalize the filename
  const file = gameFiles[filename]
  if (!file) {
    return {
      type: 'error',
      output: `File not found: ${filename}`
    }
  }

  return {
    type: 'system',
    output: `Compiling ${filename}...`,
    action: 'flash',
    actionPayload: filename
  }
}

function handleHint(puzzleId: string | undefined, currentPhase: Phase, solvedPuzzles: string[]): CommandResult {
  const solvedSet = new Set(solvedPuzzles)

  // If no puzzle specified, find current unsolved puzzle
  if (!puzzleId) {
    const phasePuzzles = puzzlesByPhase[currentPhase]
    const unsolved = phasePuzzles.find(p => !solvedSet.has(p.id))
    if (unsolved) {
      return {
        type: 'system',
        output: '',
        action: 'show_hint',
        actionPayload: unsolved.id
      }
    } else {
      return {
        type: 'system',
        output: `All puzzles in current phase are solved!`
      }
    }
  }

  const puzzle = puzzles[puzzleId]
  if (!puzzle) {
    return {
      type: 'error',
      output: `Unknown puzzle: ${puzzleId}`
    }
  }

  return {
    type: 'system',
    output: '',
    action: 'show_hint',
    actionPayload: puzzleId
  }
}

function handleOpen(filename: string | undefined, unlockedFiles: string[]): CommandResult {
  if (!filename) {
    return {
      type: 'error',
      output: `Usage: open <filename>\nExample: open lifesup/o2_sensor.wire`
    }
  }

  const file = gameFiles[filename]
  if (!file) {
    return {
      type: 'error',
      output: `File not found: ${filename}`
    }
  }

  if (!unlockedFiles.includes(filename)) {
    return {
      type: 'error',
      output: `File is locked: ${filename}\nComplete current objectives to unlock.`
    }
  }

  return {
    type: 'system',
    output: `Opening ${filename}...`,
    action: 'open_file',
    actionPayload: filename
  }
}

function handleLs(path: string | undefined, unlockedFiles: string[]): CommandResult {
  const unlockedSet = new Set(unlockedFiles)

  if (!path || path === '/') {
    // List all systems
    const lines = Object.entries(systems).map(([key, sys]) => {
      const hasFiles = sys.files.length > 0
      const hasUnlocked = sys.files.some(f => unlockedSet.has(f))
      const status = hasFiles ? (hasUnlocked ? '' : ' [locked]') : ' [offline]'
      return `  ${key}/${status}`
    })
    return {
      type: 'system',
      output: `\n${lines.join('\n')}\n`
    }
  }

  // List files in system
  const sys = systems[path]
  if (!sys) {
    return {
      type: 'error',
      output: `Directory not found: ${path}`
    }
  }

  if (sys.files.length === 0) {
    return {
      type: 'warning',
      output: `System offline: ${path}`
    }
  }

  const lines = sys.files.map(f => {
    const name = f.split('/')[1]
    const locked = !unlockedSet.has(f) ? ' [locked]' : ''
    return `  ${name}${locked}`
  })

  return {
    type: 'system',
    output: `\n${path}/\n${lines.join('\n')}\n`
  }
}

function handleCat(filename: string | undefined, unlockedFiles: string[]): CommandResult {
  if (!filename) {
    return {
      type: 'error',
      output: `Usage: cat <filename>`
    }
  }

  const file = gameFiles[filename]
  if (!file) {
    return {
      type: 'error',
      output: `File not found: ${filename}`
    }
  }

  if (!unlockedFiles.includes(filename)) {
    return {
      type: 'error',
      output: `File is locked: ${filename}`
    }
  }

  return {
    type: 'system',
    output: `\n${file.content}\n`
  }
}
