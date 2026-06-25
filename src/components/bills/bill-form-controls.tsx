"use client";

import { CheckCircle2, Coins } from "lucide-react";

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
      className={`cursor-pointer rounded-xl border p-5 transition-colors ${
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-heading text-lg font-semibold">{label}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        </div>
        <div
          className={`flex size-8 items-center justify-center rounded-full ${
            checked ? "bg-brand text-white" : "bg-surface text-muted"
          }`}
        >
          {checked ? (
            <CheckCircle2 aria-hidden="true" className="size-5" />
          ) : (
            <Coins aria-hidden="true" className="size-5" />
          )}
        </div>
      </div>
      {detail && (
        <p className="mt-3 break-all font-mono text-[11px] text-muted">
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
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <div className="mt-2 flex rounded-md border border-border bg-background focus-within:border-brand focus-within:ring-3 focus-within:ring-focus/20">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete="off"
          className={`min-h-12 min-w-0 flex-1 bg-transparent px-4 outline-none ${mono ? "font-mono text-sm" : ""}`}
        />
        {suffix && (
          <span className="flex items-center border-l border-border px-4 text-sm font-semibold text-brand">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}
