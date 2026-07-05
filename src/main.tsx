import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { initAnalytics } from './lib/analytics'
import './index.css'
import App from './App.tsx'

// Enable dark mode by default
if (typeof document !== 'undefined') {
  document.documentElement.classList.add('dark');
}

// Initialize analytics (PostHog loads only if VITE_POSTHOG_KEY is set)
initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
