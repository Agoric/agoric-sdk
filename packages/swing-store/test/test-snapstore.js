// @ts-check

import '@endo/init/debug.js';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
// eslint-disable-next-line import/no-extraneous-dependencies
import tmp from 'tmp';
import { makeMeasureSeconds } from '@agoric/internal';
import { makeSnapStore } from '../src/snapStore.js';

test('build temp file; compress to cache file', async t => {
  const pool = tmp.dirSync({ unsafeCleanup: true });
  t.teardown(() => pool.removeCallback());
  t.log({ pool: pool.name });
  await fs.promises.mkdir(pool.name, { recursive: true });
  const store = makeSnapStore(pool.name, {
    ...tmp,
    tmpFile: tmp.file,
    ...path,
    ...fs,
    ...fs.promises,
    measureSeconds: makeMeasureSeconds(() => 0),
  });
  let keepTmp = '';
  const result = await store.save(async filePath => {
    t.falsy(fs.existsSync(filePath));
    fs.writeFileSync(filePath, 'abc');
    keepTmp = filePath;
  });
  const { hash } = result;
  const expectedHash =
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  t.like(result, {
    hash: expectedHash,
    filePath: path.resolve(pool.name, `${expectedHash}.gz`),
    rawByteCount: 3,
    rawSaveSeconds: 0,
    compressSeconds: 0,
  });
  t.is(await store.has(hash), true);
  const zero =
    '0000000000000000000000000000000000000000000000000000000000000000';
  t.is(await store.has(zero), false);
  t.falsy(
    fs.existsSync(keepTmp),
    'temp file should have been deleted after withTempName',
  );
  const dest = path.resolve(pool.name, `${hash}.gz`);
  t.truthy(fs.existsSync(dest), 'save() produces file named after hash');
  const gz = fs.readFileSync(dest);
  const contents = zlib.gunzipSync(gz);
  t.is(contents.toString(), 'abc', 'gunzip(contents) matches original');
});

test('snapStore prepare / commit delete is robust', async t => {
  const pool = tmp.dirSync({ unsafeCleanup: true });
  t.teardown(() => pool.removeCallback());

  const io = {
    ...tmp,
    tmpFile: tmp.file,
    ...path,
    ...fs,
    ...fs.promises,
    measureSeconds: makeMeasureSeconds(() => 0),
  };
  const store = makeSnapStore(pool.name, io);

  const hashes = [];
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { hash } = await store.save(async fn =>
      fs.promises.writeFile(fn, `file ${i}`),
    );
    hashes.push(hash);
  }
  t.is(fs.readdirSync(pool.name).length, 5);

  await t.notThrowsAsync(() => store.commitDeletes());

  // @ts-expect-error
  t.throws(() => store.prepareToDelete(1));
  t.throws(() => store.prepareToDelete('../../../etc/passwd'));
  t.throws(() => store.prepareToDelete('/etc/passwd'));

  store.prepareToDelete(hashes[2]);
  await store.commitDeletes();
  t.deepEqual(fs.readdirSync(pool.name).length, 4);

  // Restore (re-save) between prepare and commit.
  store.prepareToDelete(hashes[3]);
  await store.save(async fn => fs.promises.writeFile(fn, `file 3`));
  await store.commitDeletes();
  t.true(fs.readdirSync(pool.name).includes(`${hashes[3]}.gz`));

  hashes.forEach(store.prepareToDelete);
  store.prepareToDelete('does not exist');
  await t.throwsAsync(() => store.commitDeletes());
  // but it deleted the rest of the files
  t.deepEqual(fs.readdirSync(pool.name), []);

  // ignore errors while clearing out pending deletes
  await store.commitDeletes(true);

  // now we shouldn't see any errors
  await store.commitDeletes();
});
