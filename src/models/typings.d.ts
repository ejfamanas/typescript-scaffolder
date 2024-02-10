import {Identifier} from "typescript";

export type GenReturnType = "Void" | "Number" | "String";

export type FunctionSchematic = {
    name: string,
    genRetType: GenReturnType,
    args: Array<Identifier>
}