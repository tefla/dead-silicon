import { sideQuests } from '../data/side-quests'
import { usePlaygroundStore } from '../store/usePlaygroundStore'
import { FileCode } from 'lucide-react'

// Import example files
import blinkerWire from '../../assets/wire/blinker.wire?raw'
import counterWire from '../../assets/wire/counter.wire?raw'
import aluTestWire from '../../assets/wire/alu_test.wire?raw'
import ledDemoPulse from '../../assets/pulse/led_demo.pulse?raw'
import bootPulse from '../../assets/pulse/boot.pulse?raw'

const fileContents: Record<string, string> = {
  'blinker.wire': blinkerWire,
  'counter.wire': counterWire,
  'alu_test.wire': aluTestWire,
  'led_demo.pulse': ledDemoPulse,
  'boot.pulse': bootPulse,
}

export function FileBrowser() {
  const { activeFile, setActiveFile } = usePlaygroundStore()

  const handleFileClick = (filename: string, language: 'wire' | 'pulse') => {
    const content = fileContents[filename] || '// File not found'
    setActiveFile(filename, language, content)
  }

  return (
    <div className="p-4">
      <h2 className="text-xs font-semibold mb-4 text-vscode-muted uppercase tracking-wide">
        Playground
      </h2>

      <div className="space-y-4">
        {sideQuests.map((quest) => (
          <div key={quest.id} className="space-y-1">
            <div className="text-xs font-semibold text-vscode-muted mb-1">
              {quest.title}
            </div>

            {quest.files.wire && (
              <button
                onClick={() => handleFileClick(quest.files.wire!, 'wire')}
                className={`w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-2 transition-colors ${
                  activeFile === quest.files.wire
                    ? 'bg-vscode-accent text-white'
                    : 'hover:bg-vscode-border/30 text-vscode-text'
                }`}
              >
                <FileCode size={14} />
                <span className="truncate">{quest.files.wire}</span>
              </button>
            )}

            {quest.files.pulse && (
              <button
                onClick={() => handleFileClick(quest.files.pulse!, 'pulse')}
                className={`w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-2 transition-colors ${
                  activeFile === quest.files.pulse
                    ? 'bg-vscode-accent text-white'
                    : 'hover:bg-vscode-border/30 text-vscode-text'
                }`}
              >
                <FileCode size={14} />
                <span className="truncate">{quest.files.pulse}</span>
              </button>
            )}

            <div className="text-xs text-vscode-muted pl-2 py-1">
              {quest.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
