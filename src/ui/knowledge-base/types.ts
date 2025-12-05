// Knowledge Base Types

export interface CodeExample {
  id: string
  title: string
  language: 'wire' | 'pulse'
  code: string
  description?: string
  expectedOutput?: string
}

export interface ArticleSection {
  id: string
  title: string
  content: string  // Markdown content
  examples?: CodeExample[]
}

export interface Article {
  id: string
  title: string
  emoji: string
  summary: string
  sections: ArticleSection[]
  relatedArticles?: string[]  // IDs of related articles
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
}

export interface Category {
  id: string
  title: string
  emoji: string
  description: string
  articles: Article[]
}

export interface KnowledgeBaseData {
  categories: Category[]
}

// Search result type
export interface SearchResult {
  articleId: string
  categoryId: string
  title: string
  snippet: string
  matchType: 'title' | 'content'
}
