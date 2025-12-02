import fs from 'fs';
import path from 'path';
import type { RenderResult } from './templates';
import { Logger } from "../../logger";
import { ensureDir } from "../../file-system";

export type WriteReport = {
    written: string[];    // absolute paths
    skipped: string[];    // absolute paths
    warnings: string[];   // aggregated warnings
};

/**
 * Write rendered schema files to disk idempotently and produce an index.ts
 * re-exporting schemas and types. Uses existing FS helpers like ensureDir.
 */
export async function writeRenderedFiles(
    renderResults: RenderResult[],
    outDir: string,
    opts?: { projectRoot?: string; overwrite?: boolean; prettier?: boolean }
): Promise<WriteReport> {
    const fn = 'zod-writer';
    const projectRoot = opts?.projectRoot ?? process.cwd();
    const absOutDir = path.isAbsolute(outDir) ? outDir : path.resolve(projectRoot, outDir);

    Logger.debug(fn, `Preparing to write ${renderResults.length} rendered files to ${absOutDir}`);

    // Ensure output directory exists using existing helper
    ensureDir(absOutDir);

    const written: string[] = [];
    const skipped: string[] = [];
    const warnings: string[] = [];

    // Helper to optionally format with prettier if requested
    let prettierFormat: ((s: string, filePath: string) => string) | null = null;
    if (opts?.prettier) {
        try {
            const prettierPath = require.resolve('prettier', {paths: [projectRoot]});
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            // @ts-ignore
            const prettier = require(prettierPath) as typeof import('prettier');
            prettierFormat = (s: string, filePath: string) => prettier.format(s, {filepath: filePath});
            Logger.debug(fn, 'Prettier loaded from project; formatting enabled');
        } catch (e) {
            Logger.info(fn, 'Prettier not found in project; skipping formatting');
            prettierFormat = null;
        }
    }

    for (const rr of renderResults) {
        const targetPath = path.join(absOutDir, rr.filename);
        ensureDir(path.dirname(targetPath));

        // Aggregate warnings from renderer
        if (rr.warnings && rr.warnings.length) {
            for (const w of rr.warnings) warnings.push(`${rr.filename}: ${w}`);
        }

        try {
            let write = true;
            if (!opts?.overwrite && fs.existsSync(targetPath)) {
                const existing = fs.readFileSync(targetPath, 'utf8');
                if (existing === rr.content) {
                    write = false;
                }
            }

            if (!write) {
                skipped.push(targetPath);
                Logger.debug(fn, `Skipping unchanged file: ${targetPath}`);
                continue;
            }

            // Optionally format content
            let contentToWrite = rr.content;
            if (prettierFormat) {
                try {
                    contentToWrite = prettierFormat(rr.content, targetPath);
                } catch (e) {
                    Logger.info(fn, `Prettier failed to format ${rr.filename}: ${(e as Error).message}. Writing unformatted.`);
                }
            }

            // Atomic write
            const tmp = `${targetPath}.tmp-${Date.now()}`;
            fs.writeFileSync(tmp, contentToWrite, 'utf8');
            fs.renameSync(tmp, targetPath);
            written.push(targetPath);
            Logger.info(fn, `Wrote file: ${targetPath}`);
        } catch (err) {
            Logger.error(fn, `Failed to write ${targetPath}: ${(err as Error).message}`);
            throw err;
        }
    }

    // Generate index.ts from the renderResults (derive exports from generated content)
    try {
        const exportsByImport = new Map<string, { schemas: Set<string>; types: Set<string> }>();

        for (const rr of renderResults) {
            const base = path.basename(rr.filename, '.ts'); // e.g. foo.schemas
            const importPath = `./${base}`;
            const schemas = new Set<string>();
            const types = new Set<string>();

            const schemaRegex = /export const\s+(\w+Schema)\s*=/g;
            const typeRegex = /export type\s+(\w+)\s*=/g;
            let m: RegExpExecArray | null;
            while ((m = schemaRegex.exec(rr.content)) !== null) schemas.add(m[1]);
            while ((m = typeRegex.exec(rr.content)) !== null) types.add(m[1]);

            if (!exportsByImport.has(importPath)) exportsByImport.set(importPath, {
                schemas: new Set(),
                types: new Set()
            });
            const entry = exportsByImport.get(importPath)!;
            for (const s of schemas) entry.schemas.add(s);
            for (const t of types) entry.types.add(t);
        }

        const indexLines: string[] = [];
        indexLines.push('// AUTO-GENERATED index of validators — do not edit.');
        indexLines.push('');

        const imports = Array.from(exportsByImport.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        for (const [importPath, {schemas, types}] of imports) {
            if (schemas.size > 0) {
                const list = Array.from(schemas).sort().join(', ');
                indexLines.push(`export { ${list} } from "${importPath}";`);
            }
            if (types.size > 0) {
                const list = Array.from(types).sort().join(', ');
                indexLines.push(`export type { ${list} } from "${importPath}";`);
            }
            indexLines.push('');
        }

        const indexContent = indexLines.join('\n') + '\n';
        const indexPath = path.join(absOutDir, 'index.ts');

        // Skip writing index if unchanged
        let writeIndex = true;
        if (fs.existsSync(indexPath)) {
            const existing = fs.readFileSync(indexPath, 'utf8');
            if (existing === indexContent) writeIndex = false;
        }

        if (writeIndex) {
            ensureDir(path.dirname(indexPath));
            let contentToWrite = indexContent;
            if (prettierFormat) {
                try {
                    contentToWrite = prettierFormat(indexContent, indexPath);
                } catch (e) {
                    Logger.info(fn, `Prettier failed to format index.ts: ${(e as Error).message}. Writing unformatted.`);
                }
            }
            const tmp = `${indexPath}.tmp-${Date.now()}`;
            fs.writeFileSync(tmp, contentToWrite, 'utf8');
            fs.renameSync(tmp, indexPath);
            written.push(indexPath);
            Logger.info(fn, `Wrote index: ${indexPath}`);
        } else {
            skipped.push(indexPath);
            Logger.debug(fn, `Skipping unchanged index: ${indexPath}`);
        }
    } catch (e) {
        Logger.error(fn, `Failed to write index.ts: ${(e as Error).message}`);
        throw e;
    }

    // Summary
    if (warnings.length > 0) {
        Logger.warn(fn, `Generated with ${warnings.length} warning(s).`);
        for (const w of warnings.slice(0, 20)) Logger.warn(fn, w);
        if (warnings.length > 20) Logger.warn(fn, `...and ${warnings.length - 20} more warnings`);
    }

    if (written.length > 0) Logger.info(fn, `Validation enabled — wrote ${written.length} files to ${absOutDir}. Ensure 'zod' is installed (npm i zod).`);

    return {written, skipped, warnings};
}
