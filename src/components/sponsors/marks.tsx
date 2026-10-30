import { asset } from '../../lib/asset'

// Versiones recreadas a partir de la camiseta. TODO: reemplazar por los logos oficiales.

export function VezzaMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 120" role="img" aria-label="VEZZA" className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="9" strokeLinejoin="miter">
        <path d="M74 12 L48 40 L74 68" />
        <path d="M126 12 L152 40 L126 68" />
        <path d="M108 16 L92 64" strokeLinecap="square" />
      </g>
      <text
        x="100"
        y="112"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="Instrument Sans Variable, sans-serif"
        fontWeight="700"
        fontSize="34"
        letterSpacing="2"
      >
        VEZZA
      </text>
    </svg>
  )
}

export function PatchMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="Parche R" className={className}>
      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="5" />
      <text
        x="44"
        y="68"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="Big Shoulders Display Variable, sans-serif"
        fontWeight="900"
        fontSize="52"
        fontStyle="italic"
      >
        R
      </text>
      <path d="M66 22 L52 52 L62 52 L54 78 L76 44 L65 44 L72 22 Z" fill="var(--color-crest-gold)" />
    </svg>
  )
}

export function TomsMark({ className = '' }: { className?: string }) {
  const mask = `url(${asset('assets/sponsors/toms-burger.png')}) center / contain no-repeat`
  return (
    <span
      role="img"
      aria-label="Tom’s Burger"
      className={`block bg-current ${className}`}
      style={{ mask, WebkitMask: mask, aspectRatio: '469 / 253' }}
    />
  )
}
