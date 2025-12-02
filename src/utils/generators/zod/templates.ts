/**
 * Render FileModel -> Zod TypeScript source string(s). This module does not
 * write files; it only returns rendered content and warnings for the writer to
 * persist and log.
 */

import path from "path";
import { FallbackExpr, FileModel, LiteralExpr, ReferenceExpr, TypeExpression, UnionExpr } from "./mapping";

export type RenderResult = { filename: string; content: string; warnings: string[] };

/**
 * Options for rendering a FileModel into a Zod schema file.
 * - projectRoot: base path used when resolving referenced type sources
 * - outputDir: directory (project-root relative or absolute) where generated
 *   schema files will be placed. Templates use this to compute relative import
 *   paths for referenced schemas.
 * - outFileName: override for the generated filename (default: <source>.schemas.ts)
 * - recursiveTypes: set of type names that should be referenced via `z.lazy`
 */
export interface RenderOptions {
    projectRoot?: string;
    outputDir?: string; // where generated schema files will be written (project-relative or abs)
    outFileName?: string;
    recursiveTypes?: Set<string>;
}

export function ensurePosix(p: string) {
    return p.split(path.sep).join('/');
}

export function quoteString(s: string) {
    return `'${s.replace(/'/g, "\\'")}'`;
}

export function isLiteralNullOrUndefined(expr: TypeExpression): boolean {
    if ((expr as any).kind === 'literal') {
        return (expr as LiteralExpr).value === null;
    }
    if ((expr as any).kind === 'primitive') {
        return (expr as any).name === 'undefined' || (expr as any).name === 'null';
    }
    return false;
}

/** Normalize an expression for property rendering: strip `null`/`undefined` from unions and
 * return a base expression plus a flag whether it was nullable. */
export function stripNullable(expr: TypeExpression): { expr: TypeExpression; nullable: boolean } {
    if (expr.kind === 'union') {
        const members = (expr as UnionExpr).members.filter((m) => !isLiteralNullOrUndefined(m));
        const nullable = (expr as UnionExpr).members.some(isLiteralNullOrUndefined);
        if (members.length === 1) return {expr: members[0], nullable};
        return {expr: {kind: 'union', members}, nullable};
    }
    if (isLiteralNullOrUndefined(expr)) return {
        expr: {
            kind: 'fallback',
            reason: 'only-null-or-undefined union'
        } as FallbackExpr, nullable: true
    };
    return {expr, nullable: false};
}

/** Render a TypeExpression to a Zod expression string. Returns code and any warnings. */
export function renderExpr(
    expr: TypeExpression,
    opts: RenderOptions,
    imports: Map<string, Set<string>>
): { code: string; warnings: string[] } {
    const warnings: string[] = [];
    switch (expr.kind) {
        case 'primitive': {
            const p = (expr as any).name;
            switch (p) {
                case 'string':
                    return {code: 'z.string()', warnings};
                case 'number':
                    return {code: 'z.number()', warnings};
                case 'boolean':
                    return {code: 'z.boolean()', warnings};
                case 'any':
                case 'unknown':
                    return {code: 'z.unknown()', warnings};
                case 'null':
                    return {code: 'z.null()', warnings};
                case 'undefined':
                    return {code: 'z.any()', warnings}; // handled via optional at property level
                default:
                    return {code: 'z.unknown()', warnings};
            }
        }

        case 'literal': {
            const v = (expr as LiteralExpr).value;
            if (typeof v === 'string') return {code: `z.literal(${quoteString(v)})`, warnings};
            return {code: `z.literal(${String(v)})`, warnings};
        }

        case 'array': {
            const child = renderExpr((expr as any).element, opts, imports);
            return {code: `z.array(${child.code})`, warnings: warnings.concat(child.warnings)};
        }

        case 'union': {
            const members = (expr as UnionExpr).members;
            // if all members are literal -> use union of literals
            const parts = members.map((m) => renderExpr(m, opts, imports));
            const code = `z.union([${parts.map((p) => p.code).join(', ')}])`;
            return {code, warnings: warnings.concat(...parts.map((p) => p.warnings))};
        }

        case 'object': {
            const props = (expr as any).properties as Array<any>;
            const rendered = props.map((p) => {
                const r = renderExpr(p.type, opts, imports);
                // mark optional/nullable handled by caller (property renderer), here just inline
                const base = r.code;
                return `  ${p.name}: ${base}`;
            });
            const code = `z.object({\n${rendered.join(',\n')}\n})`;
            return {code, warnings};
        }

        case 'reference': {
            const ref = expr as ReferenceExpr;
            const schemaId = `${ref.name}Schema`;
            // If source is known and outputDir provided, compute import path
            if (ref.source && opts.outputDir) {
                const projectRoot = opts.projectRoot ?? process.cwd();
                const refSourcePath = path.resolve(projectRoot, ref.source);
                const refSchemaPath = refSourcePath.replace(/\.ts$/i, '.schemas');
                const refSchemaPathWithExt = refSchemaPath + '.ts';
                const outFileDir = path.resolve(projectRoot, opts.outputDir, path.dirname((opts.outFileName || '').replace(/^[\\/]/, '')) || '.');
                // Attempt to compute relative path from expected output dir to referenced schema
                let rel = path.relative(outFileDir, refSchemaPath);
                if (!rel.startsWith('.')) rel = './' + rel;
                rel = ensurePosix(rel);
                // add import
                const existing = imports.get(rel) ?? new Set<string>();
                existing.add(schemaId);
                imports.set(rel, existing);
                const use = opts.recursiveTypes && opts.recursiveTypes.has(ref.name) ? `z.lazy(() => ${schemaId})` : schemaId;
                return {code: use, warnings};
            }

            // If no source, reference as external symbol (no import) and warn
            warnings.push(`Unresolved reference to ${ref.name}; emitting z.unknown()`);
            return {code: 'z.unknown()', warnings};
        }

        case 'record': {
            const r = expr as any;
            const key = renderExpr(r.keyType, opts, imports);
            const val = renderExpr(r.valueType, opts, imports);
            // z.record takes a value schema; key must be string-like. If key is not string, warn
            if (r.keyType.kind !== 'primitive' || (r.keyType as any).name !== 'string') {
                warnings.push('Record key is not a string — using z.record(z.string(), value)');
                return {
                    code: `z.record(z.string(), ${val.code})`,
                    warnings: warnings.concat(key.warnings, val.warnings)
                };
            }
            return {code: `z.record(${val.code})`, warnings: warnings.concat(key.warnings, val.warnings)};
        }

        case 'fallback': {
            const reason = (expr as FallbackExpr).reason;
            warnings.push(`Fallback: ${reason}`);
            return {code: 'z.unknown()', warnings};
        }

        default: {
            // unknown
            warnings.push(`Unknown expression kind: ${(expr as any).kind}`);
            return {code: 'z.unknown()', warnings};
        }
    }
}

export function renderProperty(
    prop: {
        name: string;
        optional: boolean;
        readonly: boolean;
        type: TypeExpression
    }, opts: RenderOptions, imports: Map<string, Set<string>>): { code: string; warnings: string[] } {
    const {expr, nullable} = stripNullable(prop.type);
    const rendered = renderExpr(expr, opts, imports);
    let code = rendered.code;
    const warnings = [...rendered.warnings];
    if (nullable) {
        code = `${code}.nullable()`;
    }
    if (prop.optional) {
        code = `${code}.optional()`;
    }
    return {code, warnings};
}

/** Compute default out filename for a source file model. */
function defaultOutFileName(fileModel: FileModel) {
    const base = path.basename(fileModel.filePath, '.ts');
    return `${base}.schemas.ts`;
}

/** Render a FileModel to a single Zod schema file string. */
export function renderFileModelToZod(fileModel: FileModel, opts: RenderOptions = {}): RenderResult {
    const warnings: string[] = [];
    const imports = new Map<string, Set<string>>();
    const recursive = opts.recursiveTypes ?? new Set<string>();

    const outFileName = opts.outFileName ?? defaultOutFileName(fileModel);

    // Render each exported type
    const bodyParts: string[] = [];
    for (const ex of fileModel.exports) {
        if (ex.kind === 'interface') {
            const iface = ex;
            const propsRendered = iface.properties.map((p) => {
                const r = renderProperty(p, opts, imports);
                if (r.warnings.length) warnings.push(...r.warnings.map((w) => `${iface.name}.${p.name}: ${w}`));
                return `  ${p.name}: ${r.code}`;
            });
            const schemaName = `${iface.name}Schema`;
            const schemaBody = `export const ${schemaName} = z.object({\n${propsRendered.join(',\n')}\n}).strict();`;
            bodyParts.push(schemaBody);
            bodyParts.push(`export type ${iface.name} = z.infer<typeof ${schemaName}>;`);
        } else if (ex.kind === 'alias') {
            const alias = ex;
            const target = alias.target;
            if (target.kind === 'fallback') {
                warnings.push(`${alias.name}: fallback alias - ${(target as FallbackExpr).reason}`);
                bodyParts.push(`export const ${alias.name}Schema = z.unknown();`);
                bodyParts.push(`export type ${alias.name} = z.infer<typeof ${alias.name}Schema>;`);
            } else {
                const rendered = renderExpr(target as TypeExpression, opts, imports);
                if (rendered.warnings.length) warnings.push(...rendered.warnings.map((w) => `${alias.name}: ${w}`));
                const schemaName = `${alias.name}Schema`;
                const use = rendered.code;
                bodyParts.push(`export const ${schemaName} = ${use};`);
                bodyParts.push(`export type ${alias.name} = z.infer<typeof ${schemaName}>;`);
            }
        } else if (ex.kind === 'enum') {
            const en = ex;
            // represent enum as union of literals
            const lits = en.members.map((m) => (typeof m === 'string' ? quoteString(String(m)) : String(m))).join(', ');
            bodyParts.push(`export const ${en.name}Schema = z.union([${en.members.map((m) => (typeof m === 'string' ? `z.literal(${quoteString(String(m))})` : `z.literal(${String(m)})`)).join(', ')}]);`);
            bodyParts.push(`export type ${en.name} = z.infer<typeof ${en.name}Schema>;`);
        } else if (ex.kind === 'fallback') {
            const fb = ex;
            warnings.push(`${fb.name}: unsupported export kind - ${fb.reason}`);
            bodyParts.push(`export const ${fb.name}Schema = z.unknown();`);
            bodyParts.push(`export type ${fb.name} = unknown;`);
        }
    }

    // Build import block
    const importLines: string[] = [];
    importLines.push(`import { z } from "zod";`);
    // For each import path, import the listed schema ids
    for (const [relPath, names] of imports.entries()) {
        const list = Array.from(names).join(', ');
        importLines.push(`import { ${list} } from "${relPath}";`);
    }

    // Header
    const header = `// AUTO-GENERATED by typescript-scaffolder — do not edit.\n// Generated from: ${ensurePosix(fileModel.relativePath)}\n// TODO: review generated schemas for correctness.`;

    const content = `${header}\n\n${importLines.join('\n')}\n\n${bodyParts.join('\n\n')}\n`;

    return {filename: outFileName, content, warnings};
}
