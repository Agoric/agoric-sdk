import { test } from 'tape-promise/tape';
import bundleSource from '..';

function runTests({ rollup, pathResolve, resolvePlugin, dirname }) {
  test('explicit authority', async t => {
    const { moduleFormat: mf1, source: src1 } = await bundleSource(
      `${dirname}/../demo/dir1`,
      'getExport',
      {
        rollup,
        resolvePlugin,
        pathResolve,
      },
    );
    t.equal(mf1, 'getExport', 'module format is getExport');
    t.assert(src1.match(/require\('@agoric\/harden'\)/), 'harden is required');
    t.end();
  });
}

/* Access process authority only if invoked as a script. */
/* eslint-disable global-require */
if (typeof require !== 'undefined' && typeof module !== 'undefined') {
  runTests({
    rollup: require('rollup').rollup,
    pathResolve: require('path').resolve,
    resolvePlugin: require('rollup-plugin-node-resolve'),
    dirname: __dirname,
  });
}
