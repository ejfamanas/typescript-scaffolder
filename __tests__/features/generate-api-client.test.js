"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const src_1 = require("../../src");
const fs_1 = __importDefault(require("fs"));
describe('generate-api-client', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });
    const sampleEndpoint = {
        method: 'GET',
        path: '/users/:id',
        responseSchema: 'GET_RES_user',
        requestSchema: undefined,
        objectName: 'user',
        pathParams: ['id'],
        queryParams: [],
        headers: {
            'x-api-key': 'test-key',
        },
    };
    describe('generateApiClientFunction', () => {
        it('generates function code and appends to source file', async () => {
            // TODO: This is erroring in the IDE even though the function call is correct based on the signature
            // @ts-ignore
            const spy = jest.spyOn(fs_1.default, 'writeFileSync');
            await (0, src_1.generateApiClientFunction)('https://api.example.com', 'user_api', 'GET_user', sampleEndpoint, {
                authType: 'apikey',
                credentials: {
                    apiKeyName: 'x-api-key',
                    apiKeyValue: 'test-key',
                }
            }, '../interfaces', './output', 'overwrite');
            expect(spy).toHaveBeenCalled();
            const writtenContent = spy.mock.calls[0][1];
            expect(writtenContent).toContain('export async function GET_user');
            expect(writtenContent).toContain('axios.get');
        });
    });
    describe('generateApiClientFromFile', () => {
        it('generates API client file from endpoint config file', async () => {
            const tempFilePath = path_1.default.join(__dirname, 'temp-endpoint.json');
            const endpointConfig = {
                baseUrl: 'https://api.example.com',
                authType: 'apikey',
                credentials: {
                    apiKeyName: 'x-api-key',
                    apiKeyValue: 'test-key',
                },
                endpoints: [sampleEndpoint],
            };
            // TODO: This is erroring in the IDE even though the function call is correct based on the signature
            // @ts-ignore
            const spy = jest.spyOn(fs_1.default, 'writeFileSync');
            fs_1.default.writeFileSync(tempFilePath, JSON.stringify(endpointConfig), 'utf8');
            await (0, src_1.generateApiClientFromFile)(tempFilePath, './interfaces', './output');
            expect(spy).toHaveBeenCalled();
            fs_1.default.unlinkSync(tempFilePath);
            spy.mockRestore();
        });
    });
    describe('generateApiClientsFromPath', () => {
        it('generates multiple API client files from config path', async () => {
            const tmpDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'api-client-test-'));
            const configDir = path_1.default.join(tmpDir, 'configs');
            const interfaceDir = path_1.default.join(tmpDir, 'interfaces/source');
            const outputDir = path_1.default.join(tmpDir, 'output');
            fs_1.default.mkdirSync(configDir, { recursive: true });
            fs_1.default.mkdirSync(interfaceDir, { recursive: true });
            fs_1.default.mkdirSync(outputDir, { recursive: true });
            // Create a dummy interface file
            fs_1.default.writeFileSync(path_1.default.join(interfaceDir, 'GET_RES_user.ts'), 'export interface GET_RES_user {}');
            const configPath = path_1.default.join(configDir, 'test-config.json');
            const config = {
                baseUrl: 'https://api.example.com',
                authType: 'apikey',
                credentials: {
                    apiKeyName: 'x-api-key',
                    apiKeyValue: 'test-key',
                },
                endpoints: [sampleEndpoint],
            };
            fs_1.default.writeFileSync(configPath, JSON.stringify(config), 'utf-8');
            await (0, src_1.generateApiClientsFromPath)(configDir, tmpDir + '/interfaces', outputDir);
            // Confirm a file was generated in the expected location
            const generatedDirs = fs_1.default.readdirSync(outputDir);
            const hasGeneratedOutput = generatedDirs.some((dir) => {
                const dirPath = path_1.default.join(outputDir, dir);
                return fs_1.default.statSync(dirPath).isDirectory() &&
                    fs_1.default.readdirSync(dirPath).some(file => file.includes('user_api'));
            });
            expect(hasGeneratedOutput).toBe(true);
            fs_1.default.rmSync(tmpDir, { recursive: true, force: true });
        });
    });
});
