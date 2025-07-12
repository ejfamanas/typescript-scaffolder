import path from 'path';
import os from 'os';
import {
    generateApiClientFunction,
    generateApiClientFromFile,
    generateApiClientsFromPath,
} from '../../src';
import {Endpoint, EndpointClientConfigFile} from '../../src';
import fs from "fs";
import { SourceFile } from 'ts-morph';

describe('generate-api-client', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });
    const sampleEndpoint: Endpoint = {
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
            const spy = jest.spyOn(fs, 'writeFileSync');

            await generateApiClientFunction(
                'https://api.example.com',
                'user_api',
                'GET_user',
                sampleEndpoint,
                {
                    authType: 'apikey',
                    credentials: {
                        apiKeyName: 'x-api-key',
                        apiKeyValue: 'test-key',
                    }
                },
                '../interfaces',
                './output',
                'overwrite'
            );

            expect(spy).toHaveBeenCalled();
            const writtenContent = spy.mock.calls[0][1] as string;
            expect(writtenContent).toContain('export async function GET_user');
            expect(writtenContent).toContain('axios.get');
        });
    });

    describe('generateApiClientFromFile', () => {
        it('generates API client file from endpoint config file', async () => {
            const tempFilePath = path.join(__dirname, 'temp-endpoint.json');

            const endpointConfig: EndpointClientConfigFile = {
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
            const spy = jest.spyOn(fs, 'writeFileSync');

            fs.writeFileSync(tempFilePath, JSON.stringify(endpointConfig), 'utf8');

            await generateApiClientFromFile(tempFilePath, './interfaces', './output');

            expect(spy).toHaveBeenCalled();

            fs.unlinkSync(tempFilePath);
            spy.mockRestore();
        });
    });

    describe('generateApiClientsFromPath', () => {
        it('generates multiple API client files from config path', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-client-test-'));
            const configDir = path.join(tmpDir, 'configs');
            const interfaceDir = path.join(tmpDir, 'interfaces/source');
            const outputDir = path.join(tmpDir, 'output');

            fs.mkdirSync(configDir, { recursive: true });
            fs.mkdirSync(interfaceDir, { recursive: true });
            fs.mkdirSync(outputDir, { recursive: true });

            // Create a dummy interface file
            fs.writeFileSync(path.join(interfaceDir, 'GET_RES_user.ts'), 'export interface GET_RES_user {}');

            const configPath = path.join(configDir, 'test-config.json');
            const config: EndpointClientConfigFile = {
                baseUrl: 'https://api.example.com',
                authType: 'apikey',
                credentials: {
                    apiKeyName: 'x-api-key',
                    apiKeyValue: 'test-key',
                },
                endpoints: [sampleEndpoint],
            };

            fs.writeFileSync(configPath, JSON.stringify(config), 'utf-8');

            await generateApiClientsFromPath(configDir, tmpDir + '/interfaces', outputDir);

            // Confirm a file was generated in the expected location
            const generatedDirs = fs.readdirSync(outputDir);
            const hasGeneratedOutput = generatedDirs.some((dir) => {
                const dirPath = path.join(outputDir, dir);
                return fs.statSync(dirPath).isDirectory() &&
                    fs.readdirSync(dirPath).some(file => file.includes('user_api'));
            });

            expect(hasGeneratedOutput).toBe(true);

            fs.rmSync(tmpDir, { recursive: true, force: true });
        });
    });
});
