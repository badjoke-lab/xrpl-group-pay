import { parseBuildEnv } from "./env-schema.mjs";

try {
  const env = parseBuildEnv(process.env);
  console.log(
    `Environment validated: network=${env.appNetwork}, url=${env.publicAppUrl}`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Environment validation failed: ${message}`);
  process.exit(1);
}
