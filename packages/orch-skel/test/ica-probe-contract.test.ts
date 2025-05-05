// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { CoinSDKType } from '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { heapVowE as VE } from '@agoric/vow/vat.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, passStyleOf } from '@endo/far';
import { Nat } from '@endo/nat';
import { M, mustMatch } from '@endo/patterns';
import { createRequire } from 'module';
import { ChainAddressShape } from '@agoric/orchestration';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { commonSetup } from './supports.js';

const nodeRequire = createRequire(import.meta.url);

const contractName = 'myOrchContract';
const contractFile = nodeRequire.resolve('../src/ica-probe.contract.js');
type StartFn = typeof import('../src/ica-probe.contract.js').start;

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
    common.commonPrivateArgs,
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

  {
    const toRegister = await E(myKit.publicFacet).makeRegisterChainInvitation();
    const { osmosis: chainInfo } = common.commonPrivateArgs.chainInfo;
    const seat = await E(zoe).offer(
      toRegister,
      {},
      {},
      { name: 'osmosis', chainInfo },
    );
    const result = await E(seat).getOfferResult();
    t.log('register result', result);
    t.is(result, 'osmosis');
  }
  {
    const toMakeICA = await E(myKit.publicFacet).makeMakeICAIinvitation();
    const seat = await E(zoe).offer(
      toMakeICA,
      {},
      {},
      { chainName: 'osmosis' },
    );
    const { vowTools } = common.utils;
    const result = await vowTools.when(await E(seat).getOfferResult());
    t.log('register result', result);
    t.deepEqual(result, {
      chainId: 'osmosis-1',
      encoding: 'bech32',
      value: 'cosmos1test',
    });
  }
});
