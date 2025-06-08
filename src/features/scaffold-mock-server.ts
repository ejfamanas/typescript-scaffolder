import express, {Response} from 'express';
import {generateMockData} from '../utils/mock-data-generator';
import {walkDirectory} from '../utils/file-system';
import path from 'path';
import {inferJsonSchemaFromPath} from "../utils/schema-inferer";


/**
 * Extracts the interfaces returned from something like quickType to convert into a Record
 * @param schemaStr
 */
function extractInterfaces(schemaStr: string | null): { name: string; body: Record<string, string> }[] {
    if (schemaStr === null) {
        return [];
    }
    const interfaceRegex = /export\s+interface\s+(\w+)\s*{([^}]*)}/g;
    const interfaces: { name: string; body: Record<string, string> }[] = [];

    let match;
    while ((match = interfaceRegex.exec(schemaStr)) !== null) {
        const [, name, bodyContent] = match;

        const body: Record<string, string> = {};
        bodyContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => !!line && line.includes(':'))
            .forEach(line => {
                const [key, type] = line.replace(/;$/, '').split(':').map(part => part.trim());
                if (key && type) {
                    body[key] = type;
                }
            });

        interfaces.push({name, body});
    }
    return interfaces;
}

/**
 * Takes in a schema directory and scaffolds out get endpoints
 * @param schemaDir
 * @param ext
 */
export async function scaffoldMockServer(schemaDir: string, ext: string = '.json') {
    const app = express();
    // TODO: Use .env file
    const root = "http://localhost:3000"
    walkDirectory(
        schemaDir,
        async (filePath) => {
            const schemaContent = await inferJsonSchemaFromPath(filePath);
            const interfaces = extractInterfaces(schemaContent);
            interfaces.forEach(({name, body}) => {
                const relativePath = path.relative(schemaDir, filePath);
                const parentDir = path.dirname(relativePath).split(path.sep).pop()?.toLowerCase() || 'root';
                const route = `/${parentDir}/${name.toLowerCase()}`;
                console.log(`Route created at: ${root}${route}`);
                app.get(route, (req, res: Response) => {
                    const mock = generateMockData(5, JSON.stringify(body));
                    res.json(mock);
                });
            });
        },
        ext
    );
    app.listen(3000, () => {
        console.log(`🚀 Mock API running at ${root}`);
    });
    return app;
}
