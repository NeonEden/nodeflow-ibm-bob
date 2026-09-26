# Para analizar: por qué el dictado crea un solo nodo en vez de una cadena

> Este archivo se puede pegar entero en Gemini / Copilot / cualquier analista: la primera parte es el
> problema contado por el usuario, después va el código, después mi diagnóstico y al final lo que quiero que
> se revise. **No hace falta acceso al repo**: con estos fragmentos alcanza.

## 1 · El problema, en palabras del usuario

«Hago una idea por voz y funciona el reconocimiento, se crea el nodo, se crea el plan, se aplica… y no pasa
nada más: queda **un único nodo, fijo**. Si dicto otra idea, se crea arriba de ese y se sobreescribe. Yo
esperaba que al cerrar la idea, si dije dos cosas ("quiero un nodo de audio, otra cosa un nodo de video"),
aparezcan **dos nodos encadenados** y que los pueda mover. Siento que vuelvo al problema del principio.»

## 2 · Qué medí (números, no impresiones)

- El turno de voz **cierra bien y con texto**: `turno.cerrado turno=4 chars=29 vacio=no` (log de la app).
- El grafo **no cambia** después de cerrar: `vault: guardado rev=13 · 3 nodos · 2 aristas` — antes y
  después de cada turno, siempre 3 nodos y 2 aristas.
- El backend **sí devuelve los temas**: `POST /api/voz/parcial` → `{clase: "semilla", temas: [2 items]}`
  en 2-10 ms (medido contra el backend de la app mientras corre).

O sea: el backend produce la cadena y en la app no aparece. El dato se pierde **en el camino**.

## 3 · El código

`src/services/vozService.ts` — lo que el panel llama al cerrar el turno:

```ts
export async function clasificarParcial(
  p: { turno_id: string; texto: string; anterior?: string; ms_desde_cambio?: number; es_final?: boolean },
  opts?: { timeoutMs?: number },
): Promise<DecisionParcial | null> {
  const ctrl = new AbortController();
  const ms = opts?.timeoutMs ?? 300;
  const timer = window.setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(apiUrl('/api/voz/parcial'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const d = await r.json();
    const claseValida = (c: unknown): c is DecisionParcial['clase'] =>
      c === 'nada' || c === 'semilla' || c === 'correccion';
    return {                        // <-- ACÁ: objeto NUEVO
      clase: claseValida(d.clase) ? d.clase : 'nada',
      motivo: typeof d.motivo === 'string' ? d.motivo : '',
      titulo: typeof d.titulo === 'string' ? d.titulo : null,
      texto: typeof d.texto === 'string' ? d.texto : '',
    };                              // <-- no copia `temas`
  } catch {
    // AbortError (timeout), error de red o JSON inválido: todo es null para el llamador.
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}
```

El tipo dice que `temas` existe:

```ts
export interface DecisionParcial {
  clase: 'nada' | 'semilla' | 'correccion';
  motivo: string;
  titulo: string | null;
  texto: string;
  temas?: { titulo: string; texto: string }[];   // declarado en el pedido 04…
}
```

El consumidor (panel de voz, al cerrar el turno):

```ts
if (onTurnoFinal) {
  void clasificarParcial({
    turno_id: sesionRef.current, texto: dictado, ms_desde_cambio: 999, es_final: true,
  })
    .then((d) => onTurnoFinal(d?.temas ?? null))   // d.temas SIEMPRE undefined
    .catch(() => onTurnoFinal(null));
}
```

Y el handler que recibe eso (`App.tsx`), que sí sabe construir la cadena:

```ts
onTurnoFinal={(temas) => {
  if (!temas?.length) return;                      // acá muere todo
  const ancla = nodes.find((n) => n.data.isRoot) ?? nodes[0] ?? null;
  const posiciones = ubicarCadena(nodes, ancla?.position ?? { x: 80, y: 80 }, temas.length);
  const { nodes: nuevos, edges: nuevas } = construirCadena(temas, posiciones, ancla?.id ?? null, turno);
  takeSnapshot(nodes, edges);
  setNodes((nds) => [...nds.filter((n) => n.id !== ID_FANTASMA), ...(nuevos as CustomNode[])]);
  setEdges((eds) => [...eds, ...nuevas]);
}}
```

## 4 · Mi diagnóstico

`temas` se declaró en el **tipo** pero **nunca se copió en el literal de retorno**: `return { … }` construye
un objeto nuevo y nombra sólo cuatro campos. El panel recibe `undefined`, llama a `onTurnoFinal(null)` y el
handler sale por `if (!temas?.length) return;`.

Lo que queda en el lienzo es el **borrador fantasma** (`ID_FANTASMA`), que es fijo y se **reutiliza** en cada
turno: de ahí el «se crea arriba de ese y se sobreescribe». No hay error ni traza, y por eso ningún test lo
vio — el test del contrato usaba un helper de respuesta que tampoco incluía `temas`.

**Fix aplicado** (con test que lo ancla; verificado revirtiéndolo: sin él, 2 tests en rojo):

```ts
const temas = Array.isArray(d.temas)
  ? (d.temas as Array<{ titulo?: unknown; texto?: unknown }>)
      .filter((t) => t && typeof t.titulo === 'string' && typeof t.texto === 'string')
      .map((t) => ({ titulo: t.titulo as string, texto: t.texto as string }))
  : undefined;
return {
  clase: claseValida(d.clase) ? d.clase : 'nada',
  motivo: typeof d.motivo === 'string' ? d.motivo : '',
  titulo: typeof d.titulo === 'string' ? d.titulo : null,
  texto: typeof d.texto === 'string' ? d.texto : '',
  ...(temas && temas.length ? { temas } : {}),
};
```

## 5 · Lo que quiero que revises

1. **¿El diagnóstico se sostiene?** ¿Hay otro camino por el que `temas` se pueda perder entre el backend y
   el handler?
2. **¿Es un patrón repetido?** El defecto es «el tipo declara un campo y el literal de retorno no lo copia».
   ¿Ves otros `return { … }` en esta familia de funciones con el mismo riesgo, y cómo los detectarías?
3. **¿El fix es el correcto, o conviene otro enfoque?** Por ejemplo `return { ...d, clase: claseValida(d.clase) ? d.clase : 'nada' }`
   para que ningún campo nuevo se pierda en el futuro — con el riesgo de propagar campos sin validar.
4. **Lo que ya está descartado con medición** (no hace falta investigarlo): el segmentador de Rust (devuelve
   los temas en 2-10 ms), el timeout del cliente (300 ms, muy por encima), el atajo de teclado (abre y cierra
   el turno bien, sin bucle), la CSP y el CORS (el backend responde `access-control-allow-origin: *` y el
   preflight `OPTIONS` contesta 200).

## 6 · Contexto del sistema (por si ayuda)

App de escritorio Tauri v2 + React Flow. El dictado va por streaming a AssemblyAI; al cerrar el turno el
front pide al backend (`/api/voz/parcial`, Rust) que parta el texto en temas con reglas deterministas
(conectores como «otra cosa», «además»; máximo 4; unidad mínima de 3 palabras). Los nodos se crean sin
aprobación previa y el error se revierte con `Ctrl+Z`. El grafo persiste en una bóveda de Obsidian.
