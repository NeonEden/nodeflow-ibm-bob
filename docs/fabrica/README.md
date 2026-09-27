# Mini-Fábrica Multi-Agente de NodeFlow

Los cuatro documentos de la fábrica, en orden de lectura. Escritos el 26/09/2026 a partir de las decisiones
de la sesión y de lo que el repo ya tiene **medido** (no de lo que suena bien).

| # | Documento | Qué resuelve |
|---|---|---|
| 1 | [`01-ARQUITECTURA-FABRICA.md`](01-ARQUITECTURA-FABRICA.md) | jerarquía, esquema de comunicación, matriz de routing, cuándo se invoca a Bob y los ~10 coins |
| 2 | [`02-SINTETIZADOR-COGNITIVO.md`](02-SINTETIZADOR-COGNITIVO.md) | dictado → nodos: dos capas, contrato de datos con tipos reales, optimización de tokens, invariantes |
| 3 | [`03-SYSTEM-PROMPT-BOB.md`](03-SYSTEM-PROMPT-BOB.md) · [`prompt-bob.txt`](prompt-bob.txt) | el system prompt quirúrgico (~230 palabras) + su bloque de contexto permanente |
| 4 | [`04-PROTOCOLO-INTEGRACION-Y-CHECKLIST.md`](04-PROTOCOLO-INTEGRACION-Y-CHECKLIST.md) | los 4 sobres de mensaje, el ciclo de 8 pasos, los pasos inmediatos y la checklist de submission |

## La jerarquía en una tabla

| Rol | Quién | Qué hace | Costo |
|---|---|---|---|
| Decide y aprueba | **Tomas** | intención, criterio, veto, publica | — |
| **Líder / orquestador** | **DeepSeek** | lee el archivo grande, corta la pieza, escribe el contrato, integra, corre los árbitros, audita | tokens de orquestación |
| Cerebro complementario | **Astra** (`agent-commander`) | revisa el contrato antes de repartir; encuadre y diseño | Azure · gpt-6-astra, cuota medida 1000 TPM |
| Volumen | **enjambre** (coder-azure · executor-granite · scout · auditor-grok) | piezas de código, i18n, investigación, auditoría | Azure + local (0 USD) |
| **Especialista quirúrgico / sintetizador** | **Bob** (IDE) | piezas nuevas y delicadas del flujo voz→nodos: parser, validación, temporalidad | **≤1 coin por pieza · quedan ~10 de 40** |

**La regla que ordena todo**: el que planifica no ejecuta, el que escribe no audita, y el contexto caro
(leer el archivo grande, decidir el corte, integrar) **no se delega** a una ventana corta.

## Invocación

```bash
# enjambre (perfil de Hermes, desde el worktree del repo)
hermes -p agent-coder-azure chat -q "$(cat docs/hackathon/pedido-07.txt)" --oneshot

# Bob (IDE, con el prompt de prompt-bob.txt como system prompt)
bobide "C:/Users/tomas/Desktop/Nodeflow BOB/nodeflow-ibm-bob"
```
