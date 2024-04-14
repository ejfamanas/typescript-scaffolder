import {ITypedIdentifier} from "../models/typings";
import {KeywordTypeNode, ModifierLike, ReturnStatement} from "typescript";


export interface IBaseImport {
    readonly name: string;
    readonly identifiers: Array<ITypedIdentifier>;
}

export interface IBaseInterface {
    readonly name: string,
    readonly identifiers: Array<ITypedIdentifier>,
    readonly modifiers?: Array<ModifierLike>
}

export interface IBaseFunction {
    readonly name: string,
    readonly identifiers: Array<ITypedIdentifier>,
    readonly statements: Array<ReturnStatement>,
    readonly keyword: KeywordTypeNode
    readonly modifiers?: Array<ModifierLike>;
}