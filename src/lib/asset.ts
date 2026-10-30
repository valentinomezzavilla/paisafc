/**
 * Ruta a un archivo de public/. El build usa base relativa ('./') y es una sola página,
 * así que alcanza con una ruta relativa al documento (sirve en la raíz o en una subcarpeta,
 * y también en el HTML prerenderizado, donde BASE_URL no es relativa).
 */
export const asset = (path: string) => path
