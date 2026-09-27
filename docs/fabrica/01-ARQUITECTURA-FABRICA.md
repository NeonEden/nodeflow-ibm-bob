# Mini-Fábrica Multi-Agente de NodeFlow — §1 Arquitectura y routing

> Estado: **diseño de producción**. Escrito el 26/09/2026 a partir de decisiones tomadas en esta sesión y
> de lo que el repo ya tiene medido. Complementa —no reemplaza— `multi-agent-repo-orchestration` y su
> `references/enjambre-de-bots-hermes.md`.
>
> **Ventana**: el cierre de IBM Bob 2.0 es el 27/09 15:00 UTC. Nada de lo que sigue se implementa antes de
> subir la submission: la arquitectura ordena el trabajo **después**. Antes del cierre sólo corre la
> checklist de `04-PROTOCOLO-INTEGRACION-Y-CHECKLIST.md` §4.

## 0 · Los tres recursos escasos (el diseño sale de acá)

| Recurso | Cuánto queda | Qué lo gasta | Consecuencia en el routing |
|---|---|---|---|
| **Bobcoins** | **29.99 / 40** usados (≈ 75 %) → ~10 coins | una tarea de Bob en el IDE | Bob es el **último** recurso, para piezas que no admiten error. Nunca para explorar |
| **Azure Foundry** | 197 USD de crédito | tokens de gpt-5.x / grok / DeepSeek-V4 | se usa con aire (2500 TPM), no para leer archivos con una cuota de 20-50 TPM |
| **VRAM + CPU (RX 6700 XT 12 GB)** | 1 modelo residente, 1 build pesado por vez | Ollama (`keep_alive` 5 min) y `cargo build` | todo lo que compile o genere va **serializado**, no en paralelo |

Costo medido de una sola tarea de Bob (26/09): **US$ 1,79 y 56.852 tokens de contexto**, con
`attribution_logs` en **0 filas** — la evidencia de Bob sale de `tasks` + el commit, no de la tabla que el
guide nombra. Ese es el precio real de un coin mal gastado: no es dinero, es **la evidencia que no se puede
volver a producir**.

## 1 · Jerarquía y esquema de comunicación

```
                         ┌─────────────────────────────────────────────┐
                         │  TOMAS — decide, aprueba, corta, publica    │
                         └────────────────────┬────────────────────────┘
                                              │ (chat: intención, criterio, veto)
                                              ▼
                         ┌─────────────────────────────────────────────┐
                         │  DEEPSEEK (agent-orquestador) = YO          │
                         │  leo el archivo grande · corto la pieza ·   │
                         │  escribo el contrato · integro · corro los  │
                         │  árbitros · audito la entrega               │
                         └───┬──────────────┬──────────────┬───────────┘
             contrato commiteado  │              │              │  contrato commiteado
                                  ▼              ▼              ▼
                    ┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
                    │ ASTRA            │ │ ENJAMBRE     │ │ BOB (IDE)        │
                    │ agent-commander  │ │ (5 perfiles) │ │ quirúrgico       │
                    │ razona, critica  │ │ producción   │ │ ≤10 coins        │
                    │ el contrato      │ │ de volumen   │ │ pieza + tests    │
                    └────────┬─────────┘ └──────┬───────┘ └────────┬─────────┘
                             │                  │                  │
                             └──────────────────┴──────────────────┘
                                        │  entrega = RAMA, no chat
                                        ▼
                         ┌─────────────────────────────────────────────┐
                         │  REPO (main inmutable)                      │
                         │  contrato → rama → PR → árbitros → merge    │
                         │  evidencia = commit + salida del árbitro    │
                         └─────────────────────────────────────────────┘
```

**Las tres reglas del canal, y ninguna se negocia:**

1. **El canal es el repo, no el chat.** Un pedido que no está commiteado (`docs/hackathon/PEDIDO-*.md`) no
   existe para un agente que trabaja en otro worktree: su ventana se olvida. El mensaje de chat sólo
   **apunta** al documento.
2. **La entrega es una rama con su commit.** Un agente que dice «listo» sin `git diff --stat` no entregó.
3. **El veredicto lo firma el orquestador**, corriendo los árbitros sobre el commit ajeno. El reporte del
   agente es un punto de partida, nunca la prueba.

## 2 · Matriz de routing (quién resuelve qué)

| Tipo de trabajo | Quién | Por qué ahí | Cierre verificable |
|---|---|---|---|
| Leer el archivo grande, decidir dónde va cada cosa, elegir el corte | **DeepSeek** | el contexto caro no se delega a una ventana de 6 mensajes | — |
| Escribir/endurecer el **contrato** (`PEDIDO-*.md`) con firma exacta y casos enumerados | **DeepSeek** | es el plan; el que planifica no ejecuta | `git log` del contrato **antes** del código |
| Revisar el contrato **antes** de repartir; encuadre, relato, posicionamiento | **Astra** | razona sobre un documento y suele corregir el diagnóstico de quien preguntó | informe commiteado, partido en «aplicado» / «queda» |
| Pieza nueva de frontend/backend con firma exacta + tests (archivos nuevos) | **Enjambre** (coder-azure) | pieza, no tarea: 2m45s verde contra 4 fallos de una tarea | rama + `tsc`/`vitest` corridos por mí |
| i18n, textos, conteos, transformaciones mecánicas, volumen | **Enjambre** (executor-granite, local) | 0 USD, no toca la placa más de lo permitido | diff + `tsc` |
| Traer de afuera: docs, precios, competencia, prospectos | **Enjambre** (scout) | buscar en varios lados es lo que mejor hace | fuentes citadas |
| Auditar código ajeno (diff + contrato, otro proveedor = otro sesgo) | **Enjambre** (auditor-grok) | quien escribe no audita | hallazgos con `archivo:línea` + evidencia |
| **Pieza delicada con cero margen de error** — parsing/validación de voz a nodos, mutación del grafo, migraciones, seguridad | **Bob** | única cosa que justifica ~1 coin | rama + commit + árbitros + **prueba contra el emisor real** |
| Integrar, correr los árbitros, mergear, publicar | **DeepSeek** | el cierre no se delega | salida real del comando |

### Las 7 reglas duras del routing

1. **Una pieza, no una tarea.** Lo que exige sostener contexto (integrar en un archivo de 5.000 líneas)
   lo hace el orquestador. Al bot se le da **firma de entrada/salida + casos enumerados**, archivos nuevos.
2. **La pieza no explora.** Si el pedido necesita que el bot lea 3 archivos para arrancar, el corte está
   mal: se parte más o lo hago yo.
3. **Un escritor por archivo** (también entre bots). Reparto por archivo, verificado antes de asignar; si
   comparten uno, van en serie y el segundo sale después del merge.
4. **Cardinalidad explícita en todo contrato que se enganche a un evento externo.** «Cero durante los
   parciales, exactamente una al cerrar, aunque el cierre llegue repetido» + la prueba contra el emisor
   real. Sin esto, el contrato pasa su propia revisión y entrega un defecto de temporalidad (medido: los
   nodos de la cadena se creaban **una vez por fragmento**, y el arreglo llegó en `0e059ed`).
5. **Ninguna firma se escribe de memoria.** Antes de pedir una pieza que recibe un estado o un enum:
   `grep -n 'export type <Tipo>'` y enumerar los valores literales **del repo**. Inventar valores produce
   un cast (`as unknown as T`) en la entrega, que es la señal de que la firma está mal.
6. **Prohibiciones archivo por archivo** en el pedido, con qué hacer si cree que el arreglo va ahí
   (escribirlo en el informe, no hacerlo). Un límite que el otro no puede ver sólo existe si está escrito.
7. **El bot no corre los árbitros pesados.** `tsc`/`vitest` puede; `cargo test` (compila desde cero en su
   worktree) lo corro yo. El pedido lo dice explícitamente.

## 3 · Cuándo se invoca a Bob (lista cerrada)

Bob entra **sólo** si se cumplen las tres:

- **A)** la pieza es **nueva o reemplaza una existente** con una firma que ya está en el repo (nada de
  «integrá esto en App.tsx»);
- **B)** un error ahí **no lo caza la suite** — validación de un evento externo, temporalidad, mutación del
  grafo, parsing de dictado, migración, credenciales;
- **C)** el contrato tiene **casos enumerados** y una prueba contra el **emisor real**.

**No se invoca a Bob para**: explorar, refactorizar, escribir tests sueltos, tocar UI/i18n, documentar,
formatear, integrar, o «revisar» (eso es el auditor). Cada una de esas ya tiene dueño con costo cero.

**Presupuesto de los ~10 coins que quedan** (propuesta, decide Tomas):

| Coins | Uso | Estado |
|---|---|---|
| 0 | **antes del cierre**: la evidencia obligatoria son capturas y la app ya funciona | no se gasta nada |
| 1 | si el jurado pide un cambio funcional puntual post-submission: el segmentador y su cliente | reservado |
| 1-2 | el parser de la capa cognitiva del sintetizador (§2 del documento 02) | reservado, post-deadline |
| resto | **no se gasta**: un coin sin pieza delicada es evidencia que se pierde | intocable |

## 4 · Aislamiento (no negociable)

- **Worktree propio** por escritor, creado desde el remoto: `git worktree add "../nf-<tema>" -b feat/<tema> origin/main`.
- **`node_modules` enlazado por junction de PowerShell** (`New-Item -ItemType Junction`; `mklink /J` desde
  MSYS falla en silencio). Verificar por un archivo adentro: `test -f node_modules/.bin/vitest`.
- **Un bot nunca toca la app viva de Tomas**: ni el proceso, ni los binarios, ni un reinicio. El estado que
  rompe no lo ve él, lo sufre la siguiente verificación.
- **Un build pesado por vez**, avisando. La PC se satura y dos `cargo` pelean por el mismo `target/`.

## 5 · Árbitros y evidencia

| Árbitro | Comando | Cuándo |
|---|---|---|
| tipos | `npx tsc --noEmit` | todo PR de front |
| tests front | `npx vitest run` | todo PR de front (135/135 al 26/09) |
| tests Rust | `cargo test --manifest-path src-tauri/Cargo.toml --lib` | todo PR que toque `src-tauri/` (324/324 al 26/09) |
| ruta HTTP | test del handler (`voz_parcial(Json(..))` → `into_response` → `to_bytes`, `#[tokio::test]`) | endpoints de voz |
| flujo real | atajo sintético contra la app corriendo | si el camino lo dispara un usuario |

Regla de cierre: **veredicto = `git diff --stat` + `git status --porcelain` + la salida real de los
árbitros**. Y si el pedido toca un camino que un usuario dispara, los tests verdes **no** alcanzan: hace
falta la corrida contra el sistema.

## 6 · Presupuesto de las horas que quedan

| Ventana | Trabajo | Quién |
|---|---|---|
| ahora → cierre | capturas de consumo de Bob · grabación del video con guion EN · subir la submission **con margen** | Tomas |
| ahora → cierre | sólo lo que destraba la submission (nada de features) | DeepSeek |
| post-submission | capa cognitiva del sintetizador · parser en pieza para Bob · SOULs y `ROLES.md` al día | fábrica |

**Lo que NO se hace antes del cierre**: funciones nuevas, integración voz→Bob automática, migraciones,
firma de instaladores, rediseño, benchmarks improvisados. Y **no se agregan disclaimers para conservar una
afirmación sin respaldo: se quita la afirmación** (eso ya se aplicó al deck).
