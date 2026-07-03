import {
  isValidClassicAddress,
  isValidXAddress,
  xAddressToClassicAddress,
} from "xrpl";

import type { XrplNetwork } from "@/features/assets/types";

export type XrplAddressRole = "recipient" | "payer";

export type XrplAddressInputStatus =
  | "empty"
  | "valid_classic"
  | "xaddress_review"
  | "invalid"
  | "network_mismatch"
  | "payer_tag_not_allowed"
  | "destination_tag_conflict";

export type XrplAddressInspection = {
  raw: string;
  status: XrplAddressInputStatus;
  classicAddress: string | null;
  destinationTag: string | null;
  encodedNetwork: XrplNetwork | null;
};

function normalizedTag(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

export function inspectXrplAddressInput({
  value,
  network,
  role,
  destinationTag,
}: {
  value: string;
  network: XrplNetwork;
  role: XrplAddressRole;
  destinationTag?: string | null;
}): XrplAddressInspection {
  const raw = value.trim();
  if (!raw) {
    return {
      raw,
      status: "empty",
      classicAddress: null,
      destinationTag: null,
      encodedNetwork: null,
    };
  }

  if (isValidClassicAddress(raw)) {
    return {
      raw,
      status: "valid_classic",
      classicAddress: raw,
      destinationTag: normalizedTag(destinationTag),
      encodedNetwork: network,
    };
  }

  if (!isValidXAddress(raw)) {
    return {
      raw,
      status: "invalid",
      classicAddress: null,
      destinationTag: null,
      encodedNetwork: null,
    };
  }

  try {
    const decoded = xAddressToClassicAddress(raw);
    const encodedNetwork: XrplNetwork = decoded.test ? "testnet" : "mainnet";
    const decodedTag = decoded.tag === false ? null : String(decoded.tag);

    if (encodedNetwork !== network) {
      return {
        raw,
        status: "network_mismatch",
        classicAddress: decoded.classicAddress,
        destinationTag: decodedTag,
        encodedNetwork,
      };
    }

    if (role === "payer" && decodedTag !== null) {
      return {
        raw,
        status: "payer_tag_not_allowed",
        classicAddress: decoded.classicAddress,
        destinationTag: decodedTag,
        encodedNetwork,
      };
    }

    const currentTag = normalizedTag(destinationTag);
    if (
      role === "recipient" &&
      decodedTag !== null &&
      currentTag !== null &&
      currentTag !== decodedTag
    ) {
      return {
        raw,
        status: "destination_tag_conflict",
        classicAddress: decoded.classicAddress,
        destinationTag: decodedTag,
        encodedNetwork,
      };
    }

    return {
      raw,
      status: "xaddress_review",
      classicAddress: decoded.classicAddress,
      destinationTag: decodedTag ?? currentTag,
      encodedNetwork,
    };
  } catch {
    return {
      raw,
      status: "invalid",
      classicAddress: null,
      destinationTag: null,
      encodedNetwork: null,
    };
  }
}

export function isCanonicalClassicAddress(value: string) {
  return isValidClassicAddress(value.trim());
}
