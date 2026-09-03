"use client";

import type { ReactNode } from "react";

export function Field({
  label,
  value,
  onChange,
  type = "text",
  required = true,
  autoComplete,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
      {label}
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring"
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-9 w-full rounded-md border border-border bg-background px-2 text-[13px] text-foreground outline-none"
      >
        {children}
      </select>
    </label>
  );
}
