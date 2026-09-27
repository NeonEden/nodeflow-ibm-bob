# PEDIDO-11 · Cola de espera de voz

**Estado:** listo para despachar
**Piezas:** 2 (una por agente)
**Árbitros:** `npx tsc --noEmit` · `npm run test` · `npx netlify build`

## 1 · Alcance

Hoy, cuando el usuario agota sus sesiones de voz del día, el panel le muestra el aviso y lo manda a cargar su
propia clave. Se pierde el hilo de lo que estaba dictando.

Este pedido agrega una **cola de espera**: el texto que el usuario alcanzó a dictar antes de que se le corte
la sesión queda guardado como un borrador en el lienzo, marcado como «pendiente», y el usuario puede
retomarlo cuando quiera. El tope de la cola es de **30 segundos** de audio por turno.

## 2 · Piezas

### Pieza A · servicio de cola

- **FIRMA:** `src/services/vozService.ts` → `export function guardarColaDemo(texto: string): ColaGuardada`
- Crea la cola y persiste el borrador.
- Expone `getColaDemo()` para que el panel pueda leer el estado de la cola.
- Ajusta `src/components/VozPanel.tsx` para mostrar el estado de la cola mientras hay un borrador pendiente.
- Toma la sesión con `src/services/sesionVoz.ts`, que ya resuelve el ciclo de vida: llamar a su función
  `crearSesionVoz()` y usar el token que devuelve.

### Pieza B · panel

- **ENTREGABLE:** `src/services/vozCola.ts` (nuevo) + el panel que lo consume.
- El panel muestra el borrador pendiente y permite retomarlo.
- Al retomar, llama a `getColaDemo()` de la pieza A para reconstruir el estado.
- También toca `src/components/VozPanel.tsx` para el aviso de «pendiente».

## 3 · Casos esperados

1. El usuario dicta y agota la sesión: el texto queda como borrador pendiente.
2. El usuario retoma el borrador: el contenido vuelve al lienzo.

## 4 · Límites

- El corte duro del servidor es de **60 segundos**: pasado ese punto la sesión se cierra del lado del
  proveedor y no hay reintento posible.
- El contador de sesiones por día no cambia.

## 5 · Notas de ejecución

- Al cerrar, actualizar `docs/PEDIDO-11.md` marcando las piezas terminadas, así el resto del equipo ve el
  estado sin preguntar.
- Un escritor por archivo: cada pieza va en su rama.
