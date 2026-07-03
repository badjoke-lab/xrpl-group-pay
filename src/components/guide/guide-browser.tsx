"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { GuideLocaleContent } from "@/features/guide/guide-content";

export function GuideBrowser({ content }: { content: GuideLocaleContent }) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const normalized = query.trim().toLocaleLowerCase();
  const sections = useMemo(() => {
    if (!normalized) return content.sections;
    return content.sections.filter((section) =>
      [section.title, ...section.paragraphs, ...(section.bullets ?? [])]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalized),
    );
  }, [content.sections, normalized]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const editing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (event.key === "/" && !editing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === searchRef.current) {
        setQuery("");
        searchRef.current?.blur();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <label htmlFor="guide-search" className="text-sm font-bold text-foreground">
            {content.searchLabel}
          </label>
          <div className="relative mt-3">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            />
            <input
              ref={searchRef}
              id="guide-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={content.searchPlaceholder}
              autoComplete="off"
              className="min-h-12 w-full rounded-md border border-border bg-background py-2 pl-10 pr-11 text-sm outline-none focus-visible:ring-3 focus-visible:ring-focus/35"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
                className="absolute right-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted outline-none hover:bg-surface-subtle hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
              >
                <X aria-hidden="true" className="size-4" />
                <span className="sr-only">{content.clearSearchLabel}</span>
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">{content.searchHint}</p>
          <p className="mt-3 text-xs font-semibold text-brand" aria-live="polite">
            {sections.length} {content.resultLabel}
          </p>
        </div>

        <nav
          aria-label={content.contentsLabel}
          className="mt-5 rounded-xl border border-border bg-surface p-5 shadow-sm"
        >
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
            {content.contentsLabel}
          </p>
          <ol className="mt-4 max-h-[55dvh] space-y-1.5 overflow-y-auto pr-1 text-sm">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block rounded-md px-3 py-2 font-semibold text-muted outline-none hover:bg-brand-subtle hover:text-brand focus-visible:ring-2 focus-visible:ring-focus"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </aside>

      <div className="min-w-0">
        {sections.length ? (
          <div className="space-y-5">
            {sections.map((section) => {
              const originalIndex = content.sections.findIndex(
                (item) => item.id === section.id,
              );
              return (
                <section
                  key={section.id}
                  id={section.id}
                  tabIndex={-1}
                  className="scroll-mt-6 rounded-xl border border-border bg-surface p-6 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-focus sm:p-8"
                >
                  <div className="flex items-start gap-4">
                    <span className="font-heading text-sm font-bold text-action">
                      {String(originalIndex + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-heading text-2xl font-semibold text-foreground">
                        {section.title}
                      </h2>
                      <div className="mt-4 space-y-4 leading-8 text-muted">
                        {section.paragraphs.map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                      </div>
                      {section.bullets?.length ? (
                        <ul className="mt-5 list-disc space-y-2 pl-5 leading-7 text-muted">
                          {section.bullets.map((bullet) => (
                            <li key={bullet}>{bullet}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <section
            role="status"
            className="rounded-xl border border-border bg-surface p-8 text-center shadow-sm"
          >
            <h2 className="font-heading text-2xl font-semibold">
              {content.noResultsTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-xl leading-7 text-muted">
              {content.noResultsBody}
            </p>
            <button
              type="button"
              className="mt-5 min-h-11 rounded-md px-4 font-semibold text-brand underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
            >
              {content.clearSearchLabel}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
