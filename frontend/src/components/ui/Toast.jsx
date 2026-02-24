import { useState, useCallback, useRef } from 'react';
import { ToastContext } from '../../hooks/useToast';

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
  }, []);

  const add = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type, leaving: false }]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const toast = {
    success: (msg, dur) => add(msg, 'success', dur),
    error:   (msg, dur) => add(msg, 'error', dur ?? 6000),
    info:    (msg, dur) => add(msg, 'info', dur),
    warning: (msg, dur) => add(msg, 'warning', dur),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
        style={{ maxWidth: '360px', width: 'calc(100vw - 2rem)' }}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const TOAST_STYLES = {
  success: {
    bar:   'bg-emerald-500',
    icon:  'text-emerald-500',
    label: 'Success',
    svg: (
      <path fillRule="evenodd" clipRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9
           10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
    ),
  },
  error: {
    bar:   'bg-red-500',
    icon:  'text-red-500',
    label: 'Error',
    svg: (
      <path fillRule="evenodd" clipRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586
           10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0
           001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586
           8.707 7.293z"/>
    ),
  },
  warning: {
    bar:   'bg-amber-500',
    icon:  'text-amber-500',
    label: 'Warning',
    svg: (
      <path fillRule="evenodd" clipRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213
           2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11
           13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1
           0 00-1-1z"/>
    ),
  },
  info: {
    bar:   'bg-blue-500',
    icon:  'text-blue-500',
    label: 'Info',
    svg: (
      <path fillRule="evenodd" clipRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012
           0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"/>
    ),
  },
};

const ToastItem = ({ toast: t, onDismiss }) => {
  const style = TOAST_STYLES[t.type] || TOAST_STYLES.info;

  return (
    <div
      className="pointer-events-auto"
      style={{
        animation: t.leaving
          ? 'toastOut 0.35s cubic-bezier(0.4,0,1,1) forwards'
          : 'toastIn 0.35s cubic-bezier(0,0,0.2,1) forwards',
      }}
    >
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(110%) scale(0.95); }
          to   { opacity: 1; transform: translateX(0)   scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0)   scale(1);    max-height: 100px; }
          to   { opacity: 0; transform: translateX(110%) scale(0.95); max-height: 0;    }
        }
      `}</style>

      <div className="relative overflow-hidden rounded-xl bg-white shadow-xl border border-gray-100"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

        {/* Coloured left bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.bar}`} />

        <div className="flex items-start gap-3 pl-4 pr-3 py-3.5">
          {/* Icon */}
          <svg className={`h-5 w-5 shrink-0 mt-0.5 ${style.icon}`} fill="currentColor" viewBox="0 0 20 20">
            {style.svg}
          </svg>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">
              {style.label}
            </p>
            <p className="text-sm font-medium text-gray-800 leading-snug">{t.message}</p>
          </div>

          {/* Dismiss */}
          <button onClick={onDismiss}
            className="text-gray-300 hover:text-gray-500 transition-colors shrink-0 mt-0.5 -mr-1">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToastProvider;
