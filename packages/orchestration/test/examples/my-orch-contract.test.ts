// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, passStyleOf } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import { createRequire } from 'module';
import { commonSetup } from '../supports.js';

const nodeRequire = createRequire(import.meta.url);

const contractName = 'myOrchContract';
const contractFile = nodeRequire.resolve('../../src/examples/my.contract.js');
type StartFn = typeof import('../../src/examples/my.contract.js').start;

test('start my orch contract', async t => {
  const { commonPrivateArgs } = await commonSetup(t);
  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  t.log('contract deployment', contractName);

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);
  t.is(passStyleOf(installation), 'remotable');

  const myKit = await E(zoe).startInstance(
    installation,
    {}, // issuers
    {}, // terms
    commonPrivateArgs, // privateArgs
  );
  t.notThrows(() =>
    mustMatch(
      myKit,
      M.splitRecord({
        instance: M.remotable(),
        publicFacet: M.remotable(),
        creatorFacet: M.remotable(),
        // ...others are not relevant here
      }),
    ),
  );
});
