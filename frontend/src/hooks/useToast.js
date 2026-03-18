import { createContext, useContext } from 'react';

export const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: {
        success: (msg) => console.log('Toast success:', msg),
        error:   (msg) => console.error('Toast error:', msg),
        info:    (msg) => console.log('Toast info:', msg),
        warning: (msg) => console.warn('Toast warning:', msg),
      }
    };
  }
  return ctx;
};