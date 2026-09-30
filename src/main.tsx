import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import LamalPage from './lamal/LamalPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LamalPage />
  </StrictMode>,
)
