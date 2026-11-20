import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { once } from 'events';
import type { AddressInfo } from 'net';
import type { Express } from 'express';
import ts from 'typescript';
import {
  generateInterfacesFromPath,
  generateWebhookApp,
  generateWebhookAppFromFile,
  generateWebhookAppFromPath,
} from '../../../src';

const projectRoot = path.resolve(__dirname, '../../..');
const paymentConfig = path.join(projectRoot, 'config/webhook-configs/payment.json');
const paymentSchemas = path.join(projectRoot, 'config/schemas/source-echo');

function writeFile(filePath: string, contents: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function typeScriptFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const filePath = path.join(dir, entry.name);
    return entry.isDirectory() ? typeScriptFiles(filePath) : entry.name.endsWith('.ts') ? [filePath] : [];
  });
}

function compileApp(workspace: string, sourceDirs: string[], appFile: string): string {
  const outDir = path.join(workspace, 'compiled');
  const program = ts.createProgram({
    rootNames: sourceDirs.flatMap(typeScriptFiles),
    options: {
      strict: true,
      skipLibCheck: false,
      noEmitOnError: true,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      types: ['node'],
      typeRoots: [path.join(projectRoot, 'node_modules/@types')],
      rootDir: workspace,
      outDir,
    },
  });
  const diagnostics = ts.getPreEmitDiagnostics(program).map(diagnostic =>
    `${diagnostic.file?.fileName ?? ''}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`
  );
  expect(diagnostics).toEqual([]);
  expect(program.emit().emitSkipped).toBe(false);
  return path.join(outDir, path.relative(workspace, appFile)).replace(/\.ts$/, '.js');
}

async function withServer(app: Express, check: (baseUrl: string) => Promise<void>) {
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const address = server.address() as AddressInfo;
    await check(`http://127.0.0.1:${address.port}`);
  } finally {
    if (server.listening) {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  }
}

describe('generated webhook app runtime', () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'webhook-runtime-'));
    // Generated code resolves the same installed dependencies as a consumer project.
    fs.symlinkSync(path.join(projectRoot, 'node_modules'), path.join(workspace, 'node_modules'), 'dir');
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it.each(['file', 'directory'])('compiles and dispatches the bundled payment routes through %s generation', async (mode) => {
    const interfacesRoot = path.join(workspace, 'interfaces');
    const interfacesDir = path.join(interfacesRoot, 'source-echo');
    const outputRoot = path.join(workspace, 'webhooks');
    const serviceOutput = mode === 'file' ? path.join(workspace, 'custom-output') : path.join(outputRoot, 'source-echo');
    const configDir = path.join(workspace, 'configs');
    writeFile(path.join(configDir, 'payment.json'), fs.readFileSync(paymentConfig, 'utf8'));

    await generateInterfacesFromPath(paymentSchemas, interfacesDir);
    const generate = () => mode === 'file'
      ? generateWebhookAppFromFile(paymentConfig, interfacesDir, serviceOutput)
      : generateWebhookAppFromPath(configDir, interfacesRoot, outputRoot);
    await generate();

    const handlerNames = ['StripePaymentSucceeded', 'StripePaymentFailed'];
    const editedHandlers = handlerNames.map(name => {
      const handlerPath = path.join(serviceOutput, 'routes', `handle_${name}.ts`);
      const contents = fs.readFileSync(handlerPath, 'utf8').replace(
        'console.log("Received webhook payload:", payload);',
        'receivedPayloads.push(payload);'
      ) + `\nexport const receivedPayloads: ${name}Payload[] = [];\n`;
      expect(contents).toContain('receivedPayloads.push(payload);');
      writeFile(handlerPath, contents);
      return { handlerPath, contents };
    });

    await generate();
    for (const { handlerPath, contents } of editedHandlers) {
      expect(fs.readFileSync(handlerPath, 'utf8')).toBe(contents);
    }

    const compiledApp = compileApp(workspace, [interfacesRoot, serviceOutput],
      path.join(serviceOutput, 'createSourceEchoWebhookApp.ts'));
    const compiledRoutes = path.join(path.dirname(compiledApp), 'routes');
    const succeeded = require(path.join(compiledRoutes, 'handle_StripePaymentSucceeded.js'));
    const failed = require(path.join(compiledRoutes, 'handle_StripePaymentFailed.js'));
    const app = require(compiledApp).createSourceEchoWebhookApp() as Express;

    await withServer(app, async baseUrl => {
      const cases = [
        { route: '/webhooks/stripe_payment_succeeded', schema: 'StripePaymentSucceededPayload', handler: succeeded, otherHandler: failed },
        { route: '/webhooks/stripe_payment_failed', schema: 'StripePaymentFailedPayload', handler: failed, otherHandler: succeeded },
      ];
      for (const testCase of cases) {
        const payload = JSON.parse(fs.readFileSync(path.join(paymentSchemas, `${testCase.schema}.json`), 'utf8'));
        const otherCalls = testCase.otherHandler.receivedPayloads.length;
        const response = await fetch(baseUrl + testCase.route, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Connection: 'close' },
          body: JSON.stringify(payload),
        });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ ok: true });
        expect(testCase.handler.receivedPayloads).toEqual([payload]);
        expect(testCase.otherHandler.receivedPayloads).toHaveLength(otherCalls);
      }

      const unconfigured = await fetch(baseUrl + '/handleStripePaymentSucceededWebhook', {
        method: 'POST', headers: { Connection: 'close' },
      });
      expect(unconfigured.status).toBe(404);
      await unconfigured.text();
      expect(succeeded.receivedPayloads).toHaveLength(1);
      expect(failed.receivedPayloads).toHaveLength(1);
    });
  }, 60000);

  it.each(['standalone', 'outgoing-only'])('compiles and starts a %s app with no incoming routes', async (mode) => {
    const interfacesDir = path.join(workspace, 'interfaces/notifications');
    const outputDir = path.join(workspace, 'custom-output');
    if (mode === 'standalone') {
      await generateWebhookApp('notifications', outputDir);
    } else {
      writeFile(path.join(interfacesDir, 'Notification.ts'), 'export interface Notification { id: string; }\n');
      const configPath = path.join(workspace, 'notifications.json');
      writeFile(configPath, JSON.stringify({ webhooks: [{
        direction: 'outgoing', name: 'notification', requestSchema: 'Notification', targetUrl: 'https://example.invalid/notify',
      }] }));
      await generateWebhookAppFromFile(configPath, interfacesDir, outputDir);
    }

    const compiledApp = compileApp(workspace, [interfacesDir, outputDir],
      path.join(outputDir, 'createNotificationsWebhookApp.ts'));
    const app = require(compiledApp).createNotificationsWebhookApp() as Express;
    await withServer(app, async baseUrl => {
      const response = await fetch(baseUrl + '/webhooks/notification', {
        method: 'POST', headers: { Connection: 'close' },
      });
      expect(response.status).toBe(404);
      await response.text();
    });
  }, 60000);
});
