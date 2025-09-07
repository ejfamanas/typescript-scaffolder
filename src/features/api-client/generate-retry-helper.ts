import path from 'path';
import { Project } from 'ts-morph';
import { Logger } from "../../utils/logger";
import {
    addRetryHelperImportsToSourceFile,
    buildEndpointRetryWrapperExport,
    buildRetryHelperImplSource
} from "../../utils/retry-constructors";


export type EndpointMeta = {
  /** The generated endpoint function name, e.g. "GET_person". */
  functionName: string;
  /** The concrete response type name, e.g. "Person" or "PersonList". */
  responseType: string;
  /** The module specifier to import the response type from, e.g. "../interfaces/Person". */
  responseModule: string;
};

/**
 * Generates a per-API retry helper file (e.g., "<fileBase>.requestWithRetry.ts"),
 * containing:
 *   - type-only imports (AxiosResponse, RetryOptions, and concrete response types)
 *   - an embedded generic retry implementation (no runtime dependency)
 *   - one exported endpoint-typed wrapper per endpoint
 *
 * This function does not modify endpoint files; it only writes the helper file.
 *
 * @param outputDir - Directory where "<fileBase>.ts" resides (helper will be written here)
 * @param fileBaseName - Base name of the API file (e.g., "person_api")
 * @param endpoints - Endpoint metadata used to build typed wrappers
 * @param overwrite - Whether to overwrite existing helper (default: true)
 */
export function generateRetryHelperForApiFile(
  outputDir: string,
  fileBaseName: string,
  endpoints: EndpointMeta[],
  overwrite: boolean = true
): void {
  const funcName = 'generateRetryHelperForApiFile';
  Logger.debug(funcName, `Generating retry helper for ${fileBaseName} with ${endpoints.length} endpoint(s)...`);

  if (!Array.isArray(endpoints) || endpoints.length === 0) {
    Logger.warn(funcName, `No endpoints provided for ${fileBaseName}.requestWithRetry.ts — nothing to write.`);
    return;
  }

  const project = new Project();
  const helperPath = path.join(outputDir, `${fileBaseName}.requestWithRetry.ts`);
  const sourceFile = project.createSourceFile(helperPath, '', { overwrite });

  // 1) Type-only imports for axios, RetryOptions, and unique response types
  const uniqueTypeImports = Array.from(
    new Map(endpoints.map(e => [`${e.responseModule}::${e.responseType}`, e])).values()
  ).map(e => ({ typeName: e.responseType, moduleSpecifier: e.responseModule }));

  addRetryHelperImportsToSourceFile(sourceFile, uniqueTypeImports);

  // 2) Embed the generic implementation (no external runtime dependency)
  sourceFile.addStatements(buildRetryHelperImplSource());

  // 3) Export one typed wrapper per endpoint
  for (const ep of endpoints) {
    const wrapperSource = buildEndpointRetryWrapperExport(ep.functionName, ep.responseType);
    sourceFile.addStatements('\n' + wrapperSource + '\n');
  }

  // 4) Save to disk
  sourceFile.saveSync();
  Logger.info(funcName, `Wrote ${fileBaseName}.requestWithRetry.ts at ${helperPath}`);
}