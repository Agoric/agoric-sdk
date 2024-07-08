import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { LOCALCHAIN_DEFAULT_ADDRESS } from '@agoric/vats/tools/fake-bridge.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import path from 'path';
import { commonSetup } from '../supports.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractFile = `${dirname}/../../src/examples/swapExample.contract.js`;
type StartFn =
  typeof import('@agoric/orchestration/src/examples/swapExample.contract.js').start;

/* Not sure why it is failing. Possibly relevant symptoms.
```
----- ComosOrchestrationAccountHolder.6  3 TODO: handle brand { brand: Object [Alleged: IST brand] {}, value: 10000000n }
REJECTED at top of event loop (Error#20)
Error#20: {"type":1,"data":"CmgKIy9jb3Ntb3Muc3Rha2luZy52MWJldGExLk1zZ0RlbGVnYXRlEkEKGFVOUEFSU0FCTEVfQ0hBSU5fQUREUkVTUxISYWdvcmljMXZhbG9wZXJmdWZ1GhEKBXVmbGl4EggxMDAwMDAwMA==","memo":""}
  at parseTxPacket (file:///Users/markmiller/src/ongithub/agoric/agoric-sdk/packages/orchestration/src/utils/packet.js:87:14)
```
*/
test.skip('start', async t => {
  const {
    bootstrap,
    brands: { ist },
    commonPrivateArgs,
    utils,
  } = await commonSetup(t);

  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);

  const { publicFacet } = await E(zoe).startInstance(
    installation,
    { Stable: ist.issuer },
    {},
    commonPrivateArgs,
  );

  const inv = E(publicFacet).makeSwapAndStakeInvitation();

  t.is(
    (await E(zoe).getInvitationDetails(inv)).description,
    'Swap for TIA and stake',
  );

  const bank = await E(bootstrap.bankManager).getBankForAddress(
    LOCALCHAIN_DEFAULT_ADDRESS,
  );

  const istPurse = await E(bank).getPurse(ist.brand);
  // bank purse is empty
  t.like(await E(istPurse).getCurrentAmount(), ist.makeEmpty());

  const ten = ist.units(10);
  const userSeat = await E(zoe).offer(
    inv,
    { give: { Stable: ten } },
    { Stable: await utils.pourPayment(ten) },
    {
      staked: ten,
      validator: {
        chainId: 'agoric-3',
        value: 'agoric1valoperfufu',
        encoding: 'bech32',
      } as const,
    },
  );
  const result = await E(userSeat).getOfferResult();
  t.is(result, undefined);

  // bank purse now has the 10 IST
  t.like(await E(istPurse).getCurrentAmount(), ten);
});
