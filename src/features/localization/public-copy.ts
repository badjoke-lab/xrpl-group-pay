import {
  type Locale,
  type MessageKey,
  translate,
} from "./catalog";

const JA_PUBLIC_COPY: Partial<Record<MessageKey, string>> = {
  "nav.roadmap": "今後の予定",
  "nav.changelog": "更新内容",
  "nav.source": "GitHub",
  "nav.home": "トップ",

  "home.eyebrow": "みんなの支払いを、直接まとめる",
  "home.title": "割り勘を、",
  "home.titleAccent": "もっと簡単に。",
  "home.description":
    "支払う人ごとに金額を決め、専用リンクを送るだけ。各自がXamanで署名し、XRPまたはRLUSDを受取人へ直接送金します。入金はXRPL上で確認されます。",
  "home.halted":
    "現在はMainnetでの請求作成を一時停止しています。再開するまで支払いリンクは作成されません。",
  "home.cta.create": "{network}で請求を作る",
  "home.cta.status": "請求作成の状況を見る",
  "home.cta.docs": "仕組みを見る",
  "home.principle.approve.title": "各自のウォレットで支払う",
  "home.principle.approve.body":
    "参加者は自分のXamanで内容を確認して署名します。",
  "home.principle.direct.title": "受取人へ直接送金",
  "home.principle.direct.body":
    "アプリが資金を預かったり、残高を管理したりすることはありません。",
  "home.principle.verify.title": "着金をXRPLで確認",
  "home.principle.verify.body":
    "送金がXRPL上で確認されるまで、支払済みにはなりません。",
  "home.step.create.title": "請求を作る",
  "home.step.create.body":
    "合計額、受取先、参加者ごとの負担額を入力します。",
  "home.step.sign.title": "参加者が支払う",
  "home.step.sign.body":
    "各参加者が専用リンクを開き、Xamanで署名します。",
  "home.step.verify.title": "着金を確認",
  "home.step.verify.body":
    "XRPL上の送金内容が一致すると、自動で支払済みになります。",
  "home.footer": "資金を預からず、XRPL上の直接送金を確認します。",

  "bill.page.eyebrow": "請求を作成 · XRPL {network}",
  "bill.page.title": "割り勘の内容を入力",
  "bill.page.description":
    "合計額と参加者を設定すると、それぞれの支払額を計算し、専用の支払いリンクを作成します。送金は参加者のウォレットから受取人へ直接行われます。",
  "bill.page.halted.title": "Mainnetでの請求作成は停止中です",
  "bill.page.halted.body":
    "現在この環境では支払いリンクを作成できません。公開設定が再び有効になるまでお待ちください。",
  "bill.page.releaseStatus": "現在の状況を見る",
  "bill.page.completedWork": "更新内容を見る",

  "bill.form.eyebrow": "割り勘を作成",
  "bill.form.title": "請求内容を入力",
  "bill.form.description":
    "全員が同じ通貨（XRPまたはRLUSD）で支払います。内容を確認して確定するまでは、支払いリンクは作られません。",
  "bill.form.reviewing": "内容を確認しています",
  "bill.form.review": "入力内容を確認する",
  "bill.form.error.review": "入力内容を確認できませんでした。",
  "bill.form.error.create": "支払いリンクを作成できませんでした。",

  "bill.asset.legend": "支払い通貨",
  "bill.asset.xrp": "{network}上のXRP",
  "bill.asset.rlusd": "{network}上のRLUSD",
  "bill.asset.issuer": "発行元: {issuer}",
  "bill.asset.rlusdNotice":
    "RLUSDを受け取るアカウントにはRLUSDのトラストラインが必要です。参加者は支払額分のRLUSDと、手数料用の少額のXRPを用意してください。",

  "bill.field.title": "請求タイトル",
  "bill.field.destination": "受取先アドレス",
  "bill.field.total": "合計額",
  "bill.field.creatorShare": "作成者の負担",
  "bill.field.destinationTag": "宛先タグ",
  "bill.field.optional": "必要な場合のみ",

  "bill.allocation.method": "分け方",
  "bill.allocation.description":
    "参加者分の合計が請求額と一致するように計算します。",
  "bill.allocation.custom.label": "金額を個別に入力",
  "bill.allocation.custom.description":
    "参加者ごとの支払額を直接入力します。",
  "bill.allocation.equal.label": "均等に分ける",
  "bill.allocation.equal.description":
    "参加者分を同じ金額に分けます。",
  "bill.allocation.percentage.label": "割合で分ける",
  "bill.allocation.percentage.description":
    "参加者ごとの割合を入力します。合計は100%です。",
  "bill.allocation.shares.label": "比率で分ける",
  "bill.allocation.shares.description":
    "1対2のような比率で支払額を決めます。",

  "bill.participants.title": "参加者",
  "bill.participants.minimum": "参加者は2人以上必要です。",
  "bill.participants.add": "参加者を追加",
  "bill.participant.number": "参加者{number}",
  "bill.participant.remove": "参加者{number}を削除",
  "bill.participant.label": "名前（任意）",
  "bill.participant.payer": "支払うウォレットアドレス",
  "bill.participant.amount": "支払額",
  "bill.participant.percentage": "負担割合",
  "bill.participant.shares": "負担比率",
  "bill.participant.calculated": "支払額",

  "bill.remainder.title": "端数を誰が負担するか選択",
  "bill.remainder.description.one":
    "最小単位の端数が{units}残ります。負担する人を選んでください。",
  "bill.remainder.description.many":
    "最小単位の端数が{units}残ります。負担する人を選んでください。",
  "bill.remainder.creator.label": "作成者が負担",
  "bill.remainder.creator.description": "端数を作成者の負担に加えます。",
  "bill.remainder.first.label": "参加者1が負担",
  "bill.remainder.first.description": "端数を参加者1の支払額に加えます。",
  "bill.remainder.selected.label": "参加者を選ぶ",
  "bill.remainder.selected.description":
    "選んだ参加者の支払額に端数を加えます。",
  "bill.remainder.manual.label": "手動で分ける",
  "bill.remainder.manual.description": "端数だけを参加者ごとに入力します。",
  "bill.remainder.participant": "端数を負担する人",
  "bill.remainder.select": "参加者を選択",
  "bill.remainder.manualTotal": "端数の合計を{units}にしてください。",
  "bill.remainder.unitsFor": "{participant}の端数",

  "bill.status.exact": "金額が一致しました",
  "bill.status.remainder": "端数の負担者を選んでください",
  "bill.status.incomplete": "入力がまだ足りません",
  "bill.status.enterAll":
    "合計額、作成者の負担、参加者ごとの支払額を入力してください。",
  "bill.status.remaining": "あと{amount} {asset}を割り当ててください。",
  "bill.status.over": "合計額を{amount} {asset}超えています。",
  "bill.status.matches": "支払額の合計が{asset}の請求額と一致しています。",

  "bill.review.badge": "{network}で支払い",
  "bill.review.exact": "金額確認済み",
  "bill.review.title": "確定前に確認",
  "bill.review.description":
    "次の内容で支払いリンクを作ります。送金先、支払う人、通貨、金額に誤りがないか確認してください。",
  "bill.review.mainnet.title": "実際の資産を送金します",
  "bill.review.mainnet.body":
    "このリンクから署名すると、実際のXRPまたはRLUSDが送金されます。受取先と金額をもう一度確認してください。",
  "bill.review.billTotal": "合計額",
  "bill.review.creatorShare": "作成者の負担",
  "bill.review.participants": "参加者",
  "bill.review.allocated": "参加者分",
  "bill.review.billTitle": "請求タイトル",
  "bill.review.destination": "受取先",
  "bill.review.destinationTag": "宛先タグ",
  "bill.review.notPresent": "なし",
  "bill.review.network": "ネットワーク",
  "bill.review.asset": "支払い通貨",
  "bill.review.assetType": "通貨の種類",
  "bill.review.issued": "発行通貨",
  "bill.review.native": "XRP",
  "bill.review.issuer": "発行元",
  "bill.review.rule": "分け方",
  "bill.review.ruleBody": "次の条件で参加者ごとの支払額を確定します。",
  "bill.review.method": "計算方法",
  "bill.review.remainderUnits": "端数",
  "bill.review.remainderAssignment": "端数の負担者",
  "bill.review.participantAllocations": "参加者ごとの支払額",
  "bill.review.participantBody":
    "参加者ごとに個別の支払いリンクが作成されます。",
  "bill.review.slot": "参加者{number}",
  "bill.review.final": "確定するとどうなるか",
  "bill.review.finalBody":
    "この時点では送金されません。支払い通貨、受取先、金額、支払うウォレットを確定し、参加者ごとの支払いリンクを作成します。",
  "bill.review.feeNotice": "ネットワーク手数料は別途XRPで支払います。",
  "bill.review.back": "入力画面に戻る",
  "bill.review.creating": "支払いリンクを作成しています",
  "bill.review.confirm": "請求を確定して支払いリンクを作る",

  "bill.created.badge": "作成完了",
  "bill.created.description":
    "請求内容を確定しました。作成者用の確認リンクを保存し、参加者ごとに支払いリンクを送ってください。",
  "bill.created.asset": "支払い通貨",
  "bill.created.total": "合計額",
  "bill.created.creatorShare": "作成者の負担",
  "bill.created.participants": "参加者",
  "bill.created.issuer": "RLUSD発行元",
  "bill.created.fee": "ネットワーク手数料は参加者がXRPで支払います。",
  "bill.created.creatorProgress": "作成者用の確認リンク",
  "bill.created.creatorProgressBody":
    "参加者名、支払うウォレット、支払い状況を確認できます。",
  "bill.created.copyCreator": "作成者用リンクをコピー",
  "bill.created.readOnly": "共有用の確認リンク",
  "bill.created.readOnlyBody":
    "個人情報を表示せず、金額と支払い状況だけを確認できます。",
  "bill.created.copyReadOnly": "共有用リンクをコピー",
  "bill.created.paymentLinks": "参加者ごとの支払いリンク",
  "bill.created.unnamed": "名前なし",
  "bill.created.copied": "コピーしました",
  "bill.created.copyPayment": "支払いリンクをコピー",
  "bill.created.capabilityNotice":
    "URLには閲覧権限が含まれます。リンクは対象の相手だけに送ってください。",
  "bill.created.another": "別の請求を作る",

  "roadmap.eyebrow": "開発状況",
  "roadmap.title": "今後の予定",
  "roadmap.description":
    "現在使える機能と、次に追加する機能を分けて掲載しています。",
  "changelog.eyebrow": "更新情報",
  "changelog.title": "更新内容",
  "changelog.description":
    "利用者に影響する機能追加や安全性の改善を掲載しています。",
  "changelog.status.title": "現在の公開状況",
  "changelog.status.body":
    "Mainnet版は公開中です。XRPとRLUSDの請求作成・支払い確認に対応しています。RLUSDを使う場合は、受取人のトラストラインと参加者のRLUSD残高が必要です。",
};

function applyVariables(
  template: string,
  variables: Record<string, string | number>,
) {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_, name: string) =>
    Object.prototype.hasOwnProperty.call(variables, name)
      ? String(variables[name])
      : `{${name}}`,
  );
}

export function translatePublic(
  locale: Locale,
  key: MessageKey,
  variables: Record<string, string | number> = {},
): string {
  const override = locale === "ja" ? JA_PUBLIC_COPY[key] : undefined;
  return override
    ? applyVariables(override, variables)
    : translate(locale, key, variables);
}
