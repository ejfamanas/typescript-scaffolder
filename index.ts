import ts, {factory} from "typescript";
import {MathFunctionCodegen} from "./src/hoc-codegen/functions/math-function-codegen";
import {ITypedIdentifier} from "./src/helpers/models/typings";
import {ReferenceType} from "./src/helpers/type-helpers/reference-type-helper";
import {InterfaceCodegen} from "./src/helpers/object-gen/interface-codegen";
import {ClassCodegen, IClassCodeGenConf} from "./src/helpers/object-gen/class-codegen";
import {IBaseClass} from "./src/helpers/declaration-helpers/base-class-helper";

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
]);