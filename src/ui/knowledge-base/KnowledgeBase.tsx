import { useState, useMemo } from 'react'
import { knowledgeBase, getArticleById, searchKnowledgeBase, getNextArticle, getPreviousArticle } from './articles'
import { ArticleViewer } from './ArticleViewer'
import type { Category, Article, SearchResult } from './types'

interface KnowledgeBaseProps {
  onOpenExample?: (code: string, language: 'wire' | 'pulse') => void
}

export function KnowledgeBase({ onOpenExample }: KnowledgeBaseProps) {
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(knowledgeBase.categories.map(c => c.id))
  )
  const [searchQuery, setSearchQuery] = useState('')

  const selectedArticle = useMemo(() => {
    if (!selectedArticleId) return null
    return getArticleById(selectedArticleId)
  }, [selectedArticleId])

  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return null
    return searchKnowledgeBase(searchQuery)
  }, [searchQuery])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const handleArticleSelect = (articleId: string) => {
    setSelectedArticleId(articleId)
    setSearchQuery('')
  }

  const handleNext = () => {
    if (!selectedArticleId) return
    const next = getNextArticle(selectedArticleId)
    if (next) setSelectedArticleId(next.articleId)
  }

  const handlePrevious = () => {
    if (!selectedArticleId) return
    const prev = getPreviousArticle(selectedArticleId)
    if (prev) setSelectedArticleId(prev.articleId)
  }

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-72 bg-vscode-sidebar border-r border-vscode-border flex flex-col">
        {/* Search */}
        <div className="p-3 border-b border-vscode-border">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge base..."
            className="w-full px-3 py-2 bg-vscode-input border border-vscode-border rounded text-sm focus:outline-none focus:border-vscode-accent"
          />
        </div>

        {/* Search Results or Categories */}
        <div className="flex-1 overflow-y-auto">
          {searchResults ? (
            <SearchResults
              results={searchResults}
              onSelect={handleArticleSelect}
              onClear={() => setSearchQuery('')}
            />
          ) : (
            <CategoryList
              categories={knowledgeBase.categories}
              expandedCategories={expandedCategories}
              selectedArticleId={selectedArticleId}
              onToggleCategory={toggleCategory}
              onSelectArticle={handleArticleSelect}
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-vscode-editor">
        {selectedArticle ? (
          <ArticleViewer
            article={selectedArticle.article}
            category={selectedArticle.category}
            onOpenExample={onOpenExample}
            onNavigate={handleArticleSelect}
            onNext={getNextArticle(selectedArticleId!) ? handleNext : undefined}
            onPrevious={getPreviousArticle(selectedArticleId!) ? handlePrevious : undefined}
          />
        ) : (
          <WelcomeScreen onSelectArticle={handleArticleSelect} />
        )}
      </div>
    </div>
  )
}

// Category list component
interface CategoryListProps {
  categories: Category[]
  expandedCategories: Set<string>
  selectedArticleId: string | null
  onToggleCategory: (id: string) => void
  onSelectArticle: (id: string) => void
}

function CategoryList({
  categories,
  expandedCategories,
  selectedArticleId,
  onToggleCategory,
  onSelectArticle
}: CategoryListProps) {
  return (
    <div className="py-2">
      {categories.map(category => (
        <div key={category.id}>
          <button
            onClick={() => onToggleCategory(category.id)}
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-vscode-hover text-left"
          >
            <span className="text-xs transition-transform" style={{
              transform: expandedCategories.has(category.id) ? 'rotate(90deg)' : 'rotate(0deg)'
            }}>
              ▶
            </span>
            <span className="text-base">{category.emoji}</span>
            <span className="font-medium text-sm">{category.title}</span>
          </button>

          {expandedCategories.has(category.id) && (
            <div className="ml-4">
              {category.articles.map(article => (
                <button
                  key={article.id}
                  onClick={() => onSelectArticle(article.id)}
                  className={`w-full px-3 py-1.5 flex items-center gap-2 text-left text-sm transition-colors ${
                    selectedArticleId === article.id
                      ? 'bg-vscode-accent/20 text-vscode-accent'
                      : 'hover:bg-vscode-hover text-vscode-text-muted'
                  }`}
                >
                  <span>{article.emoji}</span>
                  <span className="truncate">{article.title}</span>
                  {article.difficulty && (
                    <DifficultyBadge difficulty={article.difficulty} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Search results component
interface SearchResultsProps {
  results: SearchResult[]
  onSelect: (articleId: string) => void
  onClear: () => void
}

function SearchResults({ results, onSelect, onClear }: SearchResultsProps) {
  return (
    <div className="py-2">
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-sm text-vscode-text-muted">
          {results.length} result{results.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={onClear}
          className="text-xs text-vscode-accent hover:underline"
        >
          Clear
        </button>
      </div>
      {results.length === 0 ? (
        <div className="px-3 py-4 text-center text-vscode-text-muted text-sm">
          No articles found
        </div>
      ) : (
        results.map((result, i) => (
          <button
            key={`${result.articleId}-${i}`}
            onClick={() => onSelect(result.articleId)}
            className="w-full px-3 py-2 text-left hover:bg-vscode-hover"
          >
            <div className="text-sm font-medium">{result.title}</div>
            <div className="text-xs text-vscode-text-muted truncate">
              {result.snippet}
            </div>
          </button>
        ))
      )}
    </div>
  )
}

// Welcome screen
interface WelcomeScreenProps {
  onSelectArticle: (id: string) => void
}

function WelcomeScreen({ onSelectArticle }: WelcomeScreenProps) {
  const featuredArticles = [
    { id: 'what-is-digital-logic', title: 'What is Digital Logic?', emoji: '💡' },
    { id: 'wire-intro', title: 'Introduction to Wire', emoji: '👋' },
    { id: 'pulse-intro', title: 'Introduction to Pulse', emoji: '👋' },
    { id: 'cpu-basics', title: 'How a CPU Works', emoji: '🧠' },
  ]

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-3xl font-bold mb-4">Dead Silicon Knowledge Base</h1>
        <p className="text-vscode-text-muted mb-8">
          Everything you need to know about digital logic, the Wire HDL,
          the Pulse assembly language, and the Cygnus-7 spacecraft computer.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {knowledgeBase.categories.map(category => (
            <button
              key={category.id}
              onClick={() => onSelectArticle(category.articles[0]?.id)}
              className="p-4 bg-vscode-sidebar rounded-lg border border-vscode-border hover:border-vscode-accent transition-colors text-left"
            >
              <div className="text-2xl mb-2">{category.emoji}</div>
              <div className="font-medium">{category.title}</div>
              <div className="text-sm text-vscode-text-muted">
                {category.articles.length} articles
              </div>
            </button>
          ))}
        </div>

        <div className="text-left">
          <h2 className="text-lg font-medium mb-3">Getting Started</h2>
          <div className="space-y-2">
            {featuredArticles.map(article => (
              <button
                key={article.id}
                onClick={() => onSelectArticle(article.id)}
                className="w-full p-3 bg-vscode-sidebar rounded border border-vscode-border hover:border-vscode-accent transition-colors text-left flex items-center gap-3"
              >
                <span className="text-xl">{article.emoji}</span>
                <span>{article.title}</span>
                <span className="ml-auto text-vscode-accent">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Difficulty badge
function DifficultyBadge({ difficulty }: { difficulty: 'beginner' | 'intermediate' | 'advanced' }) {
  const colors = {
    beginner: 'bg-green-500/20 text-green-400',
    intermediate: 'bg-yellow-500/20 text-yellow-400',
    advanced: 'bg-red-500/20 text-red-400',
  }

  const labels = {
    beginner: 'B',
    intermediate: 'I',
    advanced: 'A',
  }

  return (
    <span className={`ml-auto px-1.5 py-0.5 rounded text-xs ${colors[difficulty]}`}>
      {labels[difficulty]}
    </span>
  )
}
