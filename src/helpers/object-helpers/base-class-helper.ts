import {ITypedIdentifier} from "../../models/typings";
import {ClassDeclaration, factory, ModifierLike} from "typescript";
import {ReferenceTypeHelper} from "../type-helpers/reference-type-helper";

export class BaseClassHelper {
    public static GenerateClass(
        name: string,
        identifiers: Array<ITypedIdentifier>,
        modifiers: Array<ModifierLike>,
    ): ClassDeclaration {
        return factory.createClassDeclaration(
            modifiers,
            name,
            undefined,
            [],
            identifiers.map((p: ITypedIdentifier) => factory.createPropertyDeclaration(
                    undefined,
                    p.identifier,
                    undefined,
                    ReferenceTypeHelper.Selector(p.referenceType),
                    undefined
                )
            ),
        )
    }
}