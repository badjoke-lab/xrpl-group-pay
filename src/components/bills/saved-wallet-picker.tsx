"use client";

import {
  Download,
  Edit3,
  FolderHeart,
  Search,
  Star,
  Trash2,
  Upload,
  UserRoundPlus,
  X,
} from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import type { XrplNetwork } from "@/features/assets/types";
import { useLocalization } from "@/features/localization/provider";
import {
  clearSavedWallets,
  deleteSavedWallet,
  importSavedWallets,
  listSavedWallets,
  markSavedWalletUsed,
  parseSavedWalletImport,
  saveSavedWallet,
  savedWalletSupportsRole,
  serializeSavedWalletExport,
  type SavedWalletDraft,
  type SavedWalletRecord,
  type SavedWalletRole,
  type SavedWalletStorageError,
} from "@/features/saved-wallets/saved-wallets";
import { isCanonicalClassicAddress } from "@/features/xrpl/address-input";

const copy = {
  en: {
    choose: "Choose saved wallet",
    saveCurrent: "Save this wallet",
    title: "Saved wallets",
    description:
      "Labels and addresses stay in this browser profile. They are not uploaded or treated as identity proof.",
    close: "Close saved wallets",
    search: "Search label or address",
    empty: "No saved wallet matches this field.",
    loading: "Loading saved wallets",
    select: "Use this wallet",
    favorite: "Favorite",
    unfavorite: "Remove favorite",
    edit: "Edit",
    delete: "Delete",
    deleteConfirm: "Delete this saved wallet from this browser?",
    deleteAll: "Delete all",
    deleteAllConfirm: "Delete every saved wallet from this browser profile?",
    export: "Export JSON",
    import: "Import JSON",
    importConfirm: (count: number) =>
      `Import ${count} saved wallet record${count === 1 ? "" : "s"}? Existing addresses will be updated.`,
    importDone: (created: number, updated: number) =>
      `Import complete: ${created} created, ${updated} updated.`,
    localOnly: "Browser-local only",
    formTitleNew: "Save wallet",
    formTitleEdit: "Edit saved wallet",
    label: "Label",
    address: "Classic Address",
    role: "Use as",
    recipient: "Recipient",
    payer: "Payer",
    both: "Recipient and payer",
    destinationTag: "Recipient Destination Tag",
    destinationTagHint: "Stored only for recipient use.",
    cancel: "Cancel",
    save: "Save",
    saved: "Saved locally.",
    selected: "Saved wallet selected.",
    storageUnavailable:
      "Saved wallets are unavailable in this browser context. Direct address entry still works.",
    storageQuota:
      "Browser storage is full. Direct address entry still works; remove records or export them first.",
    invalid: "Check the label, Classic Address, role, and Destination Tag.",
    importInvalid: "The selected file is not a valid Group Pay saved-wallet export.",
    recent: "Recently used",
    never: "Not used yet",
  },
  ja: {
    choose: "保存済みから選ぶ",
    saveCurrent: "このウォレットを保存",
    title: "保存済みウォレット",
    description:
      "ラベルとアドレスはこのブラウザプロファイル内だけに保存されます。サーバーへ送信せず、本人確認にも使用しません。",
    close: "保存済みウォレットを閉じる",
    search: "ラベルまたはアドレスを検索",
    empty: "この入力欄で使える保存済みウォレットはありません。",
    loading: "保存済みウォレットを読み込み中",
    select: "このウォレットを使用",
    favorite: "お気に入りに追加",
    unfavorite: "お気に入りを解除",
    edit: "編集",
    delete: "削除",
    deleteConfirm: "この保存済みウォレットをブラウザから削除しますか？",
    deleteAll: "すべて削除",
    deleteAllConfirm: "このブラウザプロファイルの保存済みウォレットをすべて削除しますか？",
    export: "JSONを書き出す",
    import: "JSONを読み込む",
    importConfirm: (count: number) =>
      `${count}件の保存済みウォレットを読み込みますか？既存アドレスは更新されます。`,
    importDone: (created: number, updated: number) =>
      `読み込み完了：新規${created}件、更新${updated}件。`,
    localOnly: "ブラウザ内のみ",
    formTitleNew: "ウォレットを保存",
    formTitleEdit: "保存済みウォレットを編集",
    label: "ラベル",
    address: "Classic Address",
    role: "用途",
    recipient: "受取先",
    payer: "支払者",
    both: "受取先と支払者",
    destinationTag: "受取先Destination Tag",
    destinationTagHint: "受取先として使う場合だけ保存します。",
    cancel: "キャンセル",
    save: "保存",
    saved: "ブラウザ内に保存しました。",
    selected: "保存済みウォレットを入力しました。",
    storageUnavailable:
      "このブラウザ環境では保存済みウォレットを利用できません。アドレスの直接入力は引き続き使えます。",
    storageQuota:
      "ブラウザ保存領域が不足しています。直接入力は使えます。不要な記録を削除するか、先に書き出してください。",
    invalid: "ラベル、Classic Address、用途、Destination Tagを確認してください。",
    importInvalid: "選択したファイルは有効なGroup Pay住所録の書き出しではありません。",
    recent: "最近使用",
    never: "未使用",
  },
  ko: {
    choose: "저장된 지갑 선택",
    saveCurrent: "이 지갑 저장",
    title: "저장된 지갑",
    description:
      "레이블과 주소는 이 브라우저 프로필에만 저장됩니다. 서버에 업로드되지 않으며 신원 증명으로 사용되지 않습니다.",
    close: "저장된 지갑 닫기",
    search: "레이블 또는 주소 검색",
    empty: "이 입력란에 사용할 저장된 지갑이 없습니다.",
    loading: "저장된 지갑 불러오는 중",
    select: "이 지갑 사용",
    favorite: "즐겨찾기 추가",
    unfavorite: "즐겨찾기 해제",
    edit: "편집",
    delete: "삭제",
    deleteConfirm: "이 저장된 지갑을 브라우저에서 삭제하시겠습니까?",
    deleteAll: "모두 삭제",
    deleteAllConfirm: "이 브라우저 프로필의 모든 저장된 지갑을 삭제하시겠습니까?",
    export: "JSON 내보내기",
    import: "JSON 가져오기",
    importConfirm: (count: number) =>
      `${count}개의 저장된 지갑을 가져오시겠습니까? 기존 주소는 업데이트됩니다.`,
    importDone: (created: number, updated: number) =>
      `가져오기 완료: ${created}개 생성, ${updated}개 업데이트.`,
    localOnly: "브라우저 로컬 전용",
    formTitleNew: "지갑 저장",
    formTitleEdit: "저장된 지갑 편집",
    label: "레이블",
    address: "Classic Address",
    role: "용도",
    recipient: "수취인",
    payer: "결제자",
    both: "수취인과 결제자",
    destinationTag: "수취인 Destination Tag",
    destinationTagHint: "수취인으로 사용할 때만 저장됩니다.",
    cancel: "취소",
    save: "저장",
    saved: "브라우저에 저장했습니다.",
    selected: "저장된 지갑을 입력했습니다.",
    storageUnavailable:
      "이 브라우저 환경에서는 저장된 지갑을 사용할 수 없습니다. 주소 직접 입력은 계속 사용할 수 있습니다.",
    storageQuota:
      "브라우저 저장 공간이 부족합니다. 직접 입력은 계속 사용할 수 있습니다. 기록을 삭제하거나 먼저 내보내세요.",
    invalid: "레이블, Classic Address, 용도, Destination Tag를 확인하세요.",
    importInvalid: "선택한 파일은 유효한 Group Pay 저장 지갑 내보내기가 아닙니다.",
    recent: "최근 사용",
    never: "사용 기록 없음",
  },
} as const;

type FieldRole = "recipient" | "payer";

type EditorState = SavedWalletDraft & { existingId?: string };

function storageMessage(
  error: unknown,
  text: (typeof copy)["en"],
): string {
  const code = (error as SavedWalletStorageError | undefined)?.code;
  if (code === "quota") return text.storageQuota;
  if (code === "invalid_record") return text.invalid;
  if (
    code === "invalid_import" ||
    code === "too_large" ||
    code === "too_many_records"
  ) {
    return text.importInvalid;
  }
  return text.storageUnavailable;
}

function roleLabel(role: SavedWalletRole, text: (typeof copy)["en"]) {
  if (role === "recipient") return text.recipient;
  if (role === "payer") return text.payer;
  return text.both;
}

function initialEditor({
  role,
  network,
  label,
  address,
  destinationTag,
}: {
  role: FieldRole;
  network: XrplNetwork;
  label: string;
  address: string;
  destinationTag?: string | null;
}): EditorState {
  return {
    label,
    classicAddress: address.trim(),
    destinationTag:
      role === "recipient" ? destinationTag?.trim() || null : null,
    role,
    network,
    favorite: false,
  };
}

export function SavedWalletPicker({
  role,
  network,
  currentLabel,
  currentAddress,
  currentDestinationTag,
  onSelect,
}: {
  role: FieldRole;
  network: XrplNetwork;
  currentLabel: string;
  currentAddress: string;
  currentDestinationTag?: string | null;
  onSelect(record: SavedWalletRecord): void;
}) {
  const { locale } = useLocalization();
  const text = (copy[locale] ?? copy.en) as (typeof copy)["en"];
  const titleId = useId();
  const descriptionId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<SavedWalletRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);

  const canSaveCurrent = isCanonicalClassicAddress(currentAddress);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setRecords(await listSavedWallets());
    } catch (nextError) {
      setRecords([]);
      setError(storageMessage(nextError, text));
    } finally {
      setLoading(false);
    }
  }

  function openPicker() {
    setEditor(null);
    setMessage(null);
    setError(null);
    setOpen(true);
  }

  function openSaveCurrent() {
    setEditor(
      initialEditor({
        role,
        network,
        label: currentLabel,
        address: currentAddress,
        destinationTag: currentDestinationTag,
      }),
    );
    setMessage(null);
    setError(null);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    void refresh();
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
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
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
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
      trigger?.focus();
    };
    // `text` is locale-bound for the lifetime of one open panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const visibleRecords = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records.filter((record) => {
      if (record.network !== network || !savedWalletSupportsRole(record, role)) {
        return false;
      }
      if (!needle) return true;
      return (
        record.label.toLowerCase().includes(needle) ||
        record.classicAddress.toLowerCase().includes(needle)
      );
    });
  }, [network, query, records, role]);

  async function submitEditor() {
    if (!editor) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await saveSavedWallet({
        ...editor,
        destinationTag:
          editor.role === "payer" ? null : editor.destinationTag?.trim() || null,
      });
      setEditor(null);
      setMessage(text.saved);
      await refresh();
    } catch (nextError) {
      setError(storageMessage(nextError, text));
    } finally {
      setBusy(false);
    }
  }

  async function selectRecord(record: SavedWalletRecord) {
    setBusy(true);
    setError(null);
    try {
      await markSavedWalletUsed(record.id);
      onSelect(record);
      setMessage(text.selected);
      setOpen(false);
    } catch (nextError) {
      setError(storageMessage(nextError, text));
    } finally {
      setBusy(false);
    }
  }

  async function toggleFavorite(record: SavedWalletRecord) {
    setBusy(true);
    setError(null);
    try {
      await saveSavedWallet({
        label: record.label,
        classicAddress: record.classicAddress,
        destinationTag: record.destinationTag,
        role: record.role,
        network: record.network,
        favorite: !record.favorite,
      });
      await refresh();
    } catch (nextError) {
      setError(storageMessage(nextError, text));
    } finally {
      setBusy(false);
    }
  }

  async function removeRecord(record: SavedWalletRecord) {
    if (!window.confirm(text.deleteConfirm)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteSavedWallet(record.id);
      await refresh();
    } catch (nextError) {
      setError(storageMessage(nextError, text));
    } finally {
      setBusy(false);
    }
  }

  async function removeAll() {
    if (!window.confirm(text.deleteAllConfirm)) return;
    setBusy(true);
    setError(null);
    try {
      await clearSavedWallets();
      await refresh();
    } catch (nextError) {
      setError(storageMessage(nextError, text));
    } finally {
      setBusy(false);
    }
  }

  async function exportRecords() {
    setBusy(true);
    setError(null);
    try {
      const all = await listSavedWallets();
      const blob = new Blob([serializeSavedWalletExport(all)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `xrpl-group-pay-saved-wallets-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (nextError) {
      setError(storageMessage(nextError, text));
    } finally {
      setBusy(false);
    }
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload = parseSavedWalletImport(await file.text());
      if (!window.confirm(text.importConfirm(payload.wallets.length))) return;
      const result = await importSavedWallets(payload);
      setMessage(text.importDone(result.created, result.updated));
      await refresh();
    } catch (nextError) {
      setError(storageMessage(nextError, text));
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(record: SavedWalletRecord) {
    setEditor({
      existingId: record.id,
      label: record.label,
      classicAddress: record.classicAddress,
      destinationTag: record.destinationTag,
      role: record.role,
      network: record.network,
      favorite: record.favorite,
    });
    setMessage(null);
    setError(null);
  }

  const canUsePortal = typeof document !== "undefined";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          ref={triggerRef}
          type="button"
          variant="secondary"
          onClick={openPicker}
          className="min-h-9 px-3 py-1.5 text-sm"
        >
          <FolderHeart aria-hidden="true" className="size-4" />
          {text.choose}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={openSaveCurrent}
          disabled={!canSaveCurrent}
          className="min-h-9 px-3 py-1.5 text-sm"
        >
          <UserRoundPlus aria-hidden="true" className="size-4" />
          {text.saveCurrent}
        </Button>
      </div>

      {canUsePortal && open
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
                className="max-h-[92dvh] w-full overflow-y-auto rounded-t-xl border border-border bg-surface p-5 shadow-md md:h-full md:max-h-none md:max-w-2xl md:rounded-none md:rounded-l-xl md:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand">
                      {text.localOnly}
                    </p>
                    <h2 id={titleId} className="mt-2 font-heading text-2xl font-semibold">
                      {text.title}
                    </h2>
                    <p id={descriptionId} className="mt-2 max-w-xl text-sm leading-6 text-muted">
                      {text.description}
                    </p>
                  </div>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-background outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <X aria-hidden="true" className="size-5" />
                    <span className="sr-only">{text.close}</span>
                  </button>
                </div>

                {message && (
                  <p role="status" className="mt-4 rounded-lg border border-success/25 bg-success-subtle p-3 text-sm font-semibold text-success">
                    {message}
                  </p>
                )}
                {error && (
                  <p role="alert" className="mt-4 rounded-lg border border-danger/25 bg-danger-subtle p-3 text-sm font-semibold text-danger">
                    {error}
                  </p>
                )}

                {editor ? (
                  <section className="mt-6 rounded-xl border border-border bg-background p-4 sm:p-5">
                    <h3 className="font-heading text-xl font-semibold">
                      {editor.existingId ? text.formTitleEdit : text.formTitleNew}
                    </h3>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-semibold">
                        {text.label}
                        <input
                          value={editor.label}
                          onChange={(event) =>
                            setEditor({ ...editor, label: event.target.value })
                          }
                          maxLength={120}
                          className="mt-2 min-h-12 w-full rounded-md border border-border bg-surface px-3 py-2 font-normal outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        />
                      </label>
                      <label className="text-sm font-semibold">
                        {text.role}
                        <select
                          value={editor.role}
                          onChange={(event) => {
                            const nextRole = event.target.value as SavedWalletRole;
                            setEditor({
                              ...editor,
                              role: nextRole,
                              destinationTag:
                                nextRole === "payer" ? null : editor.destinationTag,
                            });
                          }}
                          className="mt-2 min-h-12 w-full rounded-md border border-border bg-surface px-3 py-2 font-normal outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        >
                          <option value="recipient">{text.recipient}</option>
                          <option value="payer">{text.payer}</option>
                          <option value="both">{text.both}</option>
                        </select>
                      </label>
                      <label className="text-sm font-semibold sm:col-span-2">
                        {text.address}
                        <input
                          value={editor.classicAddress}
                          readOnly
                          className="mt-2 min-h-12 w-full rounded-md border border-border bg-surface-subtle px-3 py-2 font-mono text-sm"
                        />
                      </label>
                      {editor.role !== "payer" && (
                        <label className="text-sm font-semibold">
                          {text.destinationTag}
                          <input
                            value={editor.destinationTag ?? ""}
                            onChange={(event) =>
                              setEditor({
                                ...editor,
                                destinationTag: event.target.value,
                              })
                            }
                            inputMode="numeric"
                            className="mt-2 min-h-12 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono font-normal outline-none focus-visible:ring-2 focus-visible:ring-focus"
                          />
                          <span className="mt-1 block text-xs font-normal leading-5 text-muted">
                            {text.destinationTagHint}
                          </span>
                        </label>
                      )}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button type="button" onClick={() => void submitEditor()} disabled={busy}>
                        {text.save}
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setEditor(null)} disabled={busy}>
                        {text.cancel}
                      </Button>
                    </div>
                  </section>
                ) : (
                  <>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <label className="relative min-w-0 flex-1">
                        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 size-5 text-muted" />
                        <span className="sr-only">{text.search}</span>
                        <input
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder={text.search}
                          className="min-h-12 w-full rounded-md border border-border bg-background py-2 pl-11 pr-3 outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" onClick={() => void exportRecords()} disabled={busy || records.length === 0} className="min-h-10 px-3 py-2">
                          <Download aria-hidden="true" className="size-4" />
                          {text.export}
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => importRef.current?.click()} disabled={busy} className="min-h-10 px-3 py-2">
                          <Upload aria-hidden="true" className="size-4" />
                          {text.import}
                        </Button>
                        <input
                          ref={importRef}
                          type="file"
                          accept="application/json,.json"
                          className="sr-only"
                          onChange={(event) => void importFile(event)}
                        />
                      </div>
                    </div>

                    <div className="mt-5 space-y-3" aria-busy={loading || busy}>
                      {loading ? (
                        <p role="status" className="rounded-lg border border-border bg-background p-4 text-sm text-muted">
                          {text.loading}
                        </p>
                      ) : visibleRecords.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-border bg-background p-5 text-sm text-muted">
                          {text.empty}
                        </p>
                      ) : (
                        visibleRecords.map((record) => (
                          <article key={record.id} className="rounded-xl border border-border bg-background p-4">
                            <div className="flex min-w-0 items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-heading text-lg font-semibold">{record.label}</h3>
                                  {record.favorite && <Star aria-label={text.favorite} className="size-4 fill-current text-warning" />}
                                </div>
                                <p className="mt-1 break-all font-mono text-xs text-muted">{record.classicAddress}</p>
                                <p className="mt-2 text-xs text-muted">
                                  {roleLabel(record.role, text)} · {record.network} · {text.recent}: {record.lastUsedAt ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(record.lastUsedAt)) : text.never}
                                </p>
                                {role === "recipient" && record.destinationTag && (
                                  <p className="mt-1 text-xs font-semibold text-muted">
                                    Destination Tag: <span className="font-mono">{record.destinationTag}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button type="button" onClick={() => void selectRecord(record)} disabled={busy} className="min-h-10 px-3 py-2">
                                {text.select}
                              </Button>
                              <Button type="button" variant="ghost" onClick={() => void toggleFavorite(record)} disabled={busy} className="min-h-10 px-3 py-2" aria-label={record.favorite ? text.unfavorite : text.favorite}>
                                <Star aria-hidden="true" className={record.favorite ? "size-4 fill-current" : "size-4"} />
                              </Button>
                              <Button type="button" variant="secondary" onClick={() => beginEdit(record)} disabled={busy} className="min-h-10 px-3 py-2">
                                <Edit3 aria-hidden="true" className="size-4" />
                                {text.edit}
                              </Button>
                              <Button type="button" variant="ghost" onClick={() => void removeRecord(record)} disabled={busy} className="min-h-10 px-3 py-2 text-danger">
                                <Trash2 aria-hidden="true" className="size-4" />
                                {text.delete}
                              </Button>
                            </div>
                          </article>
                        ))
                      )}
                    </div>

                    {records.length > 0 && (
                      <div className="mt-6 border-t border-border pt-5">
                        <Button type="button" variant="danger" onClick={() => void removeAll()} disabled={busy}>
                          <Trash2 aria-hidden="true" className="size-4" />
                          {text.deleteAll}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
