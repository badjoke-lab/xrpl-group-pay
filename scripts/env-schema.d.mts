export type ParsedBuildEnv = {
  appNetwork: "testnet" | "mainnet";
  publicAppNetwork: "testnet" | "mainnet";
  publicAppUrl: string;
  allowMainnetBuild: boolean;
};

export function parseBuildEnv(
  input: Record<string, string | undefined>,
): ParsedBuildEnv;
