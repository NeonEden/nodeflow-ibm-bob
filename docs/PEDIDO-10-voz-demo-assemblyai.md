---
title: PEDIDO-10 · Dictado con la cuenta del autor en el demo web (token temporal + tope por IP)
fecha: 2026-09-27
estado: activo
---

# PEDIDO-10 · Dictado con la cuenta del autor en el demo web

## §0 · Qué se pide y qué se decidió

Que **cualquier visitante del demo web pueda dictar y crear nodos por voz sin traer su propia clave**, usando
la cuenta de AssemblyAI del autor, con un tope por visitante.

Decisiones tomadas con el autor (2026-09-27):

| Punto | Decisión |
|---|---|
Cuánto puede dictar un visitante | **30 s por sesión** (lo impone AssemblyAI, ver §2) |
Cuántas veces | **Hasta 3 sesiones por día por IP** (60 s/día) |
Qué ve al agotarse | **El modal de clave que ya existe** (`ApiKeyModal`, variante `voz`) — no un error seco |
Credencial | **`ASSEMBLYAI_API_KEY`** ya cargada como *secreto* del sitio, en `production`, `deploy-preview`, `branch-deploy` |

## §1 · Lo que YA existe (no se reescribe)

- **`src/services/assemblyaiRt.ts`** — cliente WebSocket v3, ya conecta a
  `wss://streaming.assemblyai.com/v3/ws?token=…&sample_rate=16000&encoding=pcm_s16le`.
- **`SesionVoz`** (`src/services/sttRt.ts:38`) — contrato de la sesión, agnóstico del motor.
- **`src/services/vozService.ts:223`** — el ÚNICO punto donde el frontend pide la sesión:
  `const r = await fetch(apiUrl('/api/voz/jwt'));`
- **`netlify/functions/api.mjs`** — adaptador Netlify → `handle()` de `demo/lib/mockApi.mjs`; ya calcula la IP
  del cliente (`x-nf-client-connection-ip`) y la pasa al handler.
- **`demo/lib/mockApi.mjs`** — ya tiene el patrón de tope por IP (`USO_POR_IP`, `LIMITE`) y el plan de voz.

**Regla madre del pedido:** la API key **nunca** sale del servidor. Si una solución necesita la key en el
bundle del navegador, está mal y no se implementa.

## §2 · El mecanismo (verificado contra la doc de AssemblyAI, 27/09/2026)

```
navegador ──GET /api/voz/jwt──▶ función Netlify
                                  ├─ 1. cuenta la sesión de esa IP (tope diario)
                                  ├─ 2. GET https://streaming.assemblyai.com/v3/token
                                  │       ?expires_in_seconds=60&max_session_duration_seconds=30
                                  │       Authorization: <ASSEMBLYAI_API_KEY>
                                  └─ 3. devuelve el token TEMPORAL
navegador ◀── {token}, url, idioma, modelo, expira_en_s, aviso
navegador ──wss://streaming.assemblyai.com/v3/ws?token=…──▶ AssemblyAI   (corta solo a los 30 s)
```

Por qué así y no de otra forma:

- **`max_session_duration_seconds=30` hace que el corte lo imponga AssemblyAI**, no nuestro JS: no se puede
  saltear desde el navegador ni con devtools. Es el límite duro.
- AssemblyAI **factura por tiempo de conexión abierta, no por audio enviado**, y una sesión sin cerrar se
  auto-cierra a las 3 h facturando todo. Además del tope del token, el cliente debe cerrar la sesión al
  terminar el turno.
- El **tope diario por IP** es la única pieza que necesita persistencia (una función serverless no conserva
  memoria entre invocaciones). Se resuelve con **Netlify Blobs**; si el import falla, el tope degrada al
  contador en memoria (el límite duro de 30 s sigue vigente) y se reporta.

## §3 · Pieza P1 — la sesión del demo (backend)

**Worktree:** `nf-voz-token` · **Rama:** `agente/voz-token`

**Archivos:**
- **NUEVO** `demo/lib/vozToken.mjs` — toda la lógica: leer la env, el contador por IP, pedir el token, armar la
  respuesta. Exporta `export async function sesionVozDemo(ip) -> { status, json }`.
- **EDITAR** `demo/lib/mockApi.mjs` — una sola rama en `handle()`: si `ruta === '/api/voz/jwt'`, delegar en
  `sesionVozDemo(ip)`. Nada más se toca de ese archivo.
- **EDITAR** `package.json` — agregar `@netlify/blobs` a `dependencies` (el bundle de la función lo necesita).

**FIRMA exacta:**

```js
// demo/lib/vozToken.mjs
export async function sesionVozDemo(ip = 'anon') -> { status: number, json: object }
```

**Respuesta OK (el contrato `SesionVoz` real, sin inventar campos):**

```json
{ "success": true, "proveedor": "assemblyai", "protocolo": "assemblyai-v3",
  "etiqueta": "AssemblyAI Universal-Streaming", "token": "<temporal>",
  "url": "wss://streaming.assemblyai.com/v3/ws", "idioma": "es", "modelo": "u3-rt-pro",
  "expira_en_s": 60, "codec": "pcm_s16le 16000 Hz",
  "aviso": "Demo: 30 segundos por sesión, 3 sesiones por día." }
```

**Casos (uno por línea):**
1. Primera llamada de una IP nueva → `200` + `success:true` + `token` no vacío + `expira_en_s` numérico.
2. Segunda y tercera llamada de la misma IP el mismo día → igual que (1).
3. Cuarta llamada de la misma IP el mismo día → `429` + `{success:false, motivo:'tope_diario', aviso:…}` (nunca un 500 ni un token vacío).
4. Sin `ASSEMBLYAI_API_KEY` en el entorno → `503` + `{success:false, motivo:'sin_credencial'}` (el frontend cae al modal de clave).
5. AssemblyAI responde distinto de `200` → propagar `502` + `{success:false, motivo:'proveedor', detalle:<status>}` **sin** el cuerpo crudo del proveedor.
6. IPs distintas → contadores independientes.

**Prohibido:** imprimir o loguear la key, el token o el cuerpo de AssemblyAI; devolver la key en cualquier
campo; tocar `src/**`, `netlify.toml`, `netlify/functions/api.mjs`; usar `--context dev` para la credencial.

**Árbitros (en el worktree, con salida cruda):**
```bash
npx netlify build                      # el bundle de la función se arma sin errores
npx netlify functions:serve --port 9999 &   # emula el empaquetado real
# y contra el emulador, el caso (1) y el caso (3):
curl -s -o /dev/null -w '%{http_code}\n' -H 'x-nf-client-connection-ip: 203.0.113.7' localhost:9999/api/voz/jwt
# repetir 3 veces OK y la 4ª debe dar 429
```
Cerrar el servidor de emulación al terminar (no dejar el puerto tomado).

## §4 · Pieza P2 — el frontend del demo (contador y modal)

**Worktree:** `nf-voz-ui` · **Rama:** `agente/voz-ui`

**Archivos:**
- **EDITAR** `src/services/vozService.ts` — cuando `ES_DEMO_WEB` es true (ya existe, exportado de
  `src/services/apiBase.ts`): no exigir clave propia, pedir `/api/voz/jwt`, y si la respuesta trae
  `motivo:'tope_diario'` o `'sin_credencial'`, **abrir el modal de clave existente** (variante `voz`) en vez de
  fallar en silencio.
- **EDITAR** `src/components/VozPanel.tsx` — contador visible de los 30 s de la sesión demo y corte local al
  llegar a 0 (defensa en profundidad; el corte real es del servidor). Al cortar: mismo modal.
- **EDITAR** `src/i18n/textos.ts` — claves nuevas **en ES y EN** (una por idioma, sin duplicar el bloque):
  `voz.demo.aviso` (los 30 s / 3 por día), `voz.demo.terminado`, `voz.demo.clave.cta`.

**Casos:**
1. Demo web, sin clave propia, con sesión disponible → dicta y crea nodos; el contador baja de 30 s.
2. Al agotar los 30 s → se corta el dictado y aparece el modal de clave (no un error crudo).
3. Con `motivo:'tope_diario'` del servidor → mismo modal, con el aviso del tope.
4. App de escritorio (`ES_DEMO_WEB === false`) → **comportamiento intacto** (sigue usando la clave del usuario).
5. `textos.ts`: cada clave nueva existe en ES y en EN (el tipo `Clave` no compila si falta una).

**Prohibido:** tocar `demo/**`, `netlify/**`, `package.json`; cambiar el comportamiento de escritorio;
introducir keys en el bundle.

**Árbitros (en el worktree, con salida cruda):**
```bash
npx tsc --noEmit          # 0 errores (el tipo Clave del i18n es el guard)
npx vitest run src/utils
npx netlify build
```

## §5 · Integración y veredicto (del orquestador, no del ejecutor)

1. Merge de ambas ramas en `integracion/pedido-10` + `tsc` + `vitest` + `netlify build`.
2. **Draft deploy** y prueba de punta a punta con el navegador:
   - pedir la sesión y verificar que AssemblyAI **acepta** el token emitido (es la única prueba real de que la
     credencial del sitio sirve: los secretos de Netlify no se pueden leer);
   - dictar y ver el nodo nacer; esperar el corte de los 30 s y ver el modal.
3. Recién entonces, merge a `main` (que dispara el deploy de producción).

**Riesgo declarado:** el demo pasa a gastar dinero de la cuenta del autor. Los topes (30 s por sesión,
3 sesiones diarias por IP) lo acotan, pero el link es público: el primer día conviene mirar el consumo en el
panel de AssemblyAI.
