"use client";

import { CheckCircle2, Circle } from "lucide-react";

export function BillFormChoiceCard({
  name,
  value,
  checked,
  label,
  description,
  detail,
  onChange,
}: {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  description: string;
  detail?: string | null;
  onChange(): void;
}) {
  return (
    <label
      className={`min-w-0 overflow-hidden rounded-xl border p-4 transition-colors sm:p-5 ${
        checked
          ? "border-brand bg-brand-subtle"
          : "border-border bg-background hover:border-brand/50"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="break-words font-heading text-base font-semibold sm:text-lg">
            {label}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        </div>
        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
            checked ? "bg-brand text-white" : "bg-surface text-muted"
          }`}
        >
          {checked ? (
            <CheckCircle2 aria-hidden="true" className="size-5" />
          ) : (
            <Circle aria-hidden="true" className="size-5" />
          )}
        </div>
      </div>
      {detail && (
        <p className="mt-3 break-all font-mono text-[11px] leading-5 text-muted">
          {detail}
        </p>
      )}
    </label>
  );
}

export function BillFormField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  mono = false,
  suffix,
  inputMode,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  placeholder: string;
  required?: boolean;
  mono?: boolean;
  suffix?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block min-w-0">
      <span className="text-sm font-semibold">{label}</span>
      <div className="mt-2 flex min-w-0 w-full overflow-hidden rounded-md border border-border bg-background focus-within:border-brand focus-within:ring-3 focus-within:ring-focus/20">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete="off"
          className={`min-h-12 min-w-0 w-full flex-1 bg-transparent px-3 outline-none sm:px-4 ${mono ? "font-mono text-sm" : ""}`}
        />
        {suffix && (
          <span className="flex shrink-0 items-center border-l border-border px-3 text-sm font-semibold text-brand sm:px-4">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}
