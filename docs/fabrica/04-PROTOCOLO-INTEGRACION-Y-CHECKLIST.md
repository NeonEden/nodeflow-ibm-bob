# Mini-Fábrica Multi-Agente de NodeFlow — §4 Protocolo de integración y checklist

## 1 · Los cuatro sobres (formato exacto, copiar y pegar)

### 1.1 `PEDIDO` — del orquestador al ejecutor (una pieza, un entregable)

```text
PEDIDO: <slug corto>
CONTRATO (commiteado): docs/<ruta>/PEDIDO-<NN>-<tema>.md      ← el mensaje sólo lo apunta
WORKTREE: <ruta absoluta, entre comillas>                      ← trabajá SIEMPRE ahí
ENTREGABLE: <un archivo nuevo> + <su test>
FIRMA (exacta, tipos reales del repo):
  export function <nombre>(<params tipados>) -> <tipo>
CASOS (uno por línea, son los tests):
  1. <entrada> → <salida esperada>
  2. ...
PATRONES QUE PODÉS LEER (y ningún otro):
  - <archivo de lógica pura>
  - <archivo de test>
PROHIBIDO TOCAR: <archivo1>, <archivo2>   ← son de otro pedido / ya mergeados
  Si creés que el arreglo va ahí: escribilo en el informe, no lo hagas.
ÁRBITROS: corre `npx tsc --noEmit` y `npx vitest run` y pegá la salida real.
  NO corras `cargo test` ni builds (los corro yo).
CIERRE: archivos tocados · tests antes/después · qué te pareció discutible del contrato.
COMMIT: no commitees (integro yo) | commiteá con este mensaje: <msg>
```

### 1.2 `ENTREGA` — del ejecutor al orquestador (rama, no chat)

```text
RAMA: feat/<tema>   COMMIT: <sha>
ARCHIVOS: <git diff --stat real>
TESTS: <n>/<n> — salida pegada, no resumida
NO HICE: <lo que quedó afuera, con el motivo>
DISCUTIBLE DEL CONTRATO: <hallazgos, o «nada»>
```

### 1.3 `AUDITORIA` — de un revisor con contexto aislado (otro proveedor, otro sesgo)

```text
AUDITÁ: <sha1>, <sha2>   CONTRA: <documento del contrato>
INVARIANTES: <los de la casa: aristas colgadas 0 · huérfanos 0 · una creación por turno · sin casts>
SALIDA: veredicto (aprueba / rechaza) + severidad + archivo:línea + evidencia + qué lo arregla.
No inventes hallazgos para parecer útil: «no encontré problemas en X» es una respuesta válida.
PROHIBIDO: editar archivos, correr builds, correr los árbitros (ya los corrí).
```

### 1.4 `VEREDICTO` — del orquestador al repo (el único que firma)

```text
git diff --stat  (¿tocó sólo lo pedido?)
git status --porcelain  (¿dejó basura?)
<árbitro> → <salida real>
flujo real (si lo dispara un usuario) → <resultado observado>
→ merge / rechazo con el motivo escrito en el commit
```

## 2 · El ciclo, en 8 pasos

1. **Decidir el corte** (yo): leo el archivo grande, decido dónde va cada cosa, elijo la pieza.
2. **Escribir el `PEDIDO` y commitearlo** — sin commit no existe para un agente en otro worktree.
3. **Astra lo revisa antes de repartir** (documento autocontenido, prohibido editar): suele corregir el corte.
4. **Worktree + junction de `node_modules`** (PowerShell `New-Item -ItemType Junction`); verificar con
   `test -f node_modules/.bin/vitest`.
5. **Invocar** `hermes -p <perfil> chat -q "$(cat pedido.txt)" --oneshot` en background, desde el worktree.
   Bob: por su GUI, con el mismo texto (Bob es IDE, no perfil).
6. **A los ~30 s, leer su estado** (no el `exit_code`): un bot muerto adentro deja el proceso vivo.
7. **Verificar yo**: `git diff --stat` + `git status --porcelain` + árbitros + (si hay usuario en el medio)
   la corrida real. Los tests verdes de la pieza **no** reemplazan la corrida contra el sistema.
8. **Merge a `main`**; el informe del auditor se guarda partido en «aplicado» / «queda».

## 3 · Payloads entre agentes

| De → a | Payload | Dónde vive | Nunca viaja por |
|---|---|---|---|
| Tomas → DeepSeek | intención, criterio, veto | chat | — |
| DeepSeek → Astra | documento autocontenido + preguntas numeradas | `docs/…/pedido-astra-*.md` (commiteado) | chat suelto |
| DeepSeek → bot | `PEDIDO` (§1.1) | `docs/hackathon/PEDIDO-*.md` + una línea de chat que lo apunta | el pedido entero tipeado |
| DeepSeek → Bob | el mismo `PEDIDO` + `prompt-bob.txt` como system prompt | GUI de Bob (`bobide "<ruta>"`) | API (Bob no es API) |
| bot → DeepSeek | rama + commit + informe (§1.2) | el repo | su resumen de chat |
| auditor → DeepSeek | hallazgos con `archivo:línea` | `docs/…/auditoria-*.md` | prosa en el chat |
| DeepSeek → repo | merge + árbitros corridos | `main` + el commit | — |
| app → agentes | nada | la app es consumidor del lienzo, no orquestador | — |

**Regla de oro del payload**: lo que decide algo **vive en un archivo commiteado**. El chat sólo transporta
punteros. Si una decisión importante quedó en una conversación, en la ventana siguiente no existe.

## 4 · Pasos de código inmediatos

### 4.1 Antes del cierre (27/09 15:00 UTC) — sólo lo que destraba la entrega

| # | Paso | Quién | Por qué |
|---|---|---|---|
| 1 | **Capturas del `task session consumption summary`** (Tasks → la tarea → click en la **cabecera**) → `bob_sessions/nodeflow_task0N_<desc>_summary.png` | Tomas | **requisito de elegibilidad**; no consume coins |
| 2 | Grabar el video (voz IA, guion `VIDEO-SCRIPT-EN.md`, Bob antes del minuto 1) y montar con subtítulos | Tomas | único entregable que falta |
| 3 | Subir la submission **con margen** y verificar desde acceso público (video, PDF, repo, demo) | Tomas + DeepSeek | un envío no se corrige después del cierre |
| 4 | *Opcional cosmético*: los 2 textos que quedaron en español en la UI inglesa (la cabecera `LIENZO` y el pill `grabado`) → arreglo en el componente + datos del mock, rebuild y release | DeepSeek | sólo si grabás con la interfaz en inglés; no es feature |

**No se agrega nada más.** La auditoría del deck fue explícita: funciones nuevas, integración voz→Bob,
migraciones, firma de instaladores y rediseños **no** entran antes del cierre.

### 4.2 La primera pieza después del cierre (la que sí justifica 1 coin)

`PEDIDO-07 — parser del sintetizador (capa cognitiva)`:

```text
ENTREGABLE: src-tauri/src/sintetizador.rs (módulo nuevo) + sus tests
FIRMA (exacta, tipos reales):
  pub fn sintetizar_tema(texto: &str, ancla: Option<&str>, turno: u64) -> Vec<Tema>
  pub struct Tema { pub titulo: String, pub descripcion: String, pub id: String }
REGLAS: titulo = primeras 7 palabras sin cortar palabras · id = idDeTema(turno, i) · si texto < 3
  palabras → Vec vacío (no inventa) · nunca lee I/O ni red (puro)
CASOS:
  1. "" → vec![]                         2. "quiero un nodo" → 1 tema, título "Quiero un nodo"
  3. dos temas separados por pausa → 2 temas con ids idDeTema(7,0) e idDeTema(7,1)
  4. "no, mejor dicho X" → 1 tema, reemplaza el anterior (no agrega)
  5. texto de 40 palabras → título de 7 palabras, sin cortar la séptima a la mitad
PROHIBIDO TOCAR: App.tsx, VozPanel.tsx, segmentador.rs (ya mergeados)
```

Por qué ésta y no otra: es **nueva sin reemplazar nada** (criterio A), un error ahí no lo caza la suite
porque define el contrato de ids que el lienzo persiste (B), y tiene casos enumerados y cardinalidad
verificable contra el emisor real (C).

## 5 · Checklist final de la submission

- [ ] `bob_sessions/` con **las capturas de consumo** (nombres `nodeflow_task0N_<desc>_summary.png`) + `tareas.md` + `attribution.md` (regenerables con `python scripts/bob-evidencia.py`).
- [ ] Video (≤3 min, inglés, subtítulos) subido y accesible desde **público**.
- [ ] `docs/hackathon/submission/`: `cover-en.png` (1280×640) + `slides-en.pdf` (**8 páginas**) + `app.png` (la captura en inglés).
- [ ] Formulario: textos de `FORM-TEXTS-EN.md` (título, descripciones, tags) — y la sección «what we do NOT say» respetada.
- [ ] Repo público con `main` verde, los commits que la submission cita (`cff0baa`, `e84fb5b`, `8582026`, `0e059ed`, `0d05b2f`, `a42be37`) y el release publicado.
- [ ] Demo `https://nodeflow-ibm-bob.vercel.app`: `/api/idioma` → `en`, interfaz en inglés para un navegador que no sea español.
- [ ] Subida **con margen**, y verificada desde una ventana privada (no desde la sesión con sesión abierta).

## 6 · Lo que NO se toca (nunca)

- La app viva de Tomas (proceso, binarios, reinicios) — un bot que la toca la deja en blanco.
- `main` a mano: todo entra por PR.
- Los contratos ya cumplidos (`PEDIDO-01..06`): son la evidencia del método, no se reescriben.
- `attribution_logs`: está en **0 filas** y se declara así. No se rellena con datos inventados.
