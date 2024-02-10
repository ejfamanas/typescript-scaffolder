// code from: https://dev.to/rametta/typescript-code-generation-epn

// function add(a: number, b: number): number {
//   return a + b;
// }

import ts from "typescript";

const aId = ts.factory.createIdentifier("a");
const bId = ts.factory.createIdentifier("b");
const addId = ts.factory.createIdentifier("add");
const numberKeyword = ts.factory.createKeywordTypeNode(
    ts.SyntaxKind.NumberKeyword
);

const addFunc = ts.factory.createFunctionDeclaration(
    undefined,
    undefined,
    addId,
    undefined,
    [
        ts.factory.createParameterDeclaration(
            undefined,
            undefined,
            aId,
            undefined,
            numberKeyword,
            undefined
        ),
        ts.factory.createParameterDeclaration(
            undefined,
            undefined,
            bId,
            undefined,
            numberKeyword,
            undefined
        ),
    ],
    numberKeyword,
    ts.factory.createBlock(
        [
            ts.factory.createReturnStatement(
                ts.factory.createBinaryExpression(
                    aId,
                    ts.factory.createToken(ts.SyntaxKind.PlusToken),
                    bId
                )
            ),
        ],
        true
    )
);

function print(nodes) {
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const resultFile = ts.createSourceFile(
        "temp.ts",
        "",
        ts.ScriptTarget.Latest,
        false,
        ts.ScriptKind.TSX
    );

    console.log(printer.printList(ts.ListFormat.MultiLine, nodes, resultFile));
}

print([addFunc]);