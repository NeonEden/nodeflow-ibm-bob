export interface Almacen {
  leer(clave: string): string | null;
  escribir(clave: string, valor: string): void;
}

export const CLAVE_ONBOARDING = 'nodeflow_onboarding_visto';

export function debeMostrarOnboarding(a: Almacen, reaperturaExplicita: boolean): boolean {
  if (reaperturaExplicita) return true;

  try {
    const valor = a.leer(CLAVE_ONBOARDING);
    return valor !== '1';
  } catch {
    // Si no se puede leer el estado del almacenamiento, es peor no explicar nada que repetir.
    return true;
  }
}

export function marcarOnboardingVisto(a: Almacen): void {
  try {
    a.escribir(CLAVE_ONBOARDING, '1');
  } catch {
    // Si no se puede guardar, no matamos la app; en el próximo arranque se reintentará.
  }
}
