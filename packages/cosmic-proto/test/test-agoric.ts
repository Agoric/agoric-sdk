/* eslint-disable @typescript-eslint/prefer-ts-expect-error */
import test from 'ava';
import { coins } from '@cosmjs/amino';

// FIXME does not work after SES init (add this back to package.json:
// "require": [
//     "@endo/init/debug.js"
//   ])
// import * as index from '../src/index.js';

// @ts-ignore tsc thinks Module '"../src/index.js"' has no exported member 'agoric'.
import { agoric } from '../src/index.js';

test('it loads', t => {
  t.deepEqual(Object.keys(agoric), [
    'lien',
    'swingset',
    'vbank',
    'vibc',
    'vstorage',
    'ClientFactory',
  ]);
});
