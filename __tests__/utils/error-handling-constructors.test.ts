import { Project } from 'ts-morph';
import {
    addErrorHandlerImportsToSourceFile,
    buildEndpointErrorHandlerExport,
    buildErrorHandlerImplSource
} from "../../src/utils/error-handling-constructors";

describe('error-handling-constructors', () => {

    describe('buildEndpointErrorHandlerExport', () => {
        it('generates correctly typed endpoint wrapper function', () => {
            const output = buildEndpointErrorHandlerExport('GET_user', 'User', {
                method: 'GET',
                path: '/users/:id',
                headers: {},
                objectName: 'User',
                responseSchema: "MY_RESPONSE"
            });

            expect(output).toContain('export function handleErrors_GET_user');
            expect(output).toContain('AxiosResponse<User>');
            expect(output).toContain('endpoint: "/users/:id"');
            expect(output).toContain('method: "GET"');
        });
    });

    describe('buildErrorHandlerImplSource', () => {
        it('returns shared handleErrorsImpl source', () => {
            const impl = buildErrorHandlerImplSource();
            expect(impl).toContain('function handleErrorsImpl<T>');
            expect(impl).toContain('logFn = console.error');
            expect(impl).toContain('if (rethrow) throw err;');
        });
    });

    describe('addErrorHandlerImportsToSourceFile', () => {
        it('adds correct imports to the source file', () => {
            const project = new Project();
            const sourceFile = project.createSourceFile('test.ts', '', {overwrite: true});

            addErrorHandlerImportsToSourceFile(sourceFile, [
                {responseType: 'User', responseModule: './interfaces/User'},
                {responseType: 'Group', responseModule: './interfaces/Group'},
                {responseType: 'User', responseModule: './interfaces/User'}
            ]);

            const imports = sourceFile.getImportDeclarations().map(i => i.getText());

            expect(imports).toEqual(expect.arrayContaining([
                `import { AxiosResponse } from "axios";`,
                `import { WrapRequestOptions } from "typescript-scaffolder";`,
                `import { User } from "./interfaces/User";`,
                `import { Group } from "./interfaces/Group";`
            ]));
        });
    });
});