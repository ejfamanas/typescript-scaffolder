import { SourceFile } from "ts-morph";
import { Endpoint } from "models/api-definitions";

/**
 * Adds the necessary imports for Axios and shared types to the generated source file.
 */
export function addErrorHandlerImportsToSourceFile(
    sourceFile: SourceFile,
    metas: { responseType: string; responseModule: string }[]
): void {
    const uniqueModules = new Set(metas.map((m) => m.responseModule));

    sourceFile.addImportDeclaration({
        namedImports: ["AxiosResponse"],
        moduleSpecifier: "axios"
    });

    sourceFile.addImportDeclaration({
        namedImports: ["WrapRequestOptions"],
        moduleSpecifier: "typescript-scaffolder"
    });

    for (const module of uniqueModules) {
        const typesFromModule = metas
            .filter((m) => m.responseModule === module)
            .map((m) => m.responseType);

        sourceFile.addImportDeclaration({
            namedImports: Array.from(new Set(typesFromModule)).map((name) => ({name})),
            moduleSpecifier: module
        });
    }
}

/**
 * Shared error-handling implementation used by all per-endpoint wrappers.
 */
export function buildErrorHandlerImplSource(): string {
    return `
async function handleErrorsImpl<T>(
  fn: () => Promise<T>,
  options: WrapRequestOptions = {}
): Promise<T | undefined> {
  const {
    context,
    logFn = console.error,
    sanitizeFn,
    rethrow = true,
  } = options;

  try {
    return await fn();
  } catch (err) {
    const safeError = sanitizeFn ? sanitizeFn(err) : err;
    logFn(safeError, context);
    if (rethrow) throw err;
    return undefined;
  }
}
  `.trim();
}

/**
 * Generates a typed error-handling wrapper function for a specific endpoint.
 */
export function buildEndpointErrorHandlerExport(
    functionName: string,
    responseType: string,
    endpoint: Endpoint
): string {
    const method = endpoint.method
    return `
export function handleErrors_${functionName}(
  fn: () => Promise<AxiosResponse<${responseType}>>
): Promise<AxiosResponse<${responseType}> | undefined> {
  return handleErrorsImpl(fn, {
    context: {
      endpointPath: "${endpoint.path}",
      method: "${method.toUpperCase()}"
    }
  });
}
  `.trim();
}
