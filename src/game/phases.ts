// Phase definitions and narrative for Dead Silicon
import type { GamePhase, Phase, CrewLog } from './types'

export const phases: Record<Phase, GamePhase> = {
  1: {
    id: 1,
    name: 'IMMEDIATE',
    title: 'Life Support Critical',
    description: 'O2 running low. CO2 scrubber offline. Fix life support or suffocate.',
    survivalTime: '4 hours',
    systems: ['lifesup'],
    puzzles: ['o2_sensor', 'co2_scrubber'],
    storyIntro: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    CYGNUS-7 DIAGNOSTIC TERMINAL
                         EMERGENCY BOOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SYSTEM STATUS: CRITICAL
━━━━━━━━━━━━━━

You wake to the sound of alarms. Red emergency lights pulse.
The pilot is slumped in her chair, unconscious but breathing.

Your portable diagnostic terminal flickers to life. The umbilical
connection to the ship's main computer is intact, but something
is very wrong.

LIFE SUPPORT: WARNING
  O2 SENSOR: MALFUNCTION (reading 47%)
  CO2 SCRUBBER: OFFLINE

You know that O2 tank was 94% full at launch. The sensor is wrong.
And without valid sensor data, the CO2 scrubber won't activate.

You have approximately 4 hours of breathable air.

Type 'help' for commands. Type 'diag lifesup' to diagnose.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
    storyComplete: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                      LIFE SUPPORT RESTORED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The scrubber hums to life. Fresh, clean air flows through the vents.
You can breathe again.

O2 SENSOR: OK (94%)
CO2 SCRUBBER: ONLINE
ATMOSPHERE: NOMINAL
Estimated O2: 4+ hours (scrubber compensating)

The pilot stirs but doesn't wake. You need to figure out what
happened. But first - the ship is running on backup power only.
Solar panels should be charging but aren't.

New systems unlocked: POWER

Type 'diag power' to check power systems.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
  },
  2: {
    id: 2,
    name: 'STABILIZE',
    title: 'Power Failing',
    description: 'Running on backup battery. Solar charging offline. Get power restored.',
    survivalTime: '8 hours',
    systems: ['power'],
    puzzles: ['solar_ctrl', 'battery_mon'],
    storyIntro: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                         PHASE 2: STABILIZE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POWER STATUS: WARNING
  SOLAR CONTROLLER: MALFUNCTION
  BATTERY: 62% (depleting)
  Estimated power: 8 hours

The external cameras flicker on briefly. Through the static, you
catch a glimpse of the surface below.

Wait... is that a structure? The moon was supposed to be barren.
The image cuts out before you can be sure.

You need to stabilize power to get a better look.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
    storyComplete: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                       POWER SYSTEMS RESTORED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Solar panels unfold toward the distant sun. Power flows back into
the ship's systems.

SOLAR: ONLINE (charging)
BATTERY: 72% (rising)
POWER: STABLE

The external cameras come back online. You zoom in on the surface
below. There's definitely something there. Geometric. Too regular
to be natural.

What is that?

The flight recorder might have answers. The crash must have been
logged. But the storage system is showing errors...

New systems unlocked: STORAGE

Type 'diag storage' to check storage systems.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
  },
  3: {
    id: 3,
    name: 'UNDERSTAND',
    title: 'What Happened?',
    description: 'Flight recorder corrupted. Fix storage to learn what went wrong.',
    survivalTime: 'stable',
    systems: ['storage'],
    puzzles: ['flash_ctrl'],
    storyIntro: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                        PHASE 3: UNDERSTAND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STORAGE STATUS: ERROR
  FLASH CONTROLLER: READ FAILURE
  FLIGHT RECORDER: 47 entries (unreadable)

You need to know what happened. Why did you crash? Why are you
here, orbiting an uncharted moon? The mission plan had you
surveying an asteroid belt, not... this.

The flight recorder has the answers. But the flash memory
controller is damaged.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`,
    storyComplete: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                     FLIGHT RECORDER RESTORED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Data streams across your screen. The crew logs...

ENTRY 44 [T+70:14:22]:
PILOT: "There's that sensor ghost again."
NAV: "I'm logging it. Bearing 047, range indeterminate."
ENG: "Guidance computer accepted an unscheduled correction."
PILOT: "What? I didn't authorize that."

ENTRY 47 [T+72:14:33] - FINAL ENTRY:
PILOT: "Sensor ghost again. It's moving with us."
NAV: "Adjusting trajectory to compensate for drift."
ENG: "Guidance computer is... I'm seeing unauthorized writes to—"
[END OF LOG]

The crash wasn't an accident.
Something took control of your ship.

New systems unlocked: NAVIGATION

Type 'diag nav' to check navigation systems.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
  },
  4: {
    id: 4,
    name: 'ORIENT',
    title: 'Where Are You?',
    description: 'Navigation offline. Star tracker damaged. Figure out your location.',
    survivalTime: 'stable',
    systems: ['nav'],
    puzzles: [],
    storyIntro: `Navigation systems damaged. Star tracker showing impossible readings.`,
    storyComplete: `You're not where you should be. The guidance computer brought you here deliberately.`
  },
  5: {
    id: 5,
    name: 'CONTACT',
    title: 'The Signal',
    description: 'Radio systems damaged. Something is broadcasting.',
    survivalTime: 'stable',
    systems: ['comms'],
    puzzles: [],
    storyIntro: `There's a signal. It's been broadcasting for a very long time.`,
    storyComplete: `The signal is instructions. For repairing something. It's been waiting.`
  },
  6: {
    id: 6,
    name: 'DECIDE',
    title: 'The Choice',
    description: 'All systems restored. What will you do?',
    survivalTime: 'stable',
    systems: [],
    puzzles: [],
    storyIntro: `The ship is functional. You have a choice to make.`,
    storyComplete: `[Game Complete]`
  }
}

export const crewLogs: CrewLog[] = [
  { id: 1, timestamp: 'T+00:00:00', content: 'Mission start. All systems nominal. Crew: Chen (ENG), Reyes (PILOT), Park (NAV).', phase: 3 },
  { id: 10, timestamp: 'T+24:00:00', content: 'First day complete. Smooth sailing toward survey zone.', phase: 3 },
  { id: 20, timestamp: 'T+48:00:00', content: 'Halfway point. Reyes is teaching Park poker. She\'s winning.', phase: 3 },
  { id: 41, timestamp: 'T+70:14:22', content: 'Sensor anomaly detected. Logging for analysis. Probably nothing.', phase: 3 },
  { id: 42, timestamp: 'T+70:31:07', content: 'Second anomaly. Same bearing. Is it... moving with us?', phase: 3 },
  { id: 43, timestamp: 'T+71:02:14', content: 'Guidance computer accepted unscheduled course correction. I didn\'t authorize that. Running diagnostics.', phase: 3 },
  { id: 44, timestamp: 'T+71:18:55', content: 'Diagnostics inconclusive. Guidance computer insists correction was valid. We\'re off the mission plan.', phase: 3 },
  { id: 45, timestamp: 'T+72:03:41', content: 'We\'re not on the planned trajectory. Not even close. Where is it taking us?', phase: 3 },
  { id: 46, timestamp: 'T+72:11:12', content: 'Full diagnostic on guidance computer. Something is in there. Code that I didn\'t write.', phase: 3 },
  { id: 47, timestamp: 'T+72:14:33', content: 'I\'m seeing unauthorized writes to nav memory. It\'s rewriting our destination. The sensor ghost—it\'s—', phase: 3 },
]

export function getPhase(phaseId: Phase): GamePhase {
  return phases[phaseId]
}

export function getNextPhase(currentPhase: Phase): Phase | null {
  if (currentPhase >= 6) return null
  return (currentPhase + 1) as Phase
}

export function getCrewLogsForPhase(phase: Phase): CrewLog[] {
  return crewLogs.filter(log => log.phase <= phase)
}
