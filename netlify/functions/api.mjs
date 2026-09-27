/**
 * Adaptador Netlify del API del demo de NodeFlow.
 *
 * Por qué existe: `demo/api/index.mjs` exporta `apiHandler(req, res)`, el contrato de Vercel
 * (`res.statusCode` / `res.setHeader` / `res.end`) que el server local (`demo/server.mjs`) comparte.
 * Netlify Functions no acepta esa firma — la v2 entrega un `Request` y espera un `Response` — así que
 * el demo tal cual no levantaba como función. Acá se traduce la entrada y la salida, sin tocar la
 * lógica de negocio: se llama a la MISMA `handle()` del mock.
 *
 * Ruteo: la función declara su path (`config.path = '/api/*'`), así que no hace falta el rewrite
 * `vercel.json` (que Netlify no lee). La ruta real llega en `url.pathname`.
 *
 * Sin persistencia real: el estado del demo vive en memoria de la instancia (arranca del lienzo
 * semilla). Es intencional — ver `demo/lib/mockApi.mjs`.
 */
import { handle } from '../../demo/lib/mockApi.mjs';

export default async (request, context) => {
  const url = new URL(request.url);
  const ruta = url.pathname.replace(/\/+$/, '') || '/';

  // Netlify pone la IP del cliente en `x-nf-client-connection-ip`; el límite por IP del demo
  // (`DEMO_TOPE_POR_IP`) se apoya en esto.
  const ip = request.headers.get('x-nf-client-connection-ip')
    || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || 'anon';

  let body = {};
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const raw = await request.text();
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = { _raw: raw };
    }
  }

  let salida;
  try {
    salida = await handle({
      method: request.method,
      ruta,
      query: Object.fromEntries(url.searchParams),
      body,
      ip,
    });
  } catch (e) {
    salida = { status: 500, json: { success: false, error: String(e?.message || e) } };
  }

  const headers = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
  };

  // Respuestas binarias (el WAV de `/api/voz/decir`) traen `body`; el resto, `json`.
  if (salida.body) {
    headers['content-type'] = salida.contentType || 'application/octet-stream';
    return new Response(salida.body, { status: salida.status || 200, headers });
  }
  headers['content-type'] = 'application/json; charset=utf-8';
  return new Response(JSON.stringify(salida.json ?? {}), { status: salida.status || 200, headers });
};

export const config = { path: '/api/*' };
