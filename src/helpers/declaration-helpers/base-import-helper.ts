import {ITypedIdentifier} from "../models/typings";
import {factory, ImportDeclaration} from "typescript";
import {IBaseImport} from "./models";

export class BaseImportHelper {
    /**
     * Creates an import statement for many exported members from one package
     * @param packageName
     * @param identifiers
     * @constructor
     */
    public static GenerateImport({name, identifiers}: IBaseImport): ImportDeclaration {
        return factory.createImportDeclaration(
            undefined,
            factory.createImportClause(
                false,
                undefined,
                factory.createNamedImports(
                    identifiers.map(({identifier}) => factory.createImportSpecifier(false, undefined, identifier)
                    )),
            ),
            factory.createStringLiteral(name),
            undefined
        );
    }
}