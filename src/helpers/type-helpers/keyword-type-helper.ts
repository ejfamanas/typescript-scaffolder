import {factory, KeywordTypeNode, KeywordTypeSyntaxKind, SyntaxKind} from "typescript";

export class KeywordTypeHelper {
    /**
     * Returns the Any keyword as a KeywordTypeNode
     * @constructor
     */
    public static get Any(): KeywordTypeNode {
        return this.Selector(SyntaxKind.AnyKeyword);
    }
    /**
     * Returns the Boolean keyword as a KeywordTypeNode
     * @constructor
     */
    public static get Boolean(): KeywordTypeNode {
        return this.Selector(SyntaxKind.BooleanKeyword);
    }
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
     * Returns the Undefined keyword as a KeywordTypeNode
     * @constructor
     */
    public static get Undefined(): KeywordTypeNode {
        return this.Selector(SyntaxKind.UndefinedKeyword);
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