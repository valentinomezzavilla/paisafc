import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'

/** Usado solo en el build (scripts/prerender.mjs) para generar el HTML estático. */
export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
