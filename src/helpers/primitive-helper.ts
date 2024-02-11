import {factory, KeywordTypeNode, KeywordTypeSyntaxKind, SyntaxKind} from "typescript";

export class PrimitiveHelper {
    /**
     * Returns the Number keyword as a KeywordTypeNode
     * @constructor
     */
    public static get Number(): KeywordTypeNode {
        return this.Selector(SyntaxKind.NumberKeyword);
    }
    /**
     * Returns the String keyword as a KeywordTypeNode
     * @constructor
     */
    public static get String(): KeywordTypeNode {
        return this.Selector(SyntaxKind.StringKeyword);
    }

    /**
     * Returns a given KeywordTypeKind selector and returns a KeywordTypeNode of the same type
     * @param selector
     * @constructor
     */
    public static Selector(selector: KeywordTypeSyntaxKind): KeywordTypeNode {
        return factory.createKeywordTypeNode(selector);
    }
}