import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import path from 'path';
import { inspectMapStore } from '@agoric/internal/src/testing-utils.js';
import { QueryDelegatorDelegationsResponse } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js';
import { MsgUndelegateResponse } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { MsgTransferResponse } from '@agoric/cosmic-proto/ibc/applications/transfer/v1/tx.js';
import { QueryBalanceResponse } from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import { commonSetup } from '../supports.js';
import {
  buildMsgResponseString,
  buildQueryResponseString,
} from '../../tools/ibc-mocks.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractFile = `${dirname}/../../src/examples/unbond.contract.js`;
type StartFn =
  typeof import('@agoric/orchestration/src/examples/unbond.contract.js').start;

test('start', async t => {
  const {
    bootstrap: { timer, vowTools: vt },
    brands: { ist },
    commonPrivateArgs,
    mocks: { ibcBridge },
  } = await commonSetup(t);

  const buildMocks = () => {
    const makeDelegationsResponse = () =>
      buildQueryResponseString(QueryDelegatorDelegationsResponse, {
        delegationResponses: [
          {
            delegation: {
              delegatorAddress: 'cosmos1test',
              validatorAddress: 'cosmosvaloper1xyz',
              shares: '1000000',
            },
            balance: { denom: 'uosmo', amount: '1000000' },
          },
        ],
      });
    const makeUndelegateResponse = () =>
      buildMsgResponseString(MsgUndelegateResponse, {
        completionTime: { seconds: 3600n, nanos: 0 },
      });

    return {
      'eyJkYXRhIjoiQ2tNS0RRb0xZMjl6Ylc5ek1YUmxjM1FTTWk5amIzTnRiM011YzNSaGEybHVaeTUyTVdKbGRHRXhMbEYxWlhKNUwwUmxiR1ZuWVhSdmNrUmxiR1ZuWVhScGIyNXoiLCJtZW1vIjoiIn0=':
        makeDelegationsResponse(),
      'eyJ0eXBlIjoxLCJkYXRhIjoiQ2xzS0pTOWpiM050YjNNdWMzUmhhMmx1Wnk1Mk1XSmxkR0V4TGsxeloxVnVaR1ZzWldkaGRHVVNNZ29MWTI5emJXOXpNWFJsYzNRU0VXTnZjMjF2YzNaaGJHOXdaWEl4ZUhsNkdoQUtCWFZ2YzIxdkVnY3hNREF3TURBdyIsIm1lbW8iOiIifQ==':
        makeUndelegateResponse(),
      'eyJkYXRhIjoiQ2pvS0ZBb0xZMjl6Ylc5ek1YUmxjM1FTQlhWdmMyMXZFaUl2WTI5emJXOXpMbUpoYm1zdWRqRmlaWFJoTVM1UmRXVnllUzlDWVd4aGJtTmwiLCJtZW1vIjoiIn0=':
        buildQueryResponseString(QueryBalanceResponse, {
          balance: { denom: 'uosmo', amount: '1234' },
        }),
      'eyJ0eXBlIjoxLCJkYXRhIjoiQ25rS0tTOXBZbU11WVhCd2JHbGpZWFJwYjI1ekxuUnlZVzV6Wm1WeUxuWXhMazF6WjFSeVlXNXpabVZ5RWt3S0NIUnlZVzV6Wm1WeUVndGphR0Z1Ym1Wc0xUTXlOaG9OQ2dWMWIzTnRieElFTVRJek5DSUxZMjl6Ylc5ek1YUmxjM1FxREdOdmMyMXZjekYwWlhOME1USUFPSUR3MXRUQ3pySUciLCJtZW1vIjoiIn0=':
        buildMsgResponseString(MsgTransferResponse, {}),
    };
  };

  ibcBridge.setMockAck(buildMocks());

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

  const inv = E(publicFacet).makeUnbondAndTransferInvitation();

  t.is(
    (await E(zoe).getInvitationDetails(inv)).description,
    'Unbond and transfer',
  );

  const userSeat = await E(zoe).offer(
    inv,
    {},
    {},
    { validator: 'agoric1valopsfufu' },
  );
  const resultP = vt.when(E(userSeat).getOfferResult());
  t.truthy(resultP);

  // Wait for the completionTime to pass
  timer.advanceBy(3600n * 1000n);

  const result = await resultP;
  t.is(result, undefined);

  const tree = inspectMapStore(contractBaggage);
  t.snapshot(tree, 'contract baggage after start');
});
