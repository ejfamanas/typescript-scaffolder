import ts from "typescript";
import {MathCodegen} from "./src/object-gen/math-codegen";

function print(nodes: any) {
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

print([
    MathCodegen.AddFunction("test", "a", "b"),
    MathCodegen.SubtractFunction("test", "a", "b"),
    MathCodegen.MultiplyFunction("test", "a", "b"),
    MathCodegen.DivideFunction("test", "a", "b"),
])