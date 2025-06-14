import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  Order,
  State,
} from '@agoric/cosmic-proto/ibc/core/channel/v1/channel.js';
import type { ChainInfo, IBCConnectionInfo } from '@agoric/orchestration';
import { HubName } from '@agoric/orchestration/src/exos/chain-hub.js';
import { objectMap } from '@endo/patterns';
import { HubName as HubNameCopy } from '../src/chain-info.core.js';
import { makeAssetInfo } from '../src/chain-name-service.js';
import { mixConnections } from '../src/orch.start.ts';

const plain: Record<string, ChainInfo> = {
  agoric: {
    namespace: 'cosmos',
    reference: 'ag-3',
    chainId: 'ag-3',
    bech32Prefix: 'agoric',
  },
  noble: {
    namespace: 'cosmos',
    reference: 'c2id',
    chainId: 'c2id',
    bech32Prefix: 'noble',
  },
};
const conns: Record<string, IBCConnectionInfo> = {
  'ag-3_c2id': {
    client_id: 't1',
    id: 'connection-0',
    state: 1,
    counterparty: { client_id: 't22', connection_id: 'connection-23' },
    transferChannel: {
      channelId: 'channel-0',
      counterPartyChannelId: 'channel-55',
      counterPartyPortId: 'transfer',
      portId: 'transfer',
      ordering: Order.ORDER_ORDERED,
      state: State.STATE_OPEN,
      version: '1',
    },
  },
};

test('mixConnections gets both directions right', t => {
  const actual = mixConnections(plain, conns);
  t.log(
    objectMap(
      actual,
      info =>
        info.namespace === 'cosmos' && Object.keys(info.connections || {}),
    ),
  );
  t.like(actual, {
    noble: { connections: { 'ag-3': { id: 'connection-23' } } },
  });
});

test('makeAssetInfo uusdc on agoric', t => {
  const tokenMap = { agoric: ['ubld'], noble: ['uusdc'] };
  const actual = makeAssetInfo(mixConnections(plain, conns), tokenMap);
  t.like(Object.fromEntries(actual), {
    'ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5': {
      baseDenom: 'uusdc',
      baseName: 'noble',
      chainName: 'agoric',
    },
  });
});

test('HubName consistency', t => {
  t.deepEqual(HubName, HubNameCopy);
});
