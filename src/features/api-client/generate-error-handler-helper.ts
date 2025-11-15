import path from "path";
import fs from "fs";
import { ensureDir } from "fs-extra";
import { Project } from "ts-morph";
import {
    addErrorHandlerImportsToSourceFile,
    buildEndpointErrorHandlerExport,
    buildErrorHandlerImplSource
} from "../../utils/error-handling-constructors"
import { Logger } from "../../utils/logger";
import { EndpointMeta } from "models/api-definitions";

export function generateErrorHandlerForApiFile(
    outputDir: string,
    fileBaseName: string,
    endpoints: EndpointMeta[],
    overwrite: boolean = true
): void {
    if (!endpoints.length) return;

    ensureDir(outputDir);
    const project = new Project();
    const outPath = path.join(outputDir, `${fileBaseName}.errorHandler.ts`);

    if (!overwrite && fs.existsSync(outPath)) {
        Logger.debug(`Skipped error handler for ${fileBaseName} (already exists)`);
        return;
    }

    const sourceFile = project.createSourceFile(outPath, "", {overwrite});

    addErrorHandlerImportsToSourceFile(sourceFile, endpoints);

    sourceFile.addStatements([buildErrorHandlerImplSource()]);

    for (const meta of endpoints) {
        sourceFile.addStatements([
            buildEndpointErrorHandlerExport(meta.functionName, meta.responseType, meta.endpoint),
        ]);
    }

    // 4) Save to disk
    sourceFile.saveSync();
    Logger.info(`✔ Wrote error handler for ${fileBaseName}`);
}
