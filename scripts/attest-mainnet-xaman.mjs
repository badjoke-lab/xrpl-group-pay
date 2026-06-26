import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { requireText } from "./mainnet-xaman-attestation-context.mjs";
import { xamanAuthHeaders } from "./mainnet-xaman-attestation-http.mjs";
import { runMainnetXamanAttestation } from "./mainnet-xaman-attestation-runner.mjs";

function readMainnetXamanHeaders(environment) {
  const keyName = "MAINNET_XAMAN_API_KEY";
  const secretName = "MAINNET_XAMAN_API_SECRET";
  return xamanAuthHeaders(
    requireText(environment[keyName], keyName),
    requireText(environment[secretName], secretName),
  );
}

export async function executeMainnetXamanAttestation(options = {}) {
  const environment = options.environment ?? process.env;
  const configPath =
    options.configPath ??
    resolve(process.cwd(), "config/mainnet-xaman-attestation.json");
  const outputPath =
    options.outputPath ??
    requireText(
      environment.MAINNET_XAMAN_ATTESTATION_REPORT_PATH,
      "MAINNET_XAMAN_ATTESTATION_REPORT_PATH",
    );
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const report = await runMainnetXamanAttestation({
    config,
    environment,
    headers: options.headers ?? readMainnetXamanHeaders(environment),
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

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  executeMainnetXamanAttestation()
    .then(() => {
      console.log(
        "Mainnet Xaman provider attestation verified; public-safe report written.",
      );
    })
    .catch((error) => {
      console.error(
        `Mainnet Xaman provider attestation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exitCode = 1;
    });
}
