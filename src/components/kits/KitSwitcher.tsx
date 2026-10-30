import type { Kit, KitId } from '../../data/kits'

interface KitSwitcherProps {
  kits: Kit[]
  activeId: KitId
  onSelect: (id: KitId, origin: HTMLElement) => void
}

/** Selector Titular / Suplente. Cada botón es el origen del wipe radial. */
export function KitSwitcher({ kits, activeId, onSelect }: KitSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="Elegí la camiseta"
      className="flex rounded-full border border-(--kit-accent)/40 bg-(--kit-bg)/75 p-1 shadow-[0_10px_40px_-10px_rgb(0_0_0/0.45)] backdrop-blur-md transition-colors duration-700"
    >
      {kits.map((kit) => {
        const active = kit.id === activeId
        return (
          <button
            key={kit.id}
            type="button"
            aria-pressed={active}
            onClick={(e) => onSelect(kit.id, e.currentTarget)}
            className={`flex items-center gap-2.5 rounded-full py-2 pr-4 pl-2.5 text-left transition-colors duration-500 ${
              active ? 'bg-(--kit-accent) text-(--kit-on-accent)' : 'text-(--kit-ink) hover:bg-(--kit-accent)/15'
            }`}
          >
            <span
              aria-hidden
              className="size-6 shrink-0 rounded-full border-2 border-(--kit-accent) shadow-inner"
              style={{ background: kit.theme.bg }}
            />
            <span className="leading-none">
              <span className="block font-jersey text-base font-extrabold tracking-wide uppercase">{kit.roleLabel}</span>
              <span className={`block text-[11px] ${active ? 'opacity-80' : 'text-(--kit-muted)'}`}>{kit.colorName}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
