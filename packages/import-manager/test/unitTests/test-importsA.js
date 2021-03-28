// Copyright (C) 2019 Agoric, under Apache License 2.0
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { makeGoodImportManager } from './goodImports';

test('import num is not empty', t => {
  const importer = makeGoodImportManager();
  const name = 'numIsEmpty';
  const emptyFn = importer[name];
  t.falsy(emptyFn(30));
});

test('import num is empty', t => {
  const importer = makeGoodImportManager();
  const name = 'numIsEmpty';
  const emptyFn = importer[name];
  t.truthy(emptyFn(0));
});

test('import listIsEmpty (false)', t => {
  const importer = makeGoodImportManager();
  const op = 'listIsEmpty';
  t.falsy(importer[op]([20]));
});

test('import listIsEmpty (true)', t => {
  const importer = makeGoodImportManager();
  const op = 'listIsEmpty';
  t.truthy(importer[op]([]));
});

// TODO: This test throws because `lookupImport` does not exist. This
// test needs to be fixed.
test.skip('import not found', t => {
  const importer = makeGoodImportManager();
  t.throws(() => importer.lookupImport('emptyPixel'), {
    message: /There is no entry for "c"./,
  });
});
