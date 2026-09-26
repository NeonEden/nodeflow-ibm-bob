import { describe, expect, it } from 'vitest';
import { decidirBorrador } from './borradorVivo';

describe('decidirBorrador', () => {
  it("1. fase 'resolviendo' + hayFantasma true + hayDecision true + clase 'semilla' + hayIdeaEnVivo true -> 'retirar'", () => {
    expect(
      decidirBorrador({
        fase: 'resolviendo',
        hayFantasma: true,
        hayDecision: true,
        clase: 'semilla',
        hayIdeaEnVivo: true,
      }),
    ).toBe('retirar');
  });

  it("2. fase 'resolviendo' + hayFantasma false + hayDecision false + clase null + hayIdeaEnVivo false -> 'retirar'", () => {
    expect(
      decidirBorrador({
        fase: 'resolviendo',
        hayFantasma: false,
        hayDecision: false,
        clase: null,
        hayIdeaEnVivo: false,
      }),
    ).toBe('retirar');
  });

  it("3. fase 'resolviendo' + hayFantasma true + hayDecision false + clase null + hayIdeaEnVivo false -> 'retirar'", () => {
    expect(
      decidirBorrador({
        fase: 'resolviendo',
        hayFantasma: true,
        hayDecision: false,
        clase: null,
        hayIdeaEnVivo: false,
      }),
    ).toBe('retirar');
  });

  it("4. fase 'escuchando' + hayDecision true + clase 'semilla' + hayIdeaEnVivo true -> 'dibujar'", () => {
    expect(
      decidirBorrador({
        fase: 'escuchando',
        hayFantasma: false,
        hayDecision: true,
        clase: 'semilla',
        hayIdeaEnVivo: true,
      }),
    ).toBe('dibujar');
  });

  it("5. fase 'escuchando' + hayDecision true + clase 'correccion' + hayIdeaEnVivo true -> 'dibujar'", () => {
    expect(
      decidirBorrador({
        fase: 'escuchando',
        hayFantasma: false,
        hayDecision: true,
        clase: 'correccion',
        hayIdeaEnVivo: true,
      }),
    ).toBe('dibujar');
  });

  it("6. fase 'escuchando' + hayDecision true + clase 'nada' + hayFantasma true + hayIdeaEnVivo false -> 'conservar'", () => {
    expect(
      decidirBorrador({
        fase: 'escuchando',
        hayFantasma: true,
        hayDecision: true,
        clase: 'nada',
        hayIdeaEnVivo: false,
      }),
    ).toBe('conservar');
  });

  it("7. fase 'escuchando' + hayDecision true + clase 'nada' + hayFantasma false + hayIdeaEnVivo true -> 'dibujar'", () => {
    expect(
      decidirBorrador({
        fase: 'escuchando',
        hayFantasma: false,
        hayDecision: true,
        clase: 'nada',
        hayIdeaEnVivo: true,
      }),
    ).toBe('dibujar');
  });

  it("8. fase 'escuchando' + hayDecision true + clase 'nada' + hayFantasma false + hayIdeaEnVivo false -> 'retirar'", () => {
    expect(
      decidirBorrador({
        fase: 'escuchando',
        hayFantasma: false,
        hayDecision: true,
        clase: 'nada',
        hayIdeaEnVivo: false,
      }),
    ).toBe('retirar');
  });

  it("9. fase 'escuchando' + hayDecision false + clase null + hayIdeaEnVivo true -> 'dibujar'", () => {
    expect(
      decidirBorrador({
        fase: 'escuchando',
        hayFantasma: false,
        hayDecision: false,
        clase: null,
        hayIdeaEnVivo: true,
      }),
    ).toBe('dibujar');
  });

  it("10. fase 'escuchando' + hayDecision false + clase null + hayFantasma true + hayIdeaEnVivo false -> 'conservar'", () => {
    expect(
      decidirBorrador({
        fase: 'escuchando',
        hayFantasma: true,
        hayDecision: false,
        clase: null,
        hayIdeaEnVivo: false,
      }),
    ).toBe('conservar');
  });

  it("11. fase 'inactivo' + hayDecision false + clase null + hayFantasma false + hayIdeaEnVivo false -> 'retirar'", () => {
    expect(
      decidirBorrador({
        fase: 'inactivo',
        hayFantasma: false,
        hayDecision: false,
        clase: null,
        hayIdeaEnVivo: false,
      }),
    ).toBe('retirar');
  });

  it("12. fase 'inactivo' + hayDecision true + clase 'semilla' + hayIdeaEnVivo true -> 'dibujar'", () => {
    expect(
      decidirBorrador({
        fase: 'inactivo',
        hayFantasma: false,
        hayDecision: true,
        clase: 'semilla',
        hayIdeaEnVivo: true,
      }),
    ).toBe('dibujar');
  });
});
