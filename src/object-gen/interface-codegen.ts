import {ITypedIdentifier} from "../models/typings";
import {factory, InterfaceDeclaration, SyntaxKind} from "typescript";
import {BaseInterfaceHelper} from "../helpers/object-helpers/base-interface-helper";

export class InterfaceCodegen {
    /**
     * Generates a basic interface with the export keyword
     * @param name
     * @param identifiers
     * @constructor
     */
    public static ExportableInterface(name: string, identifiers: Array<ITypedIdentifier>): InterfaceDeclaration {
        return BaseInterfaceHelper.GenerateInterface (
            name,
            identifiers,
            [factory.createModifier(SyntaxKind.ExportKeyword)]
        );
    }
}