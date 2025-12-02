// typescript-scaffolder.config.ts
// Starter config for the TypeScript Scaffolder runtime validation feature.
//
// Drop this file in your project root to opt in to validator emission
// (Zod-only for the initial implementation).

export default {
  runtime: {
    // Master switch: when true the generator will emit Zod validators.
    includeValidationHelpers: true,

    // Currently we only support Zod — AJV may be added later.
    validatorLibrary: "zod",

    // Where generated validators will be written (relative to project root).
    // Change this to "src/validators" if you prefer that location.
    validatorOutDir: "generated/validators",

    // Also emit client-side validation helpers for generated SDKs (optional).
    emitClientValidation: false,

    // Prefer explicit null/undefined handling when mapping TS types.
    strictNullChecks: true,
  },
};
