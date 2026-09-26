# Pedido 05 — La cadena queda en el lienzo (y el usuario decide)

**Rama:** `feat/cadena-en-lienzo` (sale de `main` con los pedidos 03 y 04 ya mergeados) · **un solo escritor** ·
este documento se commitea **antes** de tocar código.

## La decisión (textual del usuario, 26/09/2026)

> «Sí, el (a) me gusta más: que se vean luego de tirar la idea, y después yo decido si se quedan o se descartan.»

Hoy, al cerrar el turno, `onTurnoCerrado` **retira** el fantasma (`setDraftVoz('')` + `setDecisionParcial(undefined)`)
y el flujo sigue por el plan del motor. Lo que se quiere: que al terminar la idea **queden dibujados** los nodos de
cada tema, encadenados, y que la decisión de quedárselos o descartarlos sea del usuario.

## El contrato

### 1 · El dibujo de la cadena

Cuando el turno cierra con una decisión `semilla` que traiga `temas` (pedido 04):

- Se dibuja **un borrador por tema** — de 1 a 4, en el orden en que se dijeron.
- **Encadenados**: el primero cuelga del **ancla** (el nodo raíz o el enfocado, la misma que ya usa el fantasma),
  y cada uno de los siguientes cuelga del anterior. Nada de abanico: es una cadena.
- Los ids son **estables y por turno**: `nf-borrador-<turno>-<i>` (i desde 1). Tienen que poder convivir entre
  ellos y no colisionar con `ID_FANTASMA`.
- Estilo: el del borrador de hoy (punteado, atenuado, no interactivo en el sentido de «no es un nodo real») más un
  distintivo de **pendiente de decisión**.
- El texto de cada nodo sale de `temas[i].texto`; el título, de `temas[i].titulo`.

### 2 · Lo que NO son

Mientras la cadena está pendiente, sus nodos y aristas **no existen para el resto de la app**: no entran en
`localStorage`, ni en el guardado de la bóveda, ni en los envíos al motor, ni en el export.

Hoy ese filtro compara contra un id (`n.id !== ID_FANTASMA`). Con la cadena son varios: **el filtro pasa a ser por
prefijo** (`nf-borrador-`), y tiene que cubrir también las **aristas** de la cadena. Es el punto donde un descuido
contamina el estado del usuario, así que va con test.

### 3 · La decisión del usuario

La cadena **no se va sola**: espera.

- **Confirmar** → los borradores se materializan como nodos reales (título de cada tema, texto del tema), las
  aristas de la cadena quedan, y la cadena deja de estar pendiente.
- **Descartar** → se retiran los borradores y sus aristas, sin tocar el resto del lienzo.
- Mecanismo: un aviso visible en el lienzo que dice cuántos nodos quedan, con **dos botones** (crear / descartar)
  y sus dos teclas. Los textos del aviso van en **los dos idiomas** (`src/i18n/`) — es regla de la casa.

## 4 · Lo que se puede testear sin React (y por lo tanto es obligatorio)

Extraer la lógica a `src/utils/cadenaVoz.ts` (o el archivo que corresponda) y cubrir:

1. **1 tema → 1 borrador** colgando del ancla.
2. **4 temas → 4 borradores encadenados en orden** (anchora → 1 → 2 → 3 → 4).
3. Los ids son los esperados (`nf-borrador-<turno>-<i>`) y no colisionan entre turnos.
4. El **filtro por prefijo** saca los borradores de nodos **y de aristas**; un nodo real cuyo título empiece con
   «nf-borrador» (id distinto) **no** se filtra: se filtra por id, no por título.
5. Confirmar materializa todos los temas con sus títulos; descartar limpia todo y no deja aristas huérfanas.
6. Con `temas` ausente o vacío (backend viejo, o decisión `nada`), no se dibuja nada.

## 5 · Cómo se verifica en vivo

La prueba que vale es la misma que ya está agendada: dictar una idea con un marcador de tema («…otra cosa…») y ver
que al soltar aparezcan **dos nodos encadenados**, que se queden esperando, y que confirmar los cree y descartar los
borre. En la traza tiene que verse el cierre con los temas y la decisión del usuario.

## 6 · Archivos

- `src/utils/cadenaVoz.ts` (nuevo) + su test — la lógica pura.
- `src/App.tsx` — el efecto de la cadena, el filtro por prefijo, la confirmación y el descarte.
- El componente del aviso + `src/i18n/` — los textos nuevos en español e inglés.

**No toques** `src-tauri/src/segmentador.rs` ni `server.rs` (son del pedido 04, ya mergeado) ni
`src/services/vozService.ts` salvo que falte un campo del contrato: si te parece que hace falta, decilo en el
informe y no lo hagas por tu cuenta.

## 7 · Árbitros

`npx tsc --noEmit`, `npx vitest run` y `npm run build` (este pedido es frontend: el Rust no se toca). Contá los
tests antes y después.
