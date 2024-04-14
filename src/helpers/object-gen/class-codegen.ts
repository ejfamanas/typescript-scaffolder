import {
    ClassDeclaration,
    factory,
    FunctionDeclaration,
    ImportDeclaration,
    InterfaceDeclaration,
    SyntaxKind
} from "typescript";
import {BaseClassHelper, IBaseClass} from "../declaration-helpers/base-class-helper";
import {BaseImportHelper} from "../declaration-helpers/base-import-helper";
import {BaseInterfaceHelper} from "../declaration-helpers/base-interface-helper";
import {IBaseImport, IBaseInterface} from "../declaration-helpers/models";

export interface IClassCodeGenConf {
    readonly classes: Array<IBaseClass>;
    readonly imports?: Array<IBaseImport>;
    readonly interfaces?: Array<IBaseInterface>;
    readonly functions?: Array<FunctionDeclaration>;
}

export interface IClassCodeGen {
    readonly classes: Array<ClassDeclaration>;
    readonly imports: Array<ImportDeclaration>;
    readonly interfaces: Array<InterfaceDeclaration>;
}

export class ClassCodegen {
    public static FullClassFile(config: IClassCodeGenConf): IClassCodeGen {
        const imports: Array<ImportDeclaration> =
            (config.imports || []).map(i => BaseImportHelper.GenerateImport(i));
        const interfaces: Array<InterfaceDeclaration> =
            (config.interfaces || []).map(i => BaseInterfaceHelper.GenerateInterface(i))
        const classes = config.classes.map(c => this.ExportableClass(c));
        return {classes, imports, interfaces}
    }
    /**
     * Generates a basic class with the export keyword
     * @param name
     * @param identifiers
     * @constructor
     */
    public static ExportableClass({name, identifiers}: IBaseClass): ClassDeclaration {
        return BaseClassHelper.GenerateClass (
            {
                name,
                identifiers,
                modifiers: [factory.createModifier(SyntaxKind.ExportKeyword)]
            }
        );
    }
}