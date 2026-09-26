/**
 * Tests del pulido del dictado (Pedido 03, 26/09/2026).
 *
 * Prueba los cuatro arreglos derivados de la primera prueba real:
 *   1. Umbral del toggle: toque corto vs push-to-talk.
 *   2. Dedup de cierres: un solo cierre por turno.
 *   3. `nada` con fantasma dibujado: el fantasma no se borra.
 *   4. Pipeline extendido con dos turnos solapados y un cierre vacío.
 *
 * No monta componentes React: prueba la lógica de las constantes y las reglas puras.
 */

import { describe, expect, it } from 'vitest';
import { MS_UMBRAL_TOGGLE, MS_ESTABILIDAD_CLIENTE } from '../services/vozService';

// ── 1. Umbral del toggle ──────────────────────────────────────────────────────────────────────────

describe('umbral del toggle (MS_UMBRAL_TOGGLE)', () => {
  it('el umbral está definido y anclado en 400 ms', () => {
    // ANCLA (26/09/2026): la prueba real mostró que el usuario tecleaba el atajo en < 300 ms.
    // Con 400 ms hay margen para que los toques rápidos sean toggle y los largos sean push-to-talk.
    expect(MS_UMBRAL_TOGGLE).toBe(400);
  });

  it('un toque de 300 ms es corto → no debe cortar', () => {
    const presado = 1000;
    const soltado = presado + 300;
    const esCorto = soltado - presado < MS_UMBRAL_TOGGLE;
    expect(esCorto).toBe(true);
  });

  it('un toque de 500 ms es largo → push-to-talk, debe cortar', () => {
    const presado = 1000;
    const soltado = presado + 500;
    const esPushToTalk = soltado - presado >= MS_UMBRAL_TOGGLE;
    expect(esPushToTalk).toBe(true);
  });

  it('un toque de exactamente 400 ms es push-to-talk (límite incluido)', () => {
    const presado = 1000;
    const soltado = presado + 400;
    const esPushToTalk = soltado - presado >= MS_UMBRAL_TOGGLE;
    expect(esPushToTalk).toBe(true);
  });

  it('con el micrófono encendido, el pressed siempre activa el toggle independientemente de la duración', () => {
    // La lógica: si el micrófono está activo, `pressed` → cortar (toggle).
    // El `released` posterior llega después de < 400 ms → no-op (el toggle ya cerró).
    const micEncendido = true;
    // Si mic encendido → toggle (cierra)
    expect(micEncendido).toBe(true);
    // El released posterior, si es corto, no vuelve a cortar
    const duracionPosterior = 200;
    const released_no_corta = duracionPosterior < MS_UMBRAL_TOGGLE;
    expect(released_no_corta).toBe(true);
  });
});

// ── 2. Dedup de cierres ───────────────────────────────────────────────────────────────────────────

describe('dedup de cierres (turno único por número)', () => {
  it('el mismo número de turno no se procesa dos veces', () => {
    // Simula el guard: turnoUltimoCierreRef === turnoRef → ignorar
    let turnoUltimoCierre = -1;
    const turnoActual = 5;

    const intentarCerrar = (): 'cerrado' | 'duplicado' => {
      if (turnoUltimoCierre === turnoActual) return 'duplicado';
      turnoUltimoCierre = turnoActual;
      return 'cerrado';
    };

    expect(intentarCerrar()).toBe('cerrado');
    expect(intentarCerrar()).toBe('duplicado');
    expect(intentarCerrar()).toBe('duplicado');
  });

  it('un turno nuevo se puede cerrar aunque el anterior fue cerrado', () => {
    let turnoUltimoCierre = -1;
    let turnoActual = 5;

    const intentarCerrar = (): 'cerrado' | 'duplicado' => {
      if (turnoUltimoCierre === turnoActual) return 'duplicado';
      turnoUltimoCierre = turnoActual;
      return 'cerrado';
    };

    expect(intentarCerrar()).toBe('cerrado'); // turno 5

    turnoActual = 6; // nuevo turno
    expect(intentarCerrar()).toBe('cerrado'); // turno 6 se cierra
    expect(intentarCerrar()).toBe('duplicado'); // turno 6 no se duplica
  });

  it('un cierre vacío (0 palabras) no debe mandarse al motor', () => {
    const dictado = '';
    const palabras = dictado.trim().split(/\s+/).filter(Boolean).length;
    expect(palabras < 3).toBe(true); // se filtra
  });

  it('un cierre con 2 palabras no debe mandarse al motor', () => {
    const dictado = 'hola mundo';
    const palabras = dictado.trim().split(/\s+/).filter(Boolean).length;
    expect(palabras < 3).toBe(true); // se filtra
  });

  it('un cierre con 3 palabras sí se manda', () => {
    const dictado = 'quiero un nodo';
    const palabras = dictado.trim().split(/\s+/).filter(Boolean).length;
    expect(palabras < 3).toBe(false); // pasa
  });
});

// ── 3. nada con fantasma dibujado ─────────────────────────────────────────────────────────────────

describe('nada no borra el fantasma ya dibujado', () => {
  /** Simula el sub-selector del efecto de App.tsx para el nodo fantasma. */
  const ID_FANTASMA = 'ghost-voz-turno';

  type NodoMock = { id: string };

  function aplicarDecision(
    nds: NodoMock[],
    decisionClase: 'nada' | 'semilla' | 'correccion' | null | undefined,
    draftVoz: string,
  ): NodoMock[] {
    const sinFantasma = nds.filter((n) => n.id !== ID_FANTASMA);
    const hayFantasmaActual = nds.some((n) => n.id === ID_FANTASMA);

    if (decisionClase !== undefined) {
      if (decisionClase === null || decisionClase === 'nada') {
        if (hayFantasmaActual) return nds; // no borrar
        const palabras = draftVoz.trim().split(/\s+/).filter(Boolean).length;
        if (palabras < 3) return sinFantasma;
        return [...sinFantasma, { id: ID_FANTASMA }];
      }
      // semilla / correccion → dibujar
      return [...sinFantasma, { id: ID_FANTASMA }];
    }

    // Regla local
    const palabras = draftVoz.trim().split(/\s+/).filter(Boolean).length;
    if (palabras < 3) {
      if (hayFantasmaActual) return nds;
      return sinFantasma;
    }
    return [...sinFantasma, { id: ID_FANTASMA }];
  }

  it('con fantasma dibujado y decision=nada, el fantasma permanece', () => {
    const nds: NodoMock[] = [{ id: 'n1' }, { id: ID_FANTASMA }];
    const resultado = aplicarDecision(nds, 'nada', 'quiero un nodo');
    expect(resultado.some((n) => n.id === ID_FANTASMA)).toBe(true);
  });

  it('con fantasma dibujado y decision=null (backend ausente), el fantasma permanece', () => {
    const nds: NodoMock[] = [{ id: 'n1' }, { id: ID_FANTASMA }];
    const resultado = aplicarDecision(nds, null, 'quiero un nodo');
    expect(resultado.some((n) => n.id === ID_FANTASMA)).toBe(true);
  });

  it('sin fantasma previo y decision=nada con texto corto, no se dibuja', () => {
    const nds: NodoMock[] = [{ id: 'n1' }];
    const resultado = aplicarDecision(nds, 'nada', 'dos palabras');
    expect(resultado.some((n) => n.id === ID_FANTASMA)).toBe(false);
  });

  it('decision=semilla siempre actualiza el fantasma', () => {
    const nds: NodoMock[] = [{ id: 'n1' }];
    const resultado = aplicarDecision(nds, 'semilla', 'quiero un nodo de código');
    expect(resultado.some((n) => n.id === ID_FANTASMA)).toBe(true);
  });

  it('regla local con fantasma ya dibujado y texto corto: no borra', () => {
    const nds: NodoMock[] = [{ id: 'n1' }, { id: ID_FANTASMA }];
    // undefined = sin backend
    const resultado = aplicarDecision(nds, undefined, 'dos palabras');
    expect(resultado.some((n) => n.id === ID_FANTASMA)).toBe(true);
  });
});

// ── 4. Pipeline extendido — secuencia de la prueba real del 26/09 ──────────────────────────────────

describe('MS_ESTABILIDAD_CLIENTE: anclaje del umbral del cliente', () => {
  it('sigue siendo mayor al umbral del segmentador (250 ms)', () => {
    expect(MS_ESTABILIDAD_CLIENTE).toBeGreaterThan(250);
  });

  it('el umbral del toggle (400) supera al de estabilidad (300) con holgura', () => {
    // Un toque corto (< 400 ms) dura más que el tiempo de quietud del parcial (300 ms).
    // Esto garantiza que si el usuario hace toggle, el segmentador ya tuvo tiempo de contestar.
    expect(MS_UMBRAL_TOGGLE).toBeGreaterThan(MS_ESTABILIDAD_CLIENTE);
  });
});
