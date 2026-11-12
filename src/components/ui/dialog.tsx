"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { apiErrorDetail } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

/** A modal built on the native <dialog>: focus stays inside and Escape or the backdrop closes it. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[440px] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/40"
    >
      {open ? (
        <div className="p-6">
          <h2 id={titleId} className="text-[15px] font-medium">
            {title}
          </h2>
          {description ? (
            <div className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{description}</div>
          ) : null}
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      ) : null}
    </dialog>
  );
}

/**
 * Asks before running `onConfirm`. The dialog stays open while it runs and shows the error if
 * it fails; it closes only on success. With `confirmText`, the operator must type that text first.
 * A dangerous confirmation opens with Cancel focused, so Enter alone never confirms it.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  danger = false,
  confirmText,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<unknown>;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  confirmText?: string;
}) {
  const { t } = useI18n();
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inputId = useId();

  function close() {
    if (pending) return;
    setTyped("");
    setError("");
    onClose();
  }

  const ready = !confirmText || typed.trim() === confirmText.trim();

  return (
    <Dialog open={open} onClose={close} title={title} description={description}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!ready || pending) return;
          setPending(true);
          setError("");
          try {
            await onConfirm();
            setTyped("");
            onClose();
          } catch (caught) {
            setError(apiErrorDetail(caught, t("common.actionFailed")));
          } finally {
            setPending(false);
          }
        }}
      >
        {confirmText ? (
          <label htmlFor={inputId} className="block text-[12px] text-muted-foreground">
            {t("common.typeToConfirm", { text: confirmText })}
            <input
              id={inputId}
              value={typed}
              autoComplete="off"
              autoFocus
              onChange={(event) => setTyped(event.target.value)}
              className="mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring"
            />
          </label>
        ) : null}
        {error ? (
          <p role="alert" className="mt-3 text-[12px] text-destructive">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" disabled={pending} autoFocus={danger && !confirmText} onClick={close}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            variant={danger ? "destructive" : "default"}
            disabled={!ready || pending}
            autoFocus={!danger && !confirmText}
          >
            {pending ? t("common.working") : confirmLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
