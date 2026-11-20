import test from 'ava';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { applyTelescopeFixes } from '../tools/telescope-cleanup.cjs';

for (const [label, anyImport] of [
  ['generated', "import { Any, AnyAmino } from './google/protobuf/any.js';"],
  [
    'previously cleaned',
    "import { Any } from './google/protobuf/any.js';\nimport type { AnyAmino } from './google/protobuf/any.js';",
  ],
]) {
  test(`registry cleanup repairs ${label} Amino imports and is idempotent`, async t => {
    const outPath = await mkdtemp(
      path.join(tmpdir(), 'cosmic-proto-registry-'),
    );
    t.teardown(() => rm(outPath, { recursive: true, force: true }));
    const filePath = path.join(outPath, 'registry.ts');
    await writeFile(
      filePath,
      `${anyImport}
import { IProtoType, TelescopeGeneratedCodec } from './types.js';
export class Registry {
  static fromAminoMsg<T, Amino>(object: AnyAmino): T { return object.value; }
  static toAminoMsg<T, Amino>(object: T): AnyAmino { return { type: 'test', value: object }; }
}
`,
    );
    t.deepEqual(await applyTelescopeFixes({ outPath }), [filePath]);
    const source = await readFile(filePath, 'utf8');
    t.false(source.includes('AnyAmino'));
    t.true(
      source.includes(
        'import type { IAminoMsg, IProtoType, TelescopeGeneratedCodec }',
      ),
    );
    t.true(source.includes('fromAminoMsg<T, Amino>(object: IAminoMsg<Amino>)'));
    t.true(
      source.includes('toAminoMsg<T, Amino>(object: T): IAminoMsg<Amino>'),
    );
    t.deepEqual(await applyTelescopeFixes({ outPath }), []);
    t.is(await readFile(filePath, 'utf8'), source);
  });
}
