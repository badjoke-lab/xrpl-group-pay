import {
  createCipheriv,
  createHash,
  pbkdf2Sync,
  randomBytes,
} from "node:crypto";

export const MAINNET_XRP_EXECUTION_CONFIRMATION =
  "RUN XRPL GROUP PAY MAINNET XRP ACCEPTANCE";
export const MAINNET_XRP_ORIGIN = "https://xgp.badjoke-lab.com";
export const MAINNET_XRP_WORKER = "xrpl-group-pay-mainnet";
export const MAINNET_XRP_DATABASE_BINDING = "PAYMENTS_DB_MAINNET";
export const MAINNET_XRP_SOURCE_TAG = 2171267705;
export const MAINNET_XRP_ASSET_ID = "xrpl:mainnet:xrp";
export const MAINNET_XRP_WINDOW_MINUTES = 25;

export function parseJsonc(source) {
  return JSON.parse(
    source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1"),
  );
}

export function dropsToDecimal(amountDrops) {
  const drops = Number(amountDrops);
  if (!Number.isInteger(drops) || drops < 1 || drops > 1000) {
    throw new Error("The controlled XRP amount must be from 1 through 1000 drops.");
  }
  const whole = Math.floor(drops / 1_000_000);
  const fraction = String(drops % 1_000_000).padStart(6, "0");
  return `${whole}.${fraction}`;
}

function requireHexDigest(value) {
  if (!/^[a-f0-9]{64}$/i.test(value ?? "")) {
    throw new Error("The internal request digest is invalid.");
  }
  return value.toLowerCase();
}

function requireDeadline(value, now = new Date()) {
  const deadline = new Date(value);
  const difference = deadline.getTime() - now.getTime();
  if (
    !Number.isFinite(deadline.getTime()) ||
    difference <= 0 ||
    difference > 30 * 60 * 1000
  ) {
    throw new Error("The internal request window is invalid.");
  }
  return deadline.toISOString();
}

export function buildAcceptanceWrangler({
  wrangler,
  mode,
  digest,
  expiresAt,
  now = new Date(),
}) {
  if (!["enabled", "verify-only", "halted"].includes(mode)) {
    throw new Error("The requested operations mode is invalid.");
  }

  const source = structuredClone(wrangler);
  const mainnet = source?.env?.mainnet;
  const vars = mainnet?.vars;
  if (!mainnet || !vars) {
    throw new Error("Wrangler must define the Mainnet environment.");
  }
  if (
    mainnet.name !== MAINNET_XRP_WORKER ||
    vars.APP_NETWORK !== "mainnet" ||
    vars.NEXT_PUBLIC_APP_NETWORK !== "mainnet" ||
    vars.NEXT_PUBLIC_APP_URL !== MAINNET_XRP_ORIGIN ||
    vars.ALLOW_MAINNET_RUNTIME !== "true" ||
    vars.MAINNET_GATE_APPROVED !== "true" ||
    vars.MAINNET_SOURCE_TAG_APPROVED !== "true" ||
    vars.XRPL_MAINNET_SOURCE_TAG !== String(MAINNET_XRP_SOURCE_TAG) ||
    vars.MAINNET_RELEASE_MODE !== "internal" ||
    vars.MAINNET_OPERATIONS_MODE !== "halted" ||
    vars.PAYMENTS_DATABASE_BINDING !== MAINNET_XRP_DATABASE_BINDING
  ) {
    throw new Error("The committed Mainnet target is not the reviewed halted target.");
  }

  const database = mainnet.d1_databases?.find(
    (candidate) => candidate.binding === MAINNET_XRP_DATABASE_BINDING,
  );
  if (!database || database.database_id === database.preview_database_id) {
    throw new Error("The controlled target requires isolated Mainnet D1 bindings.");
  }

  delete source.d1_databases;
  mainnet.vars = {
    ...vars,
    MAINNET_OPERATIONS_MODE: mode,
  };

  if (mode === "halted") {
    delete mainnet.vars.MAINNET_ACCEPTANCE_AUTH_DIGEST;
    delete mainnet.vars.MAINNET_ACCEPTANCE_EXPIRES_AT;
  } else {
    mainnet.vars.MAINNET_ACCEPTANCE_AUTH_DIGEST = requireHexDigest(digest);
    mainnet.vars.MAINNET_ACCEPTANCE_EXPIRES_AT = requireDeadline(expiresAt, now);
  }

  return source;
}

export function generateInternalRequestMaterial(now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  const digest = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(
    now.getTime() + MAINNET_XRP_WINDOW_MINUTES * 60 * 1000,
  ).toISOString();
  return { token, digest, expiresAt };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function createEncryptedSigningBundleHtml({ bundle, password }) {
  if (typeof password !== "string" || password.length < 16) {
    throw new Error("The signing-bundle password must contain at least 16 characters.");
  }

  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(password, salt, 250_000, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(bundle), "utf8"),
    cipher.final(),
  ]);
  const encrypted = Buffer.concat([ciphertext, cipher.getAuthTag()]);

  const payload = {
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    encrypted: encrypted.toString("base64"),
    iterations: 250000,
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>XRPL Group Pay signing handoff</title>
<style>
body{font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px;background:#0b1020;color:#eef2ff}main{background:#131a2f;border:1px solid #293452;border-radius:20px;padding:24px}input,button,a{font:inherit}input{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #596684;background:#0b1020;color:#fff}button,.launch{display:inline-block;margin-top:12px;padding:12px 16px;border:0;border-radius:10px;background:#7dd3fc;color:#07111f;font-weight:700;text-decoration:none}dl{display:grid;grid-template-columns:max-content 1fr;gap:8px 16px}dt{color:#9fb0d0}dd{margin:0;overflow-wrap:anywhere}img{max-width:280px;width:100%;background:white;padding:12px;border-radius:12px}.hidden{display:none}.warning{color:#fde68a}</style>
</head>
<body><main>
<h1>XRPL Group Pay signing handoff</h1>
<p class="warning">Open this file only on a device you control. Confirm Mainnet, destination, and amount in Xaman before signing.</p>
<label for="password">Bundle password</label>
<input id="password" type="password" autocomplete="off">
<button id="decrypt" type="button">Unlock signing request</button>
<p id="error" role="alert"></p>
<section id="details" class="hidden">
<dl>
<dt>Network</dt><dd id="network"></dd>
<dt>Destination</dt><dd id="destination"></dd>
<dt>Expected payer</dt><dd id="payer"></dd>
<dt>Amount</dt><dd id="amount"></dd>
<dt>Window ends</dt><dd id="expires"></dd>
</dl>
<a id="launch" class="launch" rel="noreferrer">Open in Xaman</a>
<p><img id="qr" alt="Xaman signing QR code"></p>
</section>
</main>
<script>
const sealed=${JSON.stringify(payload)};
const fromBase64=value=>Uint8Array.from(atob(value),character=>character.charCodeAt(0));
document.getElementById('decrypt').addEventListener('click',async()=>{
 const error=document.getElementById('error');error.textContent='';
 try{
  const password=document.getElementById('password').value;
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:fromBase64(sealed.salt),iterations:sealed.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
  const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromBase64(sealed.iv)},key,fromBase64(sealed.encrypted));
  const data=JSON.parse(new TextDecoder().decode(clear));
  document.getElementById('network').textContent=data.network;
  document.getElementById('destination').textContent=data.destinationAddress;
  document.getElementById('payer').textContent=data.expectedPayerAddress;
  document.getElementById('amount').textContent=data.amountDrops+' drops';
  document.getElementById('expires').textContent=data.expiresAt;
  const launch=document.getElementById('launch');launch.href=data.deepLink;
  const qr=document.getElementById('qr');qr.src=data.qrPng;
  document.getElementById('details').classList.remove('hidden');
 }catch{error.textContent='The bundle could not be unlocked. Check the password.';}
});
</script></body></html>`;
}

export function assertPublicSafeReport(report) {
  if (
    report?.schema_version !== 1 ||
    report?.network !== "mainnet" ||
    report?.asset_id !== MAINNET_XRP_ASSET_ID ||
    report?.state !== "verified" ||
    !/^[A-F0-9]{64}$/.test(report?.transaction_hash ?? "") ||
    !Number.isInteger(report?.ledger_index) ||
    report?.validated !== true ||
    report?.transaction_result !== "tesSUCCESS" ||
    !/^[1-9]\d*$/.test(report?.amount_drops ?? "") ||
    report?.receipt_id !== `mainnet:${report.transaction_hash}` ||
    !/^[A-F0-9]{64}$/.test(report?.proof_digest ?? "") ||
    report?.duplicate_rejected !== true ||
    report?.replay_rejected !== true ||
    report?.operations_restored_halted !== true ||
    report?.sensitive_values_excluded !== true
  ) {
    throw new Error("The public-safe XRP acceptance report is incomplete.");
  }

  const forbidden = [
    "paymentToken",
    "publicToken",
    "adminToken",
    "payloadId",
    "deepLink",
    "qrPng",
    "websocketUrl",
    "authorization",
    "bearer",
    "secret",
    "signedBlob",
  ];
  const serialized = JSON.stringify(report);
  if (forbidden.some((term) => serialized.toLowerCase().includes(term.toLowerCase()))) {
    throw new Error("The public report contains private operational material.");
  }
  return report;
}

export function safeErrorCode(responseBody) {
  const code = responseBody?.error?.code;
  return typeof code === "string" && /^[A-Z0-9_:-]{1,80}$/.test(code)
    ? code
    : "UNSPECIFIED";
}

export function escapeSummary(value) {
  return escapeHtml(value);
}
