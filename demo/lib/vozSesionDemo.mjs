const LIMITE_DIARIO = 3;
const STORE_NAME = 'nf-demo-voz-sesiones';
const AVISO_DEMO = 'Demo: 30 segundos por sesión, 3 sesiones por día.';

const contadorMemoria = new Map();
let storeBlobs = null;
let blobsIntentado = false;

function claveDelDia(ip) {
  const dia = new Date().toISOString().slice(0, 10);
  const ipNormalizada = String(ip || 'anon').trim() || 'anon';
  return `${dia}:${ipNormalizada}`;
}

async function obtenerStoreBlobs() {
  if (blobsIntentado) return storeBlobs;
  blobsIntentado = true;

  try {
    const mod = await import('@netlify/blobs');
    if (typeof mod?.getStore !== 'function') {
      storeBlobs = null;
      return null;
    }
    storeBlobs = mod.getStore(STORE_NAME);
    return storeBlobs;
  } catch {
    storeBlobs = null;
    return null;
  }
}

async function leerContador(clave) {
  const store = await obtenerStoreBlobs();
  if (store) {
    try {
      const data = await store.get(clave, { type: 'json' });
      const n = Number(data?.n ?? 0);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    } catch {
      storeBlobs = null;
    }
  }

  const local = Number(contadorMemoria.get(clave) ?? 0);
  return Number.isFinite(local) && local > 0 ? Math.floor(local) : 0;
}

async function escribirContador(clave, n) {
  const siguiente = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  const store = await obtenerStoreBlobs();

  if (store) {
    try {
      await store.setJSON(clave, { n: siguiente });
      return;
    } catch {
      storeBlobs = null;
    }
  }

  contadorMemoria.set(clave, siguiente);
}

export async function sesionVozDemo(ip = 'anon') {
  const apiKey = String(process.env.ASSEMBLYAI_API_KEY || '').trim();
  if (!apiKey) {
    return {
      status: 503,
      json: {
        success: false,
        motivo: 'sin_credencial',
      },
    };
  }

  const clave = claveDelDia(ip);
  const uso = await leerContador(clave);
  if (uso >= LIMITE_DIARIO) {
    return {
      status: 429,
      json: {
        success: false,
        motivo: 'tope_diario',
        aviso: AVISO_DEMO,
      },
    };
  }

  let respuesta;
  try {
    // OJO con los limites documentados por AssemblyAI:
    //   expires_in_seconds           -> 1..600
    //   max_session_duration_seconds -> 60..10800  (¡30 da 422!)
    // Los 30 s de sesion del demo los corta el panel; esto es el tope DURO del servidor.
    respuesta = await fetch(
      'https://streaming.assemblyai.com/v3/token?expires_in_seconds=60&max_session_duration_seconds=60',
      {
        method: 'GET',
        headers: {
          Authorization: apiKey,
        },
      }
    );
  } catch {
    return {
      status: 502,
      json: {
        success: false,
        motivo: 'proveedor',
        detalle: 'fetch_error',
      },
    };
  }

  if (!respuesta.ok) {
    return {
      status: 502,
      json: {
        success: false,
        motivo: 'proveedor',
        detalle: respuesta.status,
      },
    };
  }

  let payload = null;
  try {
    payload = await respuesta.json();
  } catch {
    payload = null;
  }

  const token = typeof payload?.token === 'string' ? payload.token.trim() : '';
  if (!token) {
    return {
      status: 502,
      json: {
        success: false,
        motivo: 'proveedor',
        detalle: 'token_vacio',
      },
    };
  }

  await escribirContador(clave, uso + 1);

  return {
    status: 200,
    json: {
      success: true,
      proveedor: 'assemblyai',
      protocolo: 'assemblyai-v3',
      etiqueta: 'AssemblyAI Universal-Streaming',
      token,
      jwt: token,
      url: 'wss://streaming.assemblyai.com/v3/ws',
      idioma: 'es',
      modelo: 'u3-rt-pro',
      expira_en_s: 60,
      codec: 'pcm_s16le 16000 Hz',
      aviso: AVISO_DEMO,
    },
  };
}
