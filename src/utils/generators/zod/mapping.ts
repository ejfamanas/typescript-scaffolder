/**
 * src/generators/zod/mapping.ts
 *
 * Map TypeScript source files to a small, serializable intermediate model that
 * the Zod templates can consume. This mapping is intentionally conservative:
 * - supports primitives, arrays, nested objects, unions of literals/primitives,
 *   optionals, nullable, references and index signatures (mapped to record).
 * - falls back to `fallback` nodes for conditional/mapped/complex types.
 * - never throws on unknown constructs; it returns a model with `fallback` nodes
 *   containing a human-friendly `reason` so templates can emit TODOs.
 */

import path from "path";
import fs from "fs";
import { Project, SyntaxKind, Type } from "ts-morph";

/** --- Model types --- */
export type TypeExpression =
    | PrimitiveExpr
    | LiteralExpr
    | ArrayExpr
    | UnionExpr
    | ObjectExpr
    | ReferenceExpr
    | RecordExpr
    | FallbackExpr;

export interface PrimitiveExpr {
    kind: "primitive";
    name: "string" | "number" | "boolean" | "any" | "unknown" | "null" | "undefined";
}

export interface LiteralExpr {
    kind: "literal";
    value: string | number | boolean | null;
}

export interface ArrayExpr {
    kind: "array";
    element: TypeExpression;
}

export interface UnionExpr {
    kind: "union";
    members: TypeExpression[];
}

export interface ObjectExpr {
    kind: "object";
    properties: Property[];
}

export interface ReferenceExpr {
    kind: "reference";
    name: string; // referred type name
    typeArgs?: TypeExpression[];
    // where it was declared (if resolvable)
    source?: string | null; // relative path or null for external
}

export interface RecordExpr {
    kind: "record";
    keyType: TypeExpression;
    valueType: TypeExpression;
}

export interface FallbackExpr {
    kind: "fallback";
    reason: string;
}

export interface Property {
    name: string;
    optional: boolean;
    readonly: boolean;
    type: TypeExpression;
}

export interface IndexSignature {
    keyName: string; // usually string
    valueType: TypeExpression;
}

export interface InterfaceType {
    kind: "interface";
    name: string;
    properties: Property[];
    indexSignature?: IndexSignature | null;
    exported: boolean;
    genericParams?: string[];
}

export interface AliasType {
    kind: "alias";
    name: string;
    target: TypeExpression | FallbackExpr;
    exported: boolean;
    genericParams?: string[];
}

export interface EnumType {
    kind: "enum";
    name: string;
    members: Array<string | number>;
    exported: boolean;
}

export interface FallbackType {
    kind: "fallback";
    name: string;
    reason: string;
    exported: boolean;
}

export type ExportedType = InterfaceType | AliasType | EnumType | FallbackType;

export interface FileModel {
    filePath: string; // absolute
    relativePath: string; // relative to interfaces root
    exports: ExportedType[];
}

/** --- Mapping implementation --- */

export function makeProject(projectRoot?: string) {
    // Use existing tsconfig if present to get better type resolution
    const tsconfig = projectRoot ? path.join(projectRoot, "tsconfig.json") : null;
    if (tsconfig && fs.existsSync(tsconfig)) {
        return new Project({tsConfigFilePath: tsconfig});
    }
    return new Project({});
}

export function makePrimitiveFromText(text: string): PrimitiveExpr | null {
    const t = text.trim();
    if (t === "string") return {kind: "primitive", name: "string"};
    if (t === "number") return {kind: "primitive", name: "number"};
    if (t === "boolean") return {kind: "primitive", name: "boolean"};
    if (t === "any") return {kind: "primitive", name: "any"};
    if (t === "unknown") return {kind: "primitive", name: "unknown"};
    if (t === "null") return {kind: "primitive", name: "null"};
    if (t === "undefined") return {kind: "primitive", name: "undefined"};
    return null;
}

export function mapTsTypeToExpr(tsType: Type, sourceFilePath: string, projectRoot?: string): TypeExpression {
    // Defensive: if no type info, fallback
    try {
        if (!tsType) return {kind: "fallback", reason: "no type information"};

        // Primitives
        if (tsType.isString()) return {kind: "primitive", name: "string"};
        if (tsType.isNumber()) return {kind: "primitive", name: "number"};
        if (tsType.isBoolean()) return {kind: "primitive", name: "boolean"};
        if (tsType.isUndefined()) return {kind: "primitive", name: "undefined"};
        if (tsType.isNull()) return {kind: "primitive", name: "null"};

        // String/number/boolean literals
        if (tsType.isStringLiteral()) {
            const text = tsType.getLiteralValue() as string;
            return {kind: "literal", value: text};
        }
        if (tsType.isNumberLiteral()) {
            const num = tsType.getLiteralValue() as number;
            return {kind: "literal", value: num};
        }
        if (tsType.isBooleanLiteral()) {
            // ts-morph doesn't have direct getLiteralValue for boolean literal, fall back to text
            const txt = tsType.getText();
            return {kind: "literal", value: txt === "true"};
        }

        // Array
        const arrayElem = tsType.getArrayElementType();
        if (arrayElem) {
            return {kind: "array", element: mapTsTypeToExpr(arrayElem, sourceFilePath, projectRoot)};
        }

        // Union
        if (tsType.isUnion()) {
            const members = tsType.getUnionTypes().map((m) => mapTsTypeToExpr(m, sourceFilePath, projectRoot));
            return {kind: "union", members};
        }

        // Record / index signature: detect typical Record<K,V> symbol name
        const symbol = tsType.getSymbol();
        if (symbol?.getName() === "Record" && tsType.getTypeArguments().length === 2) {
            const [k, v] = tsType.getTypeArguments();
            return {
                kind: "record",
                keyType: mapTsTypeToExpr(k, sourceFilePath, projectRoot),
                valueType: mapTsTypeToExpr(v, sourceFilePath, projectRoot)
            };
        }

        // Object types (including anonymous inline objects)
        if (tsType.isObject()) {
            // If it's an object type with call signatures or construct signatures, fallback
            if (tsType.getCallSignatures().length > 0 || tsType.getConstructSignatures().length > 0) {
                return {kind: "fallback", reason: "function/constructor type"};
            }

            // Try to pull properties
            const props = tsType.getProperties();
            if (props.length > 0) {
                const properties: Property[] = props.map((p) => {
                    const name = p.getName();
                    // get the declarations for this symbol and derive optional/readonly
                    const decl = p.getDeclarations()[0];
                    let optional = false;
                    let readonly = false;
                    try {
                        // Declaration kind may vary: PropertySignature, Parameter
                        if (decl && (decl as any).hasQuestionToken && (decl as any).hasQuestionToken()) optional = true;
                    } catch {
                        // best-effort: fallback to false
                    }
                    try {
                        if (decl && (decl as any).hasModifier && (decl as any).hasModifier(SyntaxKind.ReadonlyKeyword)) readonly = true;
                    } catch {
                        // ignore
                    }

                    const propType = p.getTypeAtLocation(decl || p.getValueDeclaration());
                    const typeExpr = propType ? mapTsTypeToExpr(propType, sourceFilePath, projectRoot) : ({ kind: "fallback", reason: "could not resolve property type" } as FallbackExpr);

                    return {name, optional, readonly, type: typeExpr};
                });

                return {kind: "object", properties};
            }

            // If object with no properties, but has a symbolic name (e.g., reference to interface)
            const typeText = tsType.getText();
            const prim = makePrimitiveFromText(typeText);
            if (prim) return prim;

            // Try to find a named symbol - treat as reference
            const s = tsType.getSymbol() ?? tsType.getAliasSymbol();
            if (s) {
                const name = s.getName();
                // Attempt to resolve source file of symbol
                const decl = s.getDeclarations()?.[0];
                let src: string | null = null;
                try {
                    if (decl) {
                        const srcFile = decl.getSourceFile().getFilePath();
                        src = projectRoot ? path.relative(projectRoot, srcFile) : srcFile;
                    }
                } catch {
                    src = null;
                }
                return {kind: "reference", name, source: src} as ReferenceExpr;
            }

            return {kind: "fallback", reason: "unhandled object type"};
        }

        // As a last resort inspect textual representation for simple primitives
        const txt = tsType.getText();
        const p = makePrimitiveFromText(txt);
        if (p) return p;

        return {kind: "fallback", reason: `unmapped type: ${txt}`};
    } catch (e) {
        return {kind: "fallback", reason: `error mapping type: ${(e as Error).message}`};
    }
}

/** Map an individual source file to FileModel */
export async function mapFileToModel(filePath: string, opts?: { projectRoot?: string }): Promise<FileModel> {
    const project = makeProject(opts?.projectRoot);
    const abs = path.resolve(filePath);
    const sourceFile = project.addSourceFileAtPathIfExists(abs);
    if (!sourceFile) throw new Error(`File not found: ${filePath}`);

    const fileModel: FileModel = {
        filePath: abs,
        relativePath: opts?.projectRoot ? path.relative(opts.projectRoot, abs) : path.relative(process.cwd(), abs),
        exports: [],
    };

    // Interfaces
    const interfaces = sourceFile.getInterfaces();
    for (const iface of interfaces) {
        const name = iface.getName();
        const exported = iface.isExported();
        const properties: Property[] = iface.getProperties().map((p) => {
            const name = p.getName();
            const optional = p.hasQuestionToken();
            const readonly = p.hasModifier(SyntaxKind.ReadonlyKeyword);
            const typeNode = p.getType();
            const typeExpr = mapTsTypeToExpr(typeNode, abs, opts?.projectRoot);
            return {name, optional, readonly, type: typeExpr};
        });

        // index signature
        const indexSign = iface.getIndexSignatures()[0];
        let indexSignature: IndexSignature | null = null;
        if (indexSign) {
            const keyName = indexSign.getKeyName() ?? "[k:string]";
            const valType = mapTsTypeToExpr(indexSign.getReturnType(), abs, opts?.projectRoot);
            indexSignature = {keyName, valueType: valType};
        }

        fileModel.exports.push({
            kind: "interface",
            name,
            properties,
            indexSignature,
            exported,
            genericParams: iface.getTypeParameters().map((t) => t.getText())
        });
    }

    // Type aliases
    const typeAliases = sourceFile.getTypeAliases();
    for (const ta of typeAliases) {
        const name = ta.getName();
        const exported = ta.isExported();
        const typeNode = ta.getType();
        // Map using typeNode
        const mapped = mapTsTypeToExpr(typeNode, abs, opts?.projectRoot);
        if (mapped.kind === "fallback") {
            fileModel.exports.push({
                kind: "alias",
                name,
                target: mapped,
                exported,
                genericParams: ta.getTypeParameters().map((t) => t.getText())
            });
        } else {
            fileModel.exports.push({
                kind: "alias",
                name,
                target: mapped,
                exported,
                genericParams: ta.getTypeParameters().map((t) => t.getText())
            });
        }
    }

    // Enums
    const enums = sourceFile.getEnums();
    for (const e of enums) {
        const name = e.getName();
        const exported = e.isExported();
        const members = e.getMembers().map((m) => {
            const init = m.getInitializer();
            if (!init) return m.getName();
            // try to get literal value
            try {
                const txt = init.getText();
                // strip quotes from string
                if (txt.startsWith("\"") || txt.startsWith("'")) return txt.slice(1, -1);
                const n = Number(txt);
                if (!Number.isNaN(n)) return n;
                return txt;
            } catch {
                return m.getName();
            }
        });
        fileModel.exports.push({kind: "enum", name, members, exported});
    }

    // Exports that are neither interface nor alias nor enum -> attempt to capture
    const exportedDecls = sourceFile.getExportedDeclarations();
    exportedDecls.forEach((decls, key) => {
        // if already recorded skip
        if (fileModel.exports.find((e) => e.name === key)) return;
        // else create fallback entry
        fileModel.exports.push({kind: "fallback", name: key, reason: "unsupported export kind", exported: true});
    });

    return fileModel;
}

/** Map all .ts files under a directory (non-recursive) to models. */
export async function mapDirToModels(dirPath: string, opts?: { projectRoot?: string; recursive?: boolean; excludePatterns?: string[] }): Promise<FileModel[]> {
    const project = makeProject(opts?.projectRoot);
    const glob = opts?.recursive ? "**/*.ts" : "*.ts";
    const pattern = path.join(dirPath, glob);
    const sourceFiles = project.addSourceFilesAtPaths(pattern);
    const models: FileModel[] = [];
    for (const sf of sourceFiles) {
        const abs = sf.getFilePath();
        const fm = await mapFileToModel(abs, {projectRoot: opts?.projectRoot});
        models.push(fm);
    }
    return models;
}

/** Detect recursive types among the models. Returns a set of type names that are recursive. */
export function detectRecursiveTypes(models: FileModel[]): Set<string> {
    // Build dependency graph: typeName -> referenced type names
    const graph = new Map<string, Set<string>>();

    function collectExprDeps(expr: TypeExpression, deps: Set<string>) {
        switch (expr.kind) {
            case "primitive":
            case "literal":
            case "fallback":
                return;
            case "array":
                return collectExprDeps(expr.element, deps);
            case "union":
                return expr.members.forEach((m) => collectExprDeps(m, deps));
            case "object":
                return expr.properties.forEach((p) => collectExprDeps(p.type, deps));
            case "record":
                collectExprDeps(expr.keyType, deps);
                return collectExprDeps(expr.valueType, deps);
            case "reference":
                deps.add(expr.name);
                return;
        }
    }

    for (const fm of models) {
        for (const ex of fm.exports) {
            const name = ex.name;
            const deps = new Set<string>();
            if (ex.kind === "interface") {
                ex.properties.forEach((p) => collectExprDeps(p.type, deps));
                if (ex.indexSignature) collectExprDeps(ex.indexSignature.valueType, deps);
            } else if (ex.kind === "alias") {
                if (ex.target) collectExprDeps(ex.target as TypeExpression, deps);
            }
            graph.set(name, deps);
        }
    }

    // detect cycles with DFS
    const recursive = new Set<string>();
    const tempMark = new Set<string>();
    const permMark = new Set<string>();

    function visit(n: string, pathStack: string[]) {
        if (permMark.has(n)) return;
        if (tempMark.has(n)) {
            // found a cycle — mark all nodes in the cycle
            const cycleStart = pathStack.indexOf(n);
            const cycleNodes = pathStack.slice(cycleStart);
            for (const c of cycleNodes) recursive.add(c);
            return;
        }
        tempMark.add(n);
        pathStack.push(n);
        const deps = graph.get(n) ?? new Set<string>();
        for (const d of deps) visit(d, pathStack);
        pathStack.pop();
        tempMark.delete(n);
        permMark.add(n);
    }

    for (const k of graph.keys()) {
        visit(k, []);
    }

    return recursive;
}