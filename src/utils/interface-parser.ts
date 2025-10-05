import { InterfaceDeclaration, Project, ProjectOptions, ts } from "ts-morph";
import { ParsedInterface, ParsedProperty } from "models/interface-definitions";

export function parseProperty(prop: import("ts-morph").PropertySignature): ParsedProperty {
    const name = prop.getName();
    const typeObj = prop.getType();
    const symbol = typeObj.getSymbol();
    let type = symbol ? symbol.getName() : typeObj.getText();

    let elementType: string | undefined;

    if (typeObj.isArray()) {
        const elementTypeObj = typeObj.getArrayElementType();
        if (elementTypeObj) {
            if (elementTypeObj.isString()) {
                type = "array";
                elementType = "string";
            } else if (elementTypeObj.isNumber()) {
                type = "array";
                elementType = "number";
            } else if (elementTypeObj.isBoolean()) {
                type = "array";
                elementType = "boolean";
            } else {
                type = "array";
                elementType = elementTypeObj.getText();
            }
        }
    }

    // Support for generic array types like Array<string> and ReadonlyArray<number>
    if (
        !elementType &&
        (symbol?.getName() === "Array" || symbol?.getName() === "ReadonlyArray")
    ) {
        const typeArgs = typeObj.getTypeArguments();
        if (typeArgs.length === 1) {
            const arg = typeArgs[0];
            type = "array";
            if (arg.isString()) {
                elementType = "string";
            } else if (arg.isNumber()) {
                elementType = "number";
            } else if (arg.isBoolean()) {
                elementType = "boolean";
            } else {
                elementType = arg.getText();
            }
        }
    }

    let unionTypes: (string | number)[] | undefined;
    let enumValues: (string | number)[] | undefined;

    // Detect enum values
    if (symbol?.getDeclarations?.()[0]?.getKindName() === "EnumDeclaration") {
        const enumDecl = symbol.getDeclarations?.()[0]?.asKind(ts.SyntaxKind.EnumDeclaration);
        if (enumDecl) {
            const members = enumDecl.getMembers();
            const values = members.map(m => {
                const val = m.getValue();
                return typeof val === "string" || typeof val === "number" ? val : m.getName();
            });
            type = "enum";
            unionTypes = values;
            enumValues = values;
        }
    }

    // Detect union of string literals (only if not already marked as enum)
    if (!enumValues && typeObj.isUnion()) {
        const union = typeObj.getUnionTypes();
        const allLiterals = union.every(t => t.isStringLiteral());
        if (allLiterals) {
            unionTypes = union.map(t => t.getLiteralValue() as string);
            type = "union";
        }
    }

    const optional = prop.hasQuestionToken();
    const jsDoc = prop.getJsDocs().map(doc => doc.getComment()).filter(Boolean).join("\n");

    return {name, type, optional, jsDoc, unionTypes, elementType, enumValues};
}


export function extractInterfacesFromFile(filePath: string): ParsedInterface[] {
    const projectOptions: { compilerOptions: { skipLibCheck: boolean; forceConsistentCasingInFileNames: boolean; module: ts.ModuleKind; strict: boolean; target: ts.ScriptTarget; esModuleInterop: boolean } } = {
        compilerOptions: {
            target: ts.ScriptTarget.ES2015,
            module: ts.ModuleKind.CommonJS,
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
        }
    };
    const project = new Project(projectOptions as ProjectOptions);

    const sourceFile = project.addSourceFileAtPath(filePath);
    const interfaces: ParsedInterface[] = [];

    sourceFile.getInterfaces().forEach((iface: InterfaceDeclaration) => {
        const name = iface.getName();
        const typeParameters = iface.getTypeParameters().map(tp => tp.getName());
        let properties: ParsedProperty[] = iface.getProperties().map(parseProperty);

        // Merge extended interfaces' properties (inherited)
        iface.getExtends().forEach(heritageClause => {
            const baseType = heritageClause.getExpression().getType();
            const baseSymbol = baseType.getSymbol();
            const baseDeclaration = baseSymbol?.getDeclarations()?.[0];
            if (baseDeclaration && ts.isInterfaceDeclaration(baseDeclaration.compilerNode)) {
                const baseIface = baseDeclaration as InterfaceDeclaration;
                const baseProps = baseIface.getProperties().map(parseProperty);
                properties = [...baseProps, ...properties];
            }
        });

        interfaces.push({name, properties, typeParameters});
    });

    return interfaces;
}