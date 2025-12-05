import { useEffect, useState } from 'react'
import { useGameStore } from '../../game/useGameStore'
import { GameConsole } from './GameConsole'
import { GameFileBrowser } from './GameFileBrowser'
import { GameEditor } from './GameEditor'
import { Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'

export function Game() {
  const { gameStarted, startGame, resetGame, currentPhase, solvedPuzzles } = useGameStore()
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)

  // Start game on first mount if not started
  useEffect(() => {
    if (!gameStarted) {
      // Small delay for dramatic effect
      const timer = setTimeout(() => {
        startGame()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [gameStarted, startGame])

  const handleReset = () => {
    if (showResetConfirm) {
      resetGame()
      setShowResetConfirm(false)
      // Restart the game
      setTimeout(() => startGame(), 100)
    } else {
      setShowResetConfirm(true)
      setTimeout(() => setShowResetConfirm(false), 3000)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Top bar */}
      <div className="h-10 bg-gray-900 border-b border-gray-800 flex items-center px-4 justify-between">
        <div className="flex items-center gap-4">
          <span className="text-green-400 font-mono text-sm font-bold tracking-wider">
            CYGNUS-7
          </span>
          <span className="text-gray-500 text-xs">
            Phase {currentPhase}/6 • {solvedPuzzles.length} repairs completed
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
            title={audioEnabled ? 'Mute' : 'Unmute'}
          >
            {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <button
            onClick={handleReset}
            className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
              showResetConfirm
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            title="Reset game progress"
          >
            <RotateCcw size={12} />
            {showResetConfirm ? 'Click again to confirm' : 'Reset'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - File browser */}
        <div className="w-56 border-r border-gray-800 overflow-hidden">
          <GameFileBrowser />
        </div>

        {/* Center - Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <GameEditor />
        </div>

        {/* Right panel - Console */}
        <div className="w-96 border-l border-gray-800 overflow-hidden">
          <GameConsole />
        </div>
      </div>
    </div>
  )
}

// Intro screen shown before game starts
export function GameIntro({ onStart }: { onStart: () => void }) {
  const [showStart, setShowStart] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowStart(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="h-full flex flex-col items-center justify-center bg-black text-green-400 font-mono">
      <div className="text-center max-w-xl px-8">
        <h1 className="text-4xl font-bold mb-8 animate-pulse">
          DEAD SILICON
        </h1>

        <div className="text-left text-sm leading-relaxed mb-8 opacity-80">
          <p className="mb-4">
            <span className="text-cyan-400">1973. An alternate timeline.</span>
          </p>
          <p className="mb-4">
            You're the systems engineer aboard Cygnus-7, a deep space survey mission.
            Something went wrong during orbital insertion. You crashed.
          </p>
          <p className="mb-4">
            The pilot is unconscious. Life support is failing.
            The onboard guidance computer took damage in the impact.
          </p>
          <p className="text-yellow-400">
            You're not a pilot. You're an engineer.
            And this is exactly what you trained for.
          </p>
        </div>

        {showStart && (
          <button
            onClick={onStart}
            className="px-6 py-3 bg-green-500/20 border border-green-500 text-green-400 rounded hover:bg-green-500/30 transition-colors flex items-center gap-2 mx-auto"
          >
            <Play size={18} />
            Begin Mission
          </button>
        )}
      </div>

      <div className="absolute bottom-4 text-xs text-gray-600">
        LangJam 2025 • Created with Wire & Pulse
      </div>
    </div>
  )
}
