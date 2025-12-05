// Puzzle definitions for Dead Silicon
import type { Puzzle, Phase } from './types'

// Phase 1: Life Support - Easy/Tutorial puzzles
const o2Sensor: Puzzle = {
  id: 'o2_sensor',
  name: 'O2 Sensor',
  file: 'lifesup/o2_sensor.wire',
  language: 'wire',
  phase: 1,
  system: 'lifesup',
  description: 'Oxygen level sensor - reads O2 tank pressure',
  diagnostic: `O2 SENSOR: FAIL - bit 7 stuck low
  Current reading: 47%
  Expected reading: ~94%
  Note: Reading appears to be exactly half of expected`,
  diagnosticFixed: `O2 SENSOR: OK
  Current reading: 94%
  Tank pressure: NOMINAL`,
  hint: `The sensor is reading exactly half the correct value.
In binary, that means the highest bit (bit 7) is being lost.
Check the bit slice - is it capturing all 8 bits?`,
  validation: {
    type: 'output',
    testCases: [
      { inputs: { analog: 0b11111111, clk: 1 }, expectedOutputs: { level: 0b11111111 } },
      { inputs: { analog: 0b10000000, clk: 1 }, expectedOutputs: { level: 0b10000000 } },
      { inputs: { analog: 0b01011110, clk: 1 }, expectedOutputs: { level: 0b01011110 } }, // 94
    ]
  }
}

const co2Scrubber: Puzzle = {
  id: 'co2_scrubber',
  name: 'CO2 Scrubber Controller',
  file: 'lifesup/co2_scrubber.wire',
  language: 'wire',
  phase: 1,
  system: 'lifesup',
  description: 'CO2 scrubber activation controller',
  diagnostic: `CO2 SCRUBBER: FAIL - threshold comparison inverted
  CO2 level: 3%
  Threshold: 5%
  Scrubber should be OFF but is ON
  Note: Scrubber activates when it shouldn't`,
  diagnosticFixed: `CO2 SCRUBBER: OK
  CO2 level: 3%
  Threshold: 5%
  Scrubber: STANDBY (will activate at 5%)`,
  hint: `The scrubber turns ON when CO2 is BELOW threshold, but it should
turn ON when CO2 is ABOVE threshold. Look at the comparison - is it
checking greater-than or less-than?`,
  validation: {
    type: 'output',
    testCases: [
      // CO2 at 3%, threshold 5% -> scrubber OFF
      { inputs: { co2_level: 3, threshold: 5 }, expectedOutputs: { scrubber_on: 0 } },
      // CO2 at 6%, threshold 5% -> scrubber ON
      { inputs: { co2_level: 6, threshold: 5 }, expectedOutputs: { scrubber_on: 1 } },
      // CO2 at 5%, threshold 5% -> scrubber ON (at threshold)
      { inputs: { co2_level: 5, threshold: 5 }, expectedOutputs: { scrubber_on: 1 } },
    ]
  }
}

// Phase 2: Power Systems - Medium difficulty
const solarController: Puzzle = {
  id: 'solar_ctrl',
  name: 'Solar Panel Controller',
  file: 'power/solar_ctrl.wire',
  language: 'wire',
  phase: 2,
  system: 'power',
  description: 'Solar panel charging controller',
  diagnostic: `SOLAR CONTROLLER: FAIL - charge never enables
  Light level: 200
  Threshold: 50
  Charge enable: OFF (should be ON)
  Note: Subtraction appears broken`,
  diagnosticFixed: `SOLAR CONTROLLER: OK
  Light level: 200
  Threshold: 50
  Charge enable: ON
  Charging at 85% efficiency`,
  hint: `Two's complement subtraction requires adding the inverted value
plus 1. The carry-in to the adder should be 1, not 0.
A - B = A + (~B) + 1`,
  validation: {
    type: 'output',
    testCases: [
      { inputs: { light_level: 200, threshold: 50 }, expectedOutputs: { charge_enable: 1 } },
      { inputs: { light_level: 50, threshold: 200 }, expectedOutputs: { charge_enable: 0 } },
      { inputs: { light_level: 100, threshold: 100 }, expectedOutputs: { charge_enable: 1 } },
    ]
  }
}

const batteryMonitor: Puzzle = {
  id: 'battery_mon',
  name: 'Battery Monitor',
  file: 'power/battery_mon.wire',
  language: 'wire',
  phase: 2,
  system: 'power',
  description: 'Battery level monitoring circuit',
  diagnostic: `BATTERY MONITOR: FAIL - ADC timing error
  Raw ADC: unstable
  Filtered value: 0x00
  Note: Data captured before ADC settles`,
  diagnosticFixed: `BATTERY MONITOR: OK
  Raw ADC: 0xB8
  Filtered value: 0xB8
  Battery: 72%`,
  hint: `The data latch captures the ADC output on the clock edge, but the
ADC needs time to settle. Add a delay between the read strobe and
the latch clock.`,
  validation: {
    type: 'output',
    testCases: [
      { inputs: { adc_data: 0xB8, clk: 1 }, expectedOutputs: { level: 0xB8 }, cycles: 3 },
    ]
  }
}

// Phase 3: Storage/Flight Recorder - Medium difficulty
const flashController: Puzzle = {
  id: 'flash_ctrl',
  name: 'Flash Memory Controller',
  file: 'storage/flash_ctrl.wire',
  language: 'wire',
  phase: 3,
  system: 'storage',
  description: 'Flash memory read/write controller',
  diagnostic: `FLASH CONTROLLER: FAIL - read data corrupt
  Address: 0x0000
  Expected: 0x43 ('C')
  Actual: 0x00
  Note: Read strobe too short, data not captured`,
  diagnosticFixed: `FLASH CONTROLLER: OK
  Address: 0x0000
  Data: 0x43 ('C')
  Read: SUCCESS`,
  hint: `The flash memory needs the read strobe held for at least 2 clock
cycles to output valid data. The current design only holds it for 1
cycle.`,
  validation: {
    type: 'output',
    testCases: [
      { inputs: { addr: 0, read_en: 1, clk: 1 }, expectedOutputs: { valid: 1 }, cycles: 3 },
    ]
  }
}

// All puzzles organized by phase
export const puzzles: Record<string, Puzzle> = {
  o2_sensor: o2Sensor,
  co2_scrubber: co2Scrubber,
  solar_ctrl: solarController,
  battery_mon: batteryMonitor,
  flash_ctrl: flashController,
}

export const puzzlesByPhase: Record<Phase, Puzzle[]> = {
  1: [o2Sensor, co2Scrubber],
  2: [solarController, batteryMonitor],
  3: [flashController],
  4: [], // Navigation - to be added
  5: [], // Communications - to be added
  6: [], // Final choice - to be added
}

export function getPuzzlesForPhase(phase: Phase): Puzzle[] {
  return puzzlesByPhase[phase] || []
}

export function isPuzzleSolved(puzzleId: string, solvedPuzzles: Set<string>): boolean {
  return solvedPuzzles.has(puzzleId)
}

export function isPhaseComplete(phase: Phase, solvedPuzzles: Set<string>): boolean {
  const phasePuzzles = puzzlesByPhase[phase]
  return phasePuzzles.every(p => solvedPuzzles.has(p.id))
}
