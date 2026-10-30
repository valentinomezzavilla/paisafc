import { kitsSection } from '../../data/texts'
import type { KitView } from '../../three/KitModel'

const VIEWS: KitView[] = ['shirt', 'full']

/** Camiseta sola o el conjunto completo (camiseta, short, medias y botines). */
export function ViewToggle({ view, onChange }: { view: KitView; onChange: (v: KitView) => void }) {
  return (
    <div
      role="group"
      aria-label="Vista"
      className="flex rounded-full border border-(--kit-accent)/40 bg-(--kit-bg)/75 p-1 backdrop-blur-md transition-colors duration-700"
    >
      {VIEWS.map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={() => onChange(v)}
          className={`rounded-full px-4 py-2 font-jersey text-sm font-extrabold tracking-wider uppercase transition-colors duration-500 ${
            view === v ? 'bg-(--kit-accent) text-(--kit-on-accent)' : 'text-(--kit-ink) hover:bg-(--kit-accent)/15'
          }`}
        >
          {kitsSection.views[v]}
        </button>
      ))}
    </div>
  )
}
