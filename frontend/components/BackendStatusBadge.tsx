'use client';

import { useEffect, useRef, useState } from 'react';
import { Settings, X } from 'lucide-react';
import {
  checkBackendHealth,
  DEFAULT_API_BASE_URL,
  getEffectiveApiUrl,
  getStoredApiUrl,
  setStoredApiUrl,
} from '@/lib/api';

export function BackendStatusBadge() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [activeUrl, setActiveUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      const result = await checkBackendHealth();
      if (stopped) return;
      if (result.activeUrl === getEffectiveApiUrl()) {
        setIsOnline(result.isOnline);
        setActiveUrl(result.activeUrl);
      }
      timer = setTimeout(refresh, 20_000);
    }
    void refresh();
    const onGatewayChange = () => {
      clearTimeout(timer);
      void refresh();
    };
    window.addEventListener('medverify-gateway-change', onGatewayChange);
    window.addEventListener('storage', onGatewayChange);
    return () => {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener('medverify-gateway-change', onGatewayChange);
      window.removeEventListener('storage', onGatewayChange);
    };
  }, []);

  const testGateway = async (input: string) => {
    const target = input.trim().replace(/\/+$/, '');
    if (target && !/^https?:\/\//i.test(target)) {
      setMessage('Enter an HTTP or HTTPS service address.');
      return;
    }
    setIsTesting(true);
    setMessage('');
    const result = await checkBackendHealth(target || DEFAULT_API_BASE_URL);
    // Clearing the override must work even when the default service is down.
    if (result.isOnline || !target) {
      try {
        setStoredApiUrl(target || null);
        setIsOnline(result.isOnline);
        setActiveUrl(result.activeUrl);
        setInputUrl(target);
        setMessage(result.isOnline ? 'Connected to the selected service.' : 'Default restored. The service is currently unreachable.');
      } catch {
        setMessage('This browser blocked saving the gateway setting.');
      }
    } else {
      setMessage(result.message || 'The selected service is unreachable.');
    }
    setIsTesting(false);
  };

  const status = isOnline === null ? 'Checking service…' : isOnline ? 'Service online' : 'Browser mode';
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setInputUrl(getStoredApiUrl() || '');
          setMessage('');
          dialog.current?.showModal();
        }}
        className="inline-flex items-center gap-2 rounded border border-clinical-border px-3 py-2 text-xs text-clinical-navy"
      >
        <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-pharm-green' : 'bg-amber-500'}`} />
        {status}
        <Settings className="h-4 w-4" />
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="gateway-title"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
        className="max-w-[calc(100%_-_2rem)] w-[30rem] rounded border border-clinical-border bg-clinical-surface p-5 text-clinical-navy shadow-xl backdrop:bg-black/40"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="gateway-title" className="font-serif text-xl font-bold">Screening service</h2>
          <button type="button" aria-label="Close settings" onClick={() => dialog.current?.close()}><X /></button>
        </div>
        <p className="mt-3 break-all text-sm">{status} · {activeUrl || DEFAULT_API_BASE_URL}</p>
        <p className="mt-1 text-sm text-clinical-subtext">Photos go to the selected service. If the connection is unavailable, the browser can measure image quality locally.</p>
        <form className="mt-5 space-y-3" onSubmit={(event) => {
          event.preventDefault();
          void testGateway(inputUrl);
        }}>
          <label htmlFor="gateway-url" className="block text-sm font-semibold">Custom service address</label>
          <input id="gateway-url" type="url" value={inputUrl} onChange={(event) => setInputUrl(event.target.value)}
            disabled={isTesting} placeholder="https://your-service.example" className="w-full rounded border border-clinical-border p-2 text-sm" />
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={isTesting} className="rounded bg-clinical-navy px-3 py-2 text-sm text-white disabled:opacity-60">
              {isTesting ? 'Connecting…' : 'Test and save'}
            </button>
            <button type="button" disabled={isTesting} onClick={() => void testGateway('')} className="rounded border border-clinical-border px-3 py-2 text-sm">Restore default</button>
          </div>
        </form>
        {message && <p role="status" className="mt-3 text-sm">{message}</p>}
      </dialog>
    </>
  );
}
