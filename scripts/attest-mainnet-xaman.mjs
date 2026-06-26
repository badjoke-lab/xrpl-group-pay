import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { requireText } from "./mainnet-xaman-attestation-context.mjs";
import { runMainnetXamanAttestation } from "./mainnet-xaman-attestation-runner.mjs";

export async function executeMainnetXamanAttestation(options = {}) {
  const configPath =
    options.configPath ??
    resolve(process.cwd(), "config/mainnet-xaman-attestation.json");
  const outputPath =
    options.outputPath ??
    requireText(
      process.env.MAINNET_XAMAN_ATTESTATION_REPORT_PATH,
      "MAINNET_XAMAN_ATTESTATION_REPORT_PATH",
    );
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const report = await runMainnetXamanAttestation({
    config,
    environment: options.environment ?? process.env,
    headers: options.headers,
    fetcher: options.fetcher ?? fetch,
    now: options.now,
  });
  const absoluteOutputPath = resolve(outputPath);
  await mkdir(dirname(absoluteOutputPath), { recursive: true });
  await writeFile(
    absoluteOutputPath,
    `${JSON.stringify(report, null, 2)}\n`,
  );
  return report;
}
