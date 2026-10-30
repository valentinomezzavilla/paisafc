/**
 * Textos del sitio. Editá acá sin tocar componentes.
 * Regla: no inventar datos del club (fundación, títulos, historia). Donde falta un dato
 * hay un texto neutro y un TODO.
 */

export const site = {
  name: 'Paisa FC',
  // TODO: completar con la temporada real si se quiere mostrar (ej. "Temporada 2026").
  season: '',
}

export const nav = {
  links: [
    { href: '#camisetas', label: 'Camisetas' },
    { href: '#escudo', label: 'Escudo' },
    { href: '#contacto', label: 'Contacto' },
  ],
}

export const hero = {
  eyebrow: 'Nueva equipación',
  title: 'PAISA FC',
  // Línea editable que anuncia las dos camisetas.
  tagline: 'Dos camisetas, una misma tierra. Llegan la titular verde bosque y la suplente crema.',
  scrollHint: 'Bajá para verlas',
}

export const kitsSection = {
  eyebrow: 'Las camisetas',
  title: 'Hechas para el pago',
  steps: {
    front: 'De frente',
    back: 'La espalda',
    full: 'Kit completo',
  },
  hotspotHint: 'Tocá los puntos para ver cada detalle',
  swipeHint: 'Deslizá para girarla',
  together: {
    eyebrow: 'Las dos juntas',
    title: 'Una para cada domingo',
    text: 'Titular y suplente, lado a lado.',
  },
}

export const crestSection = {
  eyebrow: 'El escudo',
  title: 'Lo que llevamos en el pecho',
  intro: 'Cada parte del escudo, de cerca.',
  // TODO: reemplazar cada texto por el significado real que le dé el club.
  parts: [
    { id: 'paisano', x: 50, y: 34, title: 'El paisano', text: 'Sombrero de ala ancha, poncho y pañuelo al cuello.' },
    { id: 'vaso', x: 20, y: 18, title: 'El vaso en alto', text: 'Levantado con una mano, como en un brindis.' },
    { id: 'mate', x: 22, y: 64, title: 'El mate', text: 'Con su bombilla, a los pies del paisano.' },
    { id: 'cinta', x: 50, y: 78, title: 'La cinta', text: 'Verde con borde dorado y el nombre del club en serif crema.' },
    { id: 'estrellas', x: 7, y: 84, title: 'Las estrellas', text: 'Una en cada punta de la cinta.' },
    { id: 'borde', x: 91, y: 40, title: 'El borde dorado', text: 'Enmarca el campo verde con textura de grano.' },
  ],
}

export const sponsorsSection = {
  eyebrow: 'Nos acompañan',
  title: 'Sponsors',
  // TODO: reemplazar los logos recreados por los archivos oficiales de cada marca.
  sponsors: [
    { id: 'vezza', name: 'VEZZA', where: 'Pecho', href: '' },
    { id: 'toms', name: 'Tom’s Burger', where: 'Espalda', href: '' },
    { id: 'parche', name: 'Parche R', where: 'Manga', href: '' },
  ],
}

export const contact = {
  eyebrow: 'Contacto',
  title: 'Seguinos',
  // TODO: completar con las redes y el contacto reales del club.
  socials: [
    { label: 'Instagram', href: '#' },
    { label: 'WhatsApp', href: '#' },
    { label: 'Email', href: '#' },
  ],
  footer: 'Paisa FC',
}
