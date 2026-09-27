# Materiales de la submission

| Archivo | Qué es |
|---|---|
| `cover.png` | **Cover image** (1280×640) para el formulario de lablab |
| `slides.pdf` | **Slide presentation**: 7 slides 16:9, listas para el formulario |
| `slides.html` · `cover.html` | Las fuentes: se editan acá y se vuelven a renderizar |
| `app.png` | La captura del lienzo que usan la cover y la slide 4 |

## Cómo se regeneran (no se editan a mano los binarios)

```bash
SUB="docs/hackathon/submission"

# PDF (las 7 slides)
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu \
  --no-pdf-header-footer --virtual-time-budget=9000 \
  --print-to-pdf="$SUB/slides.pdf" "file:///C:/Users/tomas/Desktop/Nodeflow%20BOB/nodeflow-ibm-bob/$SUB/slides.html"

# Cover (1280×640)
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu \
  --hide-scrollbars --window-size=1280,640 \
  --screenshot="$SUB/cover.png" "file:///C:/Users/tomas/Desktop/Nodeflow%20BOB/nodeflow-ibm-bob/$SUB/cover.html"

# La captura del lienzo, desde el demo público (misma UI, sin instalar nada)
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu \
  --hide-scrollbars --virtual-time-budget=15000 --window-size=1440,900 \
  --screenshot="$SUB/app.png" "https://nodeflow-ibm-bob.vercel.app"
```

**Verificación después de renderizar**: contar páginas del PDF (deben ser **7**) y mirar la cover. Con
`python`: `d.count(b'/Type /Page') - d.count(b'/Type /Pages')` sobre los bytes del PDF.

## Dos cosas que hay que saber de estos materiales

1. **`app.png` es el demo web**, no la app de escritorio: es la misma interfaz (el lienzo, la biblioteca de
   nodos, la barra de estado) y ahí se ven los nodos reales del vault. En el **video** se ve la app de
   escritorio funcionando. La web **simula la voz**: sin el backend en Rust no hay micrófono.
2. **La paleta sale del producto**: `#0f172a` / `#1e293b` (slate) con indigo `#6366f1`, violet `#8b5cf6` y
   emerald `#34d399`, tomados de `src/index.css`.

## Lo que dicen las slides (el encuadre)

El tema del hackathon pide **un workflow de desarrollador con impacto**. Por eso el deck abre por el
workflow —**idea → contrato versionado → Bob implementa → commit → revisión independiente → corrección**—
y NodeFlow es el **caso real** donde se aplicó. Los números van **con su procedencia**, y la última slide
dice los límites de frente: es un proceso aplicado a este proyecto, no una demostración de productividad
general. El detalle del encuadre y su justificación están en
[`../PLAN-ASTRA-bob-hackathon.md`](../PLAN-ASTRA-bob-hackathon.md).
