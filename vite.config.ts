import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base relativa: el build en dist/ funciona en cualquier hosting y en subcarpetas.
export default defineConfig({
  base: './',
  // public/assets/ ya guarda las imágenes; el bundle va aparte.
  build: { assetsDir: 'static' },
  plugins: [react(), tailwindcss()],
})
