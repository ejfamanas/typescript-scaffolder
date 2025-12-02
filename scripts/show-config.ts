// scripts/show-config.ts
/**
 * Print the merged runtime config discovered by the TypeScript Scaffolder.
 *
 * Usage:
 *   npx ts-node scripts/show-config.ts
 *   node -r ts-node/register scripts/show-config.ts
 */

import { loadConfig } from "../src/config/loader";

async function main() {
  try {
    const cfg = await loadConfig(process.cwd());
    console.log("Effective runtime config:");
    console.log(JSON.stringify(cfg.runtime, null, 2));
  } catch (err) {
    console.error("Failed to load config:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

main();
