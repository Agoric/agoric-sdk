/* global __dirname */
import '@agoric/install-ses';
import test from 'ava';
import bundleSource from '..';
import { rollup } from 'rollup';
import {resolve as pathResolve} from 'path';
import resolvePlugin from '@rollup/plugin-node-resolve';

test('explicit authority', async t => {
  const { moduleFormat: mf1, source: src1 } = await bundleSource(
    `${__dirname}/../demo/dir1`,
    'getExport',
    {
      rollup,
      resolvePlugin,
      pathResolve,
    },
  );
  t.is(mf1, 'getExport', 'module format is getExport');
});
