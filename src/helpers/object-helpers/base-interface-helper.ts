import {ITypedIdentifier} from "../../models/typings";
import {factory, InterfaceDeclaration, ModifierLike} from "typescript";
import {ReferenceTypeHelper} from "../type-helpers/reference-type-helper";

export class BaseInterfaceHelper {
    public static GenerateInterface(
        name: string,
        identifiers: Array<ITypedIdentifier>,
        modifiers: Array<ModifierLike>,
    ): InterfaceDeclaration {
        return factory.createInterfaceDeclaration(
            modifiers,
            name,
            undefined,
            [],
            identifiers.map((p: ITypedIdentifier) => factory.createPropertySignature(
                    undefined,
                    p.identifier,
                    undefined,
                    ReferenceTypeHelper.Selector(p.referenceType),
                )
            ),
        )
    }
}