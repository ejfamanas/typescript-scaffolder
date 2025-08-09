import { readWebhookConfigFile, extractInterfaces, ensureDir } from '../../utils/file-system';
import * as path from 'path';
import { Project } from 'ts-morph';
import { Logger } from '../../utils/logger';
import { toPascalCase } from "../../utils/object-helpers";
import { generateWebhooksFromFile } from './generate-webhooks';
import { generateWebhookRoutesFromFile } from './generate-webhook-routes';
import { collectRequiredSchemas, findDirectoryContainingAllSchemas } from "../../utils/client-constructors";
import { generateWebhookAppRegistry } from "./generate-webhook-app-registry";
import { WebhookConfigFile } from "models/webhook-definitions";

export async function generateWebhookApp(serviceName: string, outputDir: string) {
	const funcName = 'generateWebhookApp';
	Logger.debug(funcName, `Generating webhook app for service "${serviceName}" in: ${outputDir}`);

	const pascalName = toPascalCase(serviceName);
	const fileName = `create${pascalName}WebhookApp.ts`;
	const functionName = `create${pascalName}WebhookApp`;

	const project = new Project();
	const filePath = path.join(outputDir, fileName);
	const sourceFile = project.createSourceFile(filePath, undefined, { overwrite: true });

	sourceFile.addImportDeclarations([
		{ moduleSpecifier: 'express', defaultImport: 'express' },
		{ moduleSpecifier: './webhookAppRegistry', namedImports: ['webhookAppRegistry'] }
	]);

	sourceFile.addFunction({
		name: functionName,
		isExported: true,
		statements: `
const app = express();
app.use(express.json());

const handlers = webhookAppRegistry['${serviceName}']?.handlers || {};

for (const key of Object.keys(handlers)) {
  app.post('/' + key, handlers[key]);
}

return app;
`
	});

	await project.save();
}


export async function generateWebhookAppFromFile(
	configPath: string,
	interfacesDir: string,
	outputDir: string
) {
	const funcName = 'generateWebhookAppFromFile';
	Logger.debug(funcName, 'Starting webhook app generation from single config file...');

	const config = readWebhookConfigFile(configPath);
	if (!config) {
		Logger.warn(funcName, `Skipping invalid config file at: ${configPath}`);
		return;
	}

	await generateWebhooksFromFile(configPath, interfacesDir, path.join(outputDir, 'routes'));
	await generateWebhookRoutesFromFile(configPath, interfacesDir, path.join(outputDir, 'routes'));

	const serviceName = path.basename(interfacesDir);
	await generateWebhookAppRegistry(outputDir);
	await generateWebhookApp(serviceName, outputDir);
}

export async function generateWebhookAppFromPath(
	configDir: string,
	interfacesRootDir: string,
	outputRootDir: string
) {
	const funcName = 'generateWebhookAppFromPath';
	Logger.debug(funcName, 'Starting webhook app generation from config directory...');

	const { configFiles, interfaceNameToDirs } = extractInterfaces(configDir, interfacesRootDir);

	for (const configPath of configFiles) {
		const config: WebhookConfigFile | null = readWebhookConfigFile(configPath);
		if (!config) {
			continue;
		}
		const requiredSchemas = collectRequiredSchemas(config.webhooks);
		const foundDir = findDirectoryContainingAllSchemas(requiredSchemas, interfaceNameToDirs, configPath, funcName);
		if (!foundDir) {
			Logger.warn(funcName,`Could not find a directory containing all schemas for config: ${configPath}`);
			continue;
		}

		// Compute relative path of foundDir to interfacesRootDir to preserve structure in outputRootDir
		const relativeInterfaceDir = path.relative(interfacesRootDir, foundDir);
		const outputDir = path.join(outputRootDir, relativeInterfaceDir);		await ensureDir(outputDir);

		await generateWebhookAppFromFile(configPath, foundDir, outputDir);
	}

	Logger.info(funcName, 'Webhook app generation completed.');
}
