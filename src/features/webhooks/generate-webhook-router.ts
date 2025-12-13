import * as path from 'path';
import { Project } from 'ts-morph';
import { ensureDir, extractInterfaces, readWebhookConfigFile } from '../../utils/file-system';
import { IncomingWebhook, WebhookConfigFile } from "models/webhook-definitions";
import { toPascalCase } from "../../utils/object-helpers";
import { assertDirectoryContainingAllSchemas, } from "../../utils/client-constructors";
import { Logger } from "../../utils/logger";
import { generateWebhookFixture } from './generate-webhook-fixture';
import {
    ensureDefaultImport,
    ensureNamedImport, hasText,
    renderTestHeadersArg,
    renderWebhookPostRoute, renderWebhookTestRoute
} from "./strings/webhook-router-strings";

/**
 * Generates an Express router file for a single incoming webhook.
 *
 * @param webhook - The webhook definition to generate a route for.
 * @param interfaceInputDir - Root path for interface .ts files.
 * @param outputDir - Base output directory (e.g., src/codegen/routes/webhooks).
 */
export async function generateWebhookRoute(
    webhook: IncomingWebhook,
    interfaceInputDir: string,
    outputDir: string,
): Promise<void> {
    const {handlerName, path: webhookPath, requestSchema} = webhook;
    const funcName = `generateWebhookRoute`;
    Logger.debug(funcName, 'Starting webhook route generation...');

    const pascalHandlerName = toPascalCase(handlerName);
    const routeFile = path.join(outputDir, 'router.ts');
    ensureDir(outputDir);

    const interfaceImportPath = path.relative(outputDir, path.join(interfaceInputDir, requestSchema)).replace(/\\/g, '/');
    // Handler files are now generated in the same routes/ directory, so use a relative local import.
    const handlerImportPath = `./handle_${handlerName}`;
    const serviceName = path.basename(interfaceInputDir);
    const fixtureExportName = `mock${toPascalCase(requestSchema)}`;

    const project = new Project();
    const existing = project.addSourceFileAtPathIfExists(routeFile);
    const sourceFile = existing ?? project.createSourceFile(routeFile, '', {overwrite: true});

    // --- Idempotent imports ---
    ensureDefaultImport(sourceFile, 'express', 'express');
    ensureNamedImport(sourceFile, interfaceImportPath.startsWith('.') ? interfaceImportPath : `./${interfaceImportPath}`, requestSchema, true);
    ensureNamedImport(sourceFile, handlerImportPath.startsWith('.') ? handlerImportPath : `./${handlerImportPath}`, `handle${pascalHandlerName}Webhook`);
    ensureNamedImport(sourceFile, `./${requestSchema}.fixture`, fixtureExportName);

    // --- Router bootstrap only once ---
    if (!hasText(sourceFile, 'const router = express.Router()')) {
        sourceFile.addStatements([
            'const router = express.Router();',
            'router.use(express.json());'
        ]);
    }

    // --- Main webhook route only once ---
    if (!hasText(sourceFile, `router.post('${webhookPath}'`)) {
        sourceFile.addStatements([
            renderWebhookPostRoute({
                webhookPath,
                requestSchema,
                handlerFunctionName: `handle${pascalHandlerName}Webhook`,
            }),
        ]);
    }

    const testHeadersArg = renderTestHeadersArg((webhook as any).testHeaders);

    // --- Test route only once ---
    const testPath = `/test/${serviceName}-${handlerName}-webhook`;
    if (!hasText(sourceFile, `router.post('${testPath}'`)) {
        sourceFile.addStatements([
            renderWebhookTestRoute({
                testPath,
                handlerFunctionName: `handle${pascalHandlerName}Webhook`,
                fixtureExportName,
                testHeadersArg,
            }),
        ]);
    }

    generateWebhookFixture(
        requestSchema,
        interfaceImportPath,
        outputDir,
        project,
        fixtureExportName
    );

    // --- Default export only once ---
    if (!hasText(sourceFile, 'export default router')) {
        sourceFile.addStatements(['export default router;']);
    }
    Logger.debug(funcName, 'Webhook route generation complete')
    await project.save();
}

/**
 * Reads a WebhookConfigFile and generates Express routes for each incoming webhook.
 *
 * @param configPath - Path to the webhook config file.
 * @param interfaceInputDir - Directory containing interface .ts files.
 * @param outputDir - Output directory for generated routes.
 */
export async function generateWebhookRoutesFromFile(
    configPath: string,
    interfaceInputDir: string,
    outputDir: string
): Promise<void> {
    const config = readWebhookConfigFile(configPath);
    if (!config) return;

    for (const webhook of config.webhooks) {
        if (webhook.direction !== 'incoming') continue;
        await generateWebhookRoute(webhook, interfaceInputDir, outputDir);
    }
}


/**
 * Generate Express webhook route files from all config files in a directory.
 * @param configDir - Path to the webhook config file.
 * @param interfacesRootDir - Directory containing interface .ts files.
 * @param outputRootDir - Output directory for generated routes.
 */
export async function generateWebhookRoutesFromPath(
    configDir: string,
    interfacesRootDir: string,
    outputRootDir: string
): Promise<void> {
    const funcName = 'generateWebhookRoutesFromPath';
    Logger.debug(funcName, 'Starting webhook route generation from config and interface directories...');

    const {configFiles, interfaceNameToDirs} = extractInterfaces(configDir, interfacesRootDir);

    for (const configPath of configFiles) {
        const config: WebhookConfigFile | null = readWebhookConfigFile(configPath);
        if (!config) {
            continue;
        }

        const requiredSchemas = new Set<string>();
        for (const webhook of config.webhooks) {
            if (webhook.direction === 'incoming') {
                requiredSchemas.add(webhook.requestSchema);
            }
        }

        const foundDir = assertDirectoryContainingAllSchemas(requiredSchemas, interfaceNameToDirs, configPath);
        if (!foundDir) {
            Logger.warn(funcName, `Could not find a directory containing all schemas for config: ${configPath}`);
            continue;
        }

        const relativeInterfaceDir = path.relative(interfacesRootDir, foundDir);
        const outputDir = path.join(outputRootDir, relativeInterfaceDir);
        ensureDir(outputDir);

        await generateWebhookRoutesFromFile(configPath, foundDir, outputDir);
    }

    Logger.info(funcName, 'Webhook route generation completed.');
}