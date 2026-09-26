# Plan: la app que se explica sola y el turno que cierra de verdad

26/09/2026 · ejecución autónoma (el usuario se ausentó; se decide y se sigue hasta que funcione) ·
Bob **no** se usa salvo necesidad extrema (quedan ~10 créditos y cierra el 27/09).

## Los dos problemas (causa raíz ya identificada, no supuesta)

### 1 · El turno queda clavado en «escuchando»

**Evidencia** (`%LOCALAPPDATA%\com.nodeflow.desktop\logs\NodeFlow.log`, prueba real de hoy 18:48–18:50):

```
21:50:02 voz(ui) atajo.toggle turno=1 estado=escuchando
21:50:02 voz(ui) turno.cierre_duplicado turno=1
21:50:03 voz(ui) atajo.toggle turno=1 estado=escuchando
...
```

`atajo.toggle` repetido a ~1 Hz, 19 veces seguidas, con el grafo guardándose en el medio (`rev 12 → 18`).

**Causa**: el handler del atajo (`src/components/VozPanel.tsx:945`) corta cuando el micrófono está
encendido, pero **`cortar()` no devuelve el estado a `inactivo`**. El siguiente `pressed` vuelve a ver «mic
encendido», vuelve a cortar, y el panel queda en «escuchando» sin poder salir.

El log muestra además `turno.cierre_duplicado`: el guard del fix anterior **sí está actuando** (los nodos no
se duplican). El defecto es otro: **la transición posterior al corte**.

### 2 · Al abrir la app no hay nada que explique qué hacer

- `src/components/WelcomeModal.tsx` **existe**.
- `src/App.tsx:291` declara `const [isWelcomeOpen, setIsWelcomeOpen] = useState(true)`.
- **El modal no está montado en ninguna parte**: no hay `import` ni `{isWelcomeOpen && <WelcomeModal …>}`.
  Quedó desconectado, así que nunca se vio.
- Su contenido es del demo web («Bienvenido a NodeFlow (Demo Web)») y sólo pide keys: no es el tutorial que
  el usuario pide para la app.

## Fases

### Fase 1 · El turno cierra y el estado vuelve (bloqueante)

- **Pieza (bot)**: `src/utils/toggleVoz.ts` — función pura con firma exacta y casos enumerados.
- **Integración (asistente)**: `VozPanel.tsx` — al cortar, el estado va a `inactivo`; el `released` corto no
  corta dos veces; `pressed` con mic encendido cierra el turno **una** vez.
- **Verificación**: `cargo test` + `vitest` + prueba real. Criterio de aceptación en el log: tras cortar,
  `estado=inactivo`, y un `pressed` inmediato vuelve a **abrir** (no a cortar en bucle).

### Fase 2 · El onboarding de la app (lo que falta y es clave)

Contenido que el usuario pidió, en una pantalla al abrir:

1. Qué es NodeFlow en una frase.
2. **Creá ideas**: el lienzo es para pensar en voz alta.
3. **El atajo para hablar** (`Ctrl+Alt+Space`) y que las ideas nacen en pantalla mientras hablás.
4. **Dónde poner la key de agentes** (los agentes que trabajan sobre el lienzo).
5. **Dónde poner la key de voz** (AssemblyAI) — con el aviso de que sin ella no hay dictado.
6. Cómo reabrirla después (un botón de ayuda), y que no vuelva a aparecer sola.

- **Pieza (bot)**: `src/utils/primerVisita.ts` — lógica pura (decidir si mostrar, marcar como vista,
  reabrir), con casos: primera vez (mostrar), segunda (no), reapertura explícita (mostrar).
- **UI (asistente)**: reescribir `WelcomeModal.tsx` para la app (no el demo) y **montarlo** en `App.tsx`.
- **Botones que funcionan**: cada uno abre la config real existente (no texto muerto).

### Fase 3 · Verificación end-to-end (con auditor distinto al que escribió)

- Dictar con el atajo → el turno cierra una vez → los nodos aparecen encadenados.
- Abrir la app de cero → el modal aparece la primera vez, y **no** la segunda.
- Los dos botones abren la configuración correspondiente.
- Árbitros: `tsc --noEmit`, `vitest run`, `cargo test --lib`.

### Fase 4 · Publicar

- Bump + instalador firmado (ver `windows-desktop-installer` §8) y deploy del demo.
- Commits por paso, ramas y PR (el merge es del usuario).

## Reparto (fábrica de 5, Bob excluido)

| Quién | Qué |
|---|---|
| asistente (yo) | razonamiento, integración, verificación, build, commits |
| `agent-coder-azure` (gpt-5.3-codex) | piezas de código con firma exacta |
| `agent-coder-nano` (gpt-5.4-nano) | piezas chicas / volumen |
| `agent-auditor-grok` (grok-4.6, cuota corta) | auditoría de las piezas |
| `agent-commander` (gpt-6-astra) | revisión de contrato, si hace falta |

Reglas: **piezas, no tareas**; un escritor por archivo; un `cargo`/test por vuelta; main sólo por PR.
