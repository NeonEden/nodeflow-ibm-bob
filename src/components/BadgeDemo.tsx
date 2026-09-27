import React from 'react';
import { useIdioma } from '../i18n/useIdioma';
import { ES_DEMO_WEB } from '../services/apiBase';

/**
 * Distintivo discreto que indica que la aplicación está en modo demo (web).
 * No se muestra en la app de escritorio porque allí ES_DEMO_WEB es false.
 */
export function BadgeDemo(): React.ReactElement | null {
  const { t } = useIdioma();
  if (!ES_DEMO_WEB) return null;
  return (
    <span
      className="ml-2 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 ring-1 ring-slate-600"
    >
      {t('demo.badge')}
    </span>
  );
}
