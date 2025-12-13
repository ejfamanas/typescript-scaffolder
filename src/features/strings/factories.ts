import { joinLines, line } from "../../utils/strings/format";

export function renderImportStatement(args: {
    importNames: string;
    importPath: string;
    interfaceFileName: string;
}): string {
    const {importNames, importPath, interfaceFileName} = args;
    return joinLines([
        `import { ${importNames} } from "${importPath}/${interfaceFileName}";`,
        "",
    ]);
}

export function renderFactoryBlock(args: {
    interfaceName: string;
    defaultsLines: string[];
}): string {
    const {interfaceName, defaultsLines} = args;

    const lines = [
        `// Auto-generated factory for ${interfaceName}`,
        `export class ${interfaceName}Factory {`,
        line(1, "/**"),
        line(1, ` * Builds a new ${interfaceName} object with default values and optional overrides.`),
        line(1, " * This method only constructs the object — it does not persist or extend behavior."),
        line(1, " */"),
        line(1, `static build(overrides: Partial<${interfaceName}> = {}): ${interfaceName} {`),
        line(2, "return {"),
        ...defaultsLines,
        line(3, "...overrides"),
        line(2, "};"),
        line(1, "}"),
        "",
        line(1, "/**"),
        line(1, ` * Creates a new ${interfaceName} instance by delegating to build().`),
        line(1, " * Can be extended in subclasses to introduce side effects or persistence."),
        line(1, " */"),
        line(1, `static create(overrides: Partial<${interfaceName}> = {}): ${interfaceName} {`),
        line(2, "return this.build(overrides);"),
        line(1, "}"),
        "",
        line(1, "/**"),
        line(1, ` * Generates an array of mock ${interfaceName} instances.`),
        line(1, " * @param count - number of items to generate"),
        line(1, " * @param overrides - optional overrides applied to each item"),
        line(1, " */"),
        line(1, `static mockList(count = 3, overrides: Partial<${interfaceName}> = {}): ${interfaceName}[] {`),
        line(2, "return Array.from({ length: count }, () => this.create(overrides));"),
        line(1, "}"),
        "}",
        "",
    ];

    return joinLines(lines);
}
