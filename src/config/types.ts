/**
 * src/config/types.ts
 *
 * Canonical config shapes and defaults for the TypeScript Scaffolder runtime options.
 * Keep this file dependency-free so it is safe to import from generator code and tests.
 */

/**
 * Validator library in use.
 *
 * NOTE: Currently we intentionally only support "zod" to avoid AJV/module issues
 * in different Node/module-system setups. AJV may be reintroduced in a follow-up.
 */
export type ValidatorLibrary = "zod";

/**
 * Runtime-related options that control whether validation helpers are emitted and where.
 */
export interface RuntimeOptions {
    /**
     * Master switch to enable emitting runtime validators (schemas + helpers).
     *
     * Default: `false` (no validators emitted).
     */
    includeValidationHelpers?: boolean;

    /**
     * Which validator library to generate schemas for. Currently only "zod" is accepted.
     */
    validatorLibrary?: ValidatorLibrary;

    /**
     * Also emit client-side validation helpers (useful when generating SDKs/clients).
     *
     * Default: `false`.
     */
    emitClientValidation?: boolean;

    /**
     * Output directory for the generated validators (relative to project root).
     *
     * Example: "src/validators" or "generated/validators"
     * Default: "src/validators"
     */
    validatorOutDir?: string;

    /**
     * Mirror TypeScript's strictNullChecks behaviour for how null/undefined are emitted
     * into generated validators. If `true` the generator will prefer `.nullable()` /
     * explicit unions rather than permissive `z.any()` fallbacks.
     *
     * Default: `false`.
     */
    strictNullChecks?: boolean;
}

/**
 * Top-level config shape for the scaffolder.
 */
export interface FullConfig {
    /**
     * Runtime-specific options. Optional; if omitted defaults will be used.
     */
    runtime?: RuntimeOptions;
}

/**
 * Default runtime options used when no config is provided.
 */
export const DEFAULT_RUNTIME: Required<RuntimeOptions> = {
    includeValidationHelpers: false,
    validatorLibrary: "zod",
    emitClientValidation: false,
    validatorOutDir: "src/validators",
    strictNullChecks: false,
};

/**
 * Merge user-provided runtime options with defaults and return a fully-populated
 * RuntimeOptions object.
 *
 * This is intentionally simple (shallow merge). Callers that need deep/complex
 * merging semantics can handle them separately.
 */
export function normalizeRuntimeOptions(input?: Partial<RuntimeOptions>): Required<RuntimeOptions> {
    return {
        ...DEFAULT_RUNTIME,
        ...(input || {}),
    };
}
