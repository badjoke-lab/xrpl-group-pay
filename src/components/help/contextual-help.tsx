"use client";

import { ExternalLink, HelpCircle, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { buttonStyles } from "@/components/ui/button";
import { useLocalization } from "@/features/localization/provider";
import {
  getHelpTopic,
  helpGuideHref,
  type HelpTopicId,
} from "@/features/help/help-registry";
import { cn } from "@/lib/cn";

const interfaceCopy = {
  en: { button: "Help", close: "Close help", guide: "Open full Guide", dialog: "Contextual help" },
  ja: { button: "ヘルプ", close: "ヘルプを閉じる", guide: "完全版ガイドを開く", dialog: "コンテキストヘルプ" },
  ko: { button: "도움말", close: "도움말 닫기", guide: "전체 가이드 열기", dialog: "상황별 도움말" },
} as const;

export type ContextualHelpProps = {
  topic: HelpTopicId;
  label?: string;
  className?: string;
  variant?: "button" | "icon" | "inline";
};

export function ContextualHelp({
  topic,
  label,
  className,
  variant = "button",
}: ContextualHelpProps) {
  const { locale } = useLocalization();
  const copy = interfaceCopy[locale] ?? interfaceCopy.en;
  const content = getHelpTopic(locale, topic);
  const titleId = useId();
  const descriptionId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);

  const triggerLabel = label ?? copy.button;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex min-h-11 items-center justify-center gap-2 rounded-md font-semibold text-brand outline-none transition-colors hover:text-brand-hover focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2",
          variant === "button" && "border border-brand/20 bg-surface px-4 py-2 text-sm shadow-sm hover:bg-brand-subtle",
          variant === "icon" && "size-11 border border-border bg-surface",
          variant === "inline" && "px-1 text-sm underline-offset-4 hover:underline",
          className,
        )}
      >
        <HelpCircle aria-hidden="true" className="size-4 shrink-0" />
        {variant !== "icon" ? <span>{triggerLabel}</span> : <span className="sr-only">{triggerLabel}</span>}
      </button>

      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-end bg-foreground/35 md:items-stretch md:justify-end"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setOpen(false);
              }}
            >
              <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                className="max-h-[88dvh] w-full overflow-y-auto rounded-t-xl border border-border bg-surface p-5 shadow-md md:h-full md:max-h-none md:max-w-md md:rounded-none md:rounded-l-xl md:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand">{copy.dialog}</p>
                    <h2 id={titleId} className="mt-2 font-heading text-2xl font-semibold text-foreground">{content.title}</h2>
                  </div>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <X aria-hidden="true" className="size-5" />
                    <span className="sr-only">{copy.close}</span>
                  </button>
                </div>

                <p id={descriptionId} className="mt-5 rounded-lg border border-brand/15 bg-brand-subtle p-4 font-semibold leading-7 text-foreground">{content.short}</p>

                <div className="mt-5 space-y-4 text-sm leading-7 text-muted sm:text-base">
                  {content.detail.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>

                <div className="mt-7 border-t border-border pt-5">
                  <a
                    href={helpGuideHref(topic)}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className={buttonStyles({ variant: "secondary" })}
                  >
                    {copy.guide}
                    <ExternalLink aria-hidden="true" className="size-4" />
                  </a>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
