import {
    factory,
    FunctionDeclaration,
    Identifier,
    ParameterDeclaration,
    ReturnStatement
} from "typescript";
import {KeywordTypeHelper} from "./keyword-type-helper";


export class MathFunctionHelper {
    /**
     * Generates a pure function that takes in at least two numbers and returns a number
     * @param name
     * @param args
     * @param statements
     * @constructor
     */
    public static GenerateMathFunction(name: string, args: Array<Identifier>, statements: Array<ReturnStatement>): FunctionDeclaration {
        const parameters: Array<ParameterDeclaration> = args.length === 0 ? [] : args.map
        ((identifier: Identifier) => factory.createParameterDeclaration(
                undefined,
                undefined,
                identifier,
                undefined,
                KeywordTypeHelper.Number,
                undefined
            )
        );
        return factory.createFunctionDeclaration(
            undefined,
            undefined,
            factory.createIdentifier(name),
            undefined,
            parameters,
            KeywordTypeHelper.Number,
            factory.createBlock(statements, true),
        );
    }
}