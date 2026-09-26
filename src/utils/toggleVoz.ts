import type { EstadoVoz } from '../services/speechmaticsRt';

export const MS_UMBRAL_TOGGLE = 400;
export type AccionAtajo = 'abrir' | 'cerrar' | 'reiniciar' | 'ignorar';

/**
 * Qué hacer con el atajo global de voz (`Ctrl+Alt+Espacio`), que es un interruptor.
 *
 * Por qué es una función pura y no vive dentro del panel: el bug que arregla (26/09/2026) fue un bucle de
 * estados. El log mostraba «atajo.toggle estado=escuchando» y «turno.cierre_duplicado» repetidos 19 veces a
 * ~1 Hz: el turno ya se había cerrado, el estado había quedado en «escuchando», y cada pulsación volvía a
 * intentar cerrar sin cambiar nada. Con `reiniciar` el panel vuelve a un estado del que sí se sale.
 *
 * Los SEIS estados reales de `EstadoVoz` se reparten en tres grupos, y estar en el grupo equivocado es
 * exactamente el bug:
 *
 *  · `escuchando` — el único con turno abierto: un `pressed` cierra, o reinicia si el turno ya se cerró.
 *  · `conectando` / `cerrando` — tránsitos de la sesión: el atajo no se mete (cortar ahí rompe el arranque).
 *  · **todo el resto** (`inactivo`, `cerrado`, `error`) — «no hay turno»: un `pressed` ABRE uno nuevo.
 *
 * El estado `cerrado` no estaba contemplado en la primera versión de esta pieza y el atajo quedaba mudo con
 * él: se descubrió probando el atajo sintético contra la app en ejecución, no leyendo el código.
 */
export function decidirAtajo(p: {
  fase: 'pressed' | 'released';
  estado: EstadoVoz;
  msDesdePressed: number;
  turnoYaCerrado: boolean;
}): AccionAtajo {
  if (p.fase === 'pressed') {
    if (p.estado === 'escuchando') return p.turnoYaCerrado ? 'reiniciar' : 'cerrar';
    if (p.estado === 'conectando' || p.estado === 'cerrando') return 'ignorar';
    return 'abrir';
  }

  // `released` (soltar el atajo): sólo corta el push-to-talk, y sólo si hay un turno abierto.
  if (p.estado !== 'escuchando') return 'ignorar';
  if (p.turnoYaCerrado) return 'ignorar';
  return p.msDesdePressed >= MS_UMBRAL_TOGGLE ? 'cerrar' : 'ignorar';
}
