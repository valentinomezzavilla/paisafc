import { useEffect, useState } from 'react'
import { nav, site } from '../../data/texts'
import { CrestImage } from '../ui/CrestImage'

export function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,box-shadow] duration-500 ${
        scrolled ? 'bg-night/70 shadow-[0_1px_0_rgb(205_187_139/0.15)] backdrop-blur-md' : ''
      }`}
    >
      <nav aria-label="Principal" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
        <a href="#inicio" className="flex items-center gap-2.5" aria-label={`${site.name}, ir al inicio`}>
          <CrestImage alt="" sizes="40px" className="h-10 w-auto" fetchPriority="high" />
          <span className="font-jersey text-xl font-extrabold tracking-wide uppercase">{site.name}</span>
        </a>
        <ul className="flex items-center gap-1 sm:gap-2">
          {nav.links.map((link, i) => (
            <li key={link.href} className={i === 0 ? '' : 'hidden sm:block'}>
              <a
                href={link.href}
                className={
                  i === 0
                    ? 'rounded-full bg-gold px-4 py-2 text-sm font-semibold text-forest-deep transition-colors hover:bg-crest-gold'
                    : 'rounded-full px-3 py-2 text-sm text-cream/80 transition-colors hover:text-cream'
                }
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
