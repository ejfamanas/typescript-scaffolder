import * as path from 'path';
import { Project, InterfaceDeclaration, Type } from 'ts-morph';

/**
 * Generate a fixture file for a given interface by introspecting the interface's properties
 * and assigning reasonable faker-generated defaults based on type (and sometimes name).
 *
 * The file is written to `${outputDir}/${interfaceName}.fixture.ts` and exports
 * `simulatedWebhookPayload` typed as the given interface.
 */
export function generateWebhookFixture(
  interfaceName: string,
  interfaceImportPath: string,
  outputDir: string,
  project: Project,
  exportConstName = 'simulatedWebhookPayload'
): void {
  const normalizedImport = interfaceImportPath.startsWith('.')
    ? interfaceImportPath
    : `./${interfaceImportPath}`;

  const fixtureFilePath = path.join(outputDir, `${interfaceName}.fixture.ts`);
  const fixtureFile = project.createSourceFile(fixtureFilePath, '', { overwrite: true });

  // Type-only import of the interface
  fixtureFile.addImportDeclaration({
    isTypeOnly: true,
    namedImports: [interfaceName],
    moduleSpecifier: normalizedImport,
  });


  // Also import faker in the generated file
  fixtureFile.addImportDeclaration({
    moduleSpecifier: '@faker-js/faker',
    namedImports: ['faker'],
  });

  // Try to load and parse the interface source to build a dynamic payload
  const absInterfacePath = path.resolve(
    outputDir,
    normalizedImport.endsWith('.ts') ? normalizedImport : `${normalizedImport}.ts`
  );

  const tmpProject = new Project({ useInMemoryFileSystem: false });
  const ifaceSource = tmpProject.addSourceFileAtPathIfExists(absInterfacePath);

  let objectLines: string[] | null = null;

  if (ifaceSource) {
    const iface: InterfaceDeclaration | undefined = ifaceSource.getInterface(interfaceName);
    if (iface) {
      objectLines = iface.getProperties().map((prop) => {
        const name = prop.getName();
        const type = prop.getType();
        const valueExpr = fakerExprFor(name, type, 2, 2);
        return `  ${name}: ${valueExpr},`;
      });
    }
  }

  if (!objectLines) {
    // Fallback stub when parsing failed
    fixtureFile.addStatements([
      `// TODO: Populate with faker-generated fields that satisfy ${interfaceName}`,
      `export const ${exportConstName}: ${interfaceName} = {} as ${interfaceName};`,
    ]);
    return;
  }

  fixtureFile.addStatements([
    `// Auto-generated from interface ${interfaceName}`,
    `export const ${exportConstName}: ${interfaceName} = {`,
    ...objectLines,
    `} as ${interfaceName};`,
  ]);
}

function fakerExprFor(name: string, type: Type, depth = 1, indent = 0): string {
  // Handle unions of string literals: pick the first literal value
  if (type.isUnion()) {
    const parts = type.getUnionTypes();
    if (parts.length > 0 && parts.every((t) => t.isStringLiteral())) {
      const v = parts[0].getLiteralValue();
      return JSON.stringify(v);
    }
    // If union includes null/undefined with a primary type, take the primary
    const nonNullable = parts.filter((t) => !t.isNull() && !t.isUndefined());
    if (nonNullable.length === 1) {
      return fakerExprFor(name, nonNullable[0], depth, indent);
    }
  }

  // Primitive types
  if (type.isString()) {
    return fakerStringByName(name);
  }
  if (type.isNumber()) {
    return 'faker.number.int({ min: 1, max: 10000 })';
  }
  if (type.isBoolean()) {
    return 'faker.datatype.boolean()';
  }

  // Date type (as object)
  const text = type.getText();
  if (text === 'Date') {
    return 'faker.date.past() as any as Date';
  }

  // Arrays
  if (type.isArray()) {
    const elem = type.getArrayElementType();
    if (elem) {
      const inner = fakerExprFor(name.replace(/s$/,'') || 'item', elem, Math.max(0, depth - 1), indent + 2);
      return inner.includes('\n') ? `[\n${inner}\n${' '.repeat(indent)}]` : `[${inner}]`;
    }
    return '[]';
  }

  // String literal type
  if (type.isStringLiteral()) {
    return JSON.stringify(type.getLiteralValue());
  }

  // Enum-like: try to detect enum declaration and pick first member
  const sym = type.getSymbol();
  const decl = sym?.getDeclarations()[0];
  if (decl && decl.getKindName && decl.getKindName() === 'EnumDeclaration') {
    const enumName = sym!.getName();
    // Best-effort: use first member via Object.values
    return `(Object.values(${enumName}) as any)[0]`;
  }

  // Object or anything else: shallow placeholder or nested object
  return buildObjectLiteralForType(type, depth, indent);
}

function buildObjectLiteralForType(type: Type, depth: number, indent: number): string {
  if (depth <= 0) {
    return '{} as any';
  }
  const props = type.getProperties();
  if (props.length === 0) {
    return '{} as any';
  }
  const pad = ' '.repeat(indent);
  const pad2 = ' '.repeat(indent + 2);
  const lines: string[] = [`${pad}{`];
  for (const sym of props) {
    const name = sym.getName();
    const decls = sym.getDeclarations();
    if (decls.length === 0) {
      continue;
    }
    const propType = decls[0].getType();
    const valueExpr = fakerExprFor(name, propType, depth - 1, indent + 2);
    lines.push(`${pad2}${name}: ${valueExpr},`);
  }
  lines.push(`${pad}}`);
  return lines.join('\n');
}

function fakerStringByName(name: string): string {
  const lower = name.toLowerCase();
  if (/(^|_)id$/.test(lower) || lower.endsWith('id')) return 'faker.string.uuid()';
  if (lower.includes('email')) return 'faker.internet.email()';
  if (lower.includes('name')) return 'faker.person.fullName()';
  if (lower.includes('phone')) return 'faker.phone.number()';
  if (lower.includes('url')) return 'faker.internet.url()';
  if (lower.includes('ip')) return 'faker.internet.ip()';
  if (lower.includes('city')) return 'faker.location.city()';
  if (lower.includes('country')) return 'faker.location.country()';
  if (lower.includes('postcode') || lower.includes('zip')) return 'faker.location.zipCode()';
  if (lower.includes('address')) return 'faker.location.streetAddress()';
  if (lower.includes('message') || lower.includes('desc')) return 'faker.lorem.sentence()';
  if (lower.includes('date') || lower.endsWith('at') || lower.endsWith('_at')) return 'new Date().toISOString()';
  return 'faker.lorem.word()';
}