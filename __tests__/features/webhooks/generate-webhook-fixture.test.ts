import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Project } from 'ts-morph';
import { generateWebhookFixture } from "../../../src";

describe('generateWebhookFixture', () => {
    let tmpDir: string;
    let project: Project;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fixture-gen-'));
        project = new Project({useInMemoryFileSystem: false});
    });

    afterEach(() => {
        // best-effort cleanup
        try {
            const entries = fs.readdirSync(tmpDir);
            for (const e of entries) {
                fs.rmSync(path.join(tmpDir, e), {recursive: true, force: true});
            }
            fs.rmdirSync(tmpDir);
        } catch {
            /* ignore */
        }
    });

    it('emits a typed fixture with faker import and depth-aware indentation', () => {
        // 1) Create a minimal interface file we can import from
        const ifaceDir = path.join(tmpDir, 'interfaces');
        fs.mkdirSync(ifaceDir, {recursive: true});
        const ifacePath = path.join(ifaceDir, 'User.ts');
        fs.writeFileSync(
            ifacePath,
            `
export interface User {
  id: string;
  email: string;
  createdAt: Date;
  profile: {
    name: string;
    city: string;
  };
  tags: string[];
  items: Array<{
    id: string;
    title: string;
  }>;
}
      `.trim() + '\n'
        );

        // 2) Run the generator
        const outputDir = tmpDir; // write fixture next to tmpDir root for easy reading
        generateWebhookFixture(
            'User',
            // import path should be relative to the outputDir; we compute a relative module spec
            './' + path.relative(outputDir, ifacePath).replace(/\\/g, '/').replace(/\.ts$/, ''),
            outputDir,
            project,
            'mockUser'
        );

        // 3) Persist files to disk (ts-morph writes happen on project.save)
        project.saveSync();

        // 4) Read the generated fixture
        const fixturePath = path.join(outputDir, 'User.fixture.ts');
        expect(fs.existsSync(fixturePath)).toBe(true);
        const txt = fs.readFileSync(fixturePath, 'utf8');

        // 5) Basic structure checks
        expect(txt).toMatch(/import\s+type\s+\{\s*User\s*\}\s+from\s+['"].+User['"];?/);
        expect(txt).toMatch(/from\s+['"]@faker-js\/faker['"];?/);
        expect(txt).toMatch(/export\s+const\s+mockUser\s*:\s*User\s*=\s*\{/);

        // 6) Field presence (top level)
        expect(txt).toMatch(/id:\s*faker\.string\.uuid\(\),?/);
        expect(txt).toMatch(/email:\s*faker\.internet\.email\(\),?/);
        // createdAt is emitted as a Date (per generator logic)
        expect(txt).toMatch(/createdAt:\s*(faker\.date\.past\(\)\s+as\s+any\s+as\s+Date|new Date\(\).toISOString\(\)),?/);

        // 7) Nested object indentation (profile block)
        // Expect a nested object with two-space deeper indentation than "profile:"
        // profile: {
        //   name: ...
        //   city: ...
        // },
        expect(txt).toMatch(
            /profile:\s*\{\n\s{4}name:\s+.+,\n\s{4}city:\s+.+,\n\s{2}\},/
        );

        // 8) Array of strings: tags
        // Could be one-liner or multi-line; allow either but must be an array literal
        expect(txt).toMatch(/tags:\s*\[.*\]/s);

        // 9) Array of objects: items should render as multi-line with properly indented inner object
        // items: [
        //   {
        //     id: ...
        //     title: ...
        //   }
        // ],
        expect(txt).toMatch(
            /items:\s*\[\s*\{\s*\n\s{6}id:\s+.+,\n\s{6}title:\s+.+,\n\s{4}\}\s*\n\s{2}\],/
        );

        // 10) Closing assertion: ends with a typed assertion
        expect(txt.trim()).toMatch(/\}\s+as\s+User;?$/);
    });

    it('falls back gracefully when interface cannot be parsed', () => {
        // point to a non-existent interface file
        const outputDir = tmpDir;
        const bogusImport = './does/not/exist/User';

        generateWebhookFixture('User', bogusImport, outputDir, project, 'mockUser');
        project.saveSync();

        const fixturePath = path.join(outputDir, 'User.fixture.ts');
        const txt = fs.readFileSync(fixturePath, 'utf8');

        // Fallback stub should be present
        expect(txt).toMatch(/export\s+const\s+mockUser\s*:\s*User\s*=\s*\{\}\s+as\s+User;?/);
    });

    it('covers unions, enums, arrays, deep objects, and name-based faker heuristics', () => {
        const ifaceDir = path.join(tmpDir, 'interfaces-advanced');
        fs.mkdirSync(ifaceDir, { recursive: true });
        const ifacePath = path.join(ifaceDir, 'Mega.ts');
        fs.writeFileSync(
            ifacePath,
            `
export enum PaymentStatus { Paid = 'paid', Open = 'open' }
export enum Color { Red, Green }

export interface Mega {
  // unions
  kind: 'A' | 'B';
  maybe: string | null | undefined;
  unionOnly: 'X' | 'Y';

  // string literal
  fixed: "hello";

  // date
  createdAt: Date;

  // enum
  status: PaymentStatus;
  color: Color;

  // deep/nested
  deep: { a: { b: { c: { d: string } } } };
  empty: {};
  tuples: Array<{ a: string; b: string }>;
  count: number;
  active: boolean;
  foo: string;

  // arrays
  items: Array<{ id: string }>;
  tags: string[];

  // name-based heuristics
  userId: string;
  email: string;
  name: string;
  phone: string;
  url: string;
  ip: string;
  city: string;
  country: string;
  zip: string;
  address: string;
  message: string;
  updated_at: string;
}
          `.trim() + '\n'
        );

        const outputDir = tmpDir;
        generateWebhookFixture(
            'Mega',
            './' + path.relative(outputDir, ifacePath).replace(/\\/g, '/').replace(/\.ts$/, ''),
            outputDir,
            project,
            'mockMega'
        );
        project.saveSync();

        const fixturePath = path.join(outputDir, 'Mega.fixture.ts');
        expect(fs.existsSync(fixturePath)).toBe(true);
        const txt = fs.readFileSync(fixturePath, 'utf8');

        // Unions: first literal is chosen; be tolerant to quote style
        expect(txt).toMatch(/kind:\s*['"]A['"]/);

        // Clean literal-only union
        expect(txt).toMatch(/unionOnly:\s*['"]X['"]/);

        // Nullable union: ensure a non-null value is emitted (heuristic faker call); just assert presence
        expect(txt).toMatch(/maybe:\s*.+/);

        // String literal preserved
        expect(txt).toMatch(/fixed:\s*['"]hello['"]/);

        // Date field mapping
        expect(txt).toMatch(/createdAt:\s*(faker\.date\.past\(\)\s+as\s+any\s+as\s+Date|new Date\(\)\.toISOString\(\))/);

        // Enum emits a literal (first value), not the enum identifier
        expect(txt).toMatch(/status:\s*['"](paid|open)['"]/);

        // Numeric enum branch uses Object.values(Enum)[0] or first member
        expect(txt).toMatch(/color:\s*(\(Object\.values\(Color\)[^)]*\)\[0\]|Color\.(Red|Green))/);

        // Array of objects should render multi-line inner object
        expect(txt).toMatch(/items:\s*\[\s*\{\s*\n\s{6}id:\s+.+,\n\s{4}\}\s*\n\s{2}\],/);

        // Array of strings allowed inline or multi-line
        expect(txt).toMatch(/tags:\s*\[[\s\S]*?\]/);

        // Deep object: tolerate current depth-capping that collapses `c` and deeper
        expect(txt).toMatch(/deep:\s*\{[\s\S]*?a:\s*\{[\s\S]*?b:\s*\{\}\s+as\s+any,?[\s\S]*?\}[\s\S]*?\},/);

        // Empty object branch
        expect(txt).toMatch(/empty:\s*\{\}\s+as\s+any/);

        // Multiline array of objects for tuples
        expect(txt).toMatch(/tuples:\s*\[\s*\{\s*\n\s{6}a:\s+.+,\n\s{6}b:\s+.+,?\n\s{4}\}\s*\n\s{2}\],/);

        // Number and boolean branches
        expect(txt).toMatch(/count:\s*faker\.number\.int\(/);
        expect(txt).toMatch(/active:\s*faker\.(datatype\.boolean|bool)\(/);

        // Default string fallback when no name hint
        expect(txt).toMatch(/foo:\s*faker\.lorem\.word\(\)/);

        // Name-based heuristics (be tolerant to faker API variants between versions)
        expect(txt).toMatch(/userId:\s*faker\.(string\.uuid|datatype\.uuid)\(\)/);
        expect(txt).toMatch(/email:\s*faker\.(internet\.email|helpers\.regexpToString)\(/);
        expect(txt).toMatch(/name:\s*faker\.(person\.fullName|name\.fullName|lorem\.word)\(/);
        expect(txt).toMatch(/phone:\s*faker\.(phone\.number|string\.numeric)\(/);
        expect(txt).toMatch(/url:\s*faker\.(internet\.url|internet\.domainName)\(/);
        expect(txt).toMatch(/ip:\s*faker\.(internet\.ip|internet\.ipv4|internet\.ipv6)\(/);
        expect(txt).toMatch(/city:\s*faker\.(location\.city|address\.city)\(/);
        expect(txt).toMatch(/country:\s*faker\.(location\.country|address\.country)\(/);
        expect(txt).toMatch(/zip:\s*faker\.(location\.zipCode|address\.zipCode|internet\.ip)\(/);
        expect(txt).toMatch(/address:\s*faker\.(location\.streetAddress|address\.streetAddress)\(/);
        expect(txt).toMatch(/message:\s*faker\.(lorem\.sentence|lorem\.lines|lorem\.words)\(/);

        // Date-ish string heuristic (updated_at) -> ISO string
        expect(txt).toMatch(/updated_at:\s*new Date\(\)\.toISOString\(\)/);
    });
});