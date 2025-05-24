// src/utils/inferSchemaFromJson.ts
import { quicktype, InputData, jsonInputForTargetLanguage } from 'quicktype-core';
import fs from 'fs';

export async function inferSchemaFromExample(examplePath: string, typeName: string = 'Root') {
    const json = fs.readFileSync(examplePath, 'utf-8');

    const jsonInput = jsonInputForTargetLanguage('typescript');
    await jsonInput.addSource({ name: typeName, samples: [json] });

    const inputData = new InputData();
    inputData.addInput(jsonInput);

    const result = await quicktype({
        inputData,
        lang: 'typescript',
        rendererOptions: { 'just-types': 'true' }
    });

    return result.lines.join('\n');
}