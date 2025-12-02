# Playground UI Implementation Plan

## Goal
Build a VSCode-like playground UI for Dead Silicon side quests using React, Monaco Editor, and Tailwind CSS.

## User Requirements
- **Framework**: React (with TypeScript)
- **Scope**: Side quests only (Wire/Pulse sandbox)
- **Style**: Modern clean (VSCode-like dark theme)
- **Editor**: Monaco Editor with custom syntax highlighting

---

## Dependencies to Install

```bash
# Core React
npm install react@^18.3.1 react-dom@^18.3.1
npm install -D @types/react@^18.3.12 @types/react-dom@^18.3.1
npm install -D @vitejs/plugin-react

# Monaco Editor
npm install @monaco-editor/react@^4.6.0 monaco-editor@^0.52.0

# Styling
npm install -D tailwindcss@^3.4.17 autoprefixer@^10.4.20 postcss@^8.4.49

# UI Components
npm install @radix-ui/react-tabs@^1.1.1 @radix-ui/react-slider@^1.2.1 lucide-react@^0.460.0

# State Management
npm install zustand@^5.0.2
```

---

## Project Structure

```
src/
├── main.ts                          # Update: render React app
├── ui/
│   ├── App.tsx                      # Root component
│   ├── styles/globals.css           # Tailwind + VSCode colors
│   ├── components/
│   │   ├── Playground.tsx           # Main 3-panel layout
│   │   ├── FileBrowser.tsx          # Left: side quest list
│   │   ├── EditorPanel.tsx          # Center: Monaco wrapper
│   │   ├── SimulationPanel.tsx      # Right: visualization
│   │   ├── ControlBar.tsx           # ▶ Run ⏸ Pause ⏭ Step
│   │   ├── WaveformDisplay.tsx      # ▓░▓░ signal traces
│   │   ├── LEDDisplay.tsx           # Visual LED indicators
│   │   └── RegisterDisplay.tsx      # CPU state (Pulse only)
│   ├── monaco/
│   │   ├── MonacoEditor.tsx         # Editor component
│   │   ├── wire-language.ts         # Wire syntax definition
│   │   ├── pulse-language.ts        # Pulse syntax definition
│   │   └── themes.ts                # VSCode dark theme
│   ├── simulation/
│   │   ├── useSimulation.ts         # Simulation hook with RAF loop
│   │   └── types.ts                 # Simulation types
│   ├── store/
│   │   └── usePlaygroundStore.ts    # Zustand store
│   └── data/
│       └── side-quests.ts           # Quest metadata
```

---

## Configuration Files

### vite.config.ts
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
```

### tsconfig.json
Add: `"jsx": "react-jsx"` to compilerOptions

### tailwind.config.js
```javascript
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        vscode: {
          bg: '#1e1e1e',
          sidebar: '#252526',
          editor: '#1e1e1e',
          panel: '#181818',
          border: '#3e3e42',
          text: '#cccccc',
          accent: '#007acc',
        }
      }
    }
  },
}
```

---

## Core Component Architecture

### 1. Zustand Store (`usePlaygroundStore.ts`)

```typescript
interface PlaygroundStore {
  // File management
  activeFile: string | null
  editorValue: string

  // Simulation state
  simulationMode: 'wire' | 'pulse'
  isRunning: boolean
  speed: number  // 1-100x
  currentCycle: number

  // Wire state
  wireSimulator: Simulator | null
  wireValues: Map<string, number>

  // Pulse state
  pulseCPU: CPU | null
  cpuState: CPUState | null
  ioHandler: SimpleIO

  // Visualization
  waveformHistory: Array<{cycle: number, signals: Map<string, number>}>

  // Actions
  setActiveFile: (file: string) => void
  updateEditorValue: (value: string) => void
  startSimulation: () => void
  pauseSimulation: () => void
  stepSimulation: () => void
  resetSimulation: () => void
}
```

### 2. Simulation Hook (`useSimulation.ts`)

```typescript
// RAF-based animation loop
// Wire: toggle clock, step(), capture getAllWires()
// Pulse: step(), capture cpu.state and io.ledState
// Speed control: execute N steps per frame
// Update store with captured state
```

### 3. Monaco Integration

**Wire Language** - Keywords: `module`, Operators: `->`, `:`, `=`, Comments: `;`
**Pulse Language** - Mnemonics: `LDA`, `STA`, etc., Immediate: `#$FF`, Labels: `loop:`
**Theme** - VSCode dark with syntax highlighting colors

### 4. Layout (`Playground.tsx`)

```
┌───────────────────────────────────────────────────────────┐
│  Dead Silicon Playground                                  │
├───────────┬───────────────────────┬───────────────────────┤
│ FILES     │ EDITOR                │ SIMULATION            │
│           │                       │                       │
│ Blinker ◀ │ module blinker(clk)   │ ┌─ Waveform ───────┐ │
│ Counter   │   led = dff(not(led)) │ │ CLK: ▓░▓░▓░▓░▓░  │ │
│ ALU       │                       │ │ LED: ░▓░▓░▓░▓░▓░ │ │
│           │                       │ └──────────────────┘ │
│           │                       │ ┌─ Controls ───────┐ │
│           │                       │ │ ▶ ⏸ ⏭  Speed: ═●│ │
│           │                       │ └──────────────────┘ │
└───────────┴───────────────────────┴───────────────────────┘
```

---

## Simulator Integration Points

### Wire Simulator
```typescript
import { createSimulator } from '@/wire/simulator'

const result = createSimulator(source, mainModule)
if (result.ok) {
  const sim = result.simulator
  sim.setInput('clk', cycle % 2)  // Auto-toggle clock
  sim.step()
  const values = sim.getAllWires()  // For waveform
  const led = sim.getOutput('led')   // For LED display
}
```

### Pulse CPU
```typescript
import { assemble } from '@/pulse/assembler'
import { CPU, SimpleIO } from '@/fpga/cpu'
import { createMemory } from '@/fpga/memory'

const result = assemble(source)
const memory = createMemory()
const io = new SimpleIO()
const cpu = new CPU(memory, io)

// Load program
for (let i = 0; i < result.program.binary.length; i++) {
  memory[result.program.origin + i] = result.program.binary[i]
}

cpu.reset()
cpu.step()  // Execute one instruction

// Read state
console.log(cpu.state.A, cpu.state.PC)
console.log(io.ledState)  // LED at 0xF030
```

---

## Implementation Phases

### Phase 1: Foundation (Days 1-2)
- [ ] Install dependencies
- [ ] Configure Vite + React + Tailwind
- [ ] Create component structure
- [ ] Build static 3-panel layout
- [ ] Implement Zustand store skeleton

**Deliverable:** Empty UI shell with VSCode styling

### Phase 2: File Browser + Monaco (Days 2-4)
- [ ] Create side quest data (`side-quests.ts`)
- [ ] Build FileBrowser component with quest list
- [ ] Integrate Monaco Editor with React wrapper
- [ ] Implement Wire language definition
- [ ] Implement Pulse language definition
- [ ] Connect editor to store

**Deliverable:** Syntax-highlighted editor loading example files

### Phase 3: Wire Simulation (Days 4-6)
- [ ] Implement useSimulation hook
- [ ] Integrate Wire simulator (createSimulator)
- [ ] Add Run/Pause/Step controls
- [ ] Build LEDDisplay component (visual circle)
- [ ] Build WaveformDisplay (ASCII ▓░ traces)
- [ ] Implement RAF animation loop

**Deliverable:** Can run Wire code, see LED blink in waveform

### Phase 4: Pulse Simulation (Days 6-8)
- [ ] Integrate Pulse assembler
- [ ] Create CPU instance with I/O handler
- [ ] Build RegisterDisplay component (A, X, Y, SP, PC, flags)
- [ ] Handle CPU halt state
- [ ] Switch simulation mode based on file type

**Deliverable:** Can run Pulse code, see registers update

### Phase 5: Polish (Days 8-9)
- [ ] Add speed slider (1x-100x)
- [ ] Implement reset functionality
- [ ] Add error handling (compile errors)
- [ ] Add loading states
- [ ] Keyboard shortcuts (F5=run, F10=step)
- [ ] Responsive layout tweaks

**Deliverable:** Production-ready playground

---

## Key Technical Decisions

1. **Monaco Code Splitting**: @monaco-editor/react handles automatic lazy loading (~2MB)
2. **Animation Loop**: requestAnimationFrame at 60 FPS, execute multiple steps per frame for speed control
3. **Waveform Rendering**: ASCII art (▓░) in monospace text, rolling 100-cycle window
4. **Clock Handling**: Auto-toggle Wire clock input on each step: `setInput('clk', cycle % 2)`
5. **Error Handling**: Catch compile errors from createSimulator/assemble, show in simulation panel

---

## Critical Files

1. **`src/ui/store/usePlaygroundStore.ts`** - Central state (file selection, simulation state, visualization)
2. **`src/ui/simulation/useSimulation.ts`** - Simulation integration with RAF loop
3. **`src/ui/monaco/MonacoEditor.tsx`** - Editor wrapper with language registration
4. **`src/ui/components/Playground.tsx`** - Main layout orchestrating all panels
5. **`src/main.ts`** - Update to render React app instead of console.log

---

## Testing Strategy

### Unit Tests
- Component rendering (FileBrowser, ControlBar, LEDDisplay)
- Store actions (Zustand)
- Simulation integration (mock simulator APIs)

### Integration Tests
- Load Wire file → compile → run → observe waveform
- Load Pulse file → assemble → run → observe registers
- Switch between Wire/Pulse modes

### Manual Testing
- [ ] Load blinker.wire, see LED blink in waveform
- [ ] Load led_demo.pulse, see registers update
- [ ] Speed control 1x to 100x works smoothly
- [ ] Step-by-step execution
- [ ] Error messages for invalid code
- [ ] Reset clears state

---

## Out of Scope (Future)

- Story mode UI
- Save/load functionality
- Multiple open files with tabs
- Breakpoint debugging
- Mobile responsive
- Export waveforms
- Share playground links
