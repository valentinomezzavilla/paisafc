import { kitsSection } from '../../data/texts'

export type Step = 'front' | 'back' | 'full'

export const STEPS: { id: Step; label: string }[] = [
  { id: 'front', label: kitsSection.steps.front },
  { id: 'back', label: kitsSection.steps.back },
  { id: 'full', label: kitsSection.steps.full },
]
