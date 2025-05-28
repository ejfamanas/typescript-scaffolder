import express, {Response} from 'express';
import {generateMockData} from '../utils/mock-data-generator';
import {walkDirectory} from '../utils/file-system';
import fs from 'fs';
import path from 'path';
import {inferJsonSchemaFromPath} from "../utils/schema-inferer";

/**
 * Takes in a schema directory and scaffolds out get endpoints
 * @param schemaDir
 */
export async function scaffoldMockServer(schemaDir: string) {
    const app = express();
    // TODO: Use .env file
    const root = "http://localhost:3000"
    const routes = [];
    walkDirectory(schemaDir, async (filePath) => {
        const schemaContent = await inferJsonSchemaFromPath(filePath);
        console.log(schemaContent)
        const interfaces = extractInterfaces(schemaContent);
        console.log('Extracted interfaces:', interfaces);
        interfaces.forEach(({name, body}) => {
            const relativePath = path.relative(schemaDir, filePath);
            const parentDir = path.dirname(relativePath).split(path.sep).pop()?.toLowerCase() || 'root';
            const route = `/${parentDir}/${name.toLowerCase()}`;

            routes.push(`${root}/${routes}`)
            app.get(route, (req, res: Response) => {
                console.log("PING")
                const mock = generateMockData(5, JSON.stringify(body));
                res.json(mock);
            });
        });
    });

    app.listen(3000, () => {
        console.log(`🚀 Mock API running at http://localhost:3000`);
        routes.forEach(r => console.log(`Scaffolding: ${r}`));
    });
}

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