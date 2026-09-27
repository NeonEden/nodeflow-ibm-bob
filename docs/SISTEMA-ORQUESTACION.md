---
title: Sistema de orquestación de @deep-orq
version: 2 (borrador para auditoría de Astra)
fecha: 2026-09-27
estado: en revisión
---

# Sistema de orquestación — @deep-orq

Documento vivo. Es el contrato entre el orquestador, los ejecutores y el dueño del repo.
Todo lo que está acá abajo existe porque **algo se rompió así**, y está medido.

## 0 · Qué cambió en la v2 (y por qué)

| Incidente medido | Regla que nace |
|---|---|
Un ejecutor reportó «102 textos traducidos, tsc 0 errores» y **7 valores eran texto en español** | El informe no es evidencia. El árbitro de CONTENIDO se **ejecuta** |
Un ejecutor escribió 2 archivos en `main` mientras decía trabajar en su worktree | Verificar `git status` **también en el repo base** tras cada despacho |
`gpt-oss:120b` **pisó la línea vecina** al insertar, 2 de 2 veces (`onboarding.empezar`, `apikey.guardando`, `continuo`, `onTurnoCerrado`) | Anclas largas + verificación **después de la última edición** + revisar que el diff traiga sólo los archivos del pedido |
`max_session_duration_seconds=30` pasó los 3 árbitros y explotó con **422** contra el proveedor | Los **rangos documentados** del proveedor se validan antes de escribir el contrato, y hay guard estático |
Un `grep -c` sobre un bundle que **no se había descargado** devolvió `0` y pareció «sin fugas» | Antes de medir, confirmar que el artefacto existe y **cuánto pesa** lo medido |
El tomo del PEDIDO-09 lo tomó el perfil **equivocado** por leer su rótulo | El inventario del enjambre se corre **antes** de asignar; el rótulo miente |

## 1 · Ciclo de vida del PEDIDO

```
LEER → CORTAR → CONTRATAR → RUTEAR → ARBITRAR → INTEGRAR
```

1. **Leer**: contexto amplio, archivos grandes, el estado real del repo (`git log`, `git status`, worktrees).
2. **Cortar**: piezas **atómicas y disjuntas** (archivos distintos por pieza, nunca dos escritores sobre uno).
3. **Contratar**: `docs/PEDIDO-NN-<tema>.md` commiteado ANTES de despachar. Incluye firma exacta, casos y árbitros.
4. **Rutear**: por **capacidad medida** (inventario + estado), no por rótulo. Ojo con el modelo del hijo delegado.
5. **Arbitrar**: el orquestador corre los árbitros sobre el **árbol final** de cada worktree. Nunca firma el ejecutor.
6. **Integrar**: rama `integracion/pedido-NN`, merge, árbitros sobre el árbol integrado, verificación post-deploy, merge a `main`.

**Aislamiento**: un `git worktree` por pieza. Ojo con el atajo: la junction de `node_modules` aísla **código, no
dependencias** — sirve para leer, pero instalar en un worktree contamina a los demás; si una pieza necesita
instalar algo, se hace consciente y se avisa. Del `.netlify/` se copia **sólo `state.json`** (la identidad del
sitio; sin él el build local falla por «project ID»). Verificación cruzada: `git status` en el worktree **y** en
el repo base.

## 2 · Reglas madre

Las cinco originales siguen; la v2 agrega cinco más que salieron de romperse:

1. El trabajo no está hecho hasta que **el árbitro lo confirma en disco**.
2. **El canal es el repo**, no el chat: decisiones y contratos en Markdown commiteado.
3. **Un solo escritor por archivo.**
4. **El árbitro se escribe antes que la tarea.**
5. **Aislamiento obligatorio** por worktree.
6. **El árbitro se corre sobre el árbol FINAL**, no sobre un estado intermedio: un «verde» anterior a la última
   edición no vale.
7. **El diff tiene que traer exactamente los archivos del pedido.** Un archivo de más es un síntoma, no una anécdota.
8. **Los límites del proveedor se leen en su doc** y se validan con un guard estático antes de cualquier deploy.
9. **Antes de medir, confirmar que el artefacto existe** (tamaño). Un negativo sin magnitud medida es un falso verde.
10. **Nada se declara terminado sin una verificación que toque el mundo real** cuando el pedido cruza una frontera
    externa (proveedor, deploy, credencial).
11. **Ningún contrato se despacha sin inspeccionar la implementación existente**, fijar rutas absolutas y base, y
    resolver contradicciones entre los requisitos y los límites externos documentados.
12. **El que modifica no firma la auditoría**: toda reparación invalida el verde anterior y exige verificación
    independiente del árbol final.
13. **Una aceptación pasa sólo con adquisición válida, entrada identificada, aserciones ejecutadas y código de
    salida esperado**; los casos no ejercitados quedan **NO VERIFICADOS** y bloquean el cierre si son obligatorios.

## 3 · Los cinco niveles de árbitro

El error típico es creer que «los árbitros del repo» alcanzan. No alcanzan: cada nivel cubre una clase distinta de falla.

| Nivel | Qué es | Qué caza | Qué NO ve |
|---|---|---|---|
1 · **Repo** | `npx tsc --noEmit` · `npm run build` · `cargo test --lib` · `npx netlify build` | tipos, compilación, tests, empaquetado | contenido, contrato, proveedor |
2 · **Contenido** | ejecutar el módulo real con esbuild+node y medir | datos faltantes o sin traducir | todo lo de afuera |
3 · **Contrato del pedido** | verificador propio que importa el módulo y prueba los casos | lógica, topes, caminos de error | la interfaz con el proveedor |
4 · **Integración** | merge + los 3 árbitros sobre el árbol integrado | conflictos, efectos cruzados | el runtime desplegado |
5 · **Post-deploy** | contra el sitio/proveedor real, con el commit identificado | credenciales, parámetros, configuración | nada: es el que más se parece a la verdad |

El nivel 5 es el único que habla con el mundo. Cuando el pedido cruza una frontera externa, **un deploy es un árbitro**.

## 4 · Matriz de routing (medida, no de rótulo)

El rótulo del perfil miente. Se corre `inventario_enjambre.py` (modelo/`max_turns`/credencial) y `estado_enjambre.py`.

- **Escribir código** → `agent-coder-azure` (gpt-5.3-codex, 80 turnos) o el orquestador.
- **PROHIBIDO para escribir código**: `gpt-oss:120b-cloud` (pisó la línea vecina 2/2). Sirve para leer y verificar.
- **Mecánico corto** → `agent-coder-nano` (30 turnos: una pieza que exige crear contenido NO es mecánica).
- **Auditoría con otro sesgo** → otro proveedor (`agent-auditor-grok`, 40).
- **Cerebro de razonamiento** → `@agent-commander` (Astra, gpt-6-astra).
- El orquestador hace: leer, cortar, contratar, integrar, arbitrar... **y reparar** cuando el diagnóstico y el
  parche ya están determinados y el costo esperado de despachar + revisar + retrabajar supera la reparación
  (sin esperar al tercer intento). La contracara, que no se negocia: **si el orquestador escribe, otro audita**.

## 5 · Protocolo de sobre

```
PEDIDO: <slug>            CONTRATO: docs/PEDIDO-NN-<tema>.md (commiteado)
WORKTREE: <ruta>          ENTREGABLE: <archivo nuevo/exacto> + su test
FIRMA (tipos reales):     CASOS (uno por línea)
PROHIBIDO TOCAR:          ÁRBITROS: <comando exacto>
CIERRE: archivos · salida cruda · hallazgos      COMMIT: no (integra el orquestador)
```

## 6 · Lo que NO se automatiza

Merge a `main`, deploy a producción, cualquier cosa que toque secretos, y declarar «terminado».
Lo decide el dueño. El orquestador prepara, verifica y pide el OK.

## 7 · Deuda y puntos ciegos abiertos

- El camino feliz del demo de voz no está verificado en navegador real: la interacción humana inevitable
  (permiso de micrófono, hardware) la hace el dueño; **el ensayo del navegador con audio controlado es tarea
  del agente**, no una transferencia al humano.
- `agent-coder-nano` en TOPE: sus 30 turnos lo dejan fuera de cualquier pieza con contenido nuevo.
- Pendiente de medir: costo real por pieza del enjambre (tokens, no sólo tiempo).

## 8 · Auditoría externa (Astra, 2026-09-27) y acuerdo

Veredicto recibido: **NECESITA CAMBIOS**. Se aplicó. Lo que sigue es el acuerdo, con la razón de cada punto.

### 8.1 · Lo que se aceptó y cambia el sistema

**A · Antes de contratar, inspeccionar lo que ya existe.**
Ningún contrato se despacha sin leer `AGENTS.md` y `docs/PLAN.md` si existen, **inspeccionar la implementación
existente y sus consumidores**, registrar la base y las rutas absolutas, y comprobar los archivos ignorados y los
requisitos del build. *Por qué: el PEDIDO-10 pidió «crear» `/api/voz/jwt`, que ya existía a medias en `main`
emitiendo tokens de 600 s sin tope; y el nombre de archivo elegido chocaba con la regla `*token*` del
`.gitignore`. Las dos cosas se veían leyendo el repo antes de escribir el pedido.*

**B · La junction no aísla dependencias.** (reemplaza al texto anterior de la §1)
`git worktree` aísla **código**, no dependencias: una `node_modules` compartida permite contaminación entre
worktrees — instalar una dependencia en uno la instala para todos. La junction se acepta **sólo para lectura
(read-only)**; si una pieza necesita instalar algo, se hace consciente y se avisa. Del `.netlify/` se copia
**únicamente `state.json`** (la identidad del sitio), no el directorio entero.

**C · El artifact de revisión es el commit intermedio + PR.** (ajusta §1.6 y §6)
El ejecutor entrega sin commit, el orquestador revisa, **commitea en la rama de tarea** e integra; el cambio
llega a `main` por **PR** (o, cuando el dueño autoriza el merge directo, con el diff de un commit identificable
y aprobación explícita). Sin commit intermedio no hay nada que mergear. Los worktrees se limpian **sólo después
de preservar cambios y evidencia**.

**D · El deploy no es la prueba.** (amplía §3, nivel 5)
El nivel 5 **sólo acredita los escenarios ejecutados**. La frontera externa se prueba en **preview** antes de
producción; si el preview no es alcanzable (p. ej. detrás de Edge Access), **se declara que la primera prueba
fue en producción y por qué**. Smoke del despliegue identificado por commit. Y se declara lo **no cubierto**:
permisos del navegador, audio real, concurrencia, reintentos.

**E · Toda medición exige adquisición válida y cobertura.** (endurece §2.9)
No alcanza el tamaño: hay que acreditar **éxito de adquisición > 0**, identidad del artefacto (un bundle no es
una página de error de 900 KB), aserciones ejecutadas, **código de salida**, y que el verificador **falle ante
un caso inválido conocido**. Un árbitro que nunca se vio fallar no es un árbitro.

**F · Reparar en vez de esperar, pero no firmarse el verde.**
Se repara localmente cuando el diagnóstico y el parche ya están determinados y el costo esperado de despacho +
revisión + retrabajo supera la reparación — **sin esperar al tercer despacho**, y sin convertir un incidente en
umbral universal. **Si el orquestador escribe código, otro audita.**

**G · No despachar topes contradictorios.**
Separar siempre **corte de la UI**, **límite efectivo del proveedor** y **presupuesto diario**. Decidir con el
dueño qué pasa si la persistencia falla, y pedir **aceptación explícita del riesgo** en vez de prometer un gasto
acotado. *Aplicado al PEDIDO-10: los 30 s son corte de UI, los 60 s son límite del proveedor, y el tope de
3/día por IP es best-effort.*

### 8.2 · Verificación: lo ejercitado y lo NO VERIFICADO

Regla de cierre adoptada (textual de Astra):
**«Una aceptación pasa sólo con adquisición válida, entrada identificada, aserciones ejecutadas y código de
salida esperado; los casos no ejercitados quedan NO VERIFICADOS y bloquean el cierre si son obligatorios.»**

### 8.3 · Las tres reglas que entran al sistema (textuales)

1. **Ningún contrato se despacha sin inspeccionar la implementación existente, fijar rutas absolutas y base, y
   resolver contradicciones entre requisitos y límites externos documentados.**
2. **El que modifica no firma la auditoría: toda reparación invalida el verde anterior y exige verificación
   independiente del árbol final.**
3. **Una aceptación pasa sólo con adquisición válida, entrada identificada, aserciones ejecutadas y código de
   salida esperado; los casos no ejercitados quedan NO VERIFICADOS.**

### 8.4 · Riesgos aceptados explícitamente (no promesas)

| Riesgo | Estado |
|---|---|
Cuota de AssemblyAI del demo | El tope de 3/día por IP es **best-effort**: si Netlify Blobs falla, el contador cae a memoria por instancia y el tope no se garantiza. El corte real de facturación es el de 60 s del proveedor. |
Concurrencia | El contador lee-escribe sin transacción: dos requests simultáneos en la misma IP pueden pasar el tope. |
Reintentos | No hay reintento del lado del servidor: el cliente ve `502` y decide. |
Micrófono/hardware real | **NO VERIFICADO** por el agente (sin permiso real de micrófono). |

