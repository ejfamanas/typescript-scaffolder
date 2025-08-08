"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const file_system_1 = require("../../src/utils/file-system");
const file_system_2 = require("../../src/utils/file-system");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const file_system_3 = require("../../src/utils/file-system");
const TEST_ROOT = path_1.default.join(__dirname, '__testdata__');
beforeAll(() => {
    fs_1.default.mkdirSync(TEST_ROOT, { recursive: true });
});
afterAll(() => {
    fs_1.default.rmSync(TEST_ROOT, { recursive: true, force: true });
});
describe('ensureDir', () => {
    it('creates a new directory if it does not exist', () => {
        const newDir = path_1.default.join(TEST_ROOT, 'ensure-me');
        expect(fs_1.default.existsSync(newDir)).toBe(false);
        (0, file_system_3.ensureDir)(newDir);
        expect(fs_1.default.existsSync(newDir)).toBe(true);
    });
    it('does nothing if the directory already exists', () => {
        const existingDir = path_1.default.join(TEST_ROOT, 'already-exists');
        fs_1.default.mkdirSync(existingDir);
        expect(() => (0, file_system_3.ensureDir)(existingDir)).not.toThrow();
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
    function createTestStructure(base, structure) {
        for (const key of Object.keys(structure)) {
            const fullPath = path_1.default.join(base, key);
            if (typeof structure[key] === 'string') {
                fs_1.default.writeFileSync(fullPath, structure[key]);
            }
            else {
                fs_1.default.mkdirSync(fullPath, { recursive: true });
                createTestStructure(fullPath, structure[key]);
            }
        }
    }
    beforeAll(() => {
        createTestStructure(TEST_ROOT, structure);
    });
    it('invokes callback for all .json files and preserves relative paths', () => {
        const found = [];
        (0, file_system_3.walkDirectory)(TEST_ROOT, (_filePath, relativePath) => {
            found.push(relativePath);
        }, '.json', TEST_ROOT);
        expect(found.sort()).toEqual([
            path_1.default.join('dir1', 'file1.json'),
            path_1.default.join('dir1', 'subdir', 'file3.json'),
            path_1.default.join('dir2', 'file4.json')
        ].sort());
    });
    it('uses different file extension filter if provided', () => {
        const found = [];
        (0, file_system_3.walkDirectory)(TEST_ROOT, (_filePath, relativePath) => {
            found.push(relativePath);
        }, '.txt', TEST_ROOT);
        expect(found).toEqual([
            path_1.default.join('dir1', 'file2.txt')
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
        const found = [];
        (0, file_system_3.walkDirectory)(path_1.default.join(TEST_ROOT, 'root'), (_filePath, relativePath) => {
            found.push(relativePath);
        }, '.json', path_1.default.join(TEST_ROOT, 'root'));
        expect(found).toContain(path_1.default.join('child', 'grandchild', 'deep.json'));
    });
    it('recursively walks into deeply nested subdirectories', () => {
        const base = path_1.default.join(TEST_ROOT, 'nested-recursion');
        const structure = {
            'level1': {
                'level2': {
                    'deep.json': '{}'
                }
            }
        };
        createTestStructure(base, structure);
        const found = [];
        (0, file_system_3.walkDirectory)(base, (_filePath, relativePath) => {
            found.push(relativePath);
        }, '.json', base);
        expect(found).toContain(path_1.default.join('level1', 'level2', 'deep.json'));
    });
    it('calls walkDirectory recursively for subdirectories', () => {
        const parent = path_1.default.join(TEST_ROOT, 'recursive-test');
        const childDir = path_1.default.join(parent, 'child');
        fs_1.default.mkdirSync(childDir, { recursive: true });
        fs_1.default.writeFileSync(path_1.default.join(childDir, 'test.json'), '{}');
        const found = [];
        (0, file_system_3.walkDirectory)(parent, (filePath, relativePath) => {
            found.push(relativePath);
        }, '.json', parent);
        expect(found).toContain(path_1.default.join('child', 'test.json'));
    });
});
describe('walkDirectory failure cases', () => {
    it('throws if rootDir does not exist', () => {
        const missingDir = path_1.default.join(TEST_ROOT, 'does-not-exist');
        expect(() => {
            (0, file_system_3.walkDirectory)(missingDir, () => {
            }, missingDir);
        }).toThrow();
    });
    it('does not invoke callback for non-matching extensions', () => {
        const found = [];
        (0, file_system_3.walkDirectory)(TEST_ROOT, (filePath, relativePath) => {
            found.push(relativePath);
        }, TEST_ROOT, '.md'); // no .md files in the test tree
        expect(found).toEqual([]);
    });
});
describe('readEndpointClientConfigFile', () => {
    const testFilePath = path_1.default.join(TEST_ROOT, 'endpoint-config.json');
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
        fs_1.default.writeFileSync(testFilePath, JSON.stringify(validConfig, null, 2));
        const result = (0, file_system_3.readEndpointClientConfigFile)(testFilePath);
        expect(result).not.toBeNull();
        expect(result?.baseUrl).toBe("https://example.com");
        expect(result?.authType).toBe("basic");
        expect(result?.endpoints.length).toBe(1);
    });
    it('throws if file does not exist', () => {
        expect(() => {
            (0, file_system_3.readEndpointClientConfigFile)(path_1.default.join(TEST_ROOT, 'does-not-exist.json'));
        }).toThrowError(/Config file not found at path/);
    });
    it('throws on malformed JSON', () => {
        fs_1.default.writeFileSync(testFilePath, '{ bad json ');
        expect(() => {
            (0, file_system_3.readEndpointClientConfigFile)(testFilePath);
        }).toThrowError(/Failed to parse config JSON/);
    });
    it('throws on structurally invalid config', () => {
        const invalidConfig = { hello: "world" }; // missing baseUrl, endpoints
        fs_1.default.writeFileSync(testFilePath, JSON.stringify(invalidConfig));
        expect(() => {
            (0, file_system_3.readEndpointClientConfigFile)(testFilePath);
        }).toThrowError(/Invalid structure in EndpointClientConfigFile/);
    });
});
describe('readWebhookConfigFile', () => {
    const testFilePath = path_1.default.join(TEST_ROOT, 'webhook-config.json');
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
        fs_1.default.writeFileSync(testFilePath, JSON.stringify(validConfig, null, 2));
        const result = (0, file_system_2.readWebhookConfigFile)(testFilePath);
        expect(result).not.toBeNull();
        expect(result?.webhooks.length).toBe(1);
        expect(result?.webhooks[0].name).toBe("stripe_payment");
    });
    it('throws if file does not exist', () => {
        const filePath = path_1.default.join(TEST_ROOT, 'missing-webhook.json');
        if (fs_1.default.existsSync(filePath))
            fs_1.default.unlinkSync(filePath); // ensure clean state
        expect(() => {
            (0, file_system_2.readWebhookConfigFile)(filePath);
        }).toThrowError(/Webhook config file not found at path/);
    });
    it('throws on malformed JSON', () => {
        fs_1.default.writeFileSync(testFilePath, '{ bad json ');
        expect(() => {
            (0, file_system_2.readWebhookConfigFile)(testFilePath);
        }).toThrowError(/Failed to parse webhook config JSON/);
    });
    it('throws on structurally invalid config', () => {
        const invalidConfig = { hello: "world" };
        fs_1.default.writeFileSync(testFilePath, JSON.stringify(invalidConfig));
        expect(() => {
            (0, file_system_2.readWebhookConfigFile)(testFilePath);
        }).toThrowError(/Invalid structure in WebhookConfigFile/);
    });
});
describe('extractInterfaces', () => {
    const configDir = path_1.default.join(TEST_ROOT, 'extract-interfaces-configs');
    const interfaceDir = path_1.default.join(TEST_ROOT, 'extract-interfaces-interfaces');
    beforeAll(() => {
        fs_1.default.mkdirSync(configDir, { recursive: true });
        fs_1.default.mkdirSync(interfaceDir, { recursive: true });
        // Create sample config files
        fs_1.default.writeFileSync(path_1.default.join(configDir, 'a.json'), '{}');
        fs_1.default.writeFileSync(path_1.default.join(configDir, 'b.json'), '{}');
        // Create sample interface files
        const subDir = path_1.default.join(interfaceDir, 'group');
        fs_1.default.mkdirSync(subDir, { recursive: true });
        fs_1.default.writeFileSync(path_1.default.join(subDir, 'Alpha.ts'), 'export interface Alpha {}');
        fs_1.default.writeFileSync(path_1.default.join(subDir, 'Beta.ts'), 'export interface Beta {}');
    });
    afterAll(() => {
        // Cleanup
        fs_1.default.rmSync(configDir, { recursive: true, force: true });
        fs_1.default.rmSync(interfaceDir, { recursive: true, force: true });
    });
    it('returns config files and maps interface names to directories', () => {
        const { configFiles, interfaceNameToDirs } = (0, file_system_1.extractInterfaces)(configDir, interfaceDir);
        const configNames = configFiles.map(f => path_1.default.basename(f)).sort();
        expect(configNames).toEqual(['a.json', 'b.json']);
        expect(interfaceNameToDirs.has('Alpha')).toBe(true);
        expect(interfaceNameToDirs.has('Beta')).toBe(true);
        const alphaDirs = Array.from(interfaceNameToDirs.get('Alpha'));
        expect(alphaDirs[0]).toContain('group');
    });
});
