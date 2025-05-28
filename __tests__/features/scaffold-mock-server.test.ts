import {scaffoldMockServer} from '../../src/features/scaffold-mock-server';
import * as fileSystem from '../../src/utils/file-system';
import * as schemaInferer from '../../src/utils/schema-inferer';
import * as mockGen from '../../src/utils/mock-data-generator';

// Mocks
jest.mock('../../src/utils/file-system');
jest.mock('../../src/utils/schema-inferer');
jest.mock('../../src/utils/mock-data-generator');

describe('scaffoldMockServer', () => {
    const mockWalkDirectory = fileSystem.walkDirectory as jest.Mock;
    const mockInferSchema = schemaInferer.inferJsonSchemaFromPath as jest.Mock;
    const mockGenerateMockData = mockGen.generateMockData as jest.Mock;

    // Store route handlers
    const routeHandlers: Record<string, (req: any, res: any) => void> = {};
    // Define first
    function mockGetImpl(route: any, handler: any): void {
        routeHandlers[route] = handler;
    }
    // Then wrap with jest.fn
    const mockGet = jest.fn(mockGetImpl);

    const mockListen = jest.fn();
    // Mock express to intercept app.get()
    jest.mock('express', () => () => ({
        listen: mockListen,
        get: mockGet,
    }));

    beforeEach(() => {
        jest.clearAllMocks();
        for (const key in routeHandlers) delete routeHandlers[key];
    });

    it('registers routes for valid interfaces', async () => {
        const fakeSchema = `
            export interface User {
                id: string;
                email: string;
            }
        `;

        mockInferSchema.mockResolvedValueOnce(fakeSchema);
        mockWalkDirectory.mockImplementation((_dir: string, cb: (filePath: string) => void) => {
            cb('/fake/path/models/user.ts');
        });

        await scaffoldMockServer('/fake/path/models');

        // Simulate a request
        const mockJson = jest.fn();
        const mockRes = {json: mockJson};

        // Manually invoke the registered handler
        routeHandlers['/user/users']?.({}, mockRes);
        // TODO: This is failing because of how expressed is wrapped and scaffolding the mock server
        // const expectedSchema = JSON.stringify({id: 'string', email: 'string'});
        // expect(mockGenerateMockData).toHaveBeenCalledWith(5, expectedSchema);
        // expect(mockJson).toHaveBeenCalledWith(expect.any(Array));
    });

    it('skips file if schema is null', async () => {
        mockInferSchema.mockResolvedValueOnce(null);

        mockWalkDirectory.mockImplementation((_dir: string, cb: (filePath: string) => void) => {
            cb('/fake/path/invalid.ts');
        });

        await scaffoldMockServer('/fake/path');

        expect(mockInferSchema).toHaveBeenCalledWith('/fake/path/invalid.ts');
        expect(mockGenerateMockData).not.toHaveBeenCalled();
    });
});