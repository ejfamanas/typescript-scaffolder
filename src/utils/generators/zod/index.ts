/****
 * Public API for generating Zod validators from TypeScript interface files.
 */
import path from 'path';
import fs from 'fs';
import { mapDirToModels, detectRecursiveTypes, type FileModel } from './mapping';
import { renderFileModelToZod, type RenderResult } from './templates';
import { writeRenderedFiles } from './writer';
import { Logger } from "../../logger";

export interface ZodGenOptions {
  outDir: string; // project-root-relative or absolute
  projectRoot?: string;
  strictNullChecks?: boolean; // reserved for future use
  prettier?: boolean;
  overwrite?: boolean;
  recursive?: boolean; // whether to scan directories recursively
}

/**
 * Generate Zod validators for all TypeScript interface files under `interfacesDir`.
 * Returns a summary report of written/skipped files and warnings.
 */
export async function generateZodValidatorsForDir(
  interfacesDir: string,
  opts: ZodGenOptions
): Promise<{ written: string[]; skipped: string[]; warnings: string[] }> {
  const fn = 'generateZodValidatorsForDir';
  const projectRoot = opts.projectRoot ?? process.cwd();
  const absInterfaces = path.isAbsolute(interfacesDir) ? interfacesDir : path.resolve(projectRoot, interfacesDir);

  if (!fs.existsSync(absInterfaces)) {
    Logger.warn(fn, `Interfaces directory not found: ${absInterfaces} — skipping validator generation`);
    return { written: [], skipped: [], warnings: [] };
  }

  const outDir = opts.outDir ?? 'generated/validators';

  Logger.info(fn, `Generating Zod validators from ${absInterfaces} → ${outDir}`);

  // Map TS files to intermediate models
  let models: FileModel[] = [];
  try {
    models = await mapDirToModels(absInterfaces, { projectRoot, recursive: !!opts.recursive });
  } catch (e) {
    Logger.error(fn, `Failed to map TypeScript files: ${(e as Error).message}`);
    throw e;
  }

  if (!models || models.length === 0) {
    Logger.info(fn, `No TypeScript source files found in ${absInterfaces}`);
    return { written: [], skipped: [], warnings: [] };
  }

  // Detect recursive types so templates can emit z.lazy
  const recursive = detectRecursiveTypes(models);

  // Render each FileModel to a RenderResult (filename + content + warnings)
  const renderResults: RenderResult[] = [];
  for (const fm of models) {
    try {
      const rr = renderFileModelToZod(fm, { projectRoot, outputDir: outDir, recursiveTypes: recursive });
      renderResults.push(rr);
    } catch (e) {
      Logger.warn(fn, `Failed to render ${fm.relativePath}: ${(e as Error).message}`);
      // emit a fallback file so generation can continue
      const fallbackName = path.basename(fm.filePath, '.ts') + '.schemas.ts';
      const fallbackContent = `// AUTO-GENERATED fallback for ${fm.relativePath}\nimport { z } from "zod";\nexport const ${path.basename(fm.filePath, '.ts')}Schema = z.unknown();\nexport type ${path.basename(fm.filePath, '.ts')} = unknown;\n`;
      renderResults.push({ filename: fallbackName, content: fallbackContent, warnings: [(e as Error).message] });
    }
  }

  // Write files using writer
  const report = await writeRenderedFiles(renderResults, outDir, { projectRoot, overwrite: !!opts.overwrite, prettier: !!opts.prettier });

  // Log summary
  if (report.written.length > 0) Logger.info(fn, `Wrote ${report.written.length} validator files to ${path.resolve(projectRoot, outDir)}`);
  if (report.skipped.length > 0) Logger.debug(fn, `Skipped ${report.skipped.length} validator files (no changes)`);
  if (report.warnings.length > 0) Logger.warn(fn, `Generation completed with ${report.warnings.length} warning(s)`);

  return report;
}
