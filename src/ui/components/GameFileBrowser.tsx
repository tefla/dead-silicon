import { useState } from 'react'
import { useGameStore } from '../../game/useGameStore'
import { buildFileTree, gameFiles, systems } from '../../game/files'
import { puzzles } from '../../game/puzzles'
import { ChevronRight, ChevronDown, FileCode, Lock, Check, AlertCircle, Folder } from 'lucide-react'

interface FileNodeProps {
  name: string
  path: string
  type: 'file' | 'folder'
  locked?: boolean
  children?: FileNodeProps[]
}

function FileNode({ node, depth = 0 }: { node: FileNodeProps; depth?: number }) {
  const [isOpen, setIsOpen] = useState(true)
  const { activeFile, setActiveFile, solvedPuzzles } = useGameStore()

  const file = gameFiles[node.path]
  const puzzle = file?.puzzleId ? puzzles[file.puzzleId] : null
  const isSolved = puzzle ? solvedPuzzles.includes(puzzle.id) : false

  const handleClick = () => {
    if (node.type === 'folder') {
      setIsOpen(!isOpen)
    } else if (!node.locked && file) {
      setActiveFile(node.path, file.content)
    }
  }

  const isActive = activeFile === node.path

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={node.locked && node.type === 'file'}
        className={`w-full text-left text-sm px-2 py-1.5 flex items-center gap-1.5 transition-colors ${
          isActive
            ? 'bg-vscode-accent text-white'
            : node.locked
            ? 'text-gray-600 cursor-not-allowed'
            : 'hover:bg-vscode-border/30 text-vscode-text'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.type === 'folder' ? (
          <>
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Folder size={14} className="text-yellow-500" />
          </>
        ) : (
          <>
            <span className="w-3.5" />
            <FileCode size={14} className={node.locked ? 'text-gray-600' : 'text-blue-400'} />
          </>
        )}

        <span className="truncate flex-1">{node.name}</span>

        {node.type === 'file' && (
          node.locked ? (
            <Lock size={12} className="text-gray-600" />
          ) : isSolved ? (
            <Check size={12} className="text-green-400" />
          ) : puzzle ? (
            <AlertCircle size={12} className="text-yellow-400" />
          ) : null
        )}
      </button>

      {node.type === 'folder' && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function GameFileBrowser() {
  const { unlockedFiles, currentPhase, solvedPuzzles, o2Level, powerLevel } = useGameStore()

  const fileTree = buildFileTree(unlockedFiles)

  // Calculate progress
  const totalPuzzles = Object.keys(puzzles).length
  const solved = solvedPuzzles.length
  const progress = Math.round((solved / totalPuzzles) * 100)

  return (
    <div className="h-full flex flex-col bg-vscode-sidebar">
      {/* Status bar */}
      <div className="p-3 border-b border-vscode-border bg-gray-900">
        <div className="text-xs font-semibold text-vscode-muted uppercase tracking-wide mb-2">
          System Status
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-vscode-muted">O2 Level</span>
            <span className={o2Level < 50 ? 'text-red-400' : 'text-green-400'}>
              {o2Level}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                o2Level < 50 ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{ width: `${o2Level}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-vscode-muted">Power</span>
            <span className={powerLevel < 30 ? 'text-red-400' : 'text-green-400'}>
              {powerLevel}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                powerLevel < 30 ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{ width: `${powerLevel}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-vscode-muted">Progress</span>
            <span className="text-cyan-400">Phase {currentPhase}/6</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 border-b border-vscode-border">
          <div className="text-xs font-semibold text-vscode-muted uppercase tracking-wide">
            Ship Schematics
          </div>
        </div>

        <div className="py-1">
          {fileTree.map((node) => (
            <FileNode key={node.path} node={node as FileNodeProps} />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-vscode-border text-xs text-vscode-muted">
        <div className="flex items-center gap-2 mb-1">
          <Check size={10} className="text-green-400" />
          <span>Fixed</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle size={10} className="text-yellow-400" />
          <span>Damaged</span>
        </div>
        <div className="flex items-center gap-2">
          <Lock size={10} className="text-gray-600" />
          <span>Locked</span>
        </div>
      </div>
    </div>
  )
}
