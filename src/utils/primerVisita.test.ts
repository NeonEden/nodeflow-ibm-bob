import { describe, expect, it } from 'vitest';
import {
  CLAVE_ONBOARDING,
  debeMostrarOnboarding,
  marcarOnboardingVisto,
  type Almacen,
} from './primerVisita';

describe('primerVisita — onboarding sólo primera vez o cuando se reabre explícitamente', () => {
  it('1. almacen vacio + reaperturaExplicita=false -> true', () => {
    const almacen: Almacen = {
      leer: () => null,
      escribir: () => {},
    };

    expect(debeMostrarOnboarding(almacen, false)).toBe(true);
  });

  it('2. despues de marcarOnboardingVisto + reaperturaExplicita=false -> false', () => {
    const almacen: Almacen = {
      leer: () => '1',
      escribir: () => {},
    };

    // Primero marco como visto (no importa cómo lo marque el mock en este caso).
    marcarOnboardingVisto(almacen);

    expect(debeMostrarOnboarding(almacen, false)).toBe(false);
  });

  it('3. despues de marcarOnboardingVisto + reaperturaExplicita=true -> true', () => {
    const almacen: Almacen = {
      leer: () => '1',
      escribir: () => {},
    };

    marcarOnboardingVisto(almacen);

    expect(debeMostrarOnboarding(almacen, true)).toBe(true);
  });

  it("4. almacen con un valor inesperado (leer devuelve 'basura') + reaperturaExplicita=false -> true", () => {
    const almacen: Almacen = {
      leer: () => 'basura',
      escribir: () => {},
    };

    expect(debeMostrarOnboarding(almacen, false)).toBe(true);
  });

  it('5. almacen cuyo leer() lanza excepcion + reaperturaExplicita=false -> true', () => {
    const almacen: Almacen = {
      leer: () => {
        throw new Error('bloqueado');
      },
      escribir: () => {},
    };

    expect(debeMostrarOnboarding(almacen, false)).toBe(true);
  });

  it("6. marcaOnboardingVisto escribe en la clave CLAVE_ONBOARDING con el valor '1'", () => {
    const writes: Array<{ clave: string; valor: string }> = [];

    const almacen: Almacen = {
      leer: () => null,
      escribir: (clave, valor) => {
        writes.push({ clave, valor });
      },
    };

    marcarOnboardingVisto(almacen);

    expect(writes).toEqual([{ clave: CLAVE_ONBOARDING, valor: '1' }]);
  });

  it('7. un Almacen en memoria simple: leer-> null, marcar-> \'1\', debeMostrar-> false', () => {
    const memoria = new Map<string, string>();

    const almacen: Almacen = {
      leer: (clave) => memoria.get(clave) ?? null,
      escribir: (clave, valor) => {
        memoria.set(clave, valor);
      },
    };

    // estado inicial
    expect(almacen.leer(CLAVE_ONBOARDING)).toBe(null);

    marcarOnboardingVisto(almacen);

    expect(almacen.leer(CLAVE_ONBOARDING)).toBe('1');
    expect(debeMostrarOnboarding(almacen, false)).toBe(false);
  });
});
