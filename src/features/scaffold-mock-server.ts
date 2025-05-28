import express, {Response} from 'express';
import {generateMockData} from '../utils/mock-data-generator';
import {walkDirectory} from '../utils/file-system';
import fs from 'fs';
import path from 'path';

export async function scaffoldMockServer(schemaDir: string) {
    const app = express();

    walkDirectory(schemaDir, (filePath) => {
        const schema = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // Preserve the folder structure in the route
        const relativePath = path.relative(schemaDir, filePath);
        const route = '/' + relativePath
            .replace(/\.json$/, '')
            .replace(/\\/g, '/') // for Windows compatibility
            .split('/')
            .map(part => part.toLowerCase())
            .join('/');

        console.log(`✅ Route ${route} from ${filePath}`);

        app.get(route, (req, res: Response) => {
            const mock = generateMockData(5, schema);
            res.json(mock);
        });
    });

    app.listen(3000, () => {
        console.log(`🚀 Mock API running at http://localhost:3000`);
    });
}