import test from 'ava';
import { coins } from '@cosmjs/amino';

// FIXME does not work after SES init (add this back to package.json:
// "require": [
//     "@endo/init/debug.js"
//   ])
// import * as index from '../src/index.js';

import { agoric } from '../src/index.js';

console.log(agoric);

test('it works', async t => {
  const fee = {
    amount: coins(0, 'uosmo'),
    gas: '250000',
  };
  t.pass();
});
