import {factory, KeywordTypeNode, KeywordTypeSyntaxKind, SyntaxKind} from "typescript";

export class PrimitiveGenerator {
    /**
     * Returns the Number keyword as a KeywordTypeNode
     * @constructor
     */
    public static get Number(): KeywordTypeNode<SyntaxKind.NumberKeyword> {
        return this.Selector(SyntaxKind.NumberKeyword);
    }

    /**
     * Returns the String keyword as a KeywordTypeNode
     * @constructor
     */
    public static get String(): KeywordTypeNode<SyntaxKind.StringKeyword> {
        return this.Selector(SyntaxKind.StringKeyword);
    }
    /**
     * Returns any specified type as a KeywordTypeNode
     * @constructor
     */
    public static Selector<T>(selector: KeywordTypeSyntaxKind): KeywordTypeNode<T> {
        return factory.createKeywordTypeNode(selector) as KeywordTypeNode<T>;
    }
}