'use client';

import { useEffect, useState } from 'react';

type Toast = {
  id: number;
  message: string;
  tone: 'success' | 'error';
};

export const TOAST_EVENT = 'roboking:toast';

export function showToast(message: string, tone: Toast['tone'] = 'success') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, tone } }));
}

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function onToast(event: Event) {
      const detail = (event as CustomEvent<{ message?: string; tone?: Toast['tone'] }>).detail;
      if (!detail?.message) return;
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current.slice(-2), { id, message: detail.message!, tone: detail.tone || 'success' }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 4000);
    }

    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${
            toast.tone === 'success'
              ? 'border-emerald-200 bg-white text-emerald-950'
              : 'border-red-200 bg-white text-red-900'
          }`}
        >
          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
            toast.tone === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}>
            {toast.tone === 'success' ? 'OK' : '!'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">{toast.tone === 'success' ? 'Success' : 'Action failed'}</div>
            <div className="mt-0.5 break-words text-sm">{toast.message}</div>
          </div>
          <button
            type="button"
            aria-label="Close notification"
            onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-lg text-slate-500 hover:bg-slate-100"
          >
            X
          </button>
        </div>
      ))}
    </div>
  );
}
