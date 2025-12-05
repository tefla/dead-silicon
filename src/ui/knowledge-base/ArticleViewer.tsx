import { useState } from 'react'
import type { Article, Category, CodeExample } from './types'
import { getArticleById } from './articles'

interface ArticleViewerProps {
  article: Article
  category: Category
  onOpenExample?: (code: string, language: 'wire' | 'pulse') => void
  onNavigate: (articleId: string) => void
  onNext?: () => void
  onPrevious?: () => void
}

export function ArticleViewer({
  article,
  category,
  onOpenExample,
  onNavigate,
  onNext,
  onPrevious
}: ArticleViewerProps) {
  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-vscode-text-muted mb-4">
        <span>{category.emoji} {category.title}</span>
        <span>/</span>
        <span className="text-vscode-text">{article.title}</span>
      </div>

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{article.emoji}</span>
          <h1 className="text-3xl font-bold">{article.title}</h1>
        </div>
        <p className="text-lg text-vscode-text-muted">{article.summary}</p>
        {article.difficulty && (
          <div className="mt-3">
            <DifficultyTag difficulty={article.difficulty} />
          </div>
        )}
      </header>

      {/* Table of Contents */}
      {article.sections.length > 1 && (
        <nav className="mb-8 p-4 bg-vscode-sidebar rounded-lg border border-vscode-border">
          <h2 className="text-sm font-medium uppercase text-vscode-text-muted mb-2">
            In This Article
          </h2>
          <ul className="space-y-1">
            {article.sections.map(section => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-vscode-accent hover:underline text-sm"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Sections */}
      <div className="space-y-10">
        {article.sections.map(section => (
          <section key={section.id} id={section.id}>
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-vscode-border">
              {section.title}
            </h2>
            <div className="prose prose-invert max-w-none">
              <MarkdownContent content={section.content} />
            </div>
            {section.examples && section.examples.length > 0 && (
              <div className="mt-6 space-y-4">
                {section.examples.map(example => (
                  <InteractiveExample
                    key={example.id}
                    example={example}
                    onOpen={onOpenExample}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Related Articles */}
      {article.relatedArticles && article.relatedArticles.length > 0 && (
        <div className="mt-12 p-6 bg-vscode-sidebar rounded-lg border border-vscode-border">
          <h2 className="text-lg font-medium mb-4">Related Articles</h2>
          <div className="grid grid-cols-2 gap-3">
            {article.relatedArticles.map(articleId => {
              const related = getArticleById(articleId)
              if (!related) return null
              return (
                <button
                  key={articleId}
                  onClick={() => onNavigate(articleId)}
                  className="p-3 bg-vscode-bg rounded border border-vscode-border hover:border-vscode-accent transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span>{related.article.emoji}</span>
                    <span className="font-medium">{related.article.title}</span>
                  </div>
                  <div className="text-xs text-vscode-text-muted mt-1 truncate">
                    {related.article.summary}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 pt-8 border-t border-vscode-border flex justify-between">
        {onPrevious ? (
          <button
            onClick={onPrevious}
            className="flex items-center gap-2 text-vscode-accent hover:underline"
          >
            <span>←</span>
            <span>Previous Article</span>
          </button>
        ) : (
          <div />
        )}
        {onNext && (
          <button
            onClick={onNext}
            className="flex items-center gap-2 text-vscode-accent hover:underline"
          >
            <span>Next Article</span>
            <span>→</span>
          </button>
        )}
      </div>
    </div>
  )
}

// Simple markdown renderer
function MarkdownContent({ content }: { content: string }) {
  // Process markdown to HTML-like elements
  const lines = content.trim().split('\n')
  const elements: JSX.Element[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Headers
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={i} className="text-lg font-semibold mt-6 mb-3">
          {line.slice(3)}
        </h3>
      )
      i++
      continue
    }

    // Code blocks
    if (line.startsWith('```')) {
      const lang = line.slice(3)
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={i} className="bg-vscode-bg p-4 rounded-lg overflow-x-auto my-4 border border-vscode-border">
          <code className={`language-${lang}`}>
            {codeLines.join('\n')}
          </code>
        </pre>
      )
      i++
      continue
    }

    // Tables
    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i])
        i++
      }
      elements.push(<MarkdownTable key={i} lines={tableLines} />)
      continue
    }

    // Paragraphs
    if (line.trim()) {
      const paragraphLines: string[] = []
      while (i < lines.length && lines[i].trim() && !lines[i].startsWith('#') && !lines[i].startsWith('```') && !lines[i].includes('|')) {
        paragraphLines.push(lines[i])
        i++
      }
      elements.push(
        <p key={i} className="my-3 leading-relaxed">
          <InlineMarkdown text={paragraphLines.join(' ')} />
        </p>
      )
      continue
    }

    i++
  }

  return <>{elements}</>
}

// Inline markdown (bold, code, etc)
function InlineMarkdown({ text }: { text: string }) {
  // Process inline elements
  const parts: (string | JSX.Element)[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    // Inline code `code`
    const codeMatch = remaining.match(/`([^`]+)`/)

    if (boldMatch && (!codeMatch || boldMatch.index! < codeMatch.index!)) {
      if (boldMatch.index! > 0) {
        parts.push(remaining.slice(0, boldMatch.index))
      }
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>)
      remaining = remaining.slice(boldMatch.index! + boldMatch[0].length)
    } else if (codeMatch) {
      if (codeMatch.index! > 0) {
        parts.push(remaining.slice(0, codeMatch.index))
      }
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 bg-vscode-bg rounded text-vscode-accent">
          {codeMatch[1]}
        </code>
      )
      remaining = remaining.slice(codeMatch.index! + codeMatch[0].length)
    } else {
      parts.push(remaining)
      break
    }
  }

  return <>{parts}</>
}

// Markdown table
function MarkdownTable({ lines }: { lines: string[] }) {
  if (lines.length < 2) return null

  const parseRow = (line: string) =>
    line.split('|').slice(1, -1).map(cell => cell.trim())

  const headers = parseRow(lines[0])
  const rows = lines.slice(2).map(parseRow)

  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                className="px-4 py-2 text-left bg-vscode-sidebar border border-vscode-border text-sm font-medium"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className="px-4 py-2 border border-vscode-border text-sm"
                >
                  <InlineMarkdown text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Interactive code example
interface InteractiveExampleProps {
  example: CodeExample
  onOpen?: (code: string, language: 'wire' | 'pulse') => void
}

function InteractiveExample({ example, onOpen }: InteractiveExampleProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(example.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpen = () => {
    onOpen?.(example.code, example.language)
  }

  return (
    <div className="rounded-lg border border-vscode-border overflow-hidden">
      {/* Header */}
      <div className="bg-vscode-sidebar px-4 py-2 flex items-center justify-between border-b border-vscode-border">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            example.language === 'wire'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-purple-500/20 text-purple-400'
          }`}>
            {example.language.toUpperCase()}
          </span>
          <span className="font-medium text-sm">{example.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-2 py-1 text-xs text-vscode-text-muted hover:text-vscode-text transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          {onOpen && (
            <button
              onClick={handleOpen}
              className="px-3 py-1 text-xs bg-vscode-accent text-white rounded hover:bg-vscode-accent/80 transition-colors"
            >
              Try It →
            </button>
          )}
        </div>
      </div>

      {/* Code */}
      <pre className="p-4 bg-vscode-bg overflow-x-auto">
        <code className="text-sm font-mono">
          <SyntaxHighlight code={example.code} language={example.language} />
        </code>
      </pre>

      {/* Description */}
      {example.description && (
        <div className="px-4 py-2 bg-vscode-sidebar border-t border-vscode-border text-sm text-vscode-text-muted">
          {example.description}
        </div>
      )}
    </div>
  )
}

// Simple syntax highlighting
function SyntaxHighlight({ code, language }: { code: string; language: 'wire' | 'pulse' }) {
  const lines = code.split('\n')

  return (
    <>
      {lines.map((line, i) => (
        <div key={i}>
          <HighlightLine line={line} language={language} />
        </div>
      ))}
    </>
  )
}

function HighlightLine({ line, language }: { line: string; language: 'wire' | 'pulse' }) {
  if (language === 'wire') {
    // Wire syntax highlighting
    const parts: JSX.Element[] = []
    let remaining = line
    let key = 0

    // Comments
    if (remaining.includes('//')) {
      const idx = remaining.indexOf('//')
      parts.push(<span key={key++}>{highlightWireTokens(remaining.slice(0, idx))}</span>)
      parts.push(<span key={key++} className="text-green-500">{remaining.slice(idx)}</span>)
      return <>{parts}</>
    }

    return <>{highlightWireTokens(remaining)}</>
  } else {
    // Pulse syntax highlighting
    const parts: JSX.Element[] = []
    let remaining = line
    let key = 0

    // Comments
    if (remaining.includes(';')) {
      const idx = remaining.indexOf(';')
      parts.push(<span key={key++}>{highlightPulseTokens(remaining.slice(0, idx))}</span>)
      parts.push(<span key={key++} className="text-green-500">{remaining.slice(idx)}</span>)
      return <>{parts}</>
    }

    return <>{highlightPulseTokens(remaining)}</>
  }
}

function highlightWireTokens(text: string): JSX.Element {
  const keywords = ['module', 'nand', 'dff', 'ram', 'rom', 'mux', 'and', 'or', 'xor', 'not']
  const parts: (string | JSX.Element)[] = []
  const tokens = text.split(/(\s+|[(),:=\[\]->]+)/)
  let key = 0

  for (const token of tokens) {
    if (keywords.includes(token)) {
      parts.push(<span key={key++} className="text-purple-400">{token}</span>)
    } else if (/^\d+$/.test(token)) {
      parts.push(<span key={key++} className="text-orange-400">{token}</span>)
    } else if (token === '->' || token === ':' || token === '=') {
      parts.push(<span key={key++} className="text-cyan-400">{token}</span>)
    } else {
      parts.push(token)
    }
  }

  return <>{parts}</>
}

function highlightPulseTokens(text: string): JSX.Element {
  const instructions = ['LDA', 'LDX', 'LDY', 'STA', 'STX', 'STY', 'ADC', 'SBC', 'AND', 'ORA', 'EOR',
    'CMP', 'CPX', 'CPY', 'INX', 'INY', 'DEX', 'DEY', 'TAX', 'TAY', 'TXA', 'TYA',
    'PHA', 'PLA', 'JMP', 'JSR', 'RTS', 'BEQ', 'BNE', 'BCC', 'BCS', 'HLT', 'BRK', 'NOP']
  const parts: (string | JSX.Element)[] = []
  const tokens = text.split(/(\s+|[#$,]+)/)
  let key = 0

  for (const token of tokens) {
    if (instructions.includes(token.toUpperCase())) {
      parts.push(<span key={key++} className="text-blue-400">{token}</span>)
    } else if (/^[0-9A-Fa-f]+$/.test(token)) {
      parts.push(<span key={key++} className="text-orange-400">{token}</span>)
    } else if (token === '#' || token === '$') {
      parts.push(<span key={key++} className="text-cyan-400">{token}</span>)
    } else if (token.endsWith(':')) {
      parts.push(<span key={key++} className="text-yellow-400">{token}</span>)
    } else {
      parts.push(token)
    }
  }

  return <>{parts}</>
}

// Difficulty tag
function DifficultyTag({ difficulty }: { difficulty: 'beginner' | 'intermediate' | 'advanced' }) {
  const config = {
    beginner: { label: 'Beginner', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
    intermediate: { label: 'Intermediate', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    advanced: { label: 'Advanced', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  }

  const { label, color } = config[difficulty]

  return (
    <span className={`inline-block px-2 py-1 rounded border text-xs ${color}`}>
      {label}
    </span>
  )
}
