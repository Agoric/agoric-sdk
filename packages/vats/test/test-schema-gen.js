import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import * as fsAmbient from 'fs/promises';
// XXX how to use devDependencies from tests??
// eslint-disable-next-line import/no-extraneous-dependencies
import { Value } from '@sinclair/typebox/value';

import { SwingSetConfig } from '@agoric/swingset-vat/src/typeGuards.js';
import { toTypeBox } from '../tools/schema-gen.js';

const makeTestContext = () => {
  const asset = spec => fsAmbient.readFile(spec, 'utf8');
  return {
    asset,
    writeFile: fsAmbient.writeFile,
  };
};

test.before(async t => {
  t.context = makeTestContext();
});

test('Generate JSON schema for editing swingset config files', async t => {
  const { asset, writeFile } = t.context;

  const schema = toTypeBox(SwingSetConfig);
  t.truthy(schema);

  // XXX KLUDGE: write schema during test
  await writeFile('schema1.json', JSON.stringify(schema, null, 2));

  const config = await asset('decentral-devnet-config.json').then(s =>
    JSON.parse(s),
  );
  t.truthy(config);
  t.deepEqual(Value.Errors(schema, config), []);
});
