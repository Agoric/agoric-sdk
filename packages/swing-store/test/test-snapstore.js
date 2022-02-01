// @ts-check

import '@endo/init';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
// eslint-disable-next-line import/no-extraneous-dependencies
import tmp from 'tmp';
import { makeSnapStore } from '../src/snapStore.js';

test('build temp file; compress to cache file', async t => {
  const pool = tmp.dirSync({ unsafeCleanup: true });
  t.teardown(() => pool.removeCallback());
  t.log({ pool: pool.name });
  await fs.promises.mkdir(pool.name, { recursive: true });
  const store = makeSnapStore(pool.name, {
    ...tmp,
    ...path,
    ...fs,
    ...fs.promises,
  });
  let keepTmp = '';
  const hash = await store.save(async fn => {
    t.falsy(fs.existsSync(fn));
    fs.writeFileSync(fn, 'abc');
    keepTmp = fn;
  });
  t.is(
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    hash,
  );
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

  const io = { ...tmp, ...path, ...fs, ...fs.promises };
  const store = makeSnapStore(pool.name, io);

  const hashes = [];
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const h = await store.save(async fn =>
      fs.promises.writeFile(fn, `file ${i}`),
    );
    hashes.push(h);
  }
  t.is(fs.readdirSync(pool.name).length, 5);

  t.notThrows(() => store.commitDeletes());

  // @ts-ignore
  t.throws(() => store.prepareToDelete(1));
  t.throws(() => store.prepareToDelete('../../../etc/passwd'));
  t.throws(() => store.prepareToDelete('/etc/passwd'));

  store.prepareToDelete(hashes[2]);
  store.commitDeletes();
  t.deepEqual(fs.readdirSync(pool.name).length, 4);

  // Restore (re-save) between prepare and commit.
  store.prepareToDelete(hashes[3]);
  await store.save(async fn => fs.promises.writeFile(fn, `file 3`));
  store.commitDeletes();
  t.true(fs.readdirSync(pool.name).includes(`${hashes[3]}.gz`));

  hashes.forEach(store.prepareToDelete);
  store.prepareToDelete('does not exist');
  t.throws(() => store.commitDeletes());
  // but it deleted the rest of the files
  t.deepEqual(fs.readdirSync(pool.name), []);

  // ignore errors while clearing out pending deletes
  store.commitDeletes(true);

  // now we shouldn't see any errors
  store.commitDeletes();
});
