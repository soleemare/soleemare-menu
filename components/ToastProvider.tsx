"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();

    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed right-4 top-4 z-[9999] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const styles =
            toast.type === "success"
              ? "border-[#046703]/20 bg-[#046703] text-white"
              : toast.type === "error"
              ? "border-[#f6070b]/20 bg-[#f6070b] text-white"
              : "border-[#69adb6]/20 bg-[#69adb6] text-white";

          return (
            <div
              key={toast.id}
              className={`rounded-2xl border px-4 py-3 shadow-lg ${styles}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium leading-5">{toast.message}</p>

                <button
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 text-sm opacity-80 hover:opacity-100"
                  type="button"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }

  return context;
}