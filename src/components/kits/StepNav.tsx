import { STEPS, type Step } from './steps'

interface StepNavProps {
  step: Step
  onJump: (step: Step) => void
}

/** Indicador del paso de la historia; cada paso es un botón que lleva hasta ahí. */
export function StepNav({ step, onJump }: StepNavProps) {
  const current = STEPS.findIndex((s) => s.id === step)
  return (
    <ol className="flex items-center gap-1.5" aria-label="Pasos">
      {STEPS.map((s, i) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => onJump(s.id)}
            aria-current={s.id === step ? 'step' : undefined}
            className={`flex items-center gap-2 rounded-full px-2.5 py-1.5 font-jersey text-xs font-bold tracking-[0.18em] uppercase transition-colors duration-500 ${
              s.id === step ? 'text-(--kit-ink)' : 'text-(--kit-muted) hover:text-(--kit-ink)'
            }`}
          >
            <span
              aria-hidden
              className={`h-0.5 rounded-full bg-(--kit-accent) transition-all duration-500 ${i <= current ? 'w-6' : 'w-2 opacity-40'}`}
            />
            <span className={s.id === step ? '' : 'sr-only sm:not-sr-only'}>{s.label}</span>
          </button>
        </li>
      ))}
    </ol>
  )
}
