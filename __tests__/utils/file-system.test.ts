import { extractInterfaces } from "../../src/utils/file-system";
import { readWebhookConfigFile } from "../../src/utils/file-system";
import * as fs from 'fs';
import * as path from 'path';
import { ensureDir, readEndpointClientConfigFile, walkDirectory } from "../../src/utils/file-system";

const TEST_ROOT = path.join(__dirname, '__testdata__');

beforeAll(() => {
    fs.mkdirSync(TEST_ROOT, {recursive: true});
});

afterAll(() => {
    fs.rmSync(TEST_ROOT, {recursive: true, force: true});
});

describe('ensureDir', () => {
    it('creates a new directory if it does not exist', () => {
        const newDir = path.join(TEST_ROOT, 'ensure-me');
        expect(fs.existsSync(newDir)).toBe(false);
        ensureDir(newDir);
        expect(fs.existsSync(newDir)).toBe(true);
    });

    it('does nothing if the directory already exists', () => {
        const existingDir = path.join(TEST_ROOT, 'already-exists');
        fs.mkdirSync(existingDir);
        expect(() => ensureDir(existingDir)).not.toThrow();
    });
});

describe('walkDirectory', () => {
    const structure = {
        'dir1': {
            'file1.json': '{}',
            'file2.txt': 'text',
            'subdir': {
                'file3.json': '{}'
            }
        },
        'dir2': {
            'file4.json': '{}'
        }
    };

    function createTestStructure(base: string, structure: any) {
        for (const key of Object.keys(structure)) {
            const fullPath = path.join(base, key);
            if (typeof structure[key] === 'string') {
                fs.writeFileSync(fullPath, structure[key]);
            } else {
                fs.mkdirSync(fullPath, {recursive: true});
                createTestStructure(fullPath, structure[key]);
            }
        }
    }

    beforeAll(() => {
        createTestStructure(TEST_ROOT, structure);
    });

    it('invokes callback for all .json files and preserves relative paths', () => {
        const found: string[] = [];

        walkDirectory(TEST_ROOT,
            (_filePath, relativePath) => {
                found.push(relativePath);
            },
            '.json',
            TEST_ROOT
        );

        expect(found.sort()).toEqual([
            path.join('dir1', 'file1.json'),
            path.join('dir1', 'subdir', 'file3.json'),
            path.join('dir2', 'file4.json')
        ].sort());
    });

    it('uses different file extension filter if provided', () => {
        const found: string[] = [];

        walkDirectory(TEST_ROOT,
            (_filePath, relativePath) => {
                found.push(relativePath);
            },
            '.txt',
            TEST_ROOT
        );

        expect(found).toEqual([
            path.join('dir1', 'file2.txt')
        ]);
    });
    // TODO: The next three tests pass, but the optional parameter specified in the function is not getting
    //  picked up by the code coverage.
    it('recursively walks into subdirectories', () => {
        const nestedJson = {
            'root': {
                'child': {
                    'grandchild': {
                        'deep.json': '{}'
                    }
                }
            }
        };

        createTestStructure(TEST_ROOT, nestedJson);

        const found: string[] = [];

        walkDirectory(
            path.join(TEST_ROOT, 'root'),
            (_filePath, relativePath) => {
                found.push(relativePath)
            },
            '.json',
            path.join(TEST_ROOT, 'root')
        );

        expect(found).toContain(path.join('child', 'grandchild', 'deep.json'));
    });

    it('recursively walks into deeply nested subdirectories', () => {
        const base = path.join(TEST_ROOT, 'nested-recursion');
        const structure = {
            'level1': {
                'level2': {
                    'deep.json': '{}'
                }
            }
        };

        createTestStructure(base, structure);

        const found: string[] = [];
        walkDirectory(base,
            (_filePath, relativePath) => {
                found.push(relativePath);
            },
            '.json',
            base);

        expect(found).toContain(path.join('level1', 'level2', 'deep.json'));
    });

    it('calls walkDirectory recursively for subdirectories', () => {
        const parent = path.join(TEST_ROOT, 'recursive-test');
        const childDir = path.join(parent, 'child');

        fs.mkdirSync(childDir, {recursive: true});
        fs.writeFileSync(path.join(childDir, 'test.json'), '{}');

        const found: string[] = [];
        walkDirectory(parent,
            (filePath, relativePath) => {
                found.push(relativePath);
            },
            '.json',
            parent
        );

        expect(found).toContain(path.join('child', 'test.json'));
    });
});

describe('walkDirectory failure cases', () => {
    it('throws if rootDir does not exist', () => {
        const missingDir = path.join(TEST_ROOT, 'does-not-exist');
        expect(() => {
            walkDirectory(missingDir, () => {
            }, missingDir);
        }).toThrow();
    });

    it('does not invoke callback for non-matching extensions', () => {
        const found: string[] = [];
        walkDirectory(TEST_ROOT, (filePath, relativePath) => {
            found.push(relativePath);
        }, TEST_ROOT, '.md'); // no .md files in the test tree
        expect(found).toEqual([]);
    });
});

describe('readEndpointClientConfigFile', () => {
    const testFilePath = path.join(TEST_ROOT, 'endpoint-config.json');

    it('returns parsed config if valid', () => {
        const validConfig = {
            baseUrl: "https://example.com",
            authType: "basic",
            credentials: {
                username: "user",
                password: "pass"
            },
            endpoints: [
                {
                    method: "GET",
                    path: "/test",
                    responseSchema: "TestResponse"
                }
            ]
        };

        fs.writeFileSync(testFilePath, JSON.stringify(validConfig, null, 2));
        const result = readEndpointClientConfigFile(testFilePath);

        expect(result).not.toBeNull();
        expect(result?.baseUrl).toBe("https://example.com");
        expect(result?.authType).toBe("basic");
        expect(result?.endpoints.length).toBe(1);
    });

    it('throws if file does not exist', () => {
        expect(() => {
            readEndpointClientConfigFile(path.join(TEST_ROOT, 'does-not-exist.json'));
        }).toThrowError(/Config file not found at path/);
    });

    it('throws on malformed JSON', () => {
        fs.writeFileSync(testFilePath, '{ bad json ');
        expect(() => {
            readEndpointClientConfigFile(testFilePath);
        }).toThrowError(/Failed to parse config JSON/);
    });

    it('throws on structurally invalid config', () => {
        const invalidConfig = { hello: "world" }; // missing baseUrl, endpoints
        fs.writeFileSync(testFilePath, JSON.stringify(invalidConfig));
        expect(() => {
            readEndpointClientConfigFile(testFilePath);
        }).toThrowError(/Invalid structure in EndpointClientConfigFile/);
    });
});

describe('readWebhookConfigFile', () => {
    const testFilePath = path.join(TEST_ROOT, 'webhook-config.json');

    it('returns parsed config if valid', () => {
        const validConfig = {
            webhooks: [
                {
                    direction: "incoming",
                    name: "stripe_payment",
                    path: "/webhooks/stripe",
                    requestSchema: "StripeWebhookPayload"
                }
            ]
        };

        fs.writeFileSync(testFilePath, JSON.stringify(validConfig, null, 2));
        const result = readWebhookConfigFile(testFilePath);

        expect(result).not.toBeNull();
        expect(result?.webhooks.length).toBe(1);
        expect(result?.webhooks[0].name).toBe("stripe_payment");
    });

    it('throws if file does not exist', () => {
        const filePath = path.join(TEST_ROOT, 'missing-webhook.json');
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath); // ensure clean state

        expect(() => {
            readWebhookConfigFile(filePath);
        }).toThrowError(/Webhook config file not found at path/);
    });

    it('throws on malformed JSON', () => {
        fs.writeFileSync(testFilePath, '{ bad json ');
        expect(() => {
            readWebhookConfigFile(testFilePath);
        }).toThrowError(/Failed to parse webhook config JSON/);
    });

    it('throws on structurally invalid config', () => {
        const invalidConfig = { hello: "world" };
        fs.writeFileSync(testFilePath, JSON.stringify(invalidConfig));
        expect(() => {
            readWebhookConfigFile(testFilePath);
        }).toThrowError(/Invalid structure in WebhookConfigFile/);
    });
});


describe('extractInterfaces', () => {
    const configDir = path.join(TEST_ROOT, 'extract-interfaces-configs');
    const interfaceDir = path.join(TEST_ROOT, 'extract-interfaces-interfaces');

    beforeAll(() => {
        fs.mkdirSync(configDir, { recursive: true });
        fs.mkdirSync(interfaceDir, { recursive: true });

        // Create sample config files
        fs.writeFileSync(path.join(configDir, 'a.json'), '{}');
        fs.writeFileSync(path.join(configDir, 'b.json'), '{}');

        // Create sample interface files
        const subDir = path.join(interfaceDir, 'group');
        fs.mkdirSync(subDir, { recursive: true });
        fs.writeFileSync(path.join(subDir, 'Alpha.ts'), 'export interface Alpha {}');
        fs.writeFileSync(path.join(subDir, 'Beta.ts'), 'export interface Beta {}');
    });

    afterAll(() => {
        // Cleanup
        fs.rmSync(configDir, { recursive: true, force: true });
        fs.rmSync(interfaceDir, { recursive: true, force: true });
    });

    it('returns config files and maps interface names to directories', () => {
        const { configFiles, interfaceNameToDirs } = extractInterfaces(configDir, interfaceDir);

        const configNames = configFiles.map(f => path.basename(f)).sort();
        expect(configNames).toEqual(['a.json', 'b.json']);

        expect(interfaceNameToDirs.has('Alpha')).toBe(true);
        expect(interfaceNameToDirs.has('Beta')).toBe(true);
        const alphaDirs = Array.from(interfaceNameToDirs.get('Alpha')!);
        expect(alphaDirs[0]).toContain('group');
    });
});