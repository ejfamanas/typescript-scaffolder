import {
    BinaryExpression,
    factory,
    Identifier,
    PunctuationSyntaxKind,
    PunctuationToken,
    SyntaxKind
} from "typescript";

export class BinaryExpressionHelper {
    /**
     * Returns an addition expression given a left and right argument, passed in as the Identifier type
     * @param left
     * @param right
     * @constructor
     */
    public static Add(left: Identifier, right: Identifier): BinaryExpression {
        return factory.createBinaryExpression(
            left,
            this.Selector(SyntaxKind.PlusToken),
            right
        );
    }

    /**
     * Returns a subtraction expression given a left and right argument, passed in as the Identifier type
     * @param left
     * @param right
     * @constructor
     */
    public static Subtract(left: Identifier, right: Identifier): BinaryExpression {
        return factory.createBinaryExpression(
            left,
            this.Selector(SyntaxKind.MinusToken),
            right
        );
    }

    /**
     * Returns a multiplication expression given a left and right argument, passed in as the Identifier type
     * @param left
     * @param right
     * @constructor
     */
    public static Multiply(left: Identifier, right: Identifier): BinaryExpression {
        return factory.createBinaryExpression(
            left,
            this.Selector(SyntaxKind.AsteriskToken),
            right
        );
    }

    /**
     * Returns a division expression given a left and right argument, passed in as the Identifier type
     * @param left
     * @param right
     * @constructor
     */
    public static Divide(left: Identifier, right: Identifier): BinaryExpression {
        return factory.createBinaryExpression(
            left,
            this.Selector(SyntaxKind.SlashToken),
            right
        );
    }
    /**
     * Returns a given PunctuationSyntaxKind selector and returns a PunctuationToken of the same type
     * @param selector
     * @constructor
     */
    public static Selector(selector: PunctuationSyntaxKind): PunctuationToken<any> {
        return factory.createToken(selector);
    }
}