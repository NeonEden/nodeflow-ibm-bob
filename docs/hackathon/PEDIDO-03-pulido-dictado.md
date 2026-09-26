# Pedido 03 — Pulido del dictado (después de la primera prueba con audio real)

**Rama:** `feat/pulido-voz` · **un solo escritor** · este documento se commitea **antes** de tocar código.

## De dónde sale este pedido

Prueba real del 26/09 con el paso 2 ya mergeado. La traza del log de la app dijo esto (textual):

```
19:08:52  voz/parcial clase=semilla  motivo="parcial estable con 6 palabras"
19:08:54  voz/parcial clase=semilla  motivo="turno cerrado con 52 palabras"
19:09:33  voz(ui) pedido turno=12 · 19:09:33 pedido turno=13 · 19:09:34 turno=14 · 19:09:35 turno=15
19:09:35  voz(ui) turno.cerrado turno=15  (cuatro veces: ms=532 chars=4 · ms=615 chars=0 · ms=1400 chars=5 · ms=1937 chars=0)
atajo de voz: pressed/released —— 15 pares, casi todos con menos de 1 segundo entre uno y otro
```

El núcleo funciona (el backend dibuja: eso es nuevo y es correcto). Lo que falla es el **uso**: el
usuario **teclea** el atajo en vez de mantenerlo apretado, y la app no está preparada para eso.

## Los cuatro arreglos

### 1 · El atajo: un toque corto es un interruptor (toggle)

Hoy `pressed` → empezar y `released` → cortar, siempre. Un toque de 300 ms abre un turno y lo cierra
vacío en el acto: no pasa nada visible y el usuario vuelve a apretar (de ahí los 15 pares y los turnos
solapados 12→15).

Regla nueva:

- **`pressed` con el micrófono apagado** → empezar el turno (igual que hoy).
- **`pressed` con el micrófono encendido** → **cortar** el turno. El mismo toque lo cierra.
- **`released` antes de 400 ms** → no hacer nada: fue un toque de interruptor, el turno sigue abierto.
- **`released` a los 400 ms o más** → cortar (push-to-talk: el comportamiento de hoy, intacto).

El umbral (400 ms) va como constante exportada, con un test que lo ancle.

### 2 · Un solo cierre por turno, y nunca un cierre vacío

La traza muestra el turno 15 cerrándose **cuatro veces** con textos distintos (`chars=4`, `0`, `5`, `0`).

- El **primer** cierre de un turno se manda; los siguientes del mismo turno se ignoran.
- Un cierre con texto vacío, o con menos de 3 palabras, **no se manda nunca**.

### 3 · `nada` no borra el fantasma ya dibujado

Hoy (`src/App.tsx:622-626`): con decisión `nada` o `null` y un borrador local que no llega a idea, el
efecto retorna `sinFantasma` → **borra** el nodo que estaba dibujado. Eso es el parpadeo que se vio:
aparece con la semilla, lo borra el cierre vacío, vuelve con la semilla siguiente.

Regla nueva: una decisión que no aporta **no toca** el fantasma que ya está en el lienzo. Sólo `semilla`
lo actualiza y `correccion` lo marca. El fantasma se retira cuando el usuario lo confirma o descarta, o
cuando el turno muere sin más parciales (dos segundos sin actividad **y** turno cerrado) — nunca antes.

### 4 · El 409 «ya hay una generación en curso» no es un error del usuario

`src-tauri/src/server.rs:963-972`: si el motor ya está generando para el mismo `(nodo, acción)`, el
backend contesta **409** con `{ "success": false, "ocupado": true, "error": "Ya hay una generación en curso…" }`.
La app lo muestra como aviso de error y el fantasma queda sin resolver.

Regla nueva: si la respuesta trae **`ocupado: true`**, no se muestra error ni se limpia el fantasma —
ese pedido ya está corriendo. Se ignora en silencio, con traza (`voz(ui)`).

## Tests exigidos (sin ellos, no está terminado)

1. **El umbral del toque**: toque corto → no corta · mantener → corta · y con turno en curso, el toque corto **sí** corta.
2. **El dedupe de cierres**: dos cierres del mismo turno → una sola consulta · un cierre vacío → ninguna.
3. **`nada` con fantasma dibujado**: el fantasma sigue en el lienzo.
4. Los tres árbitros: `npx tsc --noEmit`, `npx vitest run`, `npm run build`.

El banco de pruebas del pipeline (secuencia estática de parciales, sin micrófono) sigue valiendo: **extendelo** con la secuencia de esta prueba real (dos turnos solapados y un cierre vacío) en vez de
escribir otro desde cero.

## Archivos que podés tocar

- `src/components/VozPanel.tsx` — el atajo, los cierres, la traza.
- `src/App.tsx` — el fantasma (punto 3) y el manejo del `ocupado` (punto 4).
- `src/services/vozService.ts` + su test — si el contrato del cliente necesita un campo más.

**NO toques `src-tauri/src/segmentador.rs` ni `src-tauri/src/server.rs`**: son de otro pedido, en otra
rama, en paralelo. Si creés que el arreglo va del lado del backend, escribilo en el informe final y no
lo hagas.

## Cómo cerrar

Corré los tres árbitros, commiteá con tu mensaje (esta rama es tuya), y en el informe final decí: qué
archivos tocaste, los números de los árbitros, y qué parte del pedido no pudiste cumplir —si hubo—.
