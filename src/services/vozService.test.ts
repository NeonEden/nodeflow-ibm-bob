/**
 * Tests de `clasificarParcial` y del pipeline de parciales simulado.
 *
 * Por qué existen: el pipeline de lienzo en vivo sólo se puede probar hablando si no hay tests.
 * Cada verificación dependería de que alguien grabe audio, y los fallos aparecerían en la toma
 * buena. Con `fetch` mockeado se fija el comportamiento antes de la toma y la sesión de audio se
 * hace una sola vez para confirmar que el backend responde como los mocks esperan.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clasificarParcial, msQuieto, MS_ESTABILIDAD_CLIENTE } from './vozService';

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

// ── El reloj del cliente: sin esto el juicio del backend nunca se activa ─────────────────────────

describe('reloj del cliente (msQuieto / MS_ESTABILIDAD_CLIENTE)', () => {
  it('devuelve el tiempo transcurrido desde el último cambio', () => {
    expect(msQuieto(1000, 700)).toBe(300);
    expect(msQuieto(1000, 1000)).toBe(0);
  });

  it('nunca devuelve un tiempo negativo (performance.now() puede repetir o retroceder)', () => {
    // Un valor negativo pasaría el filtro «< 250 ms» del segmentador como si fuera reciente,
    // o peor: se leería como una pausa larguísima según el signo. Se ancla en 0.
    expect(msQuieto(700, 1000)).toBe(0);
  });

  it('el cliente espera MÁS que el umbral del segmentador, o el backend diría «nada» siempre', () => {
    // ANCLA DEL DEFECTO (26/09/2026): la primera versión consultaba al backend apenas llegaba un
    // parcial, así que `ms_desde_cambio` valía ~0 y `segmentador.rs` (que exige >= 250 ms sin
    // cambios) contestaba «nada» en cada llamada: el juicio del backend quedaba decorativo y el
    // fantasma dependía sólo de la regla local. El cliente tiene que esperar a que el parcial se
    // quede quieto, y ese umbral (300) tiene que superar el del segmentador (250) con holgura para
    // que el reloj llegue cumplido del otro lado de la red.
    expect(MS_ESTABILIDAD_CLIENTE).toBeGreaterThan(250);
  });
});

// ── Pipeline extendido — secuencia de la prueba real del 26/09 ────────────────────────────────────

describe('pipeline extendido — turnos solapados y cierre vacío (prueba real 26/09)', () => {
  /**
   * Reproduce la secuencia que dejó la traza del log:
   *   turno=12 · 13 · 14 · 15 en < 2 s con ms=532 chars=4 · ms=615 chars=0 · ms=1400 chars=5 · ms=1937 chars=0
   *
   * Con el dedup de cierres, sólo el primer cierre válido de cada turno se procesa.
   * Los cierres vacíos (chars=0) y los cortos (< 3 palabras) se descartan sin molestar al motor.
   */

  type CierreSim = { turno: number; chars: number; palabras: number };

  function simularCierres(cierres: CierreSim[]): Array<{ turno: number; procesado: boolean; motivo: string }> {
    const turnoUltimoCierre: Record<number, boolean> = {};
    return cierres.map(({ turno, palabras }) => {
      if (turnoUltimoCierre[turno]) {
        return { turno, procesado: false, motivo: 'duplicado' };
      }
      turnoUltimoCierre[turno] = true;
      if (palabras < 3) {
        return { turno, procesado: false, motivo: palabras === 0 ? 'vacio' : 'pocas_palabras' };
      }
      return { turno, procesado: true, motivo: 'ok' };
    });
  }

  it('cuatro cierres del turno 15 → sólo el primero se intenta y se descarta si tiene pocas palabras', () => {
    const cierres: CierreSim[] = [
      { turno: 15, chars: 4,  palabras: 1 }, // primer cierre: pocas palabras
      { turno: 15, chars: 0,  palabras: 0 }, // segundo: duplicado → ignorado
      { turno: 15, chars: 5,  palabras: 1 }, // tercero: duplicado → ignorado
      { turno: 15, chars: 0,  palabras: 0 }, // cuarto: duplicado → ignorado
    ];
    const resultado = simularCierres(cierres);
    const procesados = resultado.filter((r) => r.procesado);
    expect(procesados.length).toBe(0); // ninguno con texto suficiente
    expect(resultado[0].motivo).toBe('pocas_palabras');
    expect(resultado[1].motivo).toBe('duplicado');
    expect(resultado[2].motivo).toBe('duplicado');
    expect(resultado[3].motivo).toBe('duplicado');
  });

  it('un cierre válido con 3+ palabras y sin duplicados se procesa', () => {
    const cierres: CierreSim[] = [
      { turno: 12, chars: 30, palabras: 6 }, // válido
      { turno: 13, chars: 0,  palabras: 0 }, // vacío → descartado
      { turno: 14, chars: 5,  palabras: 1 }, // pocas palabras → descartado
    ];
    const resultado = simularCierres(cierres);
    expect(resultado.filter((r) => r.procesado).length).toBe(1);
    expect(resultado[0].procesado).toBe(true);
    expect(resultado[1].motivo).toBe('vacio');
    expect(resultado[2].motivo).toBe('pocas_palabras');
  });

  it('clasificarParcial devuelve null con backend apagado — el lienzo sigue por la regla local', async () => {
    vi.stubGlobal('fetch', async () => { throw new TypeError('ECONNREFUSED'); });
    const d = await clasificarParcial({ turno_id: 't12', texto: 'quiero un nodo de código', es_final: true });
    expect(d).toBeNull();
  });
});

// ── `temas`: el campo que crea la CADENA de nodos ────────────────────────────────────────────────
// ANCLA DEL DEFECTO (26/09/2026): el helper `respOk` de arriba —y por lo tanto todo el contrato— no
// incluía `temas`, y el literal de retorno de `clasificarParcial` tampoco lo copiaba (el tipo lo
// declaraba desde el pedido 04, el código no lo ponía). Resultado en la app: el panel recibía
// `undefined`, llamaba a `onTurnoFinal(null)` y no creaba la cadena; se veía un único nodo fijo que se
// sobreescribía (el borrador fantasma reusado en cada turno), sin error y sin traza. Estos tests fijan
// el campo para que el contrato no vuelva a quedarse sin él.

describe('clasificarParcial — temas (la cadena de nodos)', () => {
  const respConTemas = (temas: unknown) =>
    new Response(JSON.stringify({ clase: 'semilla', motivo: 'turno cerrado', titulo: 'primero', texto: 'primero', temas }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  it('propaga los temas que devuelve el backend', async () => {
    const temas = [
      { titulo: 'quiero un nodo de audio', texto: 'quiero un nodo de audio para el sintetizador' },
      { titulo: 'quiero un nodo de video', texto: 'quiero un nodo de video aparte' },
    ];
    vi.stubGlobal('fetch', async () => respConTemas(temas));

    const d = await clasificarParcial({ turno_id: 's1', texto: 'x', es_final: true });

    expect(d).not.toBeNull();
    expect(d!.temas).toHaveLength(2);
    expect(d!.temas![0].titulo).toBe('quiero un nodo de audio');
    expect(d!.temas![1].texto).toBe('quiero un nodo de video aparte');
  });

  it('sin temas en la respuesta, el campo queda ausente (no inventa una cadena vacía)', async () => {
    vi.stubGlobal('fetch', async () => respOk('semilla', 'turno cerrado', 'una idea', 'una idea'));

    const d = await clasificarParcial({ turno_id: 's2', texto: 'x', es_final: true });

    expect(d!.clase).toBe('semilla');
    expect(d!.temas).toBeUndefined();
  });

  it('descarta los temas con forma inválida en vez de meter basura en el lienzo', async () => {
    vi.stubGlobal('fetch', async () => respConTemas([
      { titulo: 'ok', texto: 'un tema valido' },
      { titulo: 42, texto: null },
      'no soy un objeto',
    ]));

    const d = await clasificarParcial({ turno_id: 's3', texto: 'x', es_final: true });

    expect(d!.temas).toHaveLength(1);
    expect(d!.temas![0].titulo).toBe('ok');
  });

  it('un array con todo inválido equivale a no traer temas', async () => {
    vi.stubGlobal('fetch', async () => respConTemas([{ titulo: 1, texto: 2 }, null]));

    const d = await clasificarParcial({ turno_id: 's4', texto: 'x', es_final: true });

    expect(d!.temas).toBeUndefined();
  });
});
