"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useId, type ReactNode } from "react";

import { cn } from "@/lib/cn";

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
      data-selected={checked ? "true" : "false"}
      className={`relative min-w-0 cursor-pointer select-none overflow-hidden rounded-xl border p-4 transition-colors focus-within:outline-none focus-within:ring-3 focus-within:ring-focus/30 sm:p-5 ${
        checked
          ? "border-brand bg-brand-subtle"
          : "border-border bg-background hover:border-brand/60 hover:bg-brand-subtle/30"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
      />
      <div className="pointer-events-none flex min-w-0 items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="break-words font-heading text-base font-semibold sm:text-lg">
            {label}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        </div>
        <div
          aria-hidden="true"
          className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-colors ${
            checked
              ? "bg-brand text-white"
              : "border border-border bg-background text-muted peer-focus-visible:border-brand"
          }`}
        >
          {checked ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <Circle className="size-5" />
          )}
        </div>
      </div>
      {detail && (
        <p className="pointer-events-none mt-3 break-all font-mono text-[11px] leading-5 text-muted">
          {detail}
        </p>
      )}
    </label>
  );
}

export function BillFormField({
  label,
  labelAction,
  description,
  error,
  value,
  onChange,
  placeholder,
  required = false,
  mono = false,
  suffix,
  inputMode,
  type = "text",
  disabled = false,
}: {
  label: string;
  labelAction?: ReactNode;
  description?: string;
  error?: string | null;
  value: string;
  onChange(value: string): void;
  placeholder: string;
  required?: boolean;
  mono?: boolean;
  suffix?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  type?: React.HTMLInputTypeAttribute;
  disabled?: boolean;
}) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="block min-w-0">
      <div className="flex min-h-7 items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        {labelAction}
      </div>
      {description && (
        <p id={descriptionId} className="mt-1 text-xs leading-5 text-muted">
          {description}
        </p>
      )}
      <div
        className={cn(
          "mt-2 flex min-w-0 w-full overflow-hidden rounded-md border bg-background focus-within:ring-3",
          error
            ? "border-danger focus-within:border-danger focus-within:ring-danger/20"
            : "border-border focus-within:border-brand focus-within:ring-focus/20",
          disabled && "bg-surface-subtle opacity-70",
        )}
      >
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          placeholder={placeholder}
          inputMode={inputMode}
          type={type}
          disabled={disabled}
          autoComplete="off"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={`min-h-12 min-w-0 w-full flex-1 bg-transparent px-3 outline-none sm:px-4 ${mono ? "font-mono text-sm" : ""}`}
        />
        {suffix && (
          <span className="flex shrink-0 items-center border-l border-border px-3 text-sm font-semibold text-brand sm:px-4">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
