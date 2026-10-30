/** Ruta a un archivo de public/ respetando la base relativa del build. */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`
