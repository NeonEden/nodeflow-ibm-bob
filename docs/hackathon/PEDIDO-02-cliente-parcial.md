# PEDIDO-02 · El cliente manda el parcial al segmentador

> Autocontenido: quien lo reciba no ve la conversación donde se decidió. Pegar entero.

## Dónde estás trabajando

Repo **`nodeflow-ibm-bob`** (oficial del hackathon IBM Bob 2.0), rama **`feat/cliente-parcial`**.
NodeFlow es una app de escritorio *local-first*: Tauri v2 + Rust (axum en `127.0.0.1:37371`) + React 19
+ React Flow. Regla central del proyecto: **el modelo propone y el código valida**, y **ninguna ruta que
el usuario use a diario puede depender de que un modelo (o el backend) conteste** (ADR 0005).

## Lo que YA existe (no lo rehagas, no lo toques)

- `src/services/assemblyaiRt.ts` emite `ev.onParcial(t)` en cada `Turn` que llega sin `end_of_turn`.
- `src/components/VozPanel.tsx`, en su `onParcial`: guarda `fragRef`, hace `setParcial(t)`, dispara el
  barge-in y llama `onParcialVivo?.(t)`.
- `src/App.tsx` tiene `draftVoz` y un efecto con debounce de 120 ms que dibuja un **nodo fantasma**
  (`ghost-voz-turno`) usando la regla local de `src/utils/draftVoz.ts` (`esIdeaEnVivo` /
  `nodoFantasma`). El fantasma ya se filtra en los cuatro lugares donde el lienzo sale de la app.
- El backend ya expone `POST /api/voz/parcial` (mergeado, PR #7):

```
cuerpo: { "turno_id": "…", "texto": "…", "anterior": "…", "ms_desde_cambio": 120, "es_final": false }
resp:   { "clase": "nada" | "semilla" | "correccion", "motivo": "…", "titulo": "…" | null, "texto": "…" }
```

## La tarea

Que el juicio del parcial lo haga el backend **sin que la voz dependa de él**: si el backend no contesta,
el lienzo se sigue dibujando con la regla local que ya existe.

### 1. Función nueva en `src/services/vozService.ts`

```ts
export interface DecisionParcial {
  clase: 'nada' | 'semilla' | 'correccion';
  motivo: string;
  titulo: string | null;
  texto: string;
}

export async function clasificarParcial(
  p: { turno_id: string; texto: string; anterior?: string; ms_desde_cambio?: number; es_final?: boolean },
  opts?: { timeoutMs?: number },
): Promise<DecisionParcial | null>;
```

- POST a `apiUrl('/api/voz/parcial')` (seguí el patrón de las otras funciones del archivo).
- **Timeout corto (300 ms por defecto) con `AbortController`** y devuelve `null` si falla, tarda o el
  status no es 200. **No lanza**: quien la llama no tiene que saber qué es un error de red.
- Sin reintentos.
- Una `clase` desconocida (el backend devolviera otra cosa) se trata como `nada`: el cliente no se rompe
  por un contrato que cambia.

### 2. `VozPanel.tsx`: lo que el backend necesita para juzgar

- Mantené `anteriorRef` (el texto del parcial anterior del mismo turno) y `ultimoCambioRef` (el instante
  en que el parcial cambió por última vez).
- Mandá `ms_desde_cambio` = ahora − `ultimoCambioRef`. **Es el dato que decide si la persona hizo una
  pausa**; sin él, el segmentador cae al criterio conservador y no dibuja nada mientras se habla.
- **Throttle**: como máximo una llamada cada ~150 ms (el parcial llega muchas veces por turno).
- **Una sola llamada en vuelo**: si llega un parcial nuevo mientras una respuesta viaja, la respuesta
  vieja se descarta (comparar el texto que se mandó con el texto actual). Sin esto, el fantasma puede
  mostrar una frase que ya se corrigió.

### 3. `App.tsx`: el fantasma usa la decisión

- `semilla` → dibuja/actualiza el fantasma (`titulo` del backend si viene; si no, `tituloDelBorrador`).
- `correccion` → actualiza el fantasma y lo marca como corrección (`data.ghostCorreccion = true`).
- `nada` → retira el fantasma.
- `null` (backend ausente o lento) → **cae a la regla local de hoy**. La red tiene que seguir ahí.

### 4. Tests (vitest, mockeando con `vi.stubGlobal('fetch', …)`)

- `clasificarParcial` devuelve `null` con timeout y con `status !== 200`.
- Devuelve la decisión con un 200 bien formado, y una clase desconocida se normaliza a `nada`.
- El throttle: dos parciales seguidos no disparan dos `fetch`.

## Reglas de la casa (no negociables)

1. **Un pedido, un alcance**: esto es el cliente. No toques `segmentador.rs` ni `server.rs` (ya están).
   Si ves un bug en otro lado, anotalo en el reporte.
2. **No agregues dependencias.** Se resuelve con lo que hay (`fetch`, `AbortController`).
3. **Si agregás texto visible**, va en `src/i18n/textos.ts` **en los dos idiomas**.
4. **Comentario que explica el porqué**, no el qué (y si hay medición, se cita con fecha).
5. **Los tres árbitros** antes de decir que terminaste:

```bash
npx tsc --noEmit          # tipos
npx vitest run            # tests (hoy 50/50 en el front)
npm run build             # build
```

6. **PR a `main` desde `feat/cliente-parcial`. El merge no es tuyo.**

## Cómo se verifica (esto es lo que se mira al cerrar)

- Los tres árbitros en verde, con la salida pegada.
- **El invariante que más importa**: con el backend apagado, la voz sigue dibujando el fantasma por la
  regla local. Se prueba apagando la app y hablando (o simulando el fallo en el test).
- Que con el backend prendido el fantasma reaccione a la pausa: la misma frase dicha de corrido no
  dibuja; la misma frase con 400 ms de silencio, sí.
