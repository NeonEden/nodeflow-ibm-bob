# PEDIDO-BOB-01 · Segmentador del parcial (lienzo en vivo, Fase C)

> Este documento es el pedido, autocontenido: Bob no ve la conversación donde se decidió. Pegar entero.

## Dónde estás trabajando

Repo **`nodeflow-ibm-bob`** (oficial del hackathon IBM Bob 2.0), rama de trabajo
**`feat/intra-turn-canvas`**. NodeFlow es una app de escritorio *local-first*: Tauri v2 + Rust (axum,
API propia en `127.0.0.1:37371`) + React 19 + React Flow. Su regla central: **el modelo propone y el
código valida** — ningún dato generado por un modelo entra al estado del usuario sin un validador.

El frontend **ya está hecho y mergeado** (no lo toques): mientras el usuario habla, `VozPanel` emite el
parcial del transcript y `App.tsx` dibuja un **nodo fantasma** (`src/utils/draftVoz.ts`). Ese fantasma
usa una regla local mínima (3 palabras). Tu trabajo es el **juicio de verdad**, del lado del backend.

## La tarea

Crear `src-tauri/src/segmentador.rs` — un módulo **nuevo y autocontenido** — que clasifique el parcial
del turno de voz, más el endpoint que lo expone. Nada de esto toca el grafo: sólo clasifica texto.

### 1. La función central (pura, testeable)

```rust
/// Clase de un parcial del turno de voz.
pub enum ClaseParcial { Nada, Semilla, Correccion }

pub struct Entrada<'a> {
    pub texto: &'a str,          // parcial actual (el transcript crece dentro del turno)
    pub anterior: Option<&'a str>, // parcial previo del MISMO turno
    pub ms_desde_cambio: Option<u64>,
    pub es_final: bool,          // end_of_turn: el turno cerró
}

pub struct Decision {
    pub clase: ClaseParcial,
    pub motivo: String,          // por qué decidió: se audita y va al log
    pub titulo: Option<String>,  // título corto sugerido; None = que lo arme el cliente
    pub texto: String,           // texto limpio que se dibuja
}

pub fn clasificar(e: &Entrada) -> Decision;
```

### 2. Las reglas (deterministas, sin modelo — ADR 0005 del repo)

| Señal | Decisión |
|---|---|
| Parcial inestable (cambió respecto de `anterior`) y no es final | `Nada` |
| Menos de 3 palabras y no es final | `Nada` |
| Corrección explícita en los primeros 5 tokens (`no,` · `mejor dicho` · `en realidad` · `quise decir` · `olvidate` · `corrijo`) | `Correccion` |
| `es_final: true`, o parcial estable con ≥3 palabras | `Semilla` |
| Cualquier duda | `Nada` |

Detalles que deciden si esto sirve o no:

- **`no` suelto no es corrección**: «nodo», «norte» y «no sé» empiezan igual. Sólo cuentan los marcadores
  inequívocos, y sólo en los primeros ~5 tokens (un «no» en el medio de una frase es contenido).
- **Normalizar para comparar**: minúsculas y sin acentos para detectar marcadores; el `texto` que
  devolvés se conserva tal como llegó (sólo se recortan espacios).
- **Estabilidad**: si `anterior` es igual al `texto` actual (normalizado), el parcial se considera
  estable. Si `ms_desde_cambio` viene y es chico (< ~250 ms), todavía está escribiéndose.
- **El ruido no dibuja**: `Nada` es la respuesta por defecto; lo descartado se cuenta (devolvé el motivo
  con esa palabra) para poder medirlo después.

### 3. El endpoint (en `src-tauri/src/server.rs`, siguiendo el estilo de las rutas `/api/voz/*`)

```
POST /api/voz/parcial
  cuerpo: { "turno_id": "...", "texto": "...", "anterior": "…", "ms_desde_cambio": 120, "es_final": false }
  resp:   { "clase": "nada" | "semilla" | "correccion", "motivo": "…", "titulo": "…" | null, "texto": "…" }
```

- **Sin estado global que sobreviva al turno.** Si guardás algo, que sea por `turno_id` y con
  vencimiento: en este proyecto una bandera «en curso» sin expiración ya bloqueó una función entera.
- **Tiene que contestar en menos de ~50 ms**: está en el camino de la voz. Es una función de texto, no
  puede llamar a ningún modelo ni a la red.
- Si el cuerpo viene vacío o raro → 400 con un mensaje claro, no un pánico.

### 4. Declarar el módulo

En `src-tauri/src/lib.rs`: `pub mod segmentador;` — **una línea, y sólo eso de ese archivo**.

## Cómo se verifica (esto es lo que se mira al cerrar)

```bash
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

- Tests unitarios dentro de `segmentador.rs` (`#[cfg(test)] mod tests`), cubriendo **cada fila de la
  tabla de reglas** y los casos que importan: `"nodo de código"` → `Nada`/`Semilla` según el resto,
  `"no sé"` **no** es corrección, `"no, mejor de código"` sí, un parcial inestable → `Nada`, un final con
  2 palabras → `Nada` (no alcanza para semilla) y un final con 3+ → `Semilla`.
- Los tests existentes tienen que seguir pasando (hoy son 282 en el repo).
- `npx tsc --noEmit` no lo toca (no toques el front), pero el CI corre todo junto: no rompas nada.

## Reglas de la casa (no negociables en este repo)

1. **Un pedido, un alcance**: esto es el segmentador y su endpoint. Si ves un bug en otro lado,
   **anotalo en el reporte**, no lo arregles.
2. **Comentario que explica el porqué, no el qué** (y si hay una medición, se cita con su fecha).
3. **Nada de secretos** en el código, el config o el commit.
4. **No agregues dependencias**: este módulo se resuelve con `std`.
5. **PR a `main` desde `feat/intra-turn-canvas`. El merge no es tuyo.**
6. Al cerrar: `python scripts/bob-evidencia.py` para que tu trabajo quede en `bob_sessions/`
   (la submission del hackathon pide mostrar **dónde** se usó Bob, con archivo y líneas).

## Contexto que conviene leer antes de escribir

- `docs/PLAN-LIENZO-EN-VIVO.md` §4b (el contrato, tal como está pactado) y §3 (la arquitectura completa).
- `src/utils/draftVoz.ts` (la regla mínima del cliente: tu clasificador la reemplaza cuando el backend
  contesta, y su test es un buen espejo de qué casos importan).
- `src-tauri/src/voz.rs` (cómo se valida hoy un plan y qué significa «el código valida» en este proyecto).
