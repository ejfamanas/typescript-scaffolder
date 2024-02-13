import {ITypedIdentifier} from "../models/typings";
import {ClassDeclaration, factory, InterfaceDeclaration, SyntaxKind} from "typescript";
import {BaseInterfaceHelper} from "../helpers/object-helpers/base-interface-helper";
import {BaseClassHelper} from "../helpers/object-helpers/base-class-helper";

export class ClassCodegen {
    /**
     * Generates a basic class with the export keyword
     * @param name
     * @param identifiers
     * @constructor
     */
    public static ExportableClass(name: string, identifiers: Array<ITypedIdentifier>): ClassDeclaration {
        return BaseClassHelper.GenerateClass (
            name,
            identifiers,
            [factory.createModifier(SyntaxKind.ExportKeyword)]
        );
    }
}