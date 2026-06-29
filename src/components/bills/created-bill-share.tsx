"use client";

import { useState } from "react";
import { Check, Copy, Eye, Share2, UserRoundCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CreatedBill } from "@/features/bills/types";
import { useLocalization } from "@/features/localization/provider";
import { formatMoneyAmount } from "@/features/money/money";

function paymentUrl(token: string) {
  return `${window.location.origin}/testnet/payment#token=${token}`;
}

function progressUrl(token: string) {
  return `${window.location.origin}/testnet/bill/progress#token=${token}`;
}

function amount(value: CreatedBill["bill"]["totalAmount"]) {
  return `${formatMoneyAmount(value)} ${value.code}`;
}

export function CreatedBillShare({
  created,
  onReset,
}: {
  created: CreatedBill;
  onReset(): void;
}) {
  const { t } = useLocalization();
  const [copied, setCopied] = useState<string | null>(null);
  const issued = created.bill.asset.assetType === "issued";

  async function copyUrl(key: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1500);
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success/10">
          <Check aria-hidden="true" className="size-6 text-success" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-success">
            {t("bill.created.badge")}
          </p>
          <h2 className="mt-2 font-heading text-3xl font-semibold">
            {created.bill.title}
          </h2>
          <p className="mt-2 leading-7 text-muted">
            {t("bill.created.description", {
              asset: created.bill.asset.symbol,
            })}
          </p>
        </div>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-4">
        <Summary
          label={t("bill.created.asset")}
          value={created.bill.asset.symbol}
        />
        <Summary
          label={t("bill.created.total")}
          value={amount(created.bill.totalAmount)}
        />
        <Summary
          label={t("bill.created.creatorShare")}
          value={amount(created.bill.creatorShareAmount)}
        />
        <Summary
          label={t("bill.created.participants")}
          value={String(created.slots.length)}
        />
      </div>

      {issued && (
        <div className="mt-5 rounded-lg border border-action/25 bg-action/10 p-4 text-sm leading-6">
          <p className="font-semibold">{t("bill.created.issuer")}</p>
          <p className="mt-1 break-all font-mono text-xs">
            {created.bill.asset.issuer}
          </p>
          <p className="mt-2 text-muted">{t("bill.created.fee")}</p>
        </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <AccessCard
          icon={UserRoundCog}
          title={t("bill.created.creatorProgress")}
          body={t("bill.created.creatorProgressBody")}
          buttonLabel={t("bill.created.copyCreator")}
          copiedLabel={t("bill.created.copied")}
          copied={copied === "admin-progress"}
          onCopy={() =>
            void copyUrl(
              "admin-progress",
              progressUrl(created.capabilities.adminToken),
            )
          }
        />
        <AccessCard
          icon={Eye}
          title={t("bill.created.readOnly")}
          body={t("bill.created.readOnlyBody")}
          buttonLabel={t("bill.created.copyReadOnly")}
          copiedLabel={t("bill.created.copied")}
          copied={copied === "public-progress"}
          onCopy={() =>
            void copyUrl(
              "public-progress",
              progressUrl(created.capabilities.publicToken),
            )
          }
        />
      </div>

      <div className="mt-8 space-y-4">
        <h3 className="font-heading text-xl font-semibold">
          {t("bill.created.paymentLinks")}
        </h3>
        {created.slots.map((slot, index) => (
          <article
            key={slot.publicId}
            className="rounded-lg border border-border bg-background p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted">
                  {t("bill.participant.number", { number: index + 1 })}
                </p>
                <h4 className="mt-1 font-heading text-lg font-semibold">
                  {slot.participantLabel || t("bill.created.unnamed")}
                </h4>
                <p className="mt-1 break-all font-mono text-xs text-muted">
                  {slot.expectedPayerAddress}
                </p>
                <p className="mt-2 font-semibold text-brand">
                  {formatMoneyAmount(slot.expectedAmount)} {slot.expectedAmount.code}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  void copyUrl(slot.publicId, paymentUrl(slot.paymentToken))
                }
              >
                {copied === slot.publicId ? (
                  <Check aria-hidden="true" className="size-4" />
                ) : (
                  <Copy aria-hidden="true" className="size-4" />
                )}
                {copied === slot.publicId
                  ? t("bill.created.copied")
                  : t("bill.created.copyPayment")}
              </Button>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-7 rounded-lg bg-brand-subtle p-4 text-sm leading-6 text-brand">
        <div className="flex gap-3">
          <Share2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p>{t("bill.created.capabilityNotice")}</p>
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="mt-7"
        onClick={onReset}
      >
        {t("bill.created.another")}
      </Button>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-2 font-heading text-lg font-semibold">{value}</p>
    </div>
  );
}

function AccessCard({
  icon: Icon,
  title,
  body,
  buttonLabel,
  copiedLabel,
  copied,
  onCopy,
}: {
  icon: typeof Eye;
  title: string;
  body: string;
  buttonLabel: string;
  copiedLabel: string;
  copied: boolean;
  onCopy(): void;
}) {
  return (
    <article className="rounded-lg border border-border bg-background p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-subtle">
          <Icon aria-hidden="true" className="size-4 text-brand" />
        </div>
        <div>
          <h3 className="font-heading text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="mt-5 w-full"
        onClick={onCopy}
      >
        {copied ? (
          <Check aria-hidden="true" className="size-4" />
        ) : (
          <Copy aria-hidden="true" className="size-4" />
        )}
        {copied ? copiedLabel : buttonLabel}
      </Button>
    </article>
  );
}
