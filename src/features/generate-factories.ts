import fs from "fs-extra";
import path from "path";
import { Logger } from "../utils/logger";
import { ensureDir, walkDirectory } from "../utils/file-system";
import { extractInterfacesFromFile } from "../utils/interface-parser";
import { getMockValueForProperty } from "../utils/mocking/mock-value-resolver";

/**
 * Generate a factory class file from a single interface file.
 * @param filePath - absolute path to the input interface file
 * @param relativePath - relative path (used to mirror directory structure)
 * @param outputBaseDir - root output directory for generated factories
 * @param useFakerDefaults - whether to use faker-based mocks
 */
export async function generateFactoriesFromFile(
    filePath: string,
    relativePath: string,
    outputBaseDir: string,
    useFakerDefaults = false
): Promise<void> {
    try {
        const interfaceName = path.basename(filePath, path.extname(filePath));
        const outputDir = path.join(outputBaseDir, path.dirname(relativePath));
        const outputFile = path.join(outputDir, `${interfaceName}Factory.ts`);

        await fs.ensureDir(outputDir);

        const interfaces = extractInterfacesFromFile(filePath);
        Logger.debug(`Parsed ${interfaces.length} interfaces from ${filePath}`);

        const importPath = path
            .relative(outputDir, path.dirname(filePath))
            .replace(/\\/g, "/")
            .replace(/\.ts$/, "");
        const importName = interfaces.map((iface) => iface.name).join(", ");
        const importStatement = `import { ${importName} } from "${importPath}/${interfaceName}";\n\n`;

        const localInterfaces = new Set(interfaces.map((i) => i.name));

        const factoryBlocks = interfaces.map((iface) => {
            const defaults = iface.properties
                .map(({
                          name,
                          type
                      }) => `      ${name}: ${getMockValueForProperty(name, type, localInterfaces, useFakerDefaults)},`)
                .join("\n");

            return `// Auto-generated factory for ${iface.name}
export class ${iface.name}Factory {
  static create(overrides: Partial<${iface.name}> = {}): ${iface.name} {
    return {
${defaults}
      ...overrides
    };
  }

  static mockList(count = 3, overrides: Partial<${iface.name}> = {}): ${iface.name}[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
`;
        }).join("\n\n");

        const content = importStatement + factoryBlocks;

        await fs.writeFile(outputFile, content, "utf-8");
        Logger.debug(`Generated factory: ${outputFile}`);
    } catch (error) {
        Logger.error("Error generating factory from file:", error);
        throw error;
    }
}

/**
 * Generate factory class files for all interfaces in a directory.
 * Mirrors directory structure using walkDirectory.
 */
export async function generateFactoriesFromPath(
    inputDir: string,
    outputDir: string,
    ext: string = ".ts",
    useFakerDefaults = false
): Promise<void> {
    const funcName = 'generateFactoriesFromPath';
    Logger.debug(funcName, `Walking directory for factories: ${inputDir}`);
    ensureDir(outputDir);

    const tasks: Promise<void>[] = [];

    walkDirectory(
        inputDir,
        (filePath: string, relativePath: string) => {
            const task = generateFactoriesFromFile(filePath, relativePath, outputDir, useFakerDefaults);
            tasks.push(task);
        },
        ext
    );

    await Promise.all(tasks);
    Logger.debug(funcName, `Factory generation complete. Output root: ${outputDir}`);
}
