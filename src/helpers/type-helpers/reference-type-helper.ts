import {factory, KeywordTypeNode, KeywordTypeSyntaxKind, SyntaxKind, TypeReferenceNode} from "typescript";

export enum ReferenceType {
    Any = "any",
    Boolean = "boolean",
    Number = "number",
    String = "string",
    Undefined = "undefined",
}

export class ReferenceTypeHelper {
    /**
     * Returns the Any reference as a ReferenceTypeNode
     * @constructor
     */
    public static get Any(): TypeReferenceNode {
        return this.Selector(ReferenceType.Any)!;
    }

    /**
     * Returns the Boolean reference as a ReferenceTypeNode
     * @constructor
     */
    public static get Boolean(): TypeReferenceNode {
        return this.Selector(ReferenceType.Boolean)!;
    }

    /**
     * Returns the Number reference as a ReferenceTypeNode
     * @constructor
     */
    public static get Number(): TypeReferenceNode {
        return this.Selector(ReferenceType.Number)!;
    }

    /**
     * Returns the String reference as a ReferenceTypeNode
     * @constructor
     */
    public static get String(): TypeReferenceNode {
        return this.Selector(ReferenceType.String)!;
    }

    /**
     * Returns the Undefined reference as a ReferenceTypeNode
     * @constructor
     */
    public static get Undefined(): TypeReferenceNode {
        return this.Selector(ReferenceType.Undefined)!;
    }

    /**
     * Returns a given ReferenceTypeNode for a given ReferenceType selector
     * @constructor
     * @param typeName
     */
    public static Selector(typeName: ReferenceType | undefined): TypeReferenceNode | undefined {
        return typeName !== undefined ? factory.createTypeReferenceNode(typeName) : undefined;
    }
}