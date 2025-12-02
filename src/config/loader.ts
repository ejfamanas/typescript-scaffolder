/**
 * src/config/loader.ts
 *
 * Config discovery and loader for the TypeScript Scaffolder.
 *
 * Responsibilities:
 * - Look for config files in a predictable order (ts -> cjs -> js -> mjs -> json -> package.json key)
 * - Load the config (supporting .ts via ts-node/register if available)
 * - Merge the loaded config.runtime with CLI overrides and DEFAULT_RUNTIME
 * - Return a fully-normalized runtime options object
 */

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

import type { FullConfig, RuntimeOptions } from "./types";
import { normalizeRuntimeOptions } from "./types";

/**
 * A shallow safe-require that wraps Node's require and returns `undefined` on error.
 * The caller should decide how to handle a failed load.
 */
function safeRequire(filePath: string): any {
    try {
        return require(filePath);
    } catch (err) {
        return undefined;
    }
}

/**
 * Discovery order for config files. Prefer TS file for DX, but fall back to other
 * common formats to be flexible across projects/CI environments.
 */
const CANDIDATES = [
    // Primary, explicit file name (recommended)
    "typescript-scaffolder.config.ts",
    "typescript-scaffolder.config.cjs",
    "typescript-scaffolder.config.js",

    // Shorter friendly alias
    "scaffolder.config.ts",
    "scaffolder.config.cjs",
    "scaffolder.config.js",

    // ESM / JSON fallbacks
    "typescript-scaffolder.config.mjs",
    "typescript-scaffolder.config.json",
    "scaffolder.config.mjs",
    "scaffolder.config.json",
];

/**
 * Attempt to load a config file from disk. Supports .ts/.js/.cjs/.mjs/.json.
 * For `.ts` files this function attempts to register `ts-node` so the file can be
 * required directly. If `ts-node` is not available it throws a helpful error.
 */
async function loadFile(fullPath: string): Promise<any> {
    const ext = path.extname(fullPath).toLowerCase();

    if (ext === ".ts") {
        // Prefer an existing ts-node if available (same UX as other tools).
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require("ts-node/register");
        } catch (err) {
            throw new Error(
                "Found typescript-scaffolder.config.ts but `ts-node` is not installed. Install ts-node or use .js/.json, or pass --config <file>."
            );
        }
        const mod = safeRequire(fullPath);
        return mod;
    }

    if (ext === ".cjs" || ext === ".js") {
        const mod = safeRequire(fullPath);
        return mod;
    }

    if (ext === ".mjs") {
        // Use dynamic import for ESM modules.
        const url = pathToFileURL(fullPath).href;
        const mod = await import(url);
        return mod;
    }

    if (ext === ".json") {
        const raw = fs.readFileSync(fullPath, "utf8");
        return JSON.parse(raw);
    }

    return undefined;
}

/**
 * Load the scaffolder config from the project root and merge with overrides.
 *
 * @param projectRoot Directory to resolve config files from. Defaults to process.cwd().
 * @param cliOverrides Partial config supplied by CLI (highest precedence).
 * @returns An object containing the fully-populated runtime options.
 */
export async function loadConfig(
    projectRoot = process.cwd(),
    cliOverrides: Partial<FullConfig> = {}
): Promise<{ runtime: Required<RuntimeOptions> }> {
    let found: any = null;

    for (const name of CANDIDATES) {
        const full = path.join(projectRoot, name);
        if (!fs.existsSync(full)) continue;

        // If file exists try to load it according to its extension
        try {
            const loaded = await loadFile(full);
            if (loaded) {
                // Normalize CommonJS default export semantics
                found = loaded.default ?? loaded;
            }
        } catch (err) {
            // For .ts files we intentionally fail fast with an explanatory error.
            // For others we'll rethrow since a config file exists but couldn't be loaded.
            throw err;
        }

        if (found) break;
    }

    // If no standalone config found, check package.json for a config key.
    if (!found) {
        const pkgPath = path.join(projectRoot, "package.json");
        if (fs.existsSync(pkgPath)) {
            try {
                const raw = fs.readFileSync(pkgPath, "utf8");
                const pkg = JSON.parse(raw);
                // Friendly keys: try a few likely names (keeps UX flexible).
                found = pkg.typescriptScaffolder ?? pkg.scaffolder ?? null;
            } catch (err) {
                // ignore parse errors here and treat as no config
                found = null;
            }
        }
    }

    const fileCfg: FullConfig = (found?.default ?? found) ?? {};

    // Merge runtime section (file/runtime + CLI overrides). CLI overrides take precedence.
    const runtimeFromFile: Partial<RuntimeOptions> = fileCfg.runtime ?? {};
    const runtimeFromCli: Partial<RuntimeOptions> = (cliOverrides as any)?.runtime ?? {};

    const merged = normalizeRuntimeOptions({...runtimeFromFile, ...runtimeFromCli});

    return {runtime: merged};
}

/**
 * Synchronous convenience loader. Useful for small scripts or bootstrapping where
 * dynamic `import()` is not desired. Internally this calls the async loader and
 * blocks on it — use with caution.
 */
export function loadConfigSync(projectRoot = process.cwd(), cliOverrides: Partial<FullConfig> = {}): { runtime: Required<RuntimeOptions> } {
    // This is a thin wrapper — keep correctness simple by awaiting the async loader
    // via a Promise resolution. This avoids duplicating loading logic.
    const res = (() => {
        let out: { runtime: Required<RuntimeOptions> } | undefined;
        let err: any;
        (async () => {
            try {
                out = await loadConfig(projectRoot, cliOverrides);
            } catch (e) {
                err = e;
            }
        })();

        // Busy-wait loop is gross but acceptable for small sync bootstrap paths in CLIs.
        // Keep it simple and predictable; callers should prefer `loadConfig` where possible.
        const start = Date.now();
        while (out === undefined && err === undefined) {
            // prevent tight loop spike
            const now = Date.now();
            if (now - start > 5000) {
                throw new Error("Timed out loading config synchronously");
            }
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
        }

        if (err) throw err;
        return out as { runtime: Required<RuntimeOptions> };
    })();

    return res;
}
