# Mini-Fábrica Multi-Agente de NodeFlow — §2 El Sintetizador Cognitivo

> El rol de Bob: **sintetizador cognitivo del canvas** — convertir dictado desestructurado en nodos y
> aristas de React Flow, con la llamada más corta y barata posible. Este documento fija **qué se parsea,
> con qué contrato de datos y cómo se paga lo menos posible**.

## 0 · La corrección de encuadre que hace que esto funcione

El sintetizador **no es una llamada a un modelo dentro del bucle de voz**. Medido: el modelo local más
chico (`granite3.3:2b`) tarda **2,4-3,1 s** por plan y el razonador 31 s — contra los **<50 ms** del
clasificador determinista que ya está en `main`. Además Bob es un **agente de IDE**, no una API de
runtime: no se puede invocar desde la app.

⇒ El sintetizador es **de dos capas**, y cada capa paga lo que corresponde:

| Capa | Qué decide | Motor | Costo | Latencia |
|---|---|---|---|---|
| **1 · Determinista (runtime, mientras se habla)** | ¿dibujo el borrador? ¿es corrección? ¿dónde va? | Rust puro `segmentador::clasificar` + TS puro `draftVoz`/`borradorVivo` | **0 tokens** | **<50 ms** |
| **2 · Cognitiva (una vez, al cerrar el turno)** | qué temas hay, con qué títulos, cómo se encadenan, qué acción corresponde | motor barato del catálogo de la app (`motores::Tarea::Lienzo`) → plan validado en código | 1 llamada/turno | 2-4 s (post-cierre, el usuario ya ve la cadena) |
| **3 · Bob (diseño, no runtime)** | escribir/reemplazar la **pieza delicada** de las capas 1 y 2: parser, validador, ubicación, temporalidad | Bob IDE, ≤1 coin por pieza | ~US$1,79 / 57k tokens | — |

Lo que el usuario percibe como «el lienzo se dibuja mientras hablo» es la **capa 1**. Bob escribió su
núcleo (`src-tauri/src/segmentador.rs`, PR #7) y hoy no hay que volver a tocarlo salvo defecto.

## 1 · Contrato de datos end-to-end (tipos reales del repo)

```
STT (AssemblyAI Universal-Streaming)
  └─ Turn{t, end_of_turn:false}  ──►  assemblyaiRt.ts :: ev.onParcial(t)
        │
        ├─► POST /api/voz/parcial   ──►  segmentador::Entrada{ texto, anterior, ms_desde_cambio, es_final }
        │                                     │  (puro, sin red ni modelos, responde <50ms)
        │                                     ▼
        │                              Decision{ clase: Nada|Semilla|Correccion, motivo }
        │
        ├─► draftVoz::nodoFantasma(texto, ancla) ──► FantasmaVoz | null
        │        id = 'ghost-voz-turno' · className = 'nf-fantasma' · OFFSET_FANTASMA = 72
        │        MIN_PALABRAS = 3 · PALABRAS_TITULO = 7 · debounce 120 ms
        │
        └─► borradorVivo::decidirBorrador({fase, hayFantasma, hayDecision, clase, hayIdeaEnVivo})
                 └─► 'dibujar' | 'conservar' | 'retirar'      (fase ∈ inactivo|escuchando|resolviendo)

al cerrar el turno (end_of_turn:true)
  └─► cadenaVoz::construirCadena(...)  ──►  NodoCadena[] / AristaCadena[]   (PREFIX_CADENA='node-cadena-')
        └─► UNA sola creación por turno  ──►  nodos reales en el lienzo (nunca cero, nunca dos)

al pedir una acción con la voz
  └─► PlanVoz{ comandos: VozComando[] }  ──►  aplicarPlanVoz (App.tsx)
        10 acciones: crear · enlazar · enfocar · condensar · criticar · delegar · actualizar · responder · aceptar · descartar
```

**Las tres verdades que el parser no puede violar:**

1. **El parcial crece palabra por palabra.** «quiero» → «quiero un» → «quiero un nodo». Cualquier regla
   que descarte el parcial *porque cambió respecto del anterior* marca inestable en **cada tick** y el
   fantasma aparece recién al cerrar — justo lo contrario de lo que se busca. El dato bueno es
   **`ms_desde_cambio`** (≥ ~250 ms = la persona hizo una pausa = lo dicho ya es una idea).
   `MS_ESTABILIDAD_CLIENTE = 300` y `MS_UMBRAL_TOGGLE = 400` en `vozService.ts`.
2. **Cardinalidad del cierre: exactamente una creación por turno**, incluso si `end_of_turn` llega
   repetido. Se verifica contra el **emisor real** (parciales inyectados + cierre duplicado + dos turnos
   seguidos), no contra un mock del cliente.
3. **Si hay duda, no se dibuja.** Lo que no se dibuja no molesta; lo que se dibuja de más sí (ADR 0005:
   reglas deterministas, sin modelo).

## 2 · Lógica de parsing: de dictado desestructurado a JSON de nodos

El dictado entra como **texto plano sin puntuación confiable**. Se estructura en 5 pasos, y cada paso es
una función pura testeable:

1. **Normalizar** — `palabras(texto)`; se descartan muletillas y se conserva el orden. Nada de NLP pesado.
2. **Cortar en temas** — el turno se parte por marcadores de frontera (pausa ≥ ~250 ms, conectores de
   enumeración, «y después», «por otro lado»). Cada tema es la unidad que se convierte en nodo.
3. **Titular** — `tituloDelBorrador(texto)`: las primeras `PALABRAS_TITULO = 7` palabras, sin cortar
   palabras a la mitad, con la primera en mayúscula. El título es **una hipótesis**, no una decisión: el
   usuario lo edita.
4. **Clasificar la intención** — ¿es una idea nueva (`Semilla`) o está corrigiendo (`Correccion`)?
   Corrección sólo por marcador inequívoco **en los primeros 5 tokens** (`no,` · «mejor dicho» · «en
   realidad» · «olvidate» · «quise decir» · «corrijo» · «esperá,»). `no` suelto **no** cuenta: «nodo»,
   «norte» y «no sé» empiezan igual.
5. **Ubicar y encadenar** — `nodoFantasma(texto, ancla)` cae a `OFFSET_FANTASMA = 72` del ancla (nunca
   encima del árbol; si no hay ancla: `{x:80, y:80}`) y al cerrar `construirCadena` emite la cadena con
   `PREFIX_CADENA = 'node-cadena-'` e `idDeTema(turno, i)` — **ids deterministas**, para que el mismo
   turno no pueda producir dos nodos distintos.

**Salida canónica (lo que se pide cuando la capa 2 usa un modelo):**

```json
{
  "comandos": [
    { "accion": "crear",     "titulo": "…", "descripcion": "…", "parent": "<id|título existente>", "madurez": 1, "tags": ["Voz"] },
    { "accion": "enlazar",   "de": "<ref>", "a": "<ref>", "etiqueta": "voz" },
    { "accion": "actualizar","nodo": "<ref>", "titulo": "…", "madurez": 3 }
  ]
}
```

`<ref>` = id real del lienzo, título existente, o título creado en el mismo plan. Una acción fuera de las
10 del catálogo **se rechaza**: el modelo propone, el código valida. Y al agregar una acción van juntas
las **tres** piezas (`voz::ACCIONES` en Rust, el prompt de `specs/actions.json` —entra al binario por
`include_str!`, o sea **recompilar**— y `aplicarPlanVoz` en `App.tsx`).

## 3 · Optimización de contexto y tokens (lo que hace barata la llamada)

Ordenadas por ahorro medido, no por elegancia:

1. **Una llamada por turno, no por parcial.** El bucle de parciales es determinista (0 tokens). Medido:
   el modelo local no entra ahí ni con el más chico (2,4-3,1 s contra <50 ms).
2. **El contrato es el contexto, y viaja commiteado.** El pedido apunta a `docs/…/PEDIDO-*.md`: el agent
   lo lee del repo como documento del proyecto, no como mensaje suelto. Un pedido sin commitear se relee
   desde cero en cada turno de ventana corta.
3. **Caché de prefijo.** Medido en el bucle propio: **80,8 % de la entrada vino de caché**
   (US$0,0092 contra US$0,0307 sin caché), y el hit **crece vuelta a vuelta** (v1 ~5 % → v8 ~92 %): la
   primera llamada nunca pega. Contar tokens brutos engaña ~4x. Requisito: **prefijo estable** — sistema +
   contrato al principio, historial al final, y `tarifas: [entrada, salida, entrada_cacheada]` declaradas,
   porque sin el tercer número el ahorro no se puede reportar.
4. **Techo de exploración en el pedido, con el rodeo nombrado.** «Mirá SOLO estos dos archivos (el patrón
   de lógica pura y el patrón de test). NO abras el componente grande ni releas el contrato. Después de
   esas dos lecturas, empezá a escribir: si necesitás leer un quinto archivo para arrancar, estás relevando
   de más.» Medido: con ese techo dos piezas salieron en **un intento** (1m39s-1m51s); sin él, una tarea
   de la misma clase murió en **80 llamadas y cero archivos**.
5. **Los criterios de test van pegados en el pedido**, no por referencia: 10 líneas que le ahorran releer 90.
6. **Topes explícitos del motor local** (`borrador::Config`): `num_predict` 1024 y `num_ctx` 4096. Sin
   tope: 6.238 tokens, `slot context shift`, 500 y daemon caído. Nivel daemon:
   `OLLAMA_MAX_LOADED_MODELS=1`, `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_KEEP_ALIVE=5m`.
7. **La salida también se acota**: 8 KB máximo de salida de herramienta (el resto no entra al contexto del
   modelo, se paga igual).

**Presupuesto objetivo por llamada cognitiva**: entrada ≤ 4.000 tokens efectivos (con ≥70 % de caché) ·
salida ≤ 400 tokens (el plan JSON) · **1 llamada por turno** · sin reintento automático (si el plan no
valida, se descarta y el turno queda como estaba: el usuario no ve basura).

## 4 · Invariantes y pruebas que no se saltean

| Invariante | Cómo se prueba (y que **falle** sin el arreglo) |
|---|---|
| Un solo fantasma, con id fijo | escribir el texto dos veces seguidas → `nodes.filter(n => n.id === 'ghost-voz-turno').length === 1` |
| Ninguna creación durante los parciales | inyectar 5 parciales → `nodos_creados === 0` |
| Exactamente una creación al cerrar | cerrar dos veces el mismo turno → `nodos_creados === 1` |
| Dos turnos seguidos → dos cadenas | dos cierres distintos → 2 cadenas, ids distintos (`idDeTema`) |
| El fantasma no se persiste | `localStorage` / `saveVault` / `postAiAction` → 0 fantasmas (filtrado en los 4 lugares donde el lienzo sale de la app) |
| Ningún nodo huérfano por voz | tras crear: `GET /api/graph/garden` → `huerfanos: 0` |
| La corrección no crea nodo nuevo | «no, mejor dicho X» → mismo id, texto actualizado |

## 5 · Lo que este documento NO autoriza

- **No autoriza meter un LLM en el bucle de parciales.** Latencia y costo, medidos.
- **No autoriza invocar a Bob desde la app.** Bob es IDE: su salida son archivos commiteados.
- **No autoriza implementar la capa 2 antes de subir la submission.** El cierre es el 27/09 15:00 UTC y la
  auditoría del deck fue explícita: nada de funciones nuevas. Este es el diseño de la próxima ventana.
- **No autoriza rellenar `attribution_logs`.** Está en 0 filas y se declara así; la evidencia es `tasks` +
  el commit + las capturas de consumo.
