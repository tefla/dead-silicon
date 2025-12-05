// Game file management for Dead Silicon

// Import puzzle files as raw text
import o2Sensor from '../assets/game/lifesup/o2_sensor.wire?raw'
import o2SensorFixed from '../assets/game/lifesup/o2_sensor_fixed.wire?raw'
import co2Scrubber from '../assets/game/lifesup/co2_scrubber.wire?raw'
import co2ScrubberFixed from '../assets/game/lifesup/co2_scrubber_fixed.wire?raw'
import solarCtrl from '../assets/game/power/solar_ctrl.wire?raw'
import batteryMon from '../assets/game/power/battery_mon.wire?raw'
import flashCtrl from '../assets/game/storage/flash_ctrl.wire?raw'

export interface GameFile {
  path: string
  content: string
  fixedContent?: string  // The correct solution (for validation)
  puzzleId?: string      // Associated puzzle ID
  system: string
  description: string
}

// All game files organized by path
export const gameFiles: Record<string, GameFile> = {
  'lifesup/o2_sensor.wire': {
    path: 'lifesup/o2_sensor.wire',
    content: o2Sensor,
    fixedContent: o2SensorFixed,
    puzzleId: 'o2_sensor',
    system: 'lifesup',
    description: 'O2 level sensor interface'
  },
  'lifesup/co2_scrubber.wire': {
    path: 'lifesup/co2_scrubber.wire',
    content: co2Scrubber,
    fixedContent: co2ScrubberFixed,
    puzzleId: 'co2_scrubber',
    system: 'lifesup',
    description: 'CO2 scrubber controller'
  },
  'power/solar_ctrl.wire': {
    path: 'power/solar_ctrl.wire',
    content: solarCtrl,
    puzzleId: 'solar_ctrl',
    system: 'power',
    description: 'Solar panel controller'
  },
  'power/battery_mon.wire': {
    path: 'power/battery_mon.wire',
    content: batteryMon,
    puzzleId: 'battery_mon',
    system: 'power',
    description: 'Battery monitor'
  },
  'storage/flash_ctrl.wire': {
    path: 'storage/flash_ctrl.wire',
    content: flashCtrl,
    puzzleId: 'flash_ctrl',
    system: 'storage',
    description: 'Flash memory controller'
  }
}

// System info for diagnostics
export const systems: Record<string, { name: string; files: string[] }> = {
  lifesup: {
    name: 'LIFE SUPPORT',
    files: ['lifesup/o2_sensor.wire', 'lifesup/co2_scrubber.wire']
  },
  power: {
    name: 'POWER SYSTEMS',
    files: ['power/solar_ctrl.wire', 'power/battery_mon.wire']
  },
  storage: {
    name: 'DATA STORAGE',
    files: ['storage/flash_ctrl.wire']
  },
  nav: {
    name: 'NAVIGATION',
    files: []
  },
  comms: {
    name: 'COMMUNICATIONS',
    files: []
  }
}

export function getFile(path: string): GameFile | undefined {
  return gameFiles[path]
}

export function getFilesForSystem(system: string): GameFile[] {
  return (systems[system]?.files || [])
    .map(path => gameFiles[path])
    .filter(Boolean)
}

export function getAllSystems(): string[] {
  return Object.keys(systems)
}

// File tree structure for the file browser
export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileTreeNode[]
  locked?: boolean
}

export function buildFileTree(unlockedFiles: string[]): FileTreeNode[] {
  const unlockedSet = new Set(unlockedFiles)
  const tree: FileTreeNode[] = []

  // Group files by system
  const systemGroups: Record<string, string[]> = {}
  for (const path of Object.keys(gameFiles)) {
    const system = path.split('/')[0]
    if (!systemGroups[system]) {
      systemGroups[system] = []
    }
    systemGroups[system].push(path)
  }

  // Build tree
  for (const [system, files] of Object.entries(systemGroups)) {
    const systemInfo = systems[system]
    const children: FileTreeNode[] = files.map(path => ({
      name: path.split('/')[1],
      path,
      type: 'file' as const,
      locked: !unlockedSet.has(path)
    }))

    tree.push({
      name: systemInfo?.name || system,
      path: system,
      type: 'folder',
      children
    })
  }

  return tree
}
