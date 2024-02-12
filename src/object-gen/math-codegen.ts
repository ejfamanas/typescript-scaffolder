import {factory, FunctionDeclaration} from "typescript";
import {BaseFunctionHelper} from "../helpers/base-function-helper";
import {BinaryExpressionHelper} from "../helpers/binary-expression-helper";
import {KeywordTypeHelper} from "../helpers/type-helpers/keyword-type-helper";
import {ITypedIdentifier} from "../models/typings";

export class MathCodegen {
    /**
     * Returns a named function declaration which performs an addition operation
     * @param name
     * @param arg1
     * @param arg2
     * @constructor
     */
    public static AddFunction(name: string, arg1: string, arg2: string): FunctionDeclaration {
        const [a,b]: Array<ITypedIdentifier> = [
            {identifier: factory.createIdentifier(arg1), keyword: KeywordTypeHelper.Number},
            {identifier: factory.createIdentifier(arg2), keyword: KeywordTypeHelper.Number}
        ];
        return BaseFunctionHelper.GenerateMathFunction(
            name,
            [a, b],
            [factory.createReturnStatement(BinaryExpressionHelper.Add(a.identifier, b.identifier))]
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
        const [a,b]: Array<ITypedIdentifier> = [
            {identifier: factory.createIdentifier(arg1), keyword: KeywordTypeHelper.Number},
            {identifier: factory.createIdentifier(arg2), keyword: KeywordTypeHelper.Number}
        ];
        return BaseFunctionHelper.GenerateMathFunction(
            name,
            [a, b],
            [factory.createReturnStatement(BinaryExpressionHelper.Subtract(a.identifier, b.identifier))]
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
        const [a,b]: Array<ITypedIdentifier> = [
            {identifier: factory.createIdentifier(arg1), keyword: KeywordTypeHelper.Number},
            {identifier: factory.createIdentifier(arg2), keyword: KeywordTypeHelper.Number}
        ];
        return BaseFunctionHelper.GenerateMathFunction(
            name,
            [a, b],
            [factory.createReturnStatement(BinaryExpressionHelper.Multiply(a.identifier, b.identifier))]
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
        const [a,b]: Array<ITypedIdentifier> = [
            {identifier: factory.createIdentifier(arg1), keyword: KeywordTypeHelper.Number},
            {identifier: factory.createIdentifier(arg2), keyword: KeywordTypeHelper.Number}
        ];
        return BaseFunctionHelper.GenerateMathFunction(
            name,
            [a, b],
            [factory.createReturnStatement(BinaryExpressionHelper.Divide(a.identifier, b.identifier))]
        );
    }
}