import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(__dirname, '../..');

function writeFile(filePath: string, contents: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function runCli(workspace: string, args: string[]) {
  return execFileAsync(process.execPath, [
    '-r', require.resolve('ts-node/register/transpile-only'),
    '-r', require.resolve('tsconfig-paths/register'),
    path.join(projectRoot, 'src/cli.ts'),
    ...args,
  ], {
    cwd: workspace,
    env: { ...process.env, TS_NODE_PROJECT: path.join(projectRoot, 'tsconfig.json') },
    encoding: 'utf8',
    timeout: 20000,
  });
}

describe('CLI webhook regeneration', () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'webhook-cli-'));
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it.each(['webhooks', 'full'])('%s documents the overwrite flag and its effect', async (command) => {
    const { stdout } = await runCli(workspace, [command, '--help']);
    expect(stdout).toContain('--overwrite-webhooks');
    expect(stdout.replace(/\s+/g, ' ')).toContain('discarding existing edits');
    if (command === 'webhooks') {
      expect(stdout).toContain('--config <dir>');
    }
  }, 30000);

  it.each(['webhooks', 'full'])('%s preserves edits by default and explicitly regenerates repeatable implementations', async (command) => {
    const schemasDir = path.join(workspace, 'schemas');
    const configDir = path.join(workspace, 'config/webhook-configs');
    const configPath = path.join(configDir, 'payments.json');
    const outputDir = path.join(workspace, 'output');
    const interfacesDir = path.join(outputDir, 'interfaces');
    const webhooksDir = path.join(outputDir, 'webhooks');
    const envFile = path.join(workspace, '.env');

    writeFile(path.join(schemasDir, 'payments/PaymentPayload.json'), JSON.stringify({ id: 'pay_123' }));
    writeFile(envFile, 'PORT=3000\n');
    fs.mkdirSync(path.join(workspace, 'config/endpoint-configs'), { recursive: true });
    fs.mkdirSync(path.join(workspace, 'config/sequence-configs'), { recursive: true });
    if (command === 'full') {
      // The API registry currently requires this directory even with no endpoints.
      // Keep this fixture focused on webhook regeneration; see CHANGELOG.md.
      fs.mkdirSync(path.join(outputDir, 'apis'), { recursive: true });
    }

    const incoming = {
      direction: 'incoming',
      name: 'payment_received',
      path: '/webhooks/payment_received',
      handlerName: 'paymentReceived',
      requestSchema: 'PaymentPayload',
    };
    const outgoing = {
      direction: 'outgoing',
      name: 'payment_forwarded',
      targetUrl: 'https://example.com/payments',
      requestSchema: 'PaymentPayload',
    };
    writeFile(configPath, JSON.stringify({ webhooks: [incoming, outgoing] }));

    if (command === 'webhooks') {
      await runCli(workspace, ['interfaces', '--input', schemasDir, '--output', interfacesDir]);
    }
    const args = command === 'webhooks'
      ? ['webhooks', '--config', configDir, '--interfaces', interfacesDir, '--output', webhooksDir]
      : ['full', '--json', schemasDir, '--env', envFile, '--output', outputDir];

    await runCli(workspace, args);

    const routesDir = path.join(webhooksDir, 'payments/routes');
    const handlerPath = path.join(routesDir, 'handle_paymentReceived.ts');
    const senderPath = path.join(routesDir, 'send_payment_forwarded_webhook.ts');
    const originalHandler = fs.readFileSync(handlerPath, 'utf8');
    const originalSender = fs.readFileSync(senderPath, 'utf8');
    const editedHandler = originalHandler.replace(
      'console.log("Received webhook payload:", payload);',
      'if (!payload.id) throw new Error("Missing payment ID");'
    );
    const editedSender = originalSender.replace('{ headers }', '{ headers, timeout: 5000 }');
    expect(editedHandler).not.toBe(originalHandler);
    expect(editedSender).not.toBe(originalSender);
    writeFile(handlerPath, editedHandler);
    writeFile(senderPath, editedSender);

    writeFile(configPath, JSON.stringify({
      webhooks: [
        { ...incoming, testHeaders: { 'x-signature': 'test-signature' } },
        { ...outgoing, targetUrl: 'https://example.com/payments-v2' },
        { ...incoming, name: 'payment_refunded', path: '/webhooks/payment_refunded', handlerName: 'paymentRefunded' },
        { ...outgoing, name: 'refund_forwarded' },
      ],
    }));

    const preserved = await runCli(workspace, args);
    expect(preserved.stdout).toContain('Webhook implementations: preserve existing files');
    expect(fs.readFileSync(handlerPath, 'utf8')).toBe(editedHandler);
    expect(fs.readFileSync(senderPath, 'utf8')).toBe(editedSender);
    const newHandlerPath = path.join(routesDir, 'handle_paymentRefunded.ts');
    const newSenderPath = path.join(routesDir, 'send_refund_forwarded_webhook.ts');
    expect(fs.readFileSync(newHandlerPath, 'utf8')).toContain('export async function handlePaymentRefundedWebhook(');
    expect(fs.readFileSync(newSenderPath, 'utf8')).toContain('export async function sendRefundForwardedWebhook(');

    const overwritten = await runCli(workspace, [...args, '--overwrite-webhooks']);
    expect(overwritten.stdout).toContain('Webhook implementations: overwrite from config');
    const regeneratedHandler = fs.readFileSync(handlerPath, 'utf8');
    const regeneratedSender = fs.readFileSync(senderPath, 'utf8');
    expect(regeneratedHandler).not.toContain('Missing payment ID');
    expect(regeneratedHandler).toContain('console.log("Received webhook payload:", payload);');
    expect(regeneratedHandler).toMatch(/headers\?\s*:\s*Record<string, string>/);
    expect(regeneratedSender).not.toContain('timeout: 5000');
    expect(regeneratedSender).toContain('https://example.com/payments-v2');

    const implementationPaths = [handlerPath, senderPath, newHandlerPath, newSenderPath];
    const readImplementations = () => implementationPaths.map(filePath => fs.readFileSync(filePath, 'utf8'));
    const firstOverwrite = readImplementations();
    await runCli(workspace, [...args, '--overwrite-webhooks']);
    expect(readImplementations()).toEqual(firstOverwrite);
  }, 60000);
});
