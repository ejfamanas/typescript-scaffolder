import {ITypedIdentifier} from "../models/typings";
import {factory, InterfaceDeclaration, SyntaxKind} from "typescript";
import {BaseInterfaceHelper} from "../declaration-helpers/base-interface-helper";
import {IBaseInterface} from "../declaration-helpers/models";

export class InterfaceCodegen {
    /**
     * Generates a basic interface with the export keyword
     * @constructor
     * @param config
     */
    public static ExportableInterface(config: IBaseInterface): InterfaceDeclaration {
        return BaseInterfaceHelper.GenerateInterface ({modifiers: [factory.createModifier(SyntaxKind.ExportKeyword)], ...config});
    }
}