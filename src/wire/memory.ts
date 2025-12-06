// Memory Map and I/O Ports for CPU simulation
// Defines address ranges and I/O ports used by cpu_minimal.wire

export const MEMORY_MAP = {
  // RAM regions
  ZERO_PAGE: { start: 0x0000, end: 0x00FF },
  STACK: { start: 0x0100, end: 0x01FF },
  RAM: { start: 0x0200, end: 0x0FFF },
  FS_BUFFER: { start: 0x1000, end: 0x1FFF },

  // Display (32x32 characters)
  DISPLAY: { start: 0x8000, end: 0x83FF },

  // I/O ports
  IO: { start: 0xF000, end: 0xF0FF },

  // ROM (boot + firmware)
  ROM: { start: 0xFF00, end: 0xFFFF },
} as const

// I/O port addresses
export const IO_PORTS = {
  // Serial
  SERIAL_RX: 0xF000,
  SERIAL_TX: 0xF001,
  SERIAL_STATUS: 0xF002,

  // Storage
  STORAGE_CMD: 0xF010,
  STORAGE_STATUS: 0xF011,

  // Crypto
  CRYPTO_IN: 0xF020,
  CRYPTO_OUT: 0xF021,

  // LED (for side quest)
  LED: 0xF030,
} as const

// CPU vectors
export const VECTORS = {
  NMI: 0xFFFA,
  RESET: 0xFFFC,
  IRQ: 0xFFFE,
} as const

// Check if address is in I/O range
export function isIOAddress(addr: number): boolean {
  return addr >= MEMORY_MAP.IO.start && addr <= MEMORY_MAP.IO.end
}

// Check if address is in ROM range
export function isROMAddress(addr: number): boolean {
  return addr >= MEMORY_MAP.ROM.start && addr <= MEMORY_MAP.ROM.end
}

// 64KB memory array
export function createMemory(): Uint8Array {
  return new Uint8Array(0x10000)
}
