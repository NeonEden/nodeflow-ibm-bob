# Pedido 04 — La cadena de temas (el turno se parte en unidades, no en un nodo con todo)

**Rama:** `feat/cadena-temas` (worktree propio) · **un solo escritor** · documento commiteado **antes** de tocar código.

## De dónde sale

Primera prueba con audio real (26/09). La traza:

```
19:08:54  voz/parcial clase=semilla  motivo="turno cerrado con 52 palabras"
19:09:01  voz/parcial clase=semilla  motivo="turno cerrado con 66 palabras"
```

El segmentador hizo lo que el contrato pedía: **una** semilla por turno, con el turno entero adentro. El
resultado en el lienzo fue **un nodo con 66 palabras** — y la idea se pierde ahí: lo que el usuario
quiere es que **cada tema** de lo que dijo sea un nodo, y que se vayan **encadenando**.

Regla del usuario, textual: *«un tema colgando del anterior en cadena, así es como se van uniendo los
segmentos de una idea, por partes»*.

## El contrato

Hoy `POST /api/voz/parcial` (ver `src-tauri/src/segmentador.rs`) devuelve:

```json
{ "clase": "nada|semilla|correccion", "motivo": "...", "titulo": "..." | null, "texto": "..." }
```

Cambio: cuando la clase es **`semilla`**, la respuesta agrega **`temas`**, una lista ordenada de 1 a 4
unidades temáticas:

```json
{
  "clase": "semilla",
  "motivo": "turno cerrado con 52 palabras, 3 temas",
  "titulo": "<título del PRIMER tema>",     // se mantiene: compatibilidad con el cliente de hoy
  "texto": "<texto del PRIMER tema>",        // se mantiene: compatibilidad con el cliente de hoy
  "temas": [ { "titulo": "...", "texto": "..." }, { ... }, { ... } ]
}
```

- Con `clase = nada` o `correccion`, **no** se agrega `temas` (el campo es opcional en el cliente).
- `titulo` y `texto` siguen significando **el primer tema**: así el cliente actual (que dibuja un solo
  fantasma) sigue funcionando sin cambios hasta el pedido 05.

### Regla de partición (determinista, sin modelo — esto NO usa LLM)

Se parte el turno, en este orden de prioridad:

1. **Marcadores explícitos de tema** (conectores de cambio): «otra cosa», «y también», «además»,
   «por otro lado», «ahora», «después», «paso dos», «segundo», «tercero», y la coma seguida de alguno de
   esos conectores. Cortar **después** del marcador, no antes.
2. **Techo de 4 temas.** Si aparecen más de 4 separadores, los últimos se pegan al cuarto.
3. **Unidad mínima de 3 palabras** (la misma regla de siempre). Una unidad que quede más corta **se pega
   a la anterior**, nunca se descarta.
4. **Sin separadores → 1 tema**, con el turno completo (comportamiento de hoy, intacto).

El `titulo` de cada tema se arma con la misma función que hoy usa el borrador (`tituloDelBorrador`):
no inventes otra.

## Qué archivos tocar (y cuáles NO)

- **`src-tauri/src/segmentador.rs`** — la partición y el campo `temas` (el 80% del pedido).
- **`src-tauri/src/server.rs`** — el endpoint propaga `temas` (cambio chico; el serializador ya arma el JSON).
- **`src/services/vozService.ts`** — el tipo `DecisionParcial` gana `temas?: { titulo: string; texto: string }[]`.

**NO toques `src/App.tsx` ni `src/components/VozPanel.tsx`.** Esos dos archivos son del **pedido 03**,
que corre **en paralelo en otra rama con otro escritor**. El dibujo de la cadena en el lienzo es el
pedido 05, después de que el 03 esté mergeado. Si te parece que el arreglo va ahí, escribilo en el
informe final y no lo hagas.

## Tests exigidos (en `segmentador.rs`, junto a los que ya están)

1. Un turno con un separador explícito → **2 temas**, y el de la primera mitad primero.
2. Un turno sin separadores → **1 tema**, y `texto` igual al turno completo.
3. Una unidad que queda con menos de 3 palabras → **se pega a la anterior** (no se descarta, no queda sola).
4. Cinco separadores → **máximo 4 temas** (el techo).
5. `clase = nada` y `clase = correccion` → **sin** `temas` en la respuesta.
6. Un caso con acentos y mayúsculas en los marcadores («Otra cosa», «ADEMÁS») → parte igual.

Y el árbitro: **`cargo test --lib` verde**, con el conteo antes y después — **pero ese comando no lo corras
vos** (ver abajo).

## Árbitros: los corre quien te delegó, no vos

Este worktree es nuevo: su `src-tauri/target/` compila **desde cero** (minutos de CPU en una máquina que se
sobrecalienta, y hay otro agente trabajando en paralelo). Así que **el veredicto no es tuyo**: escribí el
código y los tests, y **quien te delegó** corre `cargo test --lib` y los tipos del frontend. Lo dice el
`AGENTS.md` de este repo y es la regla del evento.

**No corras `cargo` de ninguna forma** (ni `check`): cualquier build en este worktree compila todo el árbol
de dependencias otra vez. Editá bien, revisá lo que escribiste leyéndolo, y reportá.

## Cómo cerrar

Commiteá con tu mensaje en esta rama, y en el informe final: archivos tocados, qué tests agregaste (nombres),
y qué parte del pedido no pudiste cumplir —si hubo—. Lo que no esté en el informe no cuenta.
