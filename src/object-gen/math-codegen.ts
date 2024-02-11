import {factory, FunctionDeclaration} from "typescript";
import {MathFunctionHelper} from "../helpers/math-function-helper";
import {BinaryExpressionHelper} from "../helpers/binary-expression-helper";

export class MathCodegen {
    public static AddFunction(name: string, arg1: string, arg2: string): FunctionDeclaration {
        const a = factory.createIdentifier(arg1);
        const b = factory.createIdentifier(arg2);
        return MathFunctionHelper.GenerateMathFunction(
            name,
            [a, b],
            [factory.createReturnStatement(BinaryExpressionHelper.Add(a, b))]
        );
    }

    public static SubtractFunction(name: string, arg1: string, arg2: string): FunctionDeclaration {
        const a = factory.createIdentifier(arg1);
        const b = factory.createIdentifier(arg2);
        return MathFunctionHelper.GenerateMathFunction(
            name,
            [a, b],
            [factory.createReturnStatement(BinaryExpressionHelper.Subtract(a, b))]
        );
    }

    public static MultiplyFunction(name: string, arg1: string, arg2: string): FunctionDeclaration {
        const a = factory.createIdentifier(arg1);
        const b = factory.createIdentifier(arg2);
        return MathFunctionHelper.GenerateMathFunction(
            name,
            [a, b],
            [factory.createReturnStatement(BinaryExpressionHelper.Multiply(a, b))]
        );
    }

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