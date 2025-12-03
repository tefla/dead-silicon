export interface SideQuest {
  id: string
  title: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  files: {
    wire?: string  // filename in assets/wire/
    pulse?: string // filename in assets/pulse/
  }
  description: string
}

export const sideQuests: SideQuest[] = [
  {
    id: 'blinker',
    title: 'Blinking LED',
    difficulty: 'Beginner',
    files: {
      wire: 'blinker.wire',
      pulse: 'led_demo.pulse',
    },
    description: 'Make an LED blink on and off at a visible rate',
  },
  {
    id: 'counter',
    title: 'Binary Counter',
    difficulty: 'Intermediate',
    files: {
      wire: 'counter.wire',
    },
    description: 'Display a counting binary number on 8 LEDs',
  },
  {
    id: 'alu',
    title: 'Simple ALU',
    difficulty: 'Intermediate',
    files: {
      wire: 'alu_test.wire',
    },
    description: 'Build an ALU that can ADD, SUB, AND, OR, XOR',
  },
  {
    id: 'boot',
    title: 'Boot Sequence',
    difficulty: 'Advanced',
    files: {
      pulse: 'boot.pulse',
    },
    description: 'FPGA boot firmware with shell - press Run to boot!',
  },
]
