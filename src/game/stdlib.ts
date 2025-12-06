// Standard library loader for game puzzles
// Uses the existing Wire HDL stdlib from assets

import gatesWire from '../assets/wire/gates.wire?raw'
import arithmeticWire from '../assets/wire/arithmetic.wire?raw'
import registersWire from '../assets/wire/registers.wire?raw'

// Combined stdlib for use in puzzles
export const stdlib = gatesWire + '\n' + arithmeticWire + '\n' + registersWire

// Re-export individual modules if needed
export { gatesWire, arithmeticWire, registersWire }
