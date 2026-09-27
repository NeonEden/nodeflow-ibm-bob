# PEDIDO-09 · Demo web: ingreso en un clic + i18n del grafo

**Orquestador:** `@deep-orq` · **Fecha:** 2026-09-27 · **Repo:** `nodeflow-ibm-bob` (oficial, hackathon IBM Bob 2.0)
**Sitio objetivo:** https://nodeflowsss.netlify.app
**Rama base:** `main` (post-merge del PR #32, que arregló el deploy de Netlify)

---

## 0 · DESVIACIONES DEL PEDIDO ORIGINAL (leer antes de tocar nada)

El pedido del humano asume tres cosas que **no coinciden con el repo**. Se midió antes de cortar:

| El pedido dice | La realidad medida | Qué hacemos y por qué |
|---|---|---|
| `ARCHIVOS A MUTAR: src/components/Landing/` | **No existe** `src/components/Landing/`. El front es `src/components/*.tsx` + `src/App.tsx` | Se trabaja sobre los archivos reales (§2) |
| «Usar diccionarios JSON locales (`locales/es.json`, `locales/en.json`)» | Existe **`src/i18n/textos.ts`** (467 líneas, **374 claves ES + EN**, tipo `Clave` derivado de `ES`). Su comentario documenta el porqué: *«son dos idiomas y una app de escritorio que corre offline»* | **NO se crean `locales/*.json`.** Se usan las claves existentes. El tipo `Clave` es un guard: obliga a cubrir EN o no compila — un JSON paralelo rompería ese guard y volvería a habilitar el «medio traducido» |
| «Switch visual en la barra superior (ES \| EN)» | **Ya existe**: `src/components/IdiomaSwitch.tsx`, montado en `Toolbar.tsx:297` (Right Controls), con `useIdioma()` que re-renderiza sin recargar | **No se crea otro switch.** Sólo se verifica que sea visible en el estado inicial de la demo |

**Lo que sí falta de verdad** (esto es el alcance):

1. El ingreso demo existe en el código (`services/auth.ts` → `getInitialUser()` ya devuelve `DEMO_ACCOUNTS[0]`) pero **no hay un CTA de un clic**: lo primero que ve el jurado es el `WelcomeModal`, que pide **claves de IA y de voz**.
2. No hay distintivo de que se está en un **modo demo sin credenciales**.
3. El i18n cubre la **UI**, no el **contenido del grafo**: los títulos/descripciones de los nodos del demo vienen del mock (`/api/graph/state` → fixture en español) y **no cambian** al pasar a EN.

---

## 1 · Alcance partido en DOS piezas (un solo escritor por archivo)

| Pieza | Dueño | Archivos (exclusivos) |
|---|---|---|
| **P1 · Ingreso demo + badge** | `@software_agent` | `src/services/apiBase.ts`, `src/components/WelcomeModal.tsx`, `src/components/BadgeDemo.tsx` (nuevo), `src/i18n/textos.ts` |
| **P2 · i18n del contenido del grafo** | `@agent-coder-nano` | `src/i18n/grafoDemo.ts` (nuevo), `src/components/IdeaNode.tsx` |

**Sin solapamiento: ningún archivo aparece en las dos filas.** P2 sólo *lee* `src/i18n/idioma.ts` y `src/i18n/useIdioma.ts`.

---

## 2 · FIRMAS EXACTAS

### P1

```ts
// src/services/apiBase.ts  (AGREGAR — no reescribir el archivo)
/**
 * `true` cuando el front corre contra la API del mismo origen, que es como corre el demo web
 * publicado (`VITE_API_BASE=same-origin` en `demo/build.mjs`). La app de escritorio no setea la
 * variable, así que ahí vale `false`. Se usa para no mostrar avisos de demo en la app instalada.
 */
export const ES_DEMO_WEB: boolean;
```

```tsx
// src/components/BadgeDemo.tsx  (ARCHIVO NUEVO)
/** Distintivo discreto del modo demo. Devuelve `null` si no se está en el demo web. */
export function BadgeDemo(): React.ReactElement | null;
```

```tsx
// src/components/WelcomeModal.tsx  (EXTENDER la interfaz existente)
interface WelcomeModalProps {
  // ...las 5 props que ya tiene, sin cambiar su firma...
  /** `true` en el demo web: muestra el CTA de un clic y NO empuja a cargar claves. */
  esDemo?: boolean;
  /** Se llama al hacer clic en el CTA. El padre entra sin credenciales y cierra el modal. */
  onEntrarDemo?: () => void;
}
```

```ts
// src/i18n/textos.ts  (AGREGAR las MISMAS claves en ES y EN — el tipo no compila si falta una)
'demo.badge'          // ES: 'Modo Demo Interactivo · Sin credenciales'
                      // EN: 'Interactive Demo Mode · No credentials'
'demo.entrar'         // ES: 'Probar el demo'          EN: 'Try the demo'
'demo.entrar.ayuda'   // ES: 'Entra sin claves: el demo corre con datos de ejemplo.'
                      // EN: 'Enter without keys: the demo runs on sample data.'
'demo.modo'           // ES: 'Modo demo'               EN: 'Demo mode'
```

### P2

```ts
// src/i18n/grafoDemo.ts  (ARCHIVO NUEVO)
import type { Idioma } from './idioma';

/**
 * Traduce el CONTENIDO del grafo del demo (títulos y descripciones de los nodos semilla, que vienen
 * en español desde el fixture del mock). Si un texto no tiene traducción, se devuelve el original:
 * el demo nunca muestra una clave cruda ni un hueco.
 */
export function textoGrafoDemo(es: string, idioma: Idioma): string;

/** Cuántos textos del grafo tienen traducción cargada (guard de cobertura, mismo espíritu que `CLAVES_CUBIERTAS`). */
export const TEXTOS_GRAFO_TRADUCIDOS: number;
```

```tsx
// src/components/IdeaNode.tsx  (MUTAR SÓLO el render del título/descripción)
// Hoy (línea ~377):
//   {data.title || <span className="nf-muted italic">Idea sin título...</span>}
// Debe quedar envuelto con el idioma activo, vía useIdioma(), sin cambiar la estructura del JSX
// ni el comportamiento de edición (el input de edición sigue mostrando el texto ORIGINAL).
```

**Fuente de los textos a traducir:** `demo/fixtures/api__graph__state.json` (el fixture que el mock
sirve en `/api/graph/state`). Los títulos son los `data.title` de los nodos; hay ~51 nodos semilla.
Traducir **sólo** lo que ese fixture trae — no inventar textos nuevos.

---

## 3 · CASOS (uno por línea)

1. Demo web (`VITE_API_BASE=same-origin`) → `ES_DEMO_WEB === true` y `BadgeDemo` renderiza el distintivo.
2. App de escritorio (sin `VITE_API_BASE`) → `ES_DEMO_WEB === false` y `BadgeDemo` devuelve `null`.
3. Clic en «Probar el demo» → el `WelcomeModal` se cierra y se entra **en la misma pestaña, sin recargar** y sin pedir claves.
4. Con `esDemo`, el `WelcomeModal` **no** empuja a cargar claves (los botones de claves quedan como opción, nunca como requisito).
5. Cambiar ES → EN con el switch existente → cambian los textos de UI **y** los títulos/descripciones de los nodos del grafo, sin recargar y sin errores en consola.
6. Volver a ES → todo vuelve al texto original, sin residuos en inglés.
7. Un texto del grafo **sin** traducción cargada → se muestra el original en español (nunca la clave cruda ni vacío).
8. `TEXTOS_GRAFO_TRADUCIDOS > 0` y `CLAVES_CUBIERTAS` sigue creciendo (no se pierde ninguna clave existente).

---

## 4 · ÁRBITROS (comando exacto, en el worktree)

```bash
npx tsc --noEmit                      # tipos del frontend: el tipo Clave falla si falta un idioma
npx netlify build                     # el pedido lo exige: build real del demo
npx vitest run src/utils              # tests existentes del front (no romper lo que ya andaba)
```

Y la **comprobación en runtime sin fallos de renderizado** (la hace el orquestador, sobre el deploy):
home sirviendo el bundle, `/api/graph/state` en 200, y captura del sitio con `msedge --headless` +
`vision_analyze` en **los dos idiomas**.

`cargo test --lib` **queda fuera a propósito**: el cambio es 100 % frontend, no toca Rust, y el `target/`
se podó hoy (una corrida implica recompilar todo). El CI del repo corre los tres igual.

---

## 5 · PROHIBIDO TOCAR

- `src-tauri/**` — **la app de escritorio está CONGELADA** (directiva del 27/09).
- `demo/lib/mockApi.mjs`, `demo/fixtures/**`, `netlify.toml`, `netlify/functions/api.mjs` — el deploy ya
  está verde y verificado; se toca sólo si un árbitro lo exige, y avisando.
- `src/i18n/textos.ts` fuera del bloque ES/EN (es de P1 únicamente; P2 no lo abre).
- `src/components/AuthModal.tsx`, `src/services/auth.ts` — el sistema de cuentas ya funciona
  (`getInitialUser()` devuelve `DEMO_ACCOUNTS[0]`). **P1 lo reusa, no lo reescribe.**
- Nada de dependencias nuevas. Nada de secretos. Textos de UI **siempre** en ES y EN.

---

## 6 · CIERRE (lo que se entrega por pieza)

`archivos tocados` · `salida cruda de los 3 árbitros` · `qué quedó afuera y por qué`.
Un «listo» sin la salida no es un reporte: **el veredicto no es del ejecutor.** El orquestador corre los
árbitros sobre el worktree entregado antes de integrar.
