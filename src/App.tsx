import { DEFAULT_KIT } from './data/kits'

export default function App() {
  return (
    <main className="grid min-h-dvh place-items-center">
      <h1 className="font-display text-6xl">{DEFAULT_KIT.fullName}</h1>
    </main>
  )
}
