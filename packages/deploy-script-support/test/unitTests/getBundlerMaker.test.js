// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import bundleSource from '@endo/bundle-source';

import { start } from '../../src/endo-pieces-contract.js';
import { makeGetBundlerMaker } from '../../src/getBundlerMaker.js';

test('getBundlerMaker - already made', async t => {
  const lookup = async path => {
    t.deepEqual(path, ['scratch', 'bundlerMaker']);
    return 'BUNDLER_MAKER_FOUND';
  };
  // @ts-expect-error omitting args for test
  const getBundlerMaker = makeGetBundlerMaker({}, { lookup });

  const bundler = await getBundlerMaker({ log: t.log });
  // @ts-expect-error mock lookup result
  t.is(bundler, 'BUNDLER_MAKER_FOUND');
});

test('getBundlerMaker - not yet made', async t => {
  /** @type {any} */
  let bundlerMaker;
  const zoe = {
    install: async b => {
      const bundle = await b;
      t.deepEqual(Object.keys(bundle), [
        'moduleFormat',
        'endoZipBase64',
        'endoZipBase64Sha512',
      ]);
      t.is(bundle.moduleFormat, 'endoZipBase64');
      return 'INSTALA!';
    },
    startInstance: async inst => {
      t.is(await inst, 'INSTALA!');
      const started = start();
      bundlerMaker = started.publicFacet;
      return started;
    },
  };

  const board = {
    getId: async obj => {
      t.is(obj, bundlerMaker);
      return 'BUNDLER_MAKER_BOARD_ID';
    },
  };

  let scratchBundlerMaker;
  const scratch = {
    set: (key, value) => {
      t.is(scratchBundlerMaker, undefined);
      scratchBundlerMaker = value;
      t.is(key, 'bundlerMaker');
      t.is(value, bundlerMaker);
    },
  };

  const lookup = async path => {
    t.deepEqual(path, ['scratch', 'bundlerMaker']);
    return scratchBundlerMaker;
  };

  const getBundlerMaker = makeGetBundlerMaker(
    { board, scratch, zoe },
    { lookup, bundleSource },
  );
  const bundler = await getBundlerMaker({ log: t.log });
  t.assert(bundler);
  t.is(bundler, bundlerMaker);
  const bundler2 = await getBundlerMaker({ log: t.log });
  t.assert(bundler2);
  t.is(bundler2, bundlerMaker);
  t.is(bundler, bundlerMaker);
});
