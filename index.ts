import ts, {factory} from "typescript";
import {MathCodegen} from "./src/object-gen/math-codegen";
import {ITypedIdentifier} from "./src/models/typings";
import {ReferenceType} from "./src/helpers/type-helpers/reference-type-helper";
import {InterfaceCodegen} from "./src/object-gen/interface-codegen";

function print(nodes: any) {
    const printer = ts.createPrinter({newLine: ts.NewLineKind.LineFeed});
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
    InterfaceCodegen.ExportableInterface("test", [1, 1, 1, 1].map((el: number): ITypedIdentifier => {
        return {
            identifier: factory.createIdentifier(el.toString()),
            referenceType: ReferenceType.Number
        }
    }))
]);