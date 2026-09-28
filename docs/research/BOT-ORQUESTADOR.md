# BOT-ORQUESTADOR — el orquestador definitivo

**Perfil:** `orquestador-nano` · **Modelo:** `gpt-5.4-nano` · **Creado:** 2026-09-27

## Por qué ese modelo, y no otro

Se eligió por **dos pruebas ejecutadas**, no por catálogo ni por intuición:

**1 · Lectura de contratos con 8 defectos sembrados** (`prueba-5b/`):

| Modelo | TPM | Recall | Reportados | Esquema | Tiempo |
|---|---|---|---|---|---|
gpt-4.1-mini | 100 | 1/8 | 3 | OK | 5 s |
DeepSeek-V4-Flash | 20 | 4/8 | 5 | OK | 8 s |
**gpt-5.4-nano** | **5000** | **6/8** | **6** | OK | **11 s** |
gpt-6-astra | 1000 | 6/8 | 8 | OK | 23 s |
grok-4.6 | 50 | 7/8 | 11 | OK | 99 s |
gpt-5 · gpt-5-mini | 50 | sin contenido | — | — | 25 · 16 s |

Nano empata el mejor recall razonable **sin una sola pieza de ruido**, en la mitad del tiempo y con cinco
veces la cuota. Astra (razonamiento) no superó su lectura, y los modelos de razonamiento de 50 TPM devuelven
vacío.

**2 · Ciclo de herramientas completo** (pedir la tool → recibir el resultado → usarlo):

| Modelo | Emite tool_call | Argumentos | Usa el resultado | Ciclo |
|---|---|---|---|---|
**gpt-5.4-nano** | ✅ | ✅ | ✅ | **5 s** |
grok-4.6 · gpt-4.1-mini | ✅ | ✅ | ✅ | 8 s · 4 s |
**gpt-6-astra** | ❌ **HTTP 400: «Function tools with reasoning_effort are not supported for this model»** | | | |

Un orquestador **sin herramientas no puede verificar nada**: astra queda para auditoría de criterio, no para
el rol. **Nano es el único que pasó las dos pruebas con margen.**

## La configuración (reproducible)

```bash
hermes profile create orquestador-nano
hermes -p orquestador-nano config set model.default  gpt-5.4-nano
hermes -p orquestador-nano config set model.provider azure-foundry
hermes -p orquestador-nano config set model.base_url https://tomaspieruz-suuth-resource.services.ai.azure.com/openai/v1
hermes -p orquestador-nano config set model.api_mode chat_completions
hermes -p orquestador-nano config set model.auth_mode api_key
hermes -p orquestador-nano config set approvals.mode smart
# credencial: se copia la linea AZURE_FOUNDRY_API_KEY desde un perfil que ya funciona, sin imprimirla
```

Decisiones de diseño, cada una con su motivo:

- **Perfil limpio, sin clonar.** Clonar habría arrastrado 119 skills ajenos: el índice de skills se paga en
  **cada turno**. El bot arranca sin lastre.
- **`approvals.mode: smart`** y no `manual`: con `manual`, cada comando pide permiso y una tarea se queda
  colgada esperando a un humano que no está.
- **`SOUL.md` de 5,9 KB.** Denso pero acotado, por la misma razón: el contexto fijo se paga siempre.

## La SOUL

Vive en `%LOCALAPPDATA%\hermes\profiles\orquestador-nano\SOUL.md`. Contiene, destilado, todo lo que costó
aprender en esta investigación:

1. **Rol**: no hace el trabajo pesado — lo lee, lo corta, lo despacha, lo verifica y lo firma.
2. **La regla madre**: el trabajo no está hecho hasta que un árbitro lo confirma en disco; **lo no ejercitado
   es NO VERIFICADO**.
3. **El ciclo de 7 pasos** de un pedido, empezando por *inspeccionar lo existente* y por **escribir el
   árbitro antes que la tarea**.
4. **La tabla de routing medida** con los TPM de cada deployment, para que no vuelva a descubrir que un
   modelo brillante con 50 TPM no sostiene un turno.
5. **Los cuatro criterios de elección**, incluido el que corrige la intuición: **el precio no elige, elige el
   costo por entrega aceptada** (una falla multiplica por 4,2).
6. **Auditar su propia herramienta antes de auditar a otro**: la ruta del MCP, el modelo de la sesión (que
   pisa al del config) y el TPM.
7. **Lo que NO hace**: no inventa (para y reporta), no referencia sin comprobar, no deja un límite ambiguo,
   no despacha por inercia tras dos fallos, no migra dos cosas a la vez.
8. **Estado en disco como verdad**; el resumen es índice, no prueba.
9. **Estilo**: directo y ejecutable. Y la última regla, que es la que ordena todo lo demás: **el documento se
   corrige, no el resultado**.

## Prueba de funcionamiento (ejecutada)

Se le pasó el contrato con los defectos sembrados, sin decirle qué buscar:

```
$ hermes -p orquestador-nano chat -q "Sos el orquestador. Antes de despachar este pedido,
  revisalo: .../PEDIDO-11-PRUEBA-voz-cola-de-espera.md. Decime si es apto y que problemas tiene.
  Verifica en disco lo que afirmes."
```

**Resultado** (crudo): veredicto **«No es apto para despachar»** con **cinco defectos**, cada uno con su
verificación explícita (*«Verificado: en `src/` no existe `sesionVoz.ts`»*), y —lo más importante— **se negó a
inventar la decisión que el contrato no toma**:

> *«para hacerlo bien necesito que me confirmes si querés persistencia en localStorage, bóveda, o solo estado
> en memoria (porque el "retomar cuando quiera" no está especificado con verificación)»*

Eso es lo que separa a este bot de un modelo crudo: **no sólo lee mejor — se detiene donde debe**. El mejor
modelo crudo de la prueba sacó 7/8 con ruido; este bot sacó cinco defectos *verificados en disco* y una
pregunta que evita una decisión inventada.

## Cómo usarlo

```bash
hermes -p orquestador-nano chat -q "<pedido>" -Q          # one-shot
hermes -p orquestador-nano                                # interactivo
```

Y desde cualquier sesión: aparece como perfil propio en el roster de Bot Mode, así que se le puede escribir
como a cualquier otro agente.

## Lo que este bot NO resuelve

- **No reemplaza la verificación independiente.** En la prueba, ningún modelo sacó 8/8: **un contrato no se
  audita con un solo lector**, y conviene que el auditor sea de otra familia (nano ve lo que astra no, y
  astra ve lo que nano no).
- **No arregla la cuota.** Si el trabajo excede los 5000 TPM, hay que esperar; el bot no lo evita, lo hace
  visible.
- **Su SOUL es una hipótesis probada una vez.** Está escrita con mediciones, pero una sola corrida no la
  convierte en verdad: la prueba de aceptación hay que volver a correrla cuando cambie el modelo.
