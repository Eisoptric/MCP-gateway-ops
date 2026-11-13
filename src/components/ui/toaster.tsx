"use client";

import { useEffect } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToastStore, type Toast } from "@/stores/toast-store";

const LIFETIME_MS = { success: 4000, error: 8000 } as const;

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[340px] max-w-[calc(100vw-2.5rem)] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const { t } = useI18n();
  const dismiss = useToastStore((state) => state.dismiss);

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), LIFETIME_MS[toast.tone]);
    return () => window.clearTimeout(timer);
  }, [dismiss, toast.id, toast.tone]);

  const Icon = toast.tone === "success" ? CircleCheck : CircleAlert;

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-border bg-card px-3.5 py-3 text-[13px] shadow-lg animate-in fade-in slide-in-from-bottom-2"
    >
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${toast.tone === "success" ? "text-success" : "text-destructive"}`}
      />
      <span className="min-w-0 flex-1 break-words">{toast.message}</span>
      <button
        type="button"
        aria-label={t("common.dismiss")}
        onClick={() => dismiss(toast.id)}
        className="mt-0.5 text-muted-foreground hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
