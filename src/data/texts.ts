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
  views: {
    shirt: 'Camiseta',
    full: 'Conjunto',
  },
  dragHint: 'Arrastrá para girarla',
  hotspotHint: 'Tocá los puntos para ver cada detalle',
  viewerLabel: 'Camiseta en 3D. Arrastrá o usá las flechas para girarla.',
  turntableLabel: 'Arrastrá o usá las flechas para girarla.',
  detailsTitle: 'Detalles',
  closeDetail: 'Cerrar detalle',
  together: {
    eyebrow: 'Las dos juntas',
    title: 'Una para cada domingo',
    text: 'Titular y suplente, lado a lado.',
  },
}

/** Cada equipación entera (camiseta, short, medias y botines), tal como está en el mockup. */
export const fullKitsSection = {
  eyebrow: 'Equipación completa',
  front: 'Frente',
  back: 'Espalda',
  pieces: {
    verde: [
      { label: 'Camiseta', text: 'Verde bosque con curvas de nivel y detalles dorados' },
      { label: 'Short', text: 'Verde, con franja dorada y el escudo' },
      { label: 'Medias', text: 'Verdes' },
      { label: 'Botines', text: 'Verdes' },
    ],
    crema: [
      { label: 'Camiseta', text: 'Crema con rombos tono sobre tono y detalles verdes' },
      { label: 'Short', text: 'Verde, con franja crema y el escudo' },
      { label: 'Medias', text: 'Crema' },
      { label: 'Botines', text: 'Blancos con suela verde' },
    ],
  },
}

export const crestSection = {
  eyebrow: 'El escudo',
  title: 'Lo que llevamos en el pecho',
  intro: 'Cada parte del escudo, de cerca.',
  // x/y (en % del escudo): dónde va el pin y el centro del foco.
  // TODO: reemplazar cada texto por el significado real que le dé el club.
  parts: [
    { id: 'paisano', x: 62, y: 27, title: 'El paisano', text: 'Sombrero de ala ancha, poncho y pañuelo al cuello.' },
    { id: 'vaso', x: 20, y: 11, title: 'El vaso en alto', text: 'Levantado en una mano, bien en alto.' },
    { id: 'mate', x: 21, y: 55, title: 'El mate', text: 'Con su bombilla, a los pies del paisano.' },
    {
      id: 'cinta',
      x: 50,
      y: 80,
      title: 'La cinta',
      text: 'Verde con borde dorado y el nombre del club en serif crema.',
    },
    { id: 'estrellas', x: 10, y: 88, title: 'Las estrellas', text: 'Una en cada punta de la cinta.' },
    { id: 'borde', x: 89, y: 42, title: 'El borde dorado', text: 'Enmarca el campo verde con textura de grano.' },
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
  // La licencia CC BY 4.0 del modelo de la camiseta pide crédito al autor y avisar que se modificó.
  modelCredit: {
    text: 'Prenda 3D basada en “Maillot Olympique De Marseille” de marie.cruciani, con diseño propio',
    href: 'https://sketchfab.com/3d-models/563b2a7f3ee840f39988dddf6f942610',
    license: 'CC BY 4.0',
    licenseHref: 'https://creativecommons.org/licenses/by/4.0/',
  },
}
