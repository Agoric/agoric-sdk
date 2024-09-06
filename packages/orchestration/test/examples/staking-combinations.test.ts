import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { inspectMapStore } from '@agoric/internal/src/testing-utils.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import path from 'path';
import { protoMsgMocks, UNBOND_PERIOD_SECONDS } from '../ibc-mocks.js';
import { commonSetup } from '../supports.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractFile = `${dirname}/../../src/examples/staking-combinations.contract.js`;
type StartFn =
  typeof import('@agoric/orchestration/src/examples/staking-combinations.contract.js').start;

test('start', async t => {
  const {
    bootstrap: { timer, vowTools: vt },
    brands: { ist },
    mocks: { ibcBridge },
    commonPrivateArgs,
  } = await commonSetup(t);

  let contractBaggage;
  const { zoe, bundleAndInstall } = await setUpZoeForTest({
    setJig: ({ baggage }) => {
      contractBaggage = baggage;
    },
  });
  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);

  const { publicFacet } = await E(zoe).startInstance(
    installation,
    { Stable: ist.issuer },
    {},
    commonPrivateArgs,
  );

  const inv = E(publicFacet).makeAccount();

  t.is(
    (await E(zoe).getInvitationDetails(inv)).description,
    'Make an ICA account',
  );

  const userSeat = await E(zoe).offer(
    inv,
    {},
    {},
    {
      chainName: 'osmosis',
    },
  );

  const result = await vt.when(E(userSeat).getOfferResult());
  t.like(result, {
    publicSubscribers: {
      account: {
        description: 'Staking Account holder status',
        storagePath: 'mockChainStorageRoot.cosmos1test',
      },
    },
  });

  // Here the account would get funded through Cosmos native operations.

  // Delegate the funds like so, but don't bother executing the offer
  // because the balances aren't tracked.
  const delegateInv = await E(result.invitationMakers).Delegate(
    { value: '10', encoding: 'bech32', chainId: 'osmosis' },
    {
      denom: 'osmo',
      value: 10n,
    },
  );
  t.like(await E(zoe).getInvitationDetails(delegateInv), {
    description: 'Delegate',
  });

  // Undelegate the funds using the guest flow
  ibcBridge.addMockAck(
    // observed in console
    'eyJ0eXBlIjoxLCJkYXRhIjoiQ2xnS0pTOWpiM050YjNNdWMzUmhhMmx1Wnk1Mk1XSmxkR0V4TGsxeloxVnVaR1ZzWldkaGRHVVNMd29MWTI5emJXOXpNWFJsYzNRU0VtTnZjMjF2YzNaaGJHOXdaWEl4ZEdWemRCb01DZ1YxYjNOdGJ4SURNVEF3IiwibWVtbyI6IiJ9',
    protoMsgMocks.undelegate.ack,
  );
  const undelegateInvVow = await E(
    result.invitationMakers,
  ).UndelegateAndTransfer([
    { validatorAddress: 'cosmosvaloper1test', shares: '100' },
  ]);
  const undelegateInv = await vt.when(undelegateInvVow);
  t.like(await E(zoe).getInvitationDetails(undelegateInv), {
    description: 'Undelegate and transfer',
  });

  const undelegateUserSeat = await E(zoe).offer(undelegateInv);

  // Wait for the unbonding period
  timer.advanceBy(UNBOND_PERIOD_SECONDS * 1000n);

  const undelegateResult = await vt.when(
    E(undelegateUserSeat).getOfferResult(),
  );
  t.is(undelegateResult, 'guest undelegateAndTransfer complete');

  // snapshot the resulting contract baggage
  const tree = inspectMapStore(contractBaggage);
  t.snapshot(tree, 'contract baggage after start');
});
