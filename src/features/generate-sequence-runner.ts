import { buildTreeFromSequence } from '../utils/sequence-tree-builder';
import fs from 'fs';
import path from 'path';
import { ActionStep, FetchListStep, LoopStep, Sequence } from "models/sequence-definitions";
import { TreeNode } from "../utils/sequence-tree-builder";
import { assertSequences } from "../utils/structure-validators";
import { Logger } from "../utils/logger";
import { ensureDir } from "../utils/file-system";

/**
 * Used to create a normalised method name that reflects the REST API action
 *
 * @param node
 */
export function deriveMethodName(node: TreeNode): string {
    const endpoint = (node.step as any).endpoint || '';
    const parts: string[] = endpoint.split('/')
        .filter((p: string) => p && !p.startsWith(':'));
    const objectName = parts[parts.length - 1] || 'unknown';
    let method = 'get'; // default
    if (node.type === 'fetchList') method = 'getAll';
    if (node.type === 'action') {
        const actionStep = node.step as ActionStep;
        method = actionStep.method.toLowerCase();
    }
    return `${method}_${objectName}`;
}

function interpolateTemplateObject(obj: any): string {
  if (typeof obj === 'string') {
    const match = obj.match(/^{{(.+?)}}$/);
    return match ? match[1] : JSON.stringify(obj);
  } else if (Array.isArray(obj)) {
    return `[${obj.map(interpolateTemplateObject).join(', ')}]`;
  } else if (typeof obj === 'object' && obj !== null) {
    const entries = Object.entries(obj).map(([key, value]) => {
      return `${key}: ${interpolateTemplateObject(value)}`;
    });
    return `{ ${entries.join(', ')} }`;
  } else {
    return JSON.stringify(obj);
  }
}

export function generateSequenceRunner(sequence: Sequence, tree: TreeNode[], outputPath: string, serviceName: string): void {
  const lines: string[] = [];

  lines.push(`// Auto-generated runner for sequence: ${sequence.name}`);
  lines.push(`// Service: ${serviceName}`);
  lines.push(`import { apiRegistry } from "../registry";`);
  lines.push(``);
  lines.push(`export async function run${sequence.name}() {`);

  function walk(node: TreeNode, depth = 1) {
    const indent = '  '.repeat(depth);
    switch (node.type) {
      case 'fetchList': {
        const fetchStep = node.step as FetchListStep;
        const varName = fetchStep.extract?.as || 'result';
        const service = (node.step as any).service || serviceName;
        lines.push(`${indent}const response = await apiRegistry["${service}"].${deriveMethodName(node)}();`);
        lines.push(`${indent}const ${varName} = response${fetchStep.extract?.field ? `.${fetchStep.extract.field}` : ''};`);
        break;
      }
      case 'action': {
        const actionStep = node.step as ActionStep;
        const service = (node.step as any).service || serviceName;
        const methodName = deriveMethodName(node);

        const paramMatches = (actionStep.endpoint.match(/:(\w+(?:\.\w+)?)/g) || []);
        const paramArgs = paramMatches.map(p => p.slice(1));

        const methodWithBody = ['put', 'post', 'patch'].includes(actionStep.method?.toLowerCase());
        const argsList = [...paramArgs];
        if (methodWithBody && actionStep.body) {
          argsList.push(interpolateTemplateObject(actionStep.body));
        }

        if (actionStep.extract) {
          lines.push(`${indent}const response = await apiRegistry["${service}"].${methodName}(${argsList.join(', ')});`);
          lines.push(`${indent}const ${actionStep.extract.as} = response.${actionStep.extract.field};`);
        } else {
          lines.push(`${indent}await apiRegistry["${service}"].${methodName}(${argsList.join(', ')});`);
        }

        break;
      }
      case 'loop': {
        const loopStep = node.step as LoopStep
        const list = loopStep.over;
        const item = loopStep.itemName;
        lines.push(`${indent}for (const ${item} of ${list}) {`);
        node.children.forEach(child => walk(child, depth + 1));
        lines.push(`${indent}}`);
        break;
      }
    }
  }

  tree.forEach(node => walk(node));
  lines.push(`}`);

  const outputFile = path.resolve(outputPath, `${sequence.name}.runner.ts`);
  fs.writeFileSync(outputFile, lines.join('\n'), 'utf-8');
}

export function generateSequenceFromFile(filePath: string, outputDir: string): void {
  const funcName = 'generateSequenceFromFile'
  Logger.info(funcName, `Generating sequence from ${filePath} ...`)

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(fileContent);
  assertSequences(parsed);

  for (const sequence of parsed.sequences) {
    const tree = buildTreeFromSequence(sequence);
    generateSequenceRunner(sequence, tree, outputDir, parsed.serviceName);
  }
}

export function generateSequencesFromPath(configDir: string, outputDir: string, subDir: string = 'sequences'): void {
  const funcName = 'generateSequencesFromPath';
  Logger.info(funcName, `Generating sequences from ${configDir} to ${outputDir}`);

  const files = fs.readdirSync(configDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(configDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    const serviceName = parsed.serviceName;

    if (!serviceName) {
      Logger.warn(funcName, `Skipping file ${file} — missing 'serviceName' field`);
      continue;
    }

    const serviceOutputDir = path.join(outputDir, subDir);

    ensureDir(serviceOutputDir);

    generateSequenceFromFile(filePath, serviceOutputDir);
  }

  Logger.info(funcName, 'Sequence file generation completed.');
}
