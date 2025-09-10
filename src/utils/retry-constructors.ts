import { Logger } from './logger';
import { RetryOptions } from "models/retry-definitions";

/**
 * Builds the canonical retry-wrapper function name for a given generated endpoint function.
 *
 * The generator will use this to derive wrapper import symbols like:
 *   requestWithRetry_GET_person, requestWithRetry_GET_ALL_person, etc.
 *
 * Keeping this logic centralized ensures consistent naming across imports,
 * helper file generation, and call sites.
 *
 * @param functionName - The generated endpoint function name (e.g., "GET_person").
 * @returns The wrapper name (e.g., "requestWithRetry_GET_person").
 */
export function buildRetryWrapperName(functionName: string): string {
    const funcName = 'buildRetryWrapperName';

    if (!functionName || !functionName.trim()) {
        Logger.warn(funcName, 'Empty functionName provided; defaulting to "requestWithRetry"');
        return 'requestWithRetry';
    }

    // No normalization is performed here because functionName is already produced
    // by our generator (e.g., generateClientAction) and should be a valid identifier.
    return `requestWithRetry_${functionName}`;
}

const defaultRetryStatuses = [429, 502, 503, 504];
const defaultIdempotentMethods = ["GET", "HEAD", "PUT", "DELETE", "OPTIONS"];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generic retry loop implementation.
 * Endpoint-specific generated wrappers should delegate to this, binding the concrete response type.
 *
 * NOTE: This function is exported for the generator's emitted helper module to import.
 * It is not intended to be imported directly by end users.
 *
 * @param attempt - thunk that performs the request and returns a Promise of a typed AxiosResponse-like object
 * @param opts - retry configuration
 */
export async function requestWithRetryImpl<T>(
    attempt: () => Promise<T>,
    opts: RetryOptions
): Promise<T> {
    const {
        enabled,
        maxAttempts = 3,
        initialDelayMs = 250,
        multiplier = 2.0,
        retryStatuses = defaultRetryStatuses,
        method = "GET",
        idempotentMethods = defaultIdempotentMethods,
    } = opts;

    if (!enabled) {
        return attempt();
    }

    const isIdempotent = idempotentMethods.includes(method.toUpperCase());
    let attemptNum = 0;

    while (true) {
        try {
            const result: any = await attempt();
            // If the result looks like an AxiosResponse, use its status for HTTP-based retry decisions.
            const status: number | undefined =
                result && typeof result === "object" && "status" in result ? (result as any).status : undefined;

            // If not idempotent, or we can't determine status, or status isn't retryable—return immediately.
            if (!isIdempotent || status === undefined || !retryStatuses.includes(status)) {
                return result;
            }

            attemptNum++;
            if (attemptNum >= maxAttempts) {
                return result;
            }

            const delay = Math.floor(initialDelayMs * Math.pow(multiplier, attemptNum - 1));
            await sleep(delay);
        } catch (e: any) {
            // Axios-style errors: if e.response is present, it's an HTTP error; otherwise it's a network error.
            const hasResponse = !!e?.response;
            const status: number | undefined = hasResponse ? e.response.status : undefined;
            const isRetryableHttp = hasResponse && status !== undefined && retryStatuses.includes(status);
            const isNetworkError = !hasResponse;

            // Only retry when idempotent AND (network error OR retryable HTTP status).
            if (!isIdempotent || (!isNetworkError && !isRetryableHttp)) {
                throw e;
            }

            attemptNum++;
            if (attemptNum >= maxAttempts) {
                // Preserve axios semantics on failure path: rethrow the last error when never successful.
                throw e;
            }

            const delay = Math.floor(initialDelayMs * Math.pow(multiplier, attemptNum - 1));
            await sleep(delay);
        }
    }
}

/**
 * Builds a single exported wrapper function for a given endpoint, binding the concrete response type.
 *
 * Example output:
 *   export function requestWithRetry_GET_person(
 *     attempt: () => Promise<AxiosResponse<Person>>,
 *     opts: RetryOptions
 *   ): Promise<AxiosResponse<Person>> {
 *     return requestWithRetryImpl<AxiosResponse<Person>>(attempt, opts);
 *   }
 *
 * This returns a TypeScript code snippet (string) that the generator can place into
 * the per-API helper module (e.g., person_api.requestWithRetry.ts).
 *
 * @param functionName - The generated endpoint function name (e.g., "GET_person").
 * @param responseType - The concrete response type name (e.g., "Person" or "PersonList").
 */
export function buildEndpointRetryWrapperExport(functionName: string, responseType: string): string {
    const wrapperName = buildRetryWrapperName(functionName);
    return `
export function ${wrapperName}(
  attempt: () => Promise<AxiosResponse<${responseType}>>,
  opts: RetryOptions
): Promise<AxiosResponse<${responseType}>> {
  return requestWithRetryImpl<AxiosResponse<${responseType}>>(attempt, opts);
}
`.trim();
}

/**
 * Returns the source text for the generic retry implementation that should be
 * embedded into each generated helper module (e.g., <fileBase>.requestWithRetry.ts).
 *
 * NOTE: We embed this code so that generated output has no runtime dependency on the generator.
 * The embedded implementation must stay in sync with requestWithRetryImpl in this module.
 */
export function buildRetryHelperImplSource(): string {
    return `
const defaultRetryStatuses = [429, 502, 503, 504];
const defaultIdempotentMethods = ["GET", "HEAD", "PUT", "DELETE", "OPTIONS"];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function requestWithRetryImpl<T>(
  attempt: () => Promise<T>,
  opts: RetryOptions
): Promise<T> {
  const {
    enabled,
    maxAttempts = 3,
    initialDelayMs = 250,
    multiplier = 2.0,
    retryStatuses = defaultRetryStatuses,
    method = "GET",
    idempotentMethods = defaultIdempotentMethods,
  } = opts;

  if (!enabled) {
    return attempt();
  }

  const isIdempotent = idempotentMethods.includes(method.toUpperCase());
  let attemptNum = 0;

  while (true) {
    try {
      const result: any = await attempt();
      const status: number | undefined =
        result && typeof result === "object" && "status" in result ? (result as any).status : undefined;

      if (!isIdempotent || status === undefined || !retryStatuses.includes(status)) {
        return result;
      }

      attemptNum++;
      if (attemptNum >= maxAttempts) {
        return result;
      }

      const delay = Math.floor(initialDelayMs * Math.pow(multiplier, attemptNum - 1));
      await sleep(delay);
    } catch (e: any) {
      // Axios-style errors: if e.response is present, it's an HTTP error; otherwise it's a network error.
      const hasResponse = !!e?.response;
      const status: number | undefined = hasResponse ? e.response.status : undefined;
      const isRetryableHttp = hasResponse && status !== undefined && retryStatuses.includes(status);
      const isNetworkError = !hasResponse;

      // Only retry when idempotent AND (network error OR retryable HTTP status).
      if (!isIdempotent || (!isNetworkError && !isRetryableHttp)) {
        throw e;
      }

      attemptNum++;
      if (attemptNum >= maxAttempts) {
        // Preserve axios semantics on failure path: rethrow the last error when never successful.
        throw e;
      }

      const delay = Math.floor(initialDelayMs * Math.pow(multiplier, attemptNum - 1));
      await sleep(delay);
    }
  }
}
`.trimStart();
}

/**
 * Adds all imports needed by <fileBase>.requestWithRetry.ts using ts-morph,
 * mirroring the style used by addClientRequiredImports in client-constructors.ts.
 *
 * - import type { AxiosResponse } from 'axios'
 * - import type { RetryOptions } from 'typescript-scaffolder'
 * - grouped type-only imports for concrete response types (deduped by module)
 */
export function addRetryHelperImportsToSourceFile(
    sourceFile: import('ts-morph').SourceFile,
    typeImports: Array<{ typeName: string; moduleSpecifier: string }>,
    retryDefsModule: string = 'typescript-scaffolder'
) {
    const ensureTypeOnlyNamedImport = (moduleSpecifier: string, names: string[]) => {
        if (!names.length) return;

        // Try to find an existing import from this module
        let decl = sourceFile.getImportDeclarations()
            .find(d => d.getModuleSpecifierValue() === moduleSpecifier);

        if (!decl) {
            sourceFile.addImportDeclaration({
                isTypeOnly: true,
                namedImports: [...new Set(names)].sort().map(name => ({name})),
                moduleSpecifier,
            });
            return;
        }

        // If we do have an import already:
        // - If it's type-only with named imports, append missing names
        // - Otherwise, add a separate type-only import to avoid changing existing semantics
        if (decl.isTypeOnly() && decl.getNamedImports().length > 0) {
            const existingNames = new Set(decl.getNamedImports().map(n => n.getName()));
            const toAdd = names.filter(n => !existingNames.has(n)).map(name => ({name}));
            if (toAdd.length) decl.addNamedImports(toAdd);
        } else {
            sourceFile.addImportDeclaration({
                isTypeOnly: true,
                namedImports: [...new Set(names)].sort().map(name => ({name})),
                moduleSpecifier,
            });
        }
    };

    // 1) import type { AxiosResponse } from 'axios'
    ensureTypeOnlyNamedImport('axios', ['AxiosResponse']);

    // 2) import type { RetryOptions } from 'typescript-scaffolder'
    ensureTypeOnlyNamedImport(retryDefsModule, ['RetryOptions']);

    // 3) Group response type imports by module specifier and add them
    const byModule = new Map<string, Set<string>>();
    for (const {typeName, moduleSpecifier} of typeImports) {
        if (!typeName || !moduleSpecifier) continue;
        if (!byModule.has(moduleSpecifier)) byModule.set(moduleSpecifier, new Set());
        byModule.get(moduleSpecifier)!.add(typeName);
    }

    for (const [mod, names] of byModule.entries()) {
        ensureTypeOnlyNamedImport(mod, Array.from(names));
    }
}