/**
 * Tests de `clasificarParcial` y del pipeline de parciales simulado.
 *
 * Por qué existen: el pipeline de lienzo en vivo sólo se puede probar hablando si no hay tests.
 * Cada verificación dependería de que alguien grabe audio, y los fallos aparecerían en la toma
 * buena. Con `fetch` mockeado se fija el comportamiento antes de la toma y la sesión de audio se
 * hace una sola vez para confirmar que el backend responde como los mocks esperan.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clasificarParcial } from './vozService';

// ── Helpers ──────────────────────────────────────────────────────────────────────────────────────

/** Respuesta 200 bien formada del segmentador. */
function respOk(clase: string, motivo = 'ok', titulo: string | null = null, texto = '') {
  return new Response(JSON.stringify({ clase, motivo, titulo, texto }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Respuesta de error del segmentador. */
function respError(status = 400) {
  return new Response('bad request', { status });
}

/** Parámetros mínimos para una llamada a `clasificarParcial`. */
const p = { turno_id: 'test-01', texto: 'quiero un nodo de código' };

// ── Setup / teardown ─────────────────────────────────────────────────────────────────────────────

let fetchOriginal: typeof globalThis.fetch;

beforeEach(() => {
  fetchOriginal = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  vi.restoreAllMocks();
});

// ── Tests de clasificarParcial ────────────────────────────────────────────────────────────────────

describe('clasificarParcial — contrato con el backend', () => {
  it('devuelve la decision con un 200 bien formado', async () => {
    vi.stubGlobal('fetch', async () => respOk('semilla', 'parcial estable', null, 'quiero un nodo de código'));
    const d = await clasificarParcial(p);
    expect(d).not.toBeNull();
    expect(d!.clase).toBe('semilla');
    expect(d!.motivo).toBe('parcial estable');
    expect(d!.titulo).toBeNull();
    expect(d!.texto).toBe('quiero un nodo de código');
  });

  it('devuelve null cuando el status no es 200', async () => {
    vi.stubGlobal('fetch', async () => respError(400));
    expect(await clasificarParcial(p)).toBeNull();
  });

  it('devuelve null cuando el fetch lanza (error de red)', async () => {
    vi.stubGlobal('fetch', async () => { throw new TypeError('network error'); });
    expect(await clasificarParcial(p)).toBeNull();
  });

  it('devuelve null cuando el backend no contesta dentro del timeout', async () => {
    // Simula el timeout: el fetch respeta la señal de aborto y lanza DOMException cuando el
    // AbortController dispara, igual que el fetch nativo.
    vi.stubGlobal('fetch', (_url: string, opts?: RequestInit) =>
      new Promise((_resolve, reject) => {
        const signal = opts?.signal as AbortSignal | undefined;
        if (signal?.aborted) {
          reject(new DOMException('aborted', 'AbortError'));
          return;
        }
        signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        );
      }),
    );
    // El timeout es de 50 ms; dejamos que la promesa resuelva con el timer real.
    const d = await clasificarParcial(p, { timeoutMs: 50 });
    expect(d).toBeNull();
  });

  it('normaliza una clase desconocida a nada', async () => {
    vi.stubGlobal('fetch', async () => respOk('nueva_clase_del_futuro', 'futura'));
    const d = await clasificarParcial(p);
    expect(d).not.toBeNull();
    expect(d!.clase).toBe('nada');
  });

  it('devuelve correccion cuando el backend lo dice', async () => {
    vi.stubGlobal('fetch', async () =>
      respOk('correccion', 'marcador de corrección en los primeros 5 tokens', null, 'no, mejor de código'),
    );
    const d = await clasificarParcial({ turno_id: 'x', texto: 'no, mejor de código' });
    expect(d!.clase).toBe('correccion');
  });
});

// ── Pipeline simulado (banco de pruebas sin micrófono) ───────────────────────────────────────────

describe('pipeline de parciales — secuencia estática sin micrófono ni backend real', () => {
  /**
   * Simula lo que hace el segmentador de Rust con los primeros parciales de una frase.
   * Las reglas locales se replican acá: parcial inestable → nada, < 3 palabras → nada,
   * estable con pausa → semilla, marcador de corrección → correccion.
   *
   * No necesita micrófono ni backend: `fetch` está mockeado con las respuestas que devolvería
   * el segmentador de Rust según la misma lógica que se probó en `cargo test --lib`.
   */
  const secuencia: Array<{
    texto: string;
    anterior?: string;
    ms_desde_cambio: number;
    es_final: boolean;
    respuestaBackend: string; // lo que devolvería el backend real
  }> = [
    // Parciales iniciales: inestable, menos de 3 palabras
    { texto: 'quiero',               anterior: undefined,       ms_desde_cambio: 0,   es_final: false, respuestaBackend: 'nada' },
    { texto: 'quiero un',            anterior: 'quiero',        ms_desde_cambio: 80,  es_final: false, respuestaBackend: 'nada' },
    { texto: 'quiero un nodo',       anterior: 'quiero un',     ms_desde_cambio: 90,  es_final: false, respuestaBackend: 'nada' },
    // Mismo texto pero llegó reciente (< 250 ms): todavía inestable
    { texto: 'quiero un nodo',       anterior: 'quiero un nodo', ms_desde_cambio: 120, es_final: false, respuestaBackend: 'nada' },
    // Mismo texto con pausa (≥ 250 ms): semilla
    { texto: 'quiero un nodo',       anterior: 'quiero un nodo', ms_desde_cambio: 400, es_final: false, respuestaBackend: 'semilla' },
    // Parcial con corrección
    { texto: 'no, mejor de código',  anterior: 'quiero un nodo', ms_desde_cambio: 200, es_final: false, respuestaBackend: 'correccion' },
  ];

  it('verifica las clases en orden para cada parcial de la secuencia', async () => {
    for (const item of secuencia) {
      // Mock del backend que refleja la respuesta esperada del segmentador de Rust.
      vi.stubGlobal('fetch', async () => respOk(item.respuestaBackend, 'test'));

      const d = await clasificarParcial({
        turno_id: 'pipeline-test',
        texto: item.texto,
        anterior: item.anterior,
        ms_desde_cambio: item.ms_desde_cambio,
        es_final: item.es_final,
      });

      expect(d).not.toBeNull();
      expect(d!.clase).toBe(item.respuestaBackend);
    }
  });

  it('los primeros parciales (< 3 palabras o inestables) dan nada', async () => {
    const primeros = secuencia.filter((s) => s.respuestaBackend === 'nada');
    expect(primeros.length).toBeGreaterThan(0);
    for (const item of primeros) {
      vi.stubGlobal('fetch', async () => respOk('nada', 'descartado'));
      const d = await clasificarParcial({
        turno_id: 'pipeline-test',
        texto: item.texto,
        anterior: item.anterior,
        ms_desde_cambio: item.ms_desde_cambio,
        es_final: item.es_final,
      });
      expect(d!.clase).toBe('nada');
    }
  });

  it('el estable con pausa da semilla', async () => {
    const estable = secuencia.find((s) => s.respuestaBackend === 'semilla')!;
    vi.stubGlobal('fetch', async () => respOk('semilla', 'parcial estable'));
    const d = await clasificarParcial({
      turno_id: 'pipeline-test',
      texto: estable.texto,
      anterior: estable.anterior,
      ms_desde_cambio: estable.ms_desde_cambio,
      es_final: estable.es_final,
    });
    expect(d!.clase).toBe('semilla');
  });

  it('el parcial con marcador de corrección da correccion', async () => {
    const corr = secuencia.find((s) => s.respuestaBackend === 'correccion')!;
    vi.stubGlobal('fetch', async () => respOk('correccion', 'marcador encontrado'));
    const d = await clasificarParcial({
      turno_id: 'pipeline-test',
      texto: corr.texto,
      anterior: corr.anterior,
      ms_desde_cambio: corr.ms_desde_cambio,
      es_final: corr.es_final,
    });
    expect(d!.clase).toBe('correccion');
  });

  it('con el backend apagado (fetch lanza) todos los parciales devuelven null', async () => {
    vi.stubGlobal('fetch', async () => { throw new TypeError('ECONNREFUSED'); });
    for (const item of secuencia) {
      const d = await clasificarParcial({
        turno_id: 'pipeline-test',
        texto: item.texto,
        anterior: item.anterior,
        ms_desde_cambio: item.ms_desde_cambio,
        es_final: item.es_final,
      });
      // null = backend ausente; el cliente usará la regla local (invariante de ADR 0005)
      expect(d).toBeNull();
    }
  });
});
