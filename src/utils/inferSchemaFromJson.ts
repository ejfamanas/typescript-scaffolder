import { quicktype, InputData, jsonInputForTargetLanguage } from 'quicktype-core';
import fs from 'fs';

export async function inferSchema(json: string) {
    const jsonInput = jsonInputForTargetLanguage('typescript');

    await jsonInput.addSource({
        name: 'User',
        samples: [json] // ← IMPORTANT: use the raw string, not parsed JSON here
    });

    const inputData = new InputData();
    inputData.addInput(jsonInput);

    const result = await quicktype({
        inputData,
        lang: 'typescript',
        rendererOptions: {'just-types': 'true'}
    });

    return result.lines.join('\n');
}

export async function inferSchemaFromPath(filePath: string) {
    const json = fs.readFileSync(filePath, 'utf-8');
    return await inferSchema(json);
}