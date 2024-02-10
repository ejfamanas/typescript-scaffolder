import {factory, FunctionDeclaration} from "typescript";
import {MathFunctionHelper} from "../helpers/math-function-helper";
import {BinaryExpressionHelper} from "../helpers/binary-expression-helper";

export class MathCodegen {
    public static AddFunction(name: string, arg1: string, arg2: string): FunctionDeclaration {
        const a = factory.createIdentifier(arg1);
        const b = factory.createIdentifier(arg2);
        return MathFunctionHelper.GenerateMathFunction(
            name,
            [a,b],
            [factory.createReturnStatement(BinaryExpressionHelper.Add(a,b))]
        )
    }
}