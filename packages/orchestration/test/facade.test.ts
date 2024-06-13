import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { setupZCFTest } from '@agoric/zoe/test/unitTests/zcf/setupZcfTest.js';
import type { CosmosChainInfo, IBCConnectionInfo } from '../src/cosmos-api.js';
import { makeOrchestrationFacade } from '../src/facade.js';
import type { Chain } from '../src/orchestration-api.js';
import { commonSetup } from './supports.js';
import { makeChainHub } from '../src/utils/chainHub.js';

const test = anyTest;

export const mockChainInfo: CosmosChainInfo = harden({
  chainId: 'mock-1',
  icaEnabled: false,
  icqEnabled: false,
  pfmEnabled: false,
  ibcHooksEnabled: false,
  stakingTokens: [{ denom: 'umock' }],
});
export const mockChainConnection: IBCConnectionInfo = {
  id: 'connection-0',
  client_id: '07-tendermint-2',
  counterparty: {
    client_id: '07-tendermint-2',
    connection_id: 'connection-1',
    prefix: {
      key_prefix: '',
    },
  },
  state: 3 /* IBCConnectionState.STATE_OPEN */,
  transferChannel: {
    portId: 'transfer',
    channelId: 'channel-1',
    counterPartyChannelId: 'channel-1',
    counterPartyPortId: 'transfer',
    ordering: 1 /* Order.ORDER_UNORDERED */,
    state: 3 /* IBCConnectionState.STATE_OPEN */,
    version: 'ics20-1',
  },
};

const makeLocalChainAccountKit = () => assert.fail(`not used`);

test('chain info', async t => {
  const { bootstrap, facadeServices } = await commonSetup(t);

  const zone = bootstrap.rootZone;

  const { zcf } = await setupZCFTest();
  const chainHub = makeChainHub(facadeServices.agoricNames);

  const { orchestrate } = makeOrchestrationFacade({
    ...facadeServices,
    storageNode: bootstrap.storage.rootNode,
    zcf,
    zone,
    chainHub,
    makeLocalChainAccountKit,
  });

  chainHub.registerChain('mock', mockChainInfo);
  chainHub.registerConnection(
    'agoric-3',
    mockChainInfo.chainId,
    mockChainConnection,
  );

  const handle = orchestrate('mock', {}, async orc => {
    return orc.getChain('mock');
  });

  const result = (await handle()) as Chain<any>;
  t.deepEqual(await result.getChainInfo(), mockChainInfo);
});

test.todo('contract upgrade');
