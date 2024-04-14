import {ITypedIdentifier} from "../models/typings";
import {factory, InterfaceDeclaration, ModifierLike} from "typescript";
import {ReferenceTypeHelper} from "../type-helpers/reference-type-helper";
import {IBaseInterface} from "./models";


export class BaseInterfaceHelper {
    public static GenerateInterface({name, identifiers, modifiers}: IBaseInterface): InterfaceDeclaration {
        return factory.createInterfaceDeclaration(
            modifiers || [],
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