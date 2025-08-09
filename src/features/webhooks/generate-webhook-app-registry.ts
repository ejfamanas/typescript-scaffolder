import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../../utils/logger';

export async function generateWebhookAppRegistry(serviceDir: string, registryFileName = 'webhookAppRegistry.ts') {
  const funcName = 'generateWebhookAppRegistry';
  Logger.debug(funcName, `Generating registry in ${serviceDir}`);

  const serviceName = path.basename(serviceDir);
  const routesDir = path.join(serviceDir, 'routes');
  const routerPath = path.join(routesDir, 'router.ts');
  const hasRouter = fs.existsSync(routerPath);
  const registryPath = path.join(serviceDir, registryFileName);

  if (!fs.existsSync(routesDir)) {
    Logger.warn(funcName, `Routes directory does not exist: ${routesDir}`);
    return;
  }

  const routeFiles = fs.readdirSync(routesDir).filter(
    file =>
      file.endsWith('.ts') &&
      file !== 'router.ts' &&
      file !== registryFileName
  );

  const importStatements: string[] = [];
  const handlerSpreads: string[] = [];

  // Import router if exists
  if (hasRouter) {
    importStatements.push(`import * as Router from './routes/router';`);
  }

  // Import handlers
  for (const file of routeFiles) {
    const name = path.basename(file, '.ts');
    const importAlias = name.replace(/[^a-zA-Z0-9]/g, '_');
    importStatements.push(`import * as ${importAlias} from './routes/${name}';`);
    handlerSpreads.push(`...${importAlias}`);
  }

  const registry = `
${importStatements.join('\n')}

export const webhookAppRegistry = {
  '${serviceName}': {
    ${hasRouter ? 'router: Router,' : ''}
    handlers: {
      ${handlerSpreads.join(',\n      ')}
    }
  }
};
`;

  fs.writeFileSync(registryPath, registry.trim() + '\n', 'utf8');
  Logger.info(funcName, `Registry created at ${registryPath}`);
}

export async function generateWebhookAppRegistriesFromPath(appsRootDir: string) {
  const funcName = 'generateWebhookAppRegistriesFromPath';
  Logger.debug(funcName, `Scanning for webhook apps in ${appsRootDir}...`);

  if (!fs.existsSync(appsRootDir)) {
    Logger.error(funcName, `Provided path does not exist: ${appsRootDir}`);
    return;
  }

  const subDirs = fs.readdirSync(appsRootDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(appsRootDir, dirent.name));

  for (const serviceDir of subDirs) {
    await generateWebhookAppRegistry(serviceDir);
  }

  Logger.info(funcName, 'All webhook app registries generated.');
}
