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
const contractFile = nodeRequire.resolve('../src/my.contract.ts');
type StartFn = typeof import('../src/my.contract.ts').start;

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

  const hookAddress = await E(myKit.publicFacet).getHookAddress();
  t.log('hookAddress', hookAddress);
  t.notThrows(() => mustMatch(hookAddress, ChainAddressShape));

  const { transferBridge } = common.mocks;
  const deposit = async (coins: CoinSDKType) => {
    const target = 'agoric1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqp7zqht'; // TODO: where does this come from?
    await VE(transferBridge).fromBridge(
      buildVTransferEvent({
        receiver: 'rx1...TODO',
        target,
        sourceChannel: 'channel-1', // TODO: hubToAg.transferChannel.counterPartyChannelId,
        denom: coins.denom,
        amount: Nat(BigInt(coins.amount)),
        sender: 'cosmos1xyz',
      }),
    );
    await eventLoopIteration(); // let contract do work
  };

  await t.notThrowsAsync(deposit({ amount: '10000000', denom: 'uatom' }));
});
