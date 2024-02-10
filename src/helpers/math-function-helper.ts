import ts, {factory, FunctionDeclaration, ParameterDeclaration} from "typescript";
import {FunctionSchematic} from "../models/typings";
import {PrimitiveGenerator} from "../helpers/primitive-generator";

export class FunctionGenerator {
    // making this private to prevent duplicate instantiation
    private constructor() {
    }

    public static GenerateBinaryFunction(obj: FunctionSchematic): FunctionDeclaration {
        const {name, genRetType, args} = obj;
        const parameters: Array<ParameterDeclaration> = args.length === 0 ? args : args.map((d) => {
            return ts.factory.createParameterDeclaration(
                undefined,
                undefined,
                d,
                undefined,
                PrimitiveGenerator.Number,
                undefined
            );
        })
        return factory.createFunctionDeclaration(
            undefined,
            undefined,
            name,
            undefined,
            parameters,
            PrimitiveGenerator.Number,
            factory.createBlock(
                [],
                true
            )
        );
    }

    private static
}