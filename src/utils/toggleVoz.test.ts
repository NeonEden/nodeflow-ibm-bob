import { describe, expect, it } from 'vitest';
import { decidirAtajo, MS_UMBRAL_TOGGLE } from './toggleVoz';
import type { EstadoVoz } from '../services/speechmaticsRt';

/**
 * Los seis estados reales de `EstadoVoz` aparecen acá: inactivo, conectando, escuchando, cerrando, cerrado,
 * error. La primera versión de estos tests usaba estados inventados (`pensando`, `hablando`) con un
 * `as unknown as EstadoVoz` que tapaba el problema: el estado que dejaba el atajo mudo era `cerrado`.
 */
const caso = (fase: 'pressed' | 'released', estado: EstadoVoz, ms = 0, cerrado = false) =>
  decidirAtajo({ fase, estado, msDesdePressed: ms, turnoYaCerrado: cerrado });

describe('toggleVoz.decidirAtajo', () => {
  it("1. pressed + inactivo -> 'abrir' (no hay turno: abre uno)", () => {
    expect(caso('pressed', 'inactivo')).toBe('abrir');
  });

  it("2. pressed + escuchando + turno abierto -> 'cerrar'", () => {
    expect(caso('pressed', 'escuchando')).toBe('cerrar');
  });

  it("3. pressed + escuchando + turno YA cerrado -> 'reiniciar' (el bucle del 26/09)", () => {
    expect(caso('pressed', 'escuchando', 0, true)).toBe('reiniciar');
  });

  it("4. pressed + conectando -> 'ignorar' (no cortar el arranque de la sesión)", () => {
    expect(caso('pressed', 'conectando')).toBe('ignorar');
  });

  it("5. pressed + cerrando -> 'ignorar' (la sesión se está cerrando sola)", () => {
    expect(caso('pressed', 'cerrando')).toBe('ignorar');
  });

  it("6. pressed + cerrado -> 'abrir' (el estado que dejaba el atajo mudo)", () => {
    expect(caso('pressed', 'cerrado')).toBe('abrir');
  });

  it("7. pressed + error -> 'abrir' (se puede reintentar)", () => {
    expect(caso('pressed', 'error')).toBe('abrir');
  });

  it("8. released + escuchando + 120 ms -> 'ignorar' (toque corto: el pressed ya resolvió)", () => {
    expect(caso('released', 'escuchando', 120)).toBe('ignorar');
  });

  it("9. released + escuchando + 600 ms -> 'cerrar' (push-to-talk de quien mantiene)", () => {
    expect(caso('released', 'escuchando', 600)).toBe('cerrar');
  });

  it("10. released + escuchando + 600 ms + turno ya cerrado -> 'ignorar'", () => {
    expect(caso('released', 'escuchando', 600, true)).toBe('ignorar');
  });

  it("11. released + inactivo + 600 ms -> 'ignorar' (no hay turno que cerrar)", () => {
    expect(caso('released', 'inactivo', 600)).toBe('ignorar');
  });

  it("12. released + cerrado + 600 ms -> 'ignorar'", () => {
    expect(caso('released', 'cerrado', 600)).toBe('ignorar');
  });

  it('13. el umbral declarado es 400 ms (el push-to-talk depende de este número)', () => {
    expect(MS_UMBRAL_TOGGLE).toBe(400);
  });
});
