// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import crypto from 'crypto';
import bundleSource from '@endo/bundle-source';
import { parseArchive } from '@endo/compartment-mapper';
import { decodeBase64 } from '@endo/base64';
import { computeBundleID } from '../../src/validate-archive.js';
import { makeKernelEndowments } from '../util.js';
import buildKernel from '../../src/kernel/index.js';
import { initializeKernel } from '../../src/kernel/initializeKernel.js';

test('install bundle', async t => {
  const endowments = makeKernelEndowments();
  const { kvStore } = endowments.hostStorage;
  initializeKernel({}, endowments.hostStorage);
  const kernel = buildKernel(endowments, {}, {});

  const bundleFile = new URL('./bootstrap-bundles.js', import.meta.url)
    .pathname;
  const bundle = await bundleSource(bundleFile);

  // my code to compute the bundleID
  const bundleID = await computeBundleID(bundle);
  // console.log(bundleID);

  // confirm that Endo agrees
  function computeSha512(bytes) {
    const hash = crypto.createHash('sha512');
    hash.update(bytes);
    return hash.digest().toString('hex');
  }
  const expectedSha512 = bundleID.slice(3);
  // eslint-disable-next-line no-unused-vars
  const a = await parseArchive(
    decodeBase64(bundle.endoZipBase64),
    '<unknown>',
    { computeSha512, expectedSha512 },
  );
  // Hrm, I see compartment-mapper/test/scaffold.js setup() and test-main.js
  // as examples, but I'm not sure how to build enough 'builtin' to let
  // .import work. It's not important to exercise here, though, all I really
  // care about is that my computeBundleID matches what Endo cares about
  // during parseArchive or other validation work it does
  // const importOptions = { Compartment };
  // const ns = await a.import(importOptions);
  // console.log(ns);

  const badVersion =
    'b2-00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
  await t.throwsAsync(() => kernel.installBundle(badVersion, bundle), {
    message: /is not a bundleID/,
  });

  const tooShort = 'b1-000';
  await t.throwsAsync(() => kernel.installBundle(tooShort, bundle), {
    message: /is not a bundleID/,
  });

  // actual installation should succeed
  kernel.installBundle(bundleID, bundle);
  t.deepEqual(JSON.parse(kvStore.get(`bundle.${bundleID}`)), bundle);

  // installing the same bundle twice is a NOP
  kernel.installBundle(bundleID, bundle);
  t.deepEqual(JSON.parse(kvStore.get(`bundle.${bundleID}`)), bundle);

  // the kernel's installBundle() doesn't validate
  const wrong =
    'b1-00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
  kernel.installBundle(wrong, bundle);
  t.deepEqual(JSON.parse(kvStore.get(`bundle.${wrong}`)), bundle);
});
