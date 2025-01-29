// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, Far, passStyleOf } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import { createRequire } from 'module';
import { ChainAddressShape } from '../../src/typeGuards.js';
import { commonSetup } from '@agoric/fast-usdc/test/supports.js';
import { AmountMath } from '@agoric/ertp';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';

const nodeRequire = createRequire(import.meta.url);

const contractName = 'myOrchContract';
const contractFile = nodeRequire.resolve('../../src/examples/my.contract.js');
type StartFn = typeof import('../../src/examples/my.contract.js').start;

const { add, isGTE, make, subtract, min } = AmountMath;

test('start my orch contract', async t => {
  const common = await commonSetup(t);
  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  t.log('contract deployment', contractName);

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);
  t.is(passStyleOf(installation), 'remotable');

  const myKit = await E(zoe).startInstance(
    installation,
    {}, // issuers
    {}, // terms
    common.commonPrivateArgs, // privateArgs
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

  const hookAddress = await E(myKit.publicFacet).getHookAddress();
  t.log('hookAddress', hookAddress);
  t.notThrows(() => mustMatch(hookAddress, ChainAddressShape));

  const { brands, utils } = common;
  const { bankManager } = common.bootstrap;
  const receiveUSDCAt = async (addr: string, amount: NatValue) => {
    const pmt = await utils.pourPayment(make(brands.usdc.brand, amount));
    const purse = E(E(bankManager).getBankForAddress(addr)).getPurse(
      brands.usdc.brand,
    );
    return E(purse).deposit(pmt);
  };

  brands.usdc.brand;
  const howMuch = brands.usdc.units(3);
  t.log('send', howMuch, hookAddress); // IOU
  await receiveUSDCAt(hookAddress.value, howMuch.value);

  await eventLoopIteration(); // wait for bridge I/O
});
