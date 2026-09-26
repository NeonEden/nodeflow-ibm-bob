import { afterEach, describe, expect, it, vi } from 'vitest';
import { MS_TIMEOUT_IA, postAiAction } from './aiApi';

describe('aiApi.postAiAction — timeout de fetch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('1. respuesta inmediata -> devuelve la Response, fetch llamado una vez, y no se aborta', async () => {
    const respuesta = new Response(JSON.stringify({ ok: true }), { status: 200 });
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect(init?.signal?.aborted).toBe(false);
      return respuesta;
    });
    vi.stubGlobal('fetch', fetchMock);

    const recibida = await postAiAction({ accion: 'ping' });

    expect(recibida).toBe(respuesta);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]?.[1];
    expect((init?.signal as AbortSignal).aborted).toBe(false);
  });

  it('2. fetch que nunca resuelve + avanzar el reloj 90000 ms -> rechaza con message El motor no contestó a tiempo.', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const promesa = postAiAction({ accion: 'lenta' });
    const rechazo = expect(promesa).rejects.toThrowError('El motor no contestó a tiempo.');

    await vi.advanceTimersByTimeAsync(MS_TIMEOUT_IA);
    await rechazo;
  });

  it('3. opts.timeoutMs = 500 + avanzar 500 ms -> rechaza igual (el override se respeta)', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const promesa = postAiAction({ accion: 'override' }, { timeoutMs: 500 });
    const rechazo = expect(promesa).rejects.toThrowError('El motor no contestó a tiempo.');

    await vi.advanceTimersByTimeAsync(500);
    await rechazo;
  });

  it('4. opts.timeoutMs = 500 + avanzar 400 ms + resolver la respuesta -> NO rechaza (todavia no vencio)', async () => {
    vi.useFakeTimers();
    let resolver: ((value: Response) => void) | null = null;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolver = resolve;
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const promesa = postAiAction({ accion: 'gana-a-tiempo' }, { timeoutMs: 500 });
    await vi.advanceTimersByTimeAsync(400);
    resolver?.(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await expect(promesa).resolves.toBeInstanceOf(Response);
  });

  it('5. despues de resolver, avanzar 200000 ms -> no queda ningun timer vivo', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await postAiAction({ accion: 'limpia-timer' }, { timeoutMs: 500 });

    await vi.advanceTimersByTimeAsync(200_000);
    expect(vi.getTimerCount()).toBe(0);
  });
});
