import * as path from 'path';
import { Project } from 'ts-morph';
import { ensureDir, extractInterfaces, readWebhookConfigFile } from '../../utils/file-system';
import { IncomingWebhook, WebhookConfigFile } from "models/webhook-definitions";
import { toPascalCase } from "../../utils/object-helpers";
import { findDirectoryContainingAllSchemas } from "../../utils/client-constructors";
import { Logger } from "../../utils/logger";
import { generateWebhookFixture } from './generate-webhook-fixture';

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
    fixtureName?: string
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

    const project = new Project();
    const sourceFile = project.createSourceFile(routeFile, '', {overwrite: true});

    sourceFile.addImportDeclaration({
        defaultImport: 'express',
        moduleSpecifier: 'express',
    });
    sourceFile.addImportDeclaration({
        isTypeOnly: true,
        namedImports: [requestSchema],
        moduleSpecifier: interfaceImportPath.startsWith('.') ? interfaceImportPath : `./${interfaceImportPath}`,
    });
    sourceFile.addImportDeclaration({
        namedImports: [`handle${pascalHandlerName}Webhook`],
        moduleSpecifier: handlerImportPath.startsWith('.') ? handlerImportPath : `./${handlerImportPath}`,
    });
    sourceFile.addImportDeclaration({
        namedImports: ['simulatedWebhookPayload'],
        moduleSpecifier: `./${requestSchema}.fixture`,
    });

    sourceFile.addStatements([
        'const router = express.Router();',
        'router.use(express.json());'
    ]);

    sourceFile.addStatements([
        `router.post('${webhookPath}', async (req, res) => {
	try {
		const payload = req.body as ${requestSchema};
		await handle${pascalHandlerName}Webhook(payload);
		res.status(200).json({ ok: true });
	} catch (error) {
		console.error('Webhook error:', error);
		res.status(500).json({ ok: false });
	}
});`
    ]);

    sourceFile.addStatements([
        `router.post('/test/${serviceName}-webhook', async (_req, res) => {\n\ttry {\n\t\tawait handle${pascalHandlerName}Webhook(simulatedWebhookPayload);\n\t\tres.status(200).json({ ok: true, message: 'Simulated webhook sent.' });\n\t} catch (error) {\n\t\tconsole.error('Webhook test error:', error);\n\t\tres.status(500).json({ ok: false });\n\t}\n});`
    ]);

    generateWebhookFixture(
        requestSchema,
        interfaceImportPath,
        outputDir,
        project,
        fixtureName
    );

	sourceFile.addStatements(['export default router;']);
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

	const { configFiles, interfaceNameToDirs } = extractInterfaces(configDir, interfacesRootDir);

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

		const foundDir = findDirectoryContainingAllSchemas(requiredSchemas, interfaceNameToDirs, configPath, funcName);
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