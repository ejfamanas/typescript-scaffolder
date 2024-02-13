import ts, {factory} from "typescript";
import {MathFunctionCodegen} from "./src/object-gen/math-function-codegen";
import {ITypedIdentifier} from "./src/models/typings";
import {ReferenceType} from "./src/helpers/type-helpers/reference-type-helper";
import {InterfaceCodegen} from "./src/object-gen/interface-codegen";
import {ClassCodegen} from "./src/object-gen/class-codegen";

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
const obj = {
    name: "test",
    identifiers: [1,2,3,4].map((el:number): ITypedIdentifier => {
        return {
            identifier: factory.createIdentifier(el.toString()),
            referenceType: ReferenceType.Number
        }
    })
}

print([
    MathFunctionCodegen.AddFunction("test", "a", "b"),
    MathFunctionCodegen.SubtractFunction("test", "a", "b"),
    MathFunctionCodegen.MultiplyFunction("test", "a", "b"),
    MathFunctionCodegen.DivideFunction("test", "a", "b"),
    InterfaceCodegen.ExportableInterface(obj.name, obj.identifiers),
    ClassCodegen.ExportableClass(obj.name, obj.identifiers)
]);