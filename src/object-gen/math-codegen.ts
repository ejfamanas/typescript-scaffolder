import {factory, FunctionDeclaration} from "typescript";
import {MathFunctionHelper} from "../helpers/math-function-helper";
import {BinaryExpressionHelper} from "../helpers/binary-expression-helper";

export class MathCodegen {
    /**
     * Returns a named function declaration which performs an addition operation
     * @param name
     * @param arg1
     * @param arg2
     * @constructor
     */
    public static AddFunction(name: string, arg1: string, arg2: string): FunctionDeclaration {
        const a = factory.createIdentifier(arg1);
        const b = factory.createIdentifier(arg2);
        return MathFunctionHelper.GenerateMathFunction(
            name,
            [a, b],
            [factory.createReturnStatement(BinaryExpressionHelper.Add(a, b))]
        );
    }

    /**
     * Returns a named function declaration which performs a subtraction operation
     * @param name
     * @param arg1
     * @param arg2
     * @constructor
     */
    public static SubtractFunction(name: string, arg1: string, arg2: string): FunctionDeclaration {
        const a = factory.createIdentifier(arg1);
        const b = factory.createIdentifier(arg2);
        return MathFunctionHelper.GenerateMathFunction(
            name,
            [a, b],
            [factory.createReturnStatement(BinaryExpressionHelper.Subtract(a, b))]
        );
    }

    /**
     * Returns a named function declaration which performs a multiplication operation
     * @param name
     * @param arg1
     * @param arg2
     * @constructor
     */
    public static MultiplyFunction(name: string, arg1: string, arg2: string): FunctionDeclaration {
        const a = factory.createIdentifier(arg1);
        const b = factory.createIdentifier(arg2);
        return MathFunctionHelper.GenerateMathFunction(
            name,
            [a, b],
            [factory.createReturnStatement(BinaryExpressionHelper.Multiply(a, b))]
        );
    }

    /**
     * Returns a named function declaration which performs a division operation
     * @param name
     * @param arg1
     * @param arg2
     * @constructor
     */
    public static DivideFunction(name: string, arg1: string, arg2: string): FunctionDeclaration {
        const a = factory.createIdentifier(arg1);
        const b = factory.createIdentifier(arg2);
        return MathFunctionHelper.GenerateMathFunction(
            name,
            [a, b],
            [factory.createReturnStatement(BinaryExpressionHelper.Divide(a, b))]
        );
    }
}