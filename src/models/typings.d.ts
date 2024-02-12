import {Identifier, KeywordTypeNode} from "typescript";
import {ReferenceType} from "../helpers/type-helpers/reference-type-helper";

export interface ITypedIdentifier {
    readonly identifier: Identifier,
    readonly referenceType?: ReferenceType,
    readonly keyword?: KeywordTypeNode,
}