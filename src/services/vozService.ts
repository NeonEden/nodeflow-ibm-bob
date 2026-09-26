import { apiUrl } from './apiBase';
import { postAiAction } from './aiApi';
import type { SesionVoz } from './sttRt';

/**
 * Voz: Speechmatics transcribe, el motor de la app interpreta y PROPONE un plan de operaciones
 * sobre el lienzo. El backend valida ese plan contra los ids reales antes de devolverlo, y acá
 * sólo se pide y se muestra: nada se aplica sin que el usuario lo apruebe.
 */

// ── Clasificador de parciales (Fase C, lienzo en vivo) ───────────────────────────────────────────

/** Decisión del segmentador para un parcial del turno de voz. */
export interface DecisionParcial {
  clase: 'nada' | 'semilla' | 'correccion';
  motivo: string;
  titulo: string | null;
  texto: string;
  /**
   * Unidades temáticas del turno (1 a 4), en orden de aparición — pedido 04.
   *
   * Sólo viene con `clase === 'semilla'`. `titulo` y `texto` son los del **primer** tema (así el
   * cliente que dibuja un solo fantasma sigue funcionando); la cadena completa se dibuja desde acá.
   */
  temas?: { titulo: string; texto: string }[];
}

/**
 * Cuánto tiene que quedarse quieto el parcial antes de consultar al segmentador.
 *
 * El segmentador del backend exige que el texto no haya cambiado durante su propio umbral
 * (`MS_ESTABLE` en `segmentador.rs`, 250 ms). Si el cliente consultara apenas llega un parcial
 * nuevo, `ms_desde_cambio` valdría ~0 y el backend contestaría «nada» **siempre**: su juicio nunca
 * se activaría y el fantasma dependería sólo de la regla local de `draftVoz`. Por eso el cliente
 * espera a que el parcial se quede quieto y consulta con el reloj ya cumplido.
 *
 * Esta constante tiene que quedar por encima del umbral del segmentador: si bajara, la consulta
 * llegaría con el reloj corto y el backend volvería a decir «nada» (hay un test que lo ancla).
 */
export const MS_ESTABILIDAD_CLIENTE = 300;

/**
 * Umbral que separa un toque corto (interruptor) de un push-to-talk mantenido.
 *
 * Por qué existe: la primera prueba real (26/09) mostró que el usuario tecleaba el atajo en vez
 * de mantenerlo apretado, generando 15 pares pressed/released en < 1 s y turnos solapados. Con
 * este umbral, un `released` que llega antes de 400 ms no corta el turno — el atajo ya lo cerró
 * al hacer `pressed` con el micrófono encendido. Un `released` que llega después sí corta: es el
 * push-to-talk de siempre.
 */
export const MS_UMBRAL_TOGGLE = 400;

/** Tiempo (ms) que el parcial lleva sin cambiar. Nunca negativo (`performance.now()` puede repetir). */
export function msQuieto(ahora: number, ultimoCambio: number): number {
  return Math.max(0, Math.round(ahora - ultimoCambio));
}

/**
 * Manda el parcial del turno al segmentador del backend (`POST /api/voz/parcial`) y devuelve la
 * decisión: si hay que dibujar un borrador, si el usuario se corrigió, o si hay que esperar más.
 *
 * **Devuelve `null` si el backend no contesta, tarda más de `timeoutMs` (300 ms por defecto) o
 * responde con un status distinto de 200.** No lanza: quien la llama no tiene que atrapar errores
 * de red, porque la red es opcional — el lienzo sigue funcionando con la regla local de `draftVoz`.
 *
 * Sin reintentos: el próximo parcial va a llegar en ~150 ms, así que ya habrá otra oportunidad.
 *
 * Una clase desconocida (el backend devolviera otra string) se normaliza a `'nada'`: el cliente no
 * se rompe por un contrato que todavía no actualizó.
 */
export async function clasificarParcial(
  p: {
    turno_id: string;
    texto: string;
    anterior?: string;
    ms_desde_cambio?: number;
    es_final?: boolean;
  },
  opts?: { timeoutMs?: number },
): Promise<DecisionParcial | null> {
  const ctrl = new AbortController();
  const ms = opts?.timeoutMs ?? 300;
  const timer = window.setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(apiUrl('/api/voz/parcial'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const d = await r.json();
    // Clases válidas; cualquier otra se trata como «nada» para que el cliente no se rompa.
    const claseValida = (c: unknown): c is DecisionParcial['clase'] =>
      c === 'nada' || c === 'semilla' || c === 'correccion';
    return {
      clase: claseValida(d.clase) ? d.clase : 'nada',
      motivo: typeof d.motivo === 'string' ? d.motivo : '',
      titulo: typeof d.titulo === 'string' ? d.titulo : null,
      texto: typeof d.texto === 'string' ? d.texto : '',
    };
  } catch {
    // AbortError (timeout), error de red, o JSON inválido: todo es null para el llamador.
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

export interface VozEstado {
  success: boolean;
  configurada: boolean;
  proveedor: string;
  url: string;
  modelo: string;
  idioma: string;
  codec: string;
  pista: string;
  /** Nombre legible del motor elegido (`proveedor` es el id: `speechmatics` | `assemblyai`). */
  proveedor_etiqueta?: string;
  /** `speechmatics-v2` | `assemblyai-v3` — decide el cliente del frontend. */
  protocolo?: string;
  /** `*` = multilingüe; si no, la lista de idiomas soportados. */
  idiomas_soportados?: string;
  /** Lo que hay que saber del motor (límites, latencia, alcance). */
  nota?: string;
  /** Aviso cuando el idioma pedido no se puede cumplir con el motor elegido. */
  aviso?: string | null;
  /** Catálogo completo, para poder ofrecer el cambio de motor. */
  proveedores?: ProveedorVoz[];
  /** Voz de salida local (Kokoro). Es opcional: si no está levantada, se avisa y nada se rompe. */
  tts?: { disponible: boolean; url: string; motor: string };
}

export interface ProveedorVoz {
  id: string;
  etiqueta: string;
  url: string;
  protocolo: string;
  idiomas: string;
  nota: string;
  clave_configurada: boolean;
}

export type AccionVoz =
  | 'crear'
  | 'enlazar'
  | 'enfocar'
  | 'condensar'
  | 'criticar'
  | 'delegar'
  | 'actualizar'
  // Cierres del ciclo, operables hablando: responder una pregunta y decidir qué queda.
  | 'responder'
  | 'aceptar'
  | 'descartar'
  // Sólo lectura: pregunta por el lienzo y responde hablando, sin tocarlo.
  | 'consultar';

export interface VozComando {
  accion: AccionVoz;
  titulo?: string;
  descripcion?: string;
  categoria?: string;
  /** Sólo en `crear`: a qué nodo colgar el nodo dictado (id o título). Sin él se usa el ancla del lienzo. */
  parent?: string;
  criterio?: string;
  nodos?: string[];
  desde?: string;
  hasta?: string;
  /** Sólo en `consultar`: la pregunta sobre el lienzo. No viaja al grafo: es materia de la respuesta. */
  tema?: string;
  /** Sólo en `delegar`: lo que hay que pedirle al motor profundo (Hermes, con sus herramientas). */
  pedido?: string;
  /** Sólo en `actualizar`: el nodo que ya existe y los campos que cambian (fase, descripción…). */
  nodo?: string;
  /** Sólo en `responder`: el texto de la respuesta que cierra la pregunta. */
  respuesta?: string;
  maturity?: number;
  tags?: string[];
}

export interface PlanVoz {
  intencion: 'capturar' | 'comando';
  /** Lo decide el backend con la regla de voz selectiva: si merece hablarse, se dice. */
  hablar?: boolean;
  respuesta: string;
  motivo?: string;
  comandos: VozComando[];
  descartados?: number;
  motivo_descarte?: string[];
}

export interface PlanVozRespuesta {
  plan: PlanVoz;
  modelo: string;
  uso: Record<string, any>;
}

export async function getVozEstado(): Promise<VozEstado> {
  const r = await fetch(apiUrl('/api/voz/estado'));
  if (!r.ok) throw new Error('No pude consultar el estado de la voz.');
  return (await r.json()) as VozEstado;
}

/**
 * Token temporal del motor de voz elegido. El backend decide cuál es y cómo se emite; acá viaja
 * también `proveedor`/`protocolo` para que el panel sepa qué cliente instanciar, y `aviso` cuando
 * el idioma pedido no se puede cumplir (p. ej. streaming en inglés únicamente).
 */
export async function getVozJwt(): Promise<SesionVoz> {
  const r = await fetch(apiUrl('/api/voz/jwt'));
  const d = await r.json();
  if (!r.ok || !d.success) throw new Error(d?.error || 'No pude pedir el token de voz.');
  return d as SesionVoz;
}

/** Catálogo de motores de voz y cuál está elegido. */
export async function getVozProveedores(): Promise<{ elegido: string; proveedores: ProveedorVoz[] }> {
  const r = await fetch(apiUrl('/api/voz/proveedores'));
  const d = await r.json();
  if (!r.ok || !d.success) throw new Error(d?.error || 'No pude leer los motores de voz.');
  return { elegido: d.elegido, proveedores: d.proveedores || [] };
}

/** Cambia el motor de reconocimiento (queda guardado en la config de la app). */
export async function setVozProveedor(id: string): Promise<{ elegido: string; idiomas: string; nota: string }> {
  const r = await fetch(apiUrl('/api/voz/proveedor'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  const d = await r.json();
  if (!r.ok || !d.success) throw new Error(d?.error || 'No pude cambiar el motor de voz.');
  return { elegido: d.elegido, idiomas: d.idiomas, nota: d.nota };
}

/**
 * Error marcado que indica que el backend estaba ocupado (409 con `ocupado: true`). El panel de voz
 * lo trata de forma silenciosa: el aviso ya salió por el canal `nodeflow:aviso` desde `aiApi.ts`,
 * y el fantasma del lienzo no se limpia.
 */
export class ErrorOcupado extends Error {
  readonly ocupado = true;
  constructor(msg: string) {
    super(msg);
    this.name = 'ErrorOcupado';
  }
}

/** Manda lo dictado y recibe el plan ya validado contra el lienzo real. */
export async function pedirPlanVoz(texto: string): Promise<PlanVozRespuesta> {
  const r = await postAiAction({ type: 'voz', texto });
  const d = await r.json();
  if (!d.success) {
    // 409 con ocupado:true: el aviso ya salió por nodeflow:aviso; acá sólo se marca para que el
    // panel pueda ignorarlo silenciosamente sin limpiar el fantasma del lienzo.
    if (d.ocupado) throw new ErrorOcupado(d?.error || 'Ya hay una generación en curso.');
    throw new Error(d?.error || 'No pude interpretar lo que dijiste.');
  }
  const plan = d.voz as PlanVoz;
  return { plan, modelo: d.modelUsed || '', uso: d.uso || {} };
}

/**
 * Voz del sistema (WebView2 → voces SAPI de Windows): **cero bytes, siempre disponible**.
 *
 * Es la red de seguridad para que la app hable en una PC recién instalada, donde Kokoro no existe.
 * Suena peor que Kokoro, pero hablar con voz prestada es mejor que no hablar: el fallback se usa
 * sólo si la voz local no responde, y el panel lo declara.
 */
export function hablarConElSistema(texto: string, idioma: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const s = window.speechSynthesis;
      if (!s) {
        resolve();
        return;
      }
      s.cancel();
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = idioma === 'en' ? 'en-US' : 'es-AR';
      u.rate = 1.02;
      const voz = s.getVoices().find((x) => (x.lang || '').toLowerCase().startsWith(u.lang.slice(0, 2)));
      if (voz) u.voice = voz;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      s.speak(u);
    } catch {
      resolve();
    }
  });
}

/** Pide la voz local (Kokoro) y devuelve el audio listo para reproducir. */
export async function decir(texto: string): Promise<Blob> {
  const r = await fetch(apiUrl('/api/voz/decir'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto }),
  });
  if (!r.ok) {
    let detalle = 'La voz local no respondió.';
    try {
      detalle = (await r.json())?.error || detalle;
    } catch {
      /* respuesta sin JSON */
    }
    throw new Error(detalle);
  }
  return await r.blob();
}

/** Texto legible de un comando, para la tarjeta de confirmación. */
export function describirComando(c: VozComando, titulo: (id: string) => string): string {
  switch (c.accion) {
    case 'crear':
      return `Crear «${c.titulo}»`;
    case 'enlazar':
      return `Enlazar ${titulo(c.desde || '') || c.desde} → ${titulo(c.hasta || '') || c.hasta}`;
    case 'enfocar':
      return `Enfocar en ${c.nodos?.length || 0} nodos y condensar el resto`;
    case 'condensar':
      return `Condensar ${c.nodos?.length || 0} nodos en uno`;
    case 'criticar':
      return `Cuestionar ${c.nodos?.length || 0} nodos`;
    case 'delegar':
      return `Pedirle al motor profundo: «${(c.pedido || '').slice(0, 60)}»`;
    case 'actualizar': {
      const que = [c.titulo && 'título', c.descripcion && 'descripción', c.categoria && 'categoría',
                   c.maturity && `fase ${c.maturity}`, c.tags?.length && 'etiquetas'].filter(Boolean).join(', ');
      return `Actualizar ${titulo(c.nodo || '') || c.nodo}: ${que || 'un campo'}`;
    }
    default:
      return c.accion;
  }
}
