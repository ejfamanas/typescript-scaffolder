import {BinaryExpression, factory, Identifier, PunctuationSyntaxKind, PunctuationToken, SyntaxKind} from "typescript";

export class BinaryExpressionHelper {
    public static Add(left: Identifier, right: Identifier): BinaryExpression {
        return factory.createBinaryExpression(
            left,
            this.Selector<SyntaxKind.PlusToken>(SyntaxKind.PlusToken),
            right
        );
    }

    public static Selector<T>(selector: PunctuationSyntaxKind): PunctuationToken<T> {
        return factory.createToken(selector) as PunctuationToken<T>;
    }
}