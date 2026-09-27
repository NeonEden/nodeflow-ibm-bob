import React, { useEffect, useState } from 'react';
import { Sparkles, Mic, Key, Command } from 'lucide-react';
import { apiUrl } from '../services/apiBase';
import { useIdioma } from '../i18n/useIdioma';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAiConfig: () => void;
  onOpenVoiceConfig: () => void;
  onOpenShortcuts: () => void;
  esDemo?: boolean;
  onEntrarDemo?: () => void;
}

/**
 * Bienvenida de la app: dice qué es NodeFlow, cómo se usa y dónde van las dos claves.
 *
 * Por qué existe (26/09/2026): la app abría en un lienzo vacío sin una sola frase que explicara qué hacer
 * —el `WelcomeModal` anterior estaba en el repo pero **no montado en ninguna parte**, y su texto era del
 * demo web («Bienvenido a NodeFlow (Demo Web)»). El usuario lo pidió textual: «al abrir la app no hay nada
 * que le hable al usuario ni diga lo que puede hacer».
 *
 * Dos decisiones que importan:
 *  · El atajo que muestra es el **real** (`Ctrl+Alt+Espacio`): el backend registra una cadena de candidatas
 *    (`lib.rs`: Ctrl+Shift+Space está tomado en muchos setups) y elige la primera libre. Mostrar una tecla
 *    que no funciona es peor que no mostrar ninguna.
 *  · Los botones abren la configuración que ya existe en vez de explicarla en texto: una bienvenida con
 *    botones muertos no enseña nada.
 *
 * Sólo se muestra la primera vez (y cuando el usuario la pide desde «Ver todos los atajos»): de eso se
 * encarga `utils/primerVisita.ts`, que es lógica pura y por eso está testeada aparte.
 */
export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onOpenAiConfig,
  onOpenVoiceConfig,
  onOpenShortcuts,
  esDemo,
  onEntrarDemo,
}) => {
  const { t } = useIdioma();
  // `null` = todavía no sabemos; la bienvenida no afirma nada que no haya leído de la API.
  const [hayIa, setHayIa] = useState<boolean | null>(null);
  const [hayVoz, setHayVoz] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let vivo = true;
    let intentos = 0;

    // El backend de la app tarda un instante en escuchar en su puerto (su propio log dice «puerto ocupado,
    // reintento») y este modal es lo PRIMERO que corre al abrir: con un único fetch, la bienvenida quedaba sin
    // el estado real de las claves. Medido el 26/09/2026 contra la app instalada: reabriendo el modal (backend
    // ya arriba) los badges aparecían; en la primera apertura, no. Se reintenta unos segundos y, si no se
    // puede saber, no se afirma nada: `null` = sin badge, ni «listo» ni «falta».
    const leerEstado = () => {
      fetch(apiUrl('/api/claves/estado'))
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!vivo) return;
          if (!d?.campos) {
            if (intentos++ < 5) window.setTimeout(leerEstado, 700);
            return;
          }
          const hay = (campo: string): boolean => {
            const c = (d.campos as Array<{ campo: string; origen: string }>).find((x) => x.campo === campo);
            return Boolean(c) && c!.origen !== 'ausente';
          };
          setHayIa(hay('gemini_api_key'));
          setHayVoz(hay('assemblyai_api_key'));
        })
        .catch(() => {
          // Backend que todavía no abrió (o red caída): se reintenta; la bienvenida no se cae por esto.
          if (vivo && intentos++ < 5) window.setTimeout(leerEstado, 700);
        });
    };

    leerEstado();
    return () => {
      vivo = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const fila = (
    icono: React.ReactNode,
    titulo: string,
    texto: string,
    accion: { etiqueta: string; onClick: () => void },
    configurado: boolean | null
  ) => (
    <div className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <div className="mt-0.5 shrink-0 text-emerald-400">{icono}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-100">{titulo}</h3>
          {configurado === true && (
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
              {t('onboarding.listo')}
            </span>
          )}
          {configurado === false && (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
              {t('onboarding.falta')}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">{texto}</p>
        <button
          type="button"
          onClick={accion.onClick}
          className="mt-2 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700"
        >
          {accion.etiqueta}
        </button>
      </div>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('onboarding.titulo')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-200 shadow-2xl">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Sparkles size={20} className="text-emerald-400" />
          {t('onboarding.titulo')}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{t('onboarding.bajada')}</p>

        <div className="mt-4 space-y-2">
          {fila(
            <Mic size={18} />,
            t('onboarding.hablar.titulo'),
            t('onboarding.hablar.texto'),
            { etiqueta: t('onboarding.hablar.boton'), onClick: onOpenShortcuts },
            null
          )}
          {fila(
            <Key size={18} />,
            t('onboarding.ia.titulo'),
            t('onboarding.ia.texto'),
            { etiqueta: t('onboarding.ia.boton'), onClick: onOpenAiConfig },
            hayIa
          )}
          {fila(
            <Command size={18} />,
            t('onboarding.voz.titulo'),
            t('onboarding.voz.texto'),
            { etiqueta: t('onboarding.voz.boton'), onClick: onOpenVoiceConfig },
            hayVoz
          )}
          {esDemo && (
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onEntrarDemo}
                className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-500"
              >
                {t('demo.entrar')}
              </button>
              <span className="text-xs text-slate-400">{t('demo.entrar.ayuda')}</span>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onOpenShortcuts}
            className="text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
          >
            {t('onboarding.atajos')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            {t('onboarding.empezar')}
          </button>
        </div>
      </div>
    </div>
  );
};
