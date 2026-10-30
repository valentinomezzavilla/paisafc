# Paisa FC

Sitio de una sola página para presentar las camisetas de Paisa FC.

> README en construcción: se completa en la etapa de pulido.

## Desarrollo

```bash
npm install
npm run dev
```

## Assets

Los originales están en `public/assets/source/`. Para regenerar recortes, escudo, favicon,
imagen Open Graph y paleta:

```bash
python -m venv .venv
.venv/Scripts/pip install -r scripts/requirements.txt   # en macOS/Linux: .venv/bin/pip
.venv/Scripts/python scripts/prepare_assets.py           # --esrgan para ampliar con Real-ESRGAN
```
