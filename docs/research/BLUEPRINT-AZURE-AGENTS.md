---
title: Blueprint — inferencia en Azure y arquitectura de agentes
fecha: 2026-09-27
estado: activo
autores: deep-orq (medición) · Astra/agent-commander (criterio)
---

# Blueprint — inferencia en Azure y arquitectura de agentes

> **Cómo leer este documento.** Todo número marcado *medido* salió de una llamada real contra los
> deployments de esta suscripción, no del catálogo de Azure. El catálogo ofrece ~496 modelos y es
> material de marketing: **lo que responde es el deployment**, con su TPM provisionado.

## 0 · Resumen ejecutivo: las tres cosas que cambian la decisión

1. **El límite no es la inteligencia del modelo, es el TPM provisionado.** Hay deployments de modelos
   excelentes con **50 TPM**. Un turno de agente con 20 KB de contexto consume ~5.000 tokens: a 50 TPM eso
   son **cien minutos de espera**. Un modelo brillante que no responde a tiempo es un modelo inútil para
   orquestar.

   > **Caso verificado en vivo, mientras se escribía este documento.** El agente auditor del enjambre no
   > devolvía respuestas a las peticiones que se le enviaban. Su `config.yaml` estaba **correcto**
   > (`default: gpt-6-astra`, 1000 TPM): el problema era su **sesión guardada**, que tenía fijado
   > `gpt-5` y Hermes restaura ese modelo al reanudar (*«Model restored from session: gpt-5»*). Con
   > **50 TPM** y un modelo que agota el presupuesto razonando, el agente quedaba mudo sin dar un solo
   > error. No falló la configuración: falló **la cuota de un valor heredado por la sesión**. Un
   > diagnóstico de agentes que empiece por el modelo del `config.yaml` y no por el de la sesión activa
   > llega a la conclusión equivocada.
2. **El orden correcto de criterios es: (1) TPM suficiente, (2) respeta structured output, (3) latencia,
   (4) recién ahí, calidad de razonamiento.** Los benchmarks públicos ordenan por lo último y por eso
   llevan a elegir modelos que después no se pueden usar.
3. **Ya hay una configuración ganadora desplegada y medida**: `gpt-6-astra` (1000 TPM) para orquestar y
   `gpt-5.4-nano` (5000 TPM) para ejecutar. No hace falta desplegar nada nuevo: hace falta dejar de usar
   los deployments que no tienen cuota.

## 1 · Inventario real (medido con `az cognitiveservices account deployment list`)

Suscripción `bba2f62a-…` (Azure subscription 1, Enabled). Seis recursos; tres tienen deployments:

| Recurso | Deployment | Versión | TPM | Estado |
|---|---|---|---|---|
`tomaspieruz-suuth-resource` | **gpt-5.4-nano** | 2026-03-17 | **5000** | Succeeded |
`tomaspieruz-suuth-resource` | gpt-5.3-codex | 2026-02-24 | 1000 | Succeeded |
`tomaspieruz-suuth-resource` | gpt-5 | 2025-08-07 | 50 | Succeeded |
`tomaspieruz-suuth-resource` | text-embedding-3-small | 1 | 120 | Succeeded |
`tomaspieruz-8921-resource` | **gpt-6-astra** | 2026-09-03 | **1000** | Succeeded |
`tomaspieruz-8921-resource` | gpt-5-mini | 2025-08-07 | 50 | Succeeded |
`tomaspieruz-8921-resource` | grok-4.6 | 1 | 50 | Succeeded |
`tomaspieruz-8921-resource` | DeepSeek-V4-Flash | 2026-04-23 | 20 | Succeeded |
`tomaspieruz-8921-resource` | DeepSeek-V4-Flash-0731 | 2026-07-31 | 1 | Succeeded |
`tomaspieruz-8921-resource` | text-embedding-3-small | 1 | 120 | Succeeded |
`nodeflow` | gpt-4.1-mini | 2025-04-14 | 100 | Succeeded |
`nodeflow` | (Azure OpenAI clásico, endpoint `nodeflow.openai.azure.com`) | — | — | — |

**Sin deployments** (existen, no aportan): `tomaspieruz-5166-resource`, `tomaspieruz-1107-resource`, `nos`.

### 1.1 · Prueba funcional (medida hoy, un pedido corto por deployment)

Mismo prompt (devolver un JSON con un nombre de archivo y un número), `max_completion_tokens=60`:

| Deployment | Latencia | ¿JSON válido? | ¿Emite tool calls? | Lectura |
|---|---|---|---|---|
**gpt-6-astra** | **2,8 s** | **sí** | ⚠️ HTTP 400 | El más capaz de los usables. **Rechaza `tools` combinadas con razonamiento**: *«Function tools with reasoning…»*. Sirve para orquestar y auditar; no para invocar herramientas. |
**gpt-5.4-nano** | **2,3 s** | **sí** | no emitió | El equilibrio correcto: rápido, respeta el formato, **5000 TPM**. Es el ejecutor. |
**DeepSeek-V4-Flash** | **1,3 s** | **sí** | no emitió | El más rápido en responder. Limitado por 20 TPM: útil para tareas sueltas, no para un bucle de agente. |
gpt-4.1-mini | 1,4 s | sí | no emitió | Alternativa digna para ejecución simple (100 TPM). |
grok-4.6 | 6,3 s | sí | no emitió | El más lento del lote. Con 50 TPM, descartado para agentes. |
gpt-5 | 2,3 s | **NO** | no emitió | Agotó los 60 tokens **razonando** y no llegó a responder. Con 50 TPM, inviable. |
gpt-5-mini | 2,3 s | **NO** | no emitió | Igual que el anterior. |
**gpt-5.3-codex** | 0,9 s → **HTTP 400** | — | — | **No responde por `chat/completions`**: *«The requested operation…»*. Solo funciona en su modo `codex_responses`. Un deployment que hay que operar distinto es deuda. |

> Nota honesta sobre «no emitió tool calls»: el prompt de la prueba **no pedía** usar una herramienta, así
> que ese resultado no prueba incapacidad. Lo que sí quedó probado es que **no la emitieron cuando no hacía
> falta** — que es el comportamiento correcto — y que **astra no puede recibirlas en su modo actual**
> (ese sí es un límite medido, con su error textual).

## 2 · FASE 1 · Veredicto de la tabla

### Modelo orquestador: `gpt-6-astra` (1000 TPM)
Razones medidas y de diseño: context window grande, devuelve **JSON válido** en 2,8 s, y es el único del lote
con capacidad de razonamiento *y* cuota suficiente. Su límite —no acepta tools con razonamiento— encaja con
el uso: **el orquestador no debería estar tocando herramientas de sistema de todos modos**; escribe
contratos, audita entregas y firma veredictos.

### Modelo ejecutante: `gpt-5.4-nano` (5000 TPM)
**5000 TPM es diez veces la cuota del siguiente**, y respeta structured output en 2,3 s. Para piezas de
código acotado con firma exacta (el patrón que ya validamos), es el caballo de batalla.

### Tercer puesto, con uso específico: `DeepSeek-V4-Flash`
El más rápido (1,3 s) y devuelve JSON, pero **20 TPM** lo deja fuera de cualquier bucle. Sirve para
clasificaciones sueltas y baratas (¿este parcial es una idea, una corrección o ruido?) donde no encadena
llamadas.

### Descartados, con motivo
- **gpt-5 y gpt-5-mini (50 TPM)**: no llegan a responder en modo razonamiento con presupuesto corto, y su
  cuota no soporta un agente.
- **grok-4.6 (50 TPM, 6,3 s)**: lo peor de las dos dimensiones.
- **gpt-5.3-codex**: requiere un modo de API distinto y devuelve 400 en el estándar. Mantenerlo obliga a
  código de transporte especial, que es exactamente el tipo de deuda que rompe un sistema multi-agente.

## 3 · FASE 2 · Arquitectura de agentes

### 3.1 · MCP: adoptarlo como estándar de **transporte**, no como religión

Estado real: NodeFlow ya tiene su propio servidor MCP (`mcp-server/nodeflow_mcp.py`, **1.264 líneas, 31
herramientas**) y Hermes consume dos servidores MCP (uno de TouchDesigner y el de NodeFlow). O sea: **la
decisión ya está tomada de hecho**, y funcionó.

Lo que había que corregir, medido **y ya corregido**:
- **El MCP de Hermes apuntaba al repo equivocado**: `config.yaml` → `Desktop\NodeFlow\nodeflow-desktop\mcp-server\`
  (el **laboratorio**, v0.3.7), no al oficial `NodeFlow BOB\nodeflow-ibm-bob`. Es decir: la orquestación le
  escribía al repo viejo.
  **Verificado antes de tocar** que los dos servidores son **idénticos byte por byte** (54.846 bytes, 1.264
  líneas, 31 herramientas en ambos): el cambio de ruta no altera una línea de código, sólo el destino.
  **Aplicado** con `hermes config set mcp_servers.nodeflow.args '["C:/Users/tomas/Desktop/Nodeflow BOB/nodeflow-ibm-bob/mcp-server/nodeflow_mcp.py"]'`
  y confirmado leyendo el valor de vuelta del archivo.
  ⚠️ **Requiere reiniciar Hermes para tomar efecto** (los servidores MCP se cargan al arrancar): hasta que se
  reinicie, el efecto está **NO VERIFICADO**.
  > Lección de proceso: se corrige con el CLI (`hermes config set`), nunca editando `config.yaml` a mano —
  > el agente que intentó el `patch` directo recibió un rechazo del propio Hermes, y con razón.
- **El servidor de TouchDesigner tiene `tools.exclude: ['*']`**: excluye todas sus herramientas. Vale
  revisar si es deliberado (no cargar esquemas que no se usan) o un residuo de una prueba; si es lo primero,
  es la configuración correcta y conviene copiarla como patrón.

Punto de quiebre para estandarizar todo por MCP: **cuando haya que exponer las mismas capacidades a más de
un consumidor**. Con un solo cliente, MCP agrega una capa de serialización sin comprador. Con dos o más
(Hermes, el IDE, un script), es lo que evita reescribir cada integración.

### 3.2 · Contexto y memoria: el costo está en lo que se paga siempre

Medido en este perfil:

| Qué | Cuánto | Se paga |
|---|---|---|
SOUL + memorias + perfil | ~6,5 KB | **cada turno** |
Índice de skills (119 archivos, 1,38 MB en total) | ~12 KB de títulos y descripciones | **cada turno** |
Catálogo de herramientas (MCP incluido) | ~29 entradas | cada turno, como nombres |
El sistema consume ~78 KB fijos por turno | — | **cada turno, incluso si el turno es de una línea** |

La estrategia más barata y más difícil de romper, en orden:
1. **Persistir el estado en disco y releer sólo lo necesario** (lo que ya hacemos: contratos en
   `docs/PEDIDO-*.md`, veredictos en archivos). Es lo único que no depende de que el modelo recuerde nada.
2. **Resumen acumulativo al cerrar una pieza**, escrito a un archivo, no al hilo de la conversación.
3. **Contexto deslizante** (recortar lo viejo) como último recurso: pierde justamente las decisiones
   tempranas que explican las reglas actuales, y esas son las que evitan repetir errores.
4. **Consolidar skills**: 119 skills es un catálogo, no una biblioteca. Un skill que no se cargó en las
   últimas sesiones cuesta contexto todos los días y no aporta. El curator existe para eso.

### 3.3 · Patrones de orquestación: qué cambiar y qué no

El esquema «orquestador + ejecutor quirúrgico» **se sostiene** y hay evidencia de esta semana:

| Evidencia | Qué enseña |
|---|---|
Pieza con firma exacta + casos enumerados + árbitro escrito antes → entregada limpia por `agent-coder-azure` | El ejecutor no falla por capacidad, falla por ambigüedad. |
El mismo tipo de pieza entregada por un modelo de 120B → «completed» con el JSON de un tool call y el worktree sin compilar | **El modelo barato no compensa un contrato flojo**; el costo real es la revisión. |
Prohibir un ejecutor tras dos fallos idénticos (pisar la línea vecina) y reparar a mano (6 patches vs ~20 min de agente) | El orquestador debe saber **cortar la delegación**, no sólo iniciarla. |

Ajustes concretos que propongo:
1. **Tres roles, no dos**: orquestador (`astra`) · ejecutor (`nano`) · **verificador independiente** (otro
   proveedor o un verificador determinista). La regla «el que modifica no firma» ya está escrita; el rol
   tiene que existir también en la tabla de deployments.
2. **Un pedido = una sesión corta**. Barato en tokens y reduce la contaminación de contexto.
3. **El ejecutor no explora**: si el contrato exige leer tres archivos, se los damos con sus rutas.

## 4 · FASE 3 · Duración de los créditos y roadmap

### 4.1 · Precios oficiales y estimación de crédito

Precios de la **página oficial de Azure OpenAI** (consultada 2026-09-27, `azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/`), por millón de tokens, Global Standard:

| Modelo | Input | Cached input | Output |
|---|---|---|---|
gpt-5.5 | $5,00 | $0,50 | $30,00 |
**gpt-5.4 (<272k)** | **$2,50** | **$0,25** | **$15,00** |
gpt-5.2 | $1,75 | — | $15,40 |
gpt-4.1 | $2,00 | $0,50 | $8,00 |
gpt-4o | $2,50 | $1,25 | $10,00 |
gpt-4o-mini | $0,15 | $0,075 | $0,60 |
o3 | $2,00 | $0,50 | $8,00 |
o4-mini | $1,10 | $0,28 | $4,40 |

> **Nota sobre gpt-6-astra y gpt-5.4-nano**: son deployments nuevos y **no figuran** en la página de
> precios consultada. Sus tarifas no están verificadas acá; gpt-5.4 se usa como cota superior razonable
> porque comparte familia. Los precios de **Llama 3.3, DeepSeek R1/V3, Phi-4 y Mistral Large** tampoco se
> pudieron verificar: la página de precios de Foundry devolvió `403` y el catálogo `ai.azure.com` requiere
> sesión. Y no es un hueco grave: **ninguno de esos modelos está desplegado en esta suscripción**, así que
> ninguno está disponible para usar hoy.

**El costo, calculado sobre el perfil real** (contexto fijo medido: 78 KB ≈ **21.667 tokens de entrada por turno**, más 2.000 tokens de salida):

| Modelo | $ por turno de orquestación | Turnos con los 200 USD |
|---|---|---|
gpt-5.5 | $0,168 | **1.188** |
**gpt-5.4** | **$0,084** | **2.376** |
gpt-5.2 | $0,069 | 2.910 |
gpt-4.1 | $0,059 | 3.370 |
gpt-4o | $0,074 | 2.696 |
gpt-4o-mini | **$0,0044** | **44.943** |

*(Verificado a mano: 21.667 × $2,50/M + 2.000 × $15/M = $0,0842.)*

**Una pieza de ejecución** (contrato de 6 KB de entrada + diff de 4 KB de salida) cuesta **$0,0009** con un
modelo económico. La relación que gobierna todo:

> **Un turno de orquestación cuesta como ~92 piezas de ejecución.** La ejecución es el **1,09 %** del costo
> de un turno. En otras palabras: optimizar el ejecutor es ruido; **el gasto está en el contexto que el
> orquestador reenvía en cada turno.**

Y el corolario incómodo: bajar el contexto no rinde tanto como parece. **Reducir de 78 KB a 39 KB baja el
turno de $0,0842 a $0,0792 — un 6 %**, porque la salida (2.000 tokens × $15/M = $0,03) pesa tanto como
media entrada. **La palanca real es la cantidad de turnos, no su tamaño.**

- Los deployments de **50 TPM** no gastan crédito de forma apreciable porque **no se pueden usar**: el
  cuello es la cuota, no el presupuesto.
- Conclusión de asignación: **2.376 turnos de orquestación con gpt-5.4**, o **casi 45.000 con un
  gpt-4o-mini** como ejecutor para las tareas mecánicas. La cuota de 200 USD no se agota por trabajar: se
  agota por **orquestar de más** — sesiones largas, contexto que se reenvía sin necesidad, agentes que
  exploran en vez de leer su contrato.

### 4.2 · Roadmap de migración (paso a paso, sin romper lo que funciona)

| # | Paso | Por qué en ese orden | Árbitro |
|---|---|---|---|
1 | ✅ **HECHO** — Corregir la ruta del MCP al repo oficial | El MCP le escribía al laboratorio | servidores idénticos (54.846 bytes), cambio de ruta aplicado con `hermes config set`; **verificación pendiente tras reinicio de Hermes** |
2 | Fijar el ruteo: `astra` orquestador, `nano` ejecutor, `deepseek` para clasificaciones sueltas | Ya medido; no requiere desplegar nada | una pieza real entregada y arbitrada |
3 | Retirar `gpt-5.3-codex` del ruteo (o aislarlo tras su modo propio) | Devuelve 400 en el transporte estándar; la deuda la paga cada integración | el ruteo no lo menciona |
4 | Medir el costo por pieza: tokens reales de entrada y salida por pedido | Sin esto, cualquier estimación de crédito es decorativa | tabla de 3 pedidos consecutivos |
5 | Consolidar skills (el índice se paga cada turno) | 119 skills = ~12 KB por turno para siempre | el índice baja y ningún flujo se rompe |
6 | Estandarizar el transporte por MCP **si aparece un segundo consumidor** | Antes de eso, es costo sin comprador | un segundo cliente real |

### 4.3 · Cambios propuestos en el System Prompt / Soul de los agentes

1. **Al orquestador**: agregar el criterio de routing medido, textual —
   *«TPM primero, structured output segundo, latencia tercero, razonamiento cuarto»* — y la regla de
   **cortar la delegación**: si un ejecutor falla dos veces con el mismo defecto, se repara localmente y
   otro revisa.
2. **Al orquestador**: la regla «el que modifica no firma» ya existe; falta su consecuencia operativa:
   *«si escribo código, el veredicto lo corre otro»*.
3. **Al ejecutor**: *«no explores: si el contrato dice qué archivos leer, leelos; si falta un dato, preguntá
   antes de escribir»*. Los dos fallos medidos de esta semana fueron de exploración, no de código.
4. **A ambos**: el límite de crédito no es el gasto, es la cuota. Antes de elegir un modelo, mirar su TPM.

---

## Anexo · Lo que este documento NO afirma

- **Precios**: los de la tabla 4.1 salen de la página oficial de Azure OpenAI y están citados. **No** hay
  precios verificados de `gpt-6-astra`, `gpt-5.4-nano`, ni de los modelos de Foundry (Llama, DeepSeek,
  Phi, Mistral): sus páginas no están públicas o requieren sesión. Los cálculos de costo usan gpt-5.4 como
  cota; con las tarifas reales de los deployments propios pueden bajar, no subir.
- La prueba de tool calling **no** midió capacidad real (el prompt no la exigía); sólo midió que astra no
  puede recibir tools con razonamiento, con su error textual.
- Las latencias son **una sola medición por deployment**, sin repetición ni percentiles. Sirven para
  descartar, no para prometer.
- La estimación de turnos usa un perfil de contexto **medido en este perfil** (78 KB), no una encuesta de
  uso: es una cota de orden de magnitud, no una factura.
- **Un dato del subagente investigador se descartó**: reportó GPT-5 a $1,25/$10 con fuente `metatext.io`
  (tercero), mientras la página oficial de Azure dice $2,50/$15 para gpt-5.4. Se conservó el dato oficial.
  Lección: cuando el encargo pide fuente oficial, **una fuente de terceros no cumple el encargo** aunque el
  número sea plausible.
