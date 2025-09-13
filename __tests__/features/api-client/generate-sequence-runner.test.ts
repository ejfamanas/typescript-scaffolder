import fs from 'fs';
import os from 'os';
import path from 'path';
import { Logger } from "../../../src/utils/logger";
import { buildTreeFromSequence } from "../../../src/utils/sequence-tree-builder";
import { generateSequenceFromFile, generateSequenceRunner, generateSequencesFromPath } from "../../../src";

// --- helpers ---
const tmpdir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'seq-runner-'));
const read = (fp: string) => fs.readFileSync(fp, 'utf-8');

describe('generate-sequence-runner', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateSequenceRunner (single sequence file content)', () => {
    it('emits fetchList with extract.field and loop', () => {
      const out = tmpdir();
      jest.spyOn(Logger, 'info').mockImplementation(() => {});
      jest.spyOn(Logger, 'warn').mockImplementation(() => {});
      jest.spyOn(Logger, 'debug').mockImplementation(() => {});

      const sequence = {
        name: 'PopulatePeople',
        steps: [
          { id: 'fetchPeople', type: 'fetchList', endpoint: '/people', extract: { as: 'people', field: 'data' } },
          { id: 'loopPeople', type: 'loop', over: 'people', itemName: 'person', steps: [] },
        ],
      } as const;

      const tree = buildTreeFromSequence(sequence as any);
      generateSequenceRunner(sequence as any, tree, out, 'svc');

      const fp = path.join(out, 'PopulatePeople.runner.ts');
      const code = read(fp);

      // Header + import
      expect(code).toContain('// Auto-generated runner for sequence: PopulatePeople');
      expect(code).toContain('// Service: svc');
      expect(code).toContain(`import { apiRegistry } from "../registry";`);

      // Function signature
      expect(code).toContain('export async function runPopulatePeople() {');

      // fetchList + extract.field
      expect(code).toContain(`const response = await apiRegistry["svc"].getAll_people();`);
      expect(code).toContain(`const people = response.data;`);

      // loop
      expect(code).toContain(`for (const person of people) {`);
    });

    it('emits action with path param only', () => {
      const out = tmpdir();
      jest.spyOn(Logger, 'debug').mockImplementation(() => {});

      const sequence = {
        name: 'UpdateOne',
        steps: [
          {
            id: 'loop',
            type: 'loop',
            over: 'people',
            itemName: 'person',
            steps: [
              { id: 'upd', type: 'action', method: 'put', endpoint: '/people/:person.id' },
            ],
          },
        ],
      } as const;

      const tree = buildTreeFromSequence(sequence as any);
      generateSequenceRunner(sequence as any, tree, out, 'svc');

      const code = read(path.join(out, 'UpdateOne.runner.ts'));
      expect(code).toContain(`await apiRegistry["svc"].put_people(person.id);`);
    });

    it('emits action with static body', () => {
      const out = tmpdir();
      const sequence = {
        name: 'UpdateBody',
        steps: [
          {
            id: 'loop',
            type: 'loop',
            over: 'people',
            itemName: 'person',
            steps: [
              {
                id: 'upd',
                type: 'action',
                method: 'put',
                endpoint: '/people/:person.id',
                body: { active: true, source: 'smoke' },
              },
            ],
          },
        ],
      } as const;

      const tree = buildTreeFromSequence(sequence as any);
      generateSequenceRunner(sequence as any, tree, out, 'svc');
      const code = read(path.join(out, 'UpdateBody.runner.ts'));

      expect(code).toContain(
        `await apiRegistry["svc"].put_people(person.id, { active: true, source: "smoke" });`
      );
    });

    it('emits action with interpolated body and extract', () => {
      const out = tmpdir();
      const sequence = {
        name: 'UpdateWithEmail',
        steps: [
          { id: 'fetch', type: 'fetchList', endpoint: '/people', extract: { as: 'people', field: 'data' } },
          {
            id: 'loop',
            type: 'loop',
            over: 'people',
            itemName: 'person',
            steps: [
              {
                id: 'upd',
                type: 'action',
                method: 'put',
                endpoint: '/people/:person.id',
                body: { email: '{{person.email}}', updatedBy: 'interpolator' },
                extract: { as: 'updatedEmailId', field: 'id' },
              },
            ],
          },
        ],
      } as const;

      const tree = buildTreeFromSequence(sequence as any);
      generateSequenceRunner(sequence as any, tree, out, 'svc');
      const code = read(path.join(out, 'UpdateWithEmail.runner.ts'));

      // fetch + field
      expect(code).toContain(`const response = await apiRegistry["svc"].getAll_people();`);
      expect(code).toContain(`const people = response.data;`);

      // param + interpolated body
      expect(code).toContain(
        `const response = await apiRegistry["svc"].put_people(person.id, { email: person.email, updatedBy: "interpolator" });`
      );
      // extract into variable
      expect(code).toContain(`const updatedEmailId = response.id;`);
    });
  });

  describe('drivers', () => {
    it('generateSequenceFromFile writes one file per sequence', () => {
      const out = tmpdir();
      jest.spyOn(Logger, 'info').mockImplementation(() => {});

      const cfg = {
        serviceName: 'svc',
        sequences: [
          { name: 'One', steps: [] },
          { name: 'Two', steps: [] },
        ],
      };
      const cfgPath = path.join(out, 'seqs.json');
      fs.writeFileSync(cfgPath, JSON.stringify(cfg), 'utf-8');

      generateSequenceFromFile(cfgPath, out);

      expect(fs.existsSync(path.join(out, 'One.runner.ts'))).toBe(true);
      expect(fs.existsSync(path.join(out, 'Two.runner.ts'))).toBe(true);
    });

    it('generateSequencesFromPath writes into sequences/ and skips files missing serviceName', () => {
      const root = tmpdir();
      const input = path.join(root, 'in');
      const out = path.join(root, 'out');
      fs.mkdirSync(input, { recursive: true });
      fs.mkdirSync(out, { recursive: true });

      const good = { serviceName: 'svc', sequences: [{ name: 'A', steps: [] }] };
      const bad = { sequences: [{ name: 'B', steps: [] }] }; // missing serviceName

      fs.writeFileSync(path.join(input, 'good.json'), JSON.stringify(good), 'utf-8');
      fs.writeFileSync(path.join(input, 'bad.json'), JSON.stringify(bad), 'utf-8');

      const ensureSpy = jest.spyOn(require('../../../src/utils/file-system'), 'ensureDir');
      const infoSpy = jest.spyOn(Logger, 'info').mockImplementation(() => {});
      const warnSpy = jest.spyOn(Logger, 'warn').mockImplementation(() => {});

      generateSequencesFromPath(input, out);

      const outFile = path.join(out, 'sequences', 'A.runner.ts');
      expect(fs.existsSync(outFile)).toBe(true);
      expect(ensureSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled(); // missing serviceName warning for bad.json

      ensureSpy.mockRestore();
      infoSpy.mockRestore();
      warnSpy.mockRestore();
    });
  });
});