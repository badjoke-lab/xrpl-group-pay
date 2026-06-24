export class CapabilityTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CapabilityTokenError";
  }
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function digestToHex(digest: ArrayBuffer) {
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  )
    .join("")
    .toUpperCase();
}

export function createCapabilityToken(randomBytes?: Uint8Array) {
  const bytes = randomBytes ?? crypto.getRandomValues(new Uint8Array(32));
  if (bytes.length !== 32) {
    throw new CapabilityTokenError(
      "Capability token entropy must be exactly 32 bytes.",
    );
  }
  return bytesToHex(bytes);
}

export async function hashCapabilityToken(token: string) {
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    throw new CapabilityTokenError("The capability token is invalid.");
  }
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token.toLowerCase()),
  );
  return digestToHex(digest);
}
