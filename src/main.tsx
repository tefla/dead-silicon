// Dead Silicon - Main entry point
// A puzzle game where you fix hardware and software bugs

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'

const root = document.getElementById('app')
if (!root) {
  throw new Error('Root element not found')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
