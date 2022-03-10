// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import crypto from 'crypto';
import bundleSource from '@endo/bundle-source';
import { parseArchive } from '@endo/compartment-mapper';
import { decodeBase64 } from '@endo/base64';
import { makeKernelEndowments } from '../util.js';
import buildKernel from '../../src/kernel/index.js';
import { initializeKernel } from '../../src/controller/initializeKernel.js';

test('install bundle', async t => {
  const endowments = makeKernelEndowments();
  const { kvStore } = endowments.hostStorage;
  initializeKernel({}, endowments.hostStorage);
  const kernel = buildKernel(endowments, {}, {});

  const bundleFile = new URL('./bootstrap-bundles.js', import.meta.url)
    .pathname;
  // during the transition to endo's new format, preemptively ignore the
  // hash it provides
  let bundle = await bundleSource(bundleFile);
  const { endoZipBase64Sha512: expectedSha512 } = bundle;
  const bundleID = `b1-${expectedSha512}`;
  bundle = harden({
    moduleFormat: bundle.moduleFormat,
    endoZipBase64: bundle.endoZipBase64,
  });

  // confirm that Endo agrees
  function computeSha512(bytes) {
    const hash = crypto.createHash('sha512');
    hash.update(bytes);
    return hash.digest().toString('hex');
  }

  // eslint-disable-next-line no-unused-vars
  const a = await parseArchive(
    decodeBase64(bundle.endoZipBase64),
    '<unknown>',
    { computeSha512, expectedSha512 },
  );

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
