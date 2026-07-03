"use client";

import { CopyCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { ContextualHelp } from "@/components/help/contextual-help";
import { publicEnv } from "@/config/public-env";
import { useLocalization } from "@/features/localization/provider";

import {
  BILL_DRAFT_SESSION_EVENT,
  readBillDraftSession,
} from "./bill-draft-session";

const copy = {
  en: {
    title: "New Bill draft copied from an existing Bill",
    body: "Edit this browser-local draft, then review and freeze it as a separate Bill. Creation generates new Bill, PaymentSlot, capability, InvoiceID, and link identities. The original Bill remains unchanged.",
  },
  ja: {
    title: "既存の請求から新しい請求の下書きを作成しました",
    body: "このブラウザ内の下書きを修正し、別の請求として確認・確定してください。作成時には請求、支払い枠、権限、InvoiceID、リンクの識別子がすべて新規生成され、元の請求は変更されません。",
  },
  ko: {
    title: "기존 청구서에서 새 청구서 초안을 복사했습니다",
    body: "브라우저에 저장된 이 초안을 수정한 뒤 별도의 청구서로 검토하고 고정하세요. 생성 시 청구서, PaymentSlot, 기능, InvoiceID 및 링크 식별자가 모두 새로 만들어지며 원본 청구서는 변경되지 않습니다.",
  },
} as const;

const NETWORK = publicEnv.NEXT_PUBLIC_APP_NETWORK;

export function BillCopyNotice() {
  const { locale } = useLocalization();
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    function refresh() {
      setSource(readBillDraftSession(NETWORK)?.copiedFromPublicId ?? null);
    }
    refresh();
    window.addEventListener(BILL_DRAFT_SESSION_EVENT, refresh);
    return () => window.removeEventListener(BILL_DRAFT_SESSION_EVENT, refresh);
  }, []);

  if (!source) return null;
  const text = copy[locale] ?? copy.en;
  return (
    <aside
      role="status"
      className="mb-6 rounded-xl border border-brand/25 bg-brand-subtle p-5 sm:p-6"
      data-copy-source={source}
    >
      <div className="flex items-start gap-3">
        <CopyCheck aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-xl font-semibold">{text.title}</h2>
            <ContextualHelp topic="copy-to-revise" variant="inline" />
          </div>
          <p className="mt-2 max-w-3xl leading-7 text-muted">{text.body}</p>
        </div>
      </div>
    </aside>
  );
}
