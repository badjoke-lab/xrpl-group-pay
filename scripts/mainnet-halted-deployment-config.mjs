import {
  assertHaltedDeploymentContract,
  buildHaltedMainnetWrangler,
  writeHaltedMainnetWrangler,
} from "./mainnet-halted-deployment-config-core.mjs";

export {
  assertHaltedDeploymentContract,
  buildHaltedMainnetWrangler,
  writeHaltedMainnetWrangler,
};

function parseArguments(argv) {
  const index = argv.indexOf("--output");
  return {
    outputPath: index >= 0 ? argv[index + 1] : undefined,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeHaltedMainnetWrangler(parseArguments(process.argv.slice(2)))
    .then((summary) => {
      console.log(
        `Prepared halted Mainnet Wrangler config for ${summary.workerName} at ${summary.outputPath}.`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
