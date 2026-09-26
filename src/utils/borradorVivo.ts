export type FaseTurno = 'inactivo' | 'escuchando' | 'resolviendo';
export type AccionBorrador = 'dibujar' | 'conservar' | 'retirar';

export function decidirBorrador(p: {
  fase: FaseTurno;
  hayFantasma: boolean;
  hayDecision: boolean;
  clase: 'nada' | 'semilla' | 'correccion' | null;
  hayIdeaEnVivo: boolean;
}): AccionBorrador {
  if (p.fase === 'resolviendo') {
    return 'retirar';
  }

  const resolverReglaLocal = (): AccionBorrador => {
    if (p.hayIdeaEnVivo) {
      return 'dibujar';
    }
    if (p.hayFantasma) {
      return 'conservar';
    }
    return 'retirar';
  };

  if (!p.hayDecision) {
    return resolverReglaLocal();
  }

  if (p.clase === 'nada') {
    if (p.hayFantasma) {
      return 'conservar';
    }
    return p.hayIdeaEnVivo ? 'dibujar' : 'retirar';
  }

  if (p.clase === 'semilla' || p.clase === 'correccion') {
    return 'dibujar';
  }

  return resolverReglaLocal();
}
