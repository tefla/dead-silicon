import type { KnowledgeBaseData, SearchResult } from '../types'
import { logicFundamentals } from './logic-fundamentals'
import { wireLanguage } from './wire-language'
import { pulseLanguage } from './pulse-language'
import { cpuHardware } from './cpu-hardware'

export const knowledgeBase: KnowledgeBaseData = {
  categories: [
    logicFundamentals,
    wireLanguage,
    pulseLanguage,
    cpuHardware,
  ]
}

// Helper functions for navigation
export function getArticleById(articleId: string) {
  for (const category of knowledgeBase.categories) {
    const article = category.articles.find(a => a.id === articleId)
    if (article) {
      return { article, category }
    }
  }
  return null
}

export function getCategoryById(categoryId: string) {
  return knowledgeBase.categories.find(c => c.id === categoryId) || null
}

export function searchKnowledgeBase(query: string): SearchResult[] {
  const results: SearchResult[] = []
  const lowerQuery = query.toLowerCase()

  for (const category of knowledgeBase.categories) {
    for (const article of category.articles) {
      // Search in title
      if (article.title.toLowerCase().includes(lowerQuery)) {
        results.push({
          articleId: article.id,
          categoryId: category.id,
          title: article.title,
          snippet: article.summary,
          matchType: 'title'
        })
        continue
      }

      // Search in summary
      if (article.summary.toLowerCase().includes(lowerQuery)) {
        results.push({
          articleId: article.id,
          categoryId: category.id,
          title: article.title,
          snippet: article.summary,
          matchType: 'content'
        })
        continue
      }

      // Search in content
      for (const section of article.sections) {
        if (section.content.toLowerCase().includes(lowerQuery) ||
            section.title.toLowerCase().includes(lowerQuery)) {
          // Extract snippet around match
          const index = section.content.toLowerCase().indexOf(lowerQuery)
          const start = Math.max(0, index - 50)
          const end = Math.min(section.content.length, index + query.length + 50)
          const snippet = (start > 0 ? '...' : '') +
            section.content.slice(start, end).trim() +
            (end < section.content.length ? '...' : '')

          results.push({
            articleId: article.id,
            categoryId: category.id,
            title: article.title,
            snippet: snippet.replace(/\n/g, ' '),
            matchType: 'content'
          })
          break  // Only one result per article
        }
      }
    }
  }

  return results
}

// Get all articles in reading order (for prev/next navigation)
export function getArticleList() {
  const list: { articleId: string; categoryId: string; title: string }[] = []

  for (const category of knowledgeBase.categories) {
    for (const article of category.articles) {
      list.push({
        articleId: article.id,
        categoryId: category.id,
        title: article.title
      })
    }
  }

  return list
}

export function getNextArticle(currentArticleId: string) {
  const list = getArticleList()
  const index = list.findIndex(a => a.articleId === currentArticleId)
  if (index >= 0 && index < list.length - 1) {
    return list[index + 1]
  }
  return null
}

export function getPreviousArticle(currentArticleId: string) {
  const list = getArticleList()
  const index = list.findIndex(a => a.articleId === currentArticleId)
  if (index > 0) {
    return list[index - 1]
  }
  return null
}
