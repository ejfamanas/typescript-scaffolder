import {ReferenceType} from "../type-helpers/reference-type-helper";
import {Identifier, KeywordTypeNode} from "typescript";

export interface ITypedIdentifier {
    readonly identifier: Identifier;
    readonly referenceType?: ReferenceType;
    readonly keyword?: KeywordTypeNode;
}

