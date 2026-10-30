import { Hero } from './components/hero/Hero'
import { Nav } from './components/layout/Nav'
import { useSmoothScroll } from './hooks/useSmoothScroll'

export default function App() {
  useSmoothScroll()

  return (
    <div className="grain">
      <a href="#camisetas" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded focus:bg-cream focus:px-3 focus:py-2 focus:text-forest-deep">
        Saltar a las camisetas
      </a>
      <Nav />
      <main>
        <Hero />
        <section id="camisetas" className="min-h-svh bg-forest-deep" />
      </main>
    </div>
  )
}
