# Cómo probar NodeFlow

Hay **dos** formas de ver NodeFlow, y conviene no confundirlas: el **demo web** es la vitrina (se abre en el
navegador, sin instalar nada, con datos simulados) y la **app de escritorio** es la de verdad (escucha tu voz y
usa el backend local). El demo sirve para que un jurado o un cliente vea la idea en 10 segundos; la app, para
comprobar que funciona.

---

## Opción 1 — El demo web (lo más rápido, cero instalación)

> **URL pública: <https://nodeflowsss.netlify.app>** — abrila desde cualquier dispositivo, no pide login
> ni instalar nada. (Las URLs con el sufijo del equipo —`…-tms-7b18.vercel.app`— están detrás de la protección
> de Vercel; usá siempre la limpia.)

Se abre en el navegador y muestra el lienzo con un flujo de voz **simulado**: la misma interfaz de la app, con
respuestas de ejemplo. No pide micrófono ni clave de ningún servicio.

## Opción 2 — El demo web en tu máquina (2 comandos)

```bash
npm install
npm run demo
```

Y abrí **http://localhost:4173**. Eso sirve el bundle del demo y su API simulada bajo `/api`.
(Para rehacer el bundle después de cambiar el front: `npm run demo:build`.)

## Opción 3 — La app de escritorio (la que escucha de verdad)

Requisitos: **Node 18+** y **Rust** (para compilar el backend). La primera compilación tarda varios minutos.

```bash
npm install
npx tauri dev
```

La ventana de la app se abre sola. El atajo para dictar es **`Ctrl + Alt + Space`**:

- **Un toque corto** arranca a escuchar; **otro toque corto** corta.
- Mantenerlo apretado también funciona (push-to-talk: corta al soltar).
- Mientras hablás, el lienzo dibuja un **borrador** de lo que está entendiendo.
- Al cerrar la idea, cada tema se convierte en un **nodo real**: movible, conectable arrastrando de un nodo a
  otro, y **Ctrl+Z** deshace la creación.

Necesita una clave de AssemblyAI configurada en la app (la pide la primera vez) para el dictado.

---

## ¿Cuál le muestro a quién?

| | Demo web | App de escritorio |
|---|---|---|
| Abrir en el navegador | ✅ | ❌ (hay que compilar) |
| Escucha tu voz de verdad | ❌ respuestas simuladas | ✅ |
| Micrófono y backend local | ❌ | ✅ |
| Sirve para | que alguien **vea** la idea en 10 segundos | que alguien **compruebe** que funciona |

## Si algo no arranca

- **`npm install` falla**: verificá Node 18 o superior (`node -v`).
- **`npx tauri dev` falla en Rust**: instalá Rust desde <https://rustup.rs> y volvé a intentar. La primera vez
  compila cientos de crates: tardar varios minutos es normal.
- **El puerto 4173 está ocupado**: `node demo/server.mjs 4199` y abrí ese puerto.
- **No escucha**: revisá el micrófono del sistema y que la clave de AssemblyAI esté cargada en la app.
