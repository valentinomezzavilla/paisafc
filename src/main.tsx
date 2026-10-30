import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import '@fontsource-variable/fraunces/soft'
import '@fontsource-variable/big-shoulders-display/wght'
import '@fontsource-variable/instrument-sans/wght'
import './index.css'
import App from './App.tsx'

const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

// En el build el HTML viene prerenderizado (scripts/prerender.mjs): se hidrata.
if (root.hasChildNodes()) hydrateRoot(root, app)
else createRoot(root).render(app)
