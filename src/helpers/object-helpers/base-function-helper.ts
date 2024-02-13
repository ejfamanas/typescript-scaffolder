import {
    factory,
    FunctionDeclaration,
    Identifier,
    KeywordTypeNode,
    ParameterDeclaration,
    ReturnStatement
} from "typescript";
import {ITypedIdentifier} from "../../models/typings";

export class BaseFunctionHelper {

    /**
     * Creates a basic function that takes an input and creates a function with a specified return type.
     * To keep the parameter field empty, pass in an empty array for @param identifiers
     * To keep the function body empty, pass in an empty array for @param statements
     * To not declare a return type, do not send a value for @param keyword
     *
     * @param name
     * @param identifiers
     * @param statements
     * @param keyword
     * @constructor
     */
    public static GenerateFunction(name: string, identifiers: Array<ITypedIdentifier>, statements: Array<ReturnStatement>, keyword: KeywordTypeNode | undefined = undefined): FunctionDeclaration {
        return factory.createFunctionDeclaration(
            undefined,
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