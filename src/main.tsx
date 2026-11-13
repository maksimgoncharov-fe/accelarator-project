import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

async function enableMocks(): Promise<void> {
  // Assessment infrastructure: serve /api from MSW during development only.
  if (import.meta.env.DEV) {
    const { startMocks } = await import('./mocks/start.ts')
    await startMocks()
  }
}

enableMocks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
