import { Hero } from './components/hero/Hero'
import { KitSection } from './components/kits/KitSection'
import { KitsTogether } from './components/kits/KitsTogether'
import { Nav } from './components/layout/Nav'
import { useSmoothScroll } from './hooks/useSmoothScroll'

export default function App() {
  useSmoothScroll()

  return (
    <div className="grain">
      <a
        href="#camisetas"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded focus:bg-cream focus:px-3 focus:py-2 focus:text-forest-deep"
      >
        Saltar a las camisetas
      </a>
      <Nav />
      <main>
        <Hero />
        <KitSection />
        <KitsTogether />
        <section id="escudo" className="min-h-svh bg-night" />
      </main>
    </div>
  )
}
