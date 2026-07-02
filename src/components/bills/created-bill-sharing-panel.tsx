"use client";

import { Check, Copy, Eye, FileText, Share2, ShieldCheck, UserRoundCog } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AssetBadge, LinkTypeBadge, RoleBadge } from "@/components/ui/identity-badges";
import { NetworkBadge } from "@/components/ui/network-badge";
import { reviewSharingCopy } from "@/features/bills/review-sharing-copy";
import {
  buildParticipantInstructions,
  buildRlusdPreparationInstructions,
  participantCollectionAmount,
} from "@/features/bills/sharing-instructions";
import type { CreatedBill } from "@/features/bills/types";
import { useLocalization } from "@/features/localization/provider";
import { formatMoneyAmount } from "@/features/money/money";

function paymentUrl(token: string) {
  return `${window.location.origin}/payment#token=${token}`;
}

function progressUrl(token: string) {
  return `${window.location.origin}/bill/progress#token=${token}`;
}

function amount(value: CreatedBill["bill"]["totalAmount"]) {
  return `${formatMoneyAmount(value)} ${value.code}`;
}

export function CreatedBillSharingPanel({
  created,
  onReset,
}: {
  created: CreatedBill;
  onReset(): void;
}) {
  const { locale, t } = useLocalization();
  const copy = reviewSharingCopy(locale);
  const [copied, setCopied] = useState<string | null>(null);
  const issued = created.bill.asset.assetType === "issued";
  const collection = participantCollectionAmount(created);
  const zero = { ...collection, units: "0" };
  const modeBody =
    created.bill.paymentMode === "representative"
      ? copy.representativeSummary
      : copy.directSummary;

  async function copyValue(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1500);
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success-subtle">
            <Check aria-hidden="true" className="size-6 text-success" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-success">
              {t("bill.created.badge")}
            </p>
            <h2 className="mt-2 font-heading text-3xl font-semibold">
              {created.bill.title}
            </h2>
            <p className="mt-2 max-w-2xl leading-7 text-muted">{modeBody}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <NetworkBadge network={created.bill.network} />
          <AssetBadge symbol={created.bill.asset.symbol} official={issued} locale={locale} />
        </div>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Summary label={copy.billTotal} value={amount(created.bill.totalAmount)} />
        <Summary
          label={copy.recipientFunded}
          value={`${amount(created.bill.recipientFundedAmount)} · ${copy.noTransfer}`}
        />
        <Summary label={copy.participantCollection} value={amount(collection)} />
        <Summary label={copy.verified} value={amount(zero)} detail={copy.verifiedZero} />
        <Summary label={copy.remaining} value={amount(collection)} />
      </div>

      <div className="mt-6 rounded-lg border border-brand/20 bg-brand-subtle p-5">
        <div className="flex flex-wrap items-center gap-2">
          <RoleBadge role="recipient" locale={locale} />
          <span className="font-semibold text-brand">
            {created.bill.recipientLabel || copy.recipient}
          </span>
        </div>
        <p className="mt-3 break-all font-mono text-xs text-muted">
          {created.bill.destinationAddress}
          {created.bill.destinationTag === null
            ? ""
            : ` · Destination Tag ${created.bill.destinationTag}`}
        </p>
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
          badge={<LinkTypeBadge type="management" locale={locale} />}
          title={copy.managementTitle}
          body={copy.managementBody}
          buttonLabel={copy.copyManagement}
          ariaLabel={t("bill.created.copyCreator")}
          copiedLabel={copy.copied}
          copied={copied === "management"}
          onCopy={() =>
            void copyValue(
              "management",
              progressUrl(created.capabilities.adminToken),
            )
          }
        />
        <AccessCard
          icon={Eye}
          badge={<LinkTypeBadge type="read_only" locale={locale} />}
          title={copy.readOnlyTitle}
          body={copy.readOnlyBody}
          buttonLabel={copy.copyReadOnly}
          ariaLabel={t("bill.created.copyReadOnly")}
          copiedLabel={copy.copied}
          copied={copied === "read-only"}
          onCopy={() =>
            void copyValue(
              "read-only",
              progressUrl(created.capabilities.publicToken),
            )
          }
        />
      </div>

      <div className="mt-8 space-y-4">
        <h3 className="font-heading text-xl font-semibold">
          {t("bill.created.paymentLinks")}
        </h3>
        {created.slots.map((slot) => {
          const url = paymentUrl(slot.paymentToken);
          const fullKey = `${slot.publicId}:instructions`;
          const setupKey = `${slot.publicId}:setup`;
          return (
            <article
              key={slot.publicId}
              className="rounded-lg border border-border bg-background p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <LinkTypeBadge type="payment" locale={locale} />
                    <RoleBadge role="payer" locale={locale} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-action">
                    {copy.paymentAudience}
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
                  <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
                    {copy.paymentBody}
                  </p>
                </div>

                <div className="grid shrink-0 gap-2 sm:grid-cols-2 lg:w-80 lg:grid-cols-1">
                  <CopyButton
                    copied={copied === slot.publicId}
                    label={copy.copyPayment}
                    ariaLabel={t("bill.created.copyPayment")}
                    copiedLabel={copy.copied}
                    icon={Copy}
                    onClick={() => void copyValue(slot.publicId, url)}
                  />
                  <CopyButton
                    copied={copied === fullKey}
                    label={copy.copyInstructions}
                    copiedLabel={copy.copied}
                    icon={FileText}
                    onClick={() =>
                      void copyValue(
                        fullKey,
                        buildParticipantInstructions({
                          locale,
                          created,
                          slot,
                          paymentUrl: url,
                        }),
                      )
                    }
                  />
                  {issued && (
                    <CopyButton
                      copied={copied === setupKey}
                      label={copy.copyRlusdSetup}
                      copiedLabel={copy.copied}
                      icon={ShieldCheck}
                      onClick={() =>
                        void copyValue(
                          setupKey,
                          buildRlusdPreparationInstructions({
                            locale,
                            created,
                            slot,
                            paymentUrl: url,
                          }),
                        )
                      }
                    />
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-7 rounded-lg bg-brand-subtle p-4 text-sm leading-6 text-brand">
        <div className="flex gap-3">
          <Share2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p>{copy.capabilityWarning}</p>
        </div>
      </div>

      <Button type="button" variant="secondary" className="mt-7" onClick={onReset}>
        {t("bill.created.another")}
      </Button>
    </section>
  );
}

function Summary({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-2 font-heading text-lg font-semibold">{value}</p>
      {detail && <p className="mt-1 text-xs text-muted">{detail}</p>}
    </div>
  );
}

function CopyButton({
  copied,
  label,
  ariaLabel,
  copiedLabel,
  icon: Icon,
  onClick,
}: {
  copied: boolean;
  label: string;
  ariaLabel?: string;
  copiedLabel: string;
  icon: typeof Copy;
  onClick(): void;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full"
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {copied ? (
        <Check aria-hidden="true" className="size-4" />
      ) : (
        <Icon aria-hidden="true" className="size-4" />
      )}
      {copied ? copiedLabel : label}
    </Button>
  );
}

function AccessCard({
  icon: Icon,
  badge,
  title,
  body,
  buttonLabel,
  ariaLabel,
  copiedLabel,
  copied,
  onCopy,
}: {
  icon: typeof Eye;
  badge: React.ReactNode;
  title: string;
  body: string;
  buttonLabel: string;
  ariaLabel: string;
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
        <div className="min-w-0">
          {badge}
          <h3 className="mt-2 font-heading text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="mt-5 w-full"
        aria-label={ariaLabel}
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
