import {
    factory,
    FunctionDeclaration,
    Identifier,
    ParameterDeclaration,
    ReturnStatement
} from "typescript";
import {PrimitiveHelper} from "./primitive-helper";


export class MathFunctionHelper {
    public static GenerateMathFunction(name: string, args: Array<Identifier>, statements: Array<ReturnStatement>): FunctionDeclaration {
        const parameters: Array<ParameterDeclaration> = args.length === 0 ? [] : args.map
        ((identifier: Identifier) => factory.createParameterDeclaration(
                undefined,
                undefined,
                identifier,
                undefined,
                PrimitiveHelper.Number,
                undefined
            )
        );
        return factory.createFunctionDeclaration(
            undefined,
            undefined,
            factory.createIdentifier(name),
            undefined,
            parameters,
            PrimitiveHelper.Number,
            factory.createBlock(statements, true),
        );
    }
}