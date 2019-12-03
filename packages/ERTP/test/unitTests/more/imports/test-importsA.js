// Copyright (C) 2019 Agoric, under Apache License 2.0

import { test } from 'tape-promise/tape';
import { makeGoodImportManager } from './goodImports';

test('import num is not empty', t => {
  const importer = makeGoodImportManager();
  const name = 'numIsEmpty';
  const emptyFn = importer[name];
  t.notOk(emptyFn(30));
  t.end();
});

test('import num is empty', t => {
  const importer = makeGoodImportManager();
  const name = 'numIsEmpty';
  const emptyFn = importer[name];
  t.assert(emptyFn(0));
  t.end();
});

test('import listIsEmpty (false)', t => {
  const importer = makeGoodImportManager();
  const op = 'listIsEmpty';
  t.notok(importer[op]([20]));
  t.end();
});

test('import listIsEmpty (true)', t => {
  const importer = makeGoodImportManager();
  const op = 'listIsEmpty';
  t.assert(importer[op]([]));
  t.end();
});

test.skip('import not found', t => {
  const importer = makeGoodImportManager();
  t.throws(
    () => importer.lookupImport('emptyPixel'),
    /There is no entry for "c"./,
  );
  t.end();
});
