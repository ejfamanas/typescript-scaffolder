import {
    factory,
    FunctionDeclaration,
    Identifier,
    KeywordTypeNode,
    ModifierLike,
    ParameterDeclaration,
    ReturnStatement, Statement
} from "typescript";
import {ITypedIdentifier} from "../models/typings";
import {IBaseFunction} from "./models";


export class BaseFunctionHelper {

    public static GenerateFunction(baseFunction: IBaseFunction): FunctionDeclaration {
        const {modifiers, name, identifiers, keyword, statements} = baseFunction;
        return factory.createFunctionDeclaration(
            modifiers,
            undefined,
            factory.createIdentifier(name),
            undefined,
            identifiers.map((p: ITypedIdentifier) => this.CreateParameter(p.identifier, p.keyword)),
            keyword,
            factory.createBlock(statements, true)
        );
    }

    /**
     * Generates the node for a basic parameter for a function.
     * To create parameters without typings, do not enter a keyword
     * @param identifier
     * @param keyword
     * @constructor
     */
    public static CreateParameter(identifier: Identifier, keyword: KeywordTypeNode | undefined = undefined): ParameterDeclaration {
        return factory.createParameterDeclaration(
            undefined,
            undefined,
            identifier,
            undefined,
            keyword,
            undefined
        )
    }
}