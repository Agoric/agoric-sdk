// Copyright (C) 2019 Agoric, under Apache License 2.0

import '@agoric/install-ses';
import test from 'ava';
import { makeGoodImportManager } from './goodImports';

test('import num is not empty', t => {
  const importer = makeGoodImportManager();
  const name = 'numIsEmpty';
  const emptyFn = importer[name];
 t.falsy(emptyFn(30));
 return; // t.end();
});

test('import num is empty', t => {
  const importer = makeGoodImportManager();
  const name = 'numIsEmpty';
  const emptyFn = importer[name];
  t.assert(emptyFn(0));
 return; // t.end();
});

test('import listIsEmpty (false)', t => {
  const importer = makeGoodImportManager();
  const op = 'listIsEmpty';
 t.falsy(importer[op]([20]));
 return; // t.end();
});

test('import listIsEmpty (true)', t => {
  const importer = makeGoodImportManager();
  const op = 'listIsEmpty';
  t.assert(importer[op]([]));
 return; // t.end();
});

// TODO: This test throws because `lookupImport` does not exist. This
// test needs to be fixed.
test.skip('import not found', t => {
  const importer = makeGoodImportManager();
  t.throws(
    () => importer.lookupImport('emptyPixel'),
    { message: /There is no entry for "c"./ },
  );
 return; // t.end();
});
