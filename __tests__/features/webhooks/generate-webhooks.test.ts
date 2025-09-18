import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  generateIncomingWebhook,
  generateOutgoingWebhook,
  generateWebhooksFromFile,
  generateWebhooksFromPath,
} from '../../../src';

function mkdirp(p: string) { fs.mkdirSync(p, { recursive: true }); }
function writeFile(p: string, c: string) { mkdirp(path.dirname(p)); fs.writeFileSync(p, c); }
function readIfExists(p: string): string | null { return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }

function findFileRecursive(root: string, predicate: (name: string) => boolean): string | null {
  if (!fs.existsSync(root)) return null;
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(root, e.name);
    if (e.isDirectory()) {
      const found = findFileRecursive(full, predicate);
      if (found) return found;
    } else if (predicate(e.name)) {
      return full;
    }
  }
  return null;
}

describe('generate-webhooks.ts', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webhooks-gen-'));
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('generateIncomingWebhook: creates handler and includes optional headers when testHeaders exist', async () => {
    const interfacesDir = path.join(tmpDir, 'interfaces', 'source-omega');
    const outputDir = path.join(tmpDir, 'out', 'source-omega');
    mkdirp(interfacesDir); mkdirp(outputDir);

    // Minimal interface so type resolution works
    writeFile(path.join(interfacesDir, 'StripePaymentSucceededPayload.ts'), 'export interface StripePaymentSucceededPayload { id: string; }\n');

    const webhook = {
      direction: 'incoming',
      name: 'stripe_payment_succeeded',
      path: '/webhooks/stripe_payment_succeeded',
      handlerName: 'handleStripePaymentSucceeded',
      requestSchema: 'StripePaymentSucceededPayload',
      testHeaders: { 'stripe-signature': '${ENV:STRIPE_TEST_SIGNATURE}' },
    } as any;

    await generateIncomingWebhook(webhook, interfacesDir, outputDir);

    const handlerPath = findFileRecursive(outputDir, (n) => n === 'handle_handleStripePaymentSucceeded.ts');
    expect(handlerPath).toBeTruthy();
    const src = readIfExists(handlerPath!);
    expect(src).toBeTruthy();

    // Function name and signature
    expect(src!).toMatch(/export\s+async\s+function\s+handleHandleStripePaymentSucceededWebhook\(/);
    expect(src!).toMatch(/payload:\s*StripePaymentSucceededPayload/);
    expect(src!).toMatch(/headers\?\s*:\s*Record<\s*string,\s*string\s*>/);
  });

  it('generateIncomingWebhook: omits optional headers when testHeaders are not provided', async () => {
    const interfacesDir = path.join(tmpDir, 'interfaces', 'source-theta');
    const outputDir = path.join(tmpDir, 'out', 'source-theta');
    mkdirp(interfacesDir); mkdirp(outputDir);

    writeFile(path.join(interfacesDir, 'FooPayload.ts'), 'export interface FooPayload { id: string; }\n');

    const webhook = {
      direction: 'incoming',
      name: 'foo',
      path: '/webhooks/foo',
      handlerName: 'handleFoo',
      requestSchema: 'FooPayload',
    } as any;

    await generateIncomingWebhook(webhook, interfacesDir, outputDir);

    const handlerPath = findFileRecursive(outputDir, (n) => n === 'handle_handleFoo.ts');
    expect(handlerPath).toBeTruthy();
    const src = readIfExists(handlerPath!);
    expect(src).toBeTruthy();

    expect(src!).toMatch(/export\s+async\s+function\s+handleHandleFooWebhook\(/);
    expect(src!).toMatch(/payload:\s*FooPayload/);
    expect(src!).not.toMatch(/headers\?\s*:\s*Record<\s*string,\s*string\s*>/);
  });

  it('generateOutgoingWebhook: creates sender with axios.post and headers param', async () => {
    const interfacesDir = path.join(tmpDir, 'interfaces', 'source-lambda');
    const outputDir = path.join(tmpDir, 'out', 'source-lambda');
    mkdirp(interfacesDir); mkdirp(outputDir);

    writeFile(path.join(interfacesDir, 'FooRequest.ts'), 'export interface FooRequest { id: string; }\n');
    writeFile(path.join(interfacesDir, 'FooResponse.ts'), 'export interface FooResponse { ok: boolean; }\n');

    const webhook = {
      direction: 'outgoing',
      name: 'foo',
      targetUrl: 'https://example.com/webhook',
      requestSchema: 'FooRequest',
      responseSchema: 'FooResponse',
    } as any;

    await generateOutgoingWebhook(webhook, interfacesDir, outputDir);

    const senderPath = findFileRecursive(outputDir, (n) => n === 'send_foo_webhook.ts');
    expect(senderPath).toBeTruthy();
    const src = readIfExists(senderPath!);
    expect(src).toBeTruthy();

    expect(src!).toMatch(/export\s+async\s+function\s+sendFooWebhook\(/);
    expect(src!).toMatch(/body:\s*FooRequest/);
    expect(src!).toMatch(/headers\?\s*:\s*Record<\s*string,\s*string\s*>/);
    expect(src!).toMatch(/axios\.post\(\`https:\/\/example\.com\/webhook\`/);
    expect(src!).toMatch(/return\s+response\.data;/);
  });

  it('generateWebhooksFromFile: processes both incoming and outgoing webhooks in a config', async () => {
    const interfacesDir = path.join(tmpDir, 'interfaces', 'source-zeta');
    const outputDir = path.join(tmpDir, 'out', 'source-zeta');
    mkdirp(interfacesDir); mkdirp(outputDir);

    // interfaces referenced by config
    writeFile(path.join(interfacesDir, 'AReq.ts'), 'export interface AReq { id: string }\n');
    writeFile(path.join(interfacesDir, 'BReq.ts'), 'export interface BReq { id: string }\n');
    writeFile(path.join(interfacesDir, 'BRes.ts'), 'export interface BRes { ok: boolean }\n');

    const cfgPath = path.join(tmpDir, 'config.json');
    writeFile(cfgPath, JSON.stringify({
      webhooks: [
        { direction: 'incoming', name: 'a', path: '/a', handlerName: 'handleA', requestSchema: 'AReq' },
        { direction: 'outgoing', name: 'b', targetUrl: 'https://t.example/b', requestSchema: 'BReq', responseSchema: 'BRes' },
      ]
    }, null, 2));

    await generateWebhooksFromFile(cfgPath, interfacesDir, outputDir);

    // incoming handler present
    expect(findFileRecursive(outputDir, (n) => n === 'handle_handleA.ts')).toBeTruthy();
    // outgoing sender present
    expect(findFileRecursive(outputDir, (n) => n === 'send_b_webhook.ts')).toBeTruthy();
  });

  it('generateWebhooksFromPath: discovers config, resolves interface dir, and writes outputs under the mapped service folder', async () => {
    const configDir = path.join(tmpDir, 'configs');
    const interfacesRootDir = path.join(tmpDir, 'interfaces');
    const outputRootDir = path.join(tmpDir, 'out');
    mkdirp(configDir); mkdirp(interfacesRootDir); mkdirp(outputRootDir);

    // service folder under interfaces root
    const svcDir = path.join(interfacesRootDir, 'source-omega');
    mkdirp(svcDir);
    writeFile(path.join(svcDir, 'InReq.ts'), 'export interface InReq { id: string }\n');
    writeFile(path.join(svcDir, 'OutReq.ts'), 'export interface OutReq { id: string }\n');
    writeFile(path.join(svcDir, 'OutRes.ts'), 'export interface OutRes { ok: boolean }\n');

    // config that references those interfaces
    writeFile(path.join(configDir, 'omega.json'), JSON.stringify({
      webhooks: [
        { direction: 'incoming', name: 'in', path: '/in', handlerName: 'handleIn', requestSchema: 'InReq' },
        { direction: 'outgoing', name: 'out', targetUrl: 'https://t.example/out', requestSchema: 'OutReq', responseSchema: 'OutRes' }
      ]
    }, null, 2));

    await generateWebhooksFromPath(configDir, interfacesRootDir, outputRootDir);

    const outSvc = path.join(outputRootDir, 'source-omega');
    expect(findFileRecursive(outSvc, (n) => n === 'handle_handleIn.ts')).toBeTruthy();
    expect(findFileRecursive(outSvc, (n) => n === 'send_out_webhook.ts')).toBeTruthy();
  });

  it('skips invalid config file in generateWebhooksFromPath', async () => {
    const configDir = path.join(tmpDir, 'bad-configs');
    const interfacesRootDir = path.join(tmpDir, 'interfaces');
    const outputRootDir = path.join(tmpDir, 'out');
    mkdirp(configDir); mkdirp(interfacesRootDir); mkdirp(outputRootDir);

    writeFile(path.join(configDir, 'invalid.json'), ''); // empty/invalid JSON

    await expect(generateWebhooksFromPath(configDir, interfacesRootDir, outputRootDir)).rejects.toThrow(/Failed to parse webhook config JSON/);
  });

  it('warns and skips config with unmatched schema', async () => {
    const configDir = path.join(tmpDir, 'bad-schema-configs');
    const interfacesRootDir = path.join(tmpDir, 'interfaces');
    const outputRootDir = path.join(tmpDir, 'out');
    mkdirp(configDir); mkdirp(interfacesRootDir); mkdirp(outputRootDir);

    writeFile(path.join(configDir, 'ghost.json'), JSON.stringify({
      webhooks: [
        { direction: 'incoming', name: 'ghost', path: '/ghost', handlerName: 'handleGhost', requestSchema: 'NotARealSchema' }
      ]
    }, null, 2));

    await expect(generateWebhooksFromPath(configDir, interfacesRootDir, outputRootDir)).rejects.toThrow(/Failed to locate an interfaces directory containing all required schemas/);
  });

  it('logs completion after successful generation', async () => {
    const configDir = path.join(tmpDir, 'log-check');
    const interfacesRootDir = path.join(tmpDir, 'interfaces');
    const outputRootDir = path.join(tmpDir, 'out');
    mkdirp(configDir); mkdirp(interfacesRootDir); mkdirp(outputRootDir);

    const svcDir = path.join(interfacesRootDir, 'source-alpha');
    mkdirp(svcDir);
    writeFile(path.join(svcDir, 'TestReq.ts'), 'export interface TestReq { id: string }');

    writeFile(path.join(configDir, 'alpha.json'), JSON.stringify({
      webhooks: [
        { direction: 'incoming', name: 'logtest', path: '/logtest', handlerName: 'handleLogtest', requestSchema: 'TestReq' }
      ]
    }));

    const logger = require('../../../src/utils/logger');
    const spy = jest.spyOn(logger.Logger, 'info');

    await generateWebhooksFromPath(configDir, interfacesRootDir, outputRootDir);
    expect(spy).toHaveBeenCalledWith('generateWebhooksFromPath', 'Webhook generation completed.');

    spy.mockRestore();
  });

  it('gracefully exits on invalid file in generateWebhooksFromFile', async () => {
    const configPath = path.join(tmpDir, 'invalid-file.json');
    const interfacesDir = path.join(tmpDir, 'interfaces');
    const outputDir = path.join(tmpDir, 'out');
    mkdirp(interfacesDir); mkdirp(outputDir);

    writeFile(configPath, ''); // invalid JSON

    await expect(generateWebhooksFromFile(configPath, interfacesDir, outputDir)).rejects.toThrow(/Failed to parse webhook config JSON/);
  });
});