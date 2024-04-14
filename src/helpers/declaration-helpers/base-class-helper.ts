import {ITypedIdentifier} from "../models/typings";
import {ClassDeclaration, factory, ModifierLike} from "typescript";
import {ReferenceTypeHelper} from "../type-helpers/reference-type-helper";
export interface IBaseClass {
    readonly name: string;
    readonly identifiers: Array<ITypedIdentifier>;
    readonly modifiers?: Array<ModifierLike>;
}


export class BaseClassHelper {
    public static GenerateClass(
        {name, modifiers, identifiers}: IBaseClass
    ): ClassDeclaration {
        return factory.createClassDeclaration(
            modifiers || [],
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