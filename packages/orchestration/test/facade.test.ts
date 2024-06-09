import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { setupZCFTest } from '@agoric/zoe/test/unitTests/zcf/setupZcfTest.js';
import type { CosmosChainInfo } from '../src/cosmos-api.js';
import { makeOrchestrationFacade } from '../src/facade.js';
import type { Chain } from '../src/orchestration-api.js';
import { commonSetup } from './supports.js';

const test = anyTest;

export const mockChainInfo: CosmosChainInfo = harden({
  chainId: 'mock-1',
  connections: {},
  icaEnabled: false,
  icqEnabled: false,
  pfmEnabled: false,
  ibcHooksEnabled: false,
  stakingTokens: [{ denom: 'umock' }],
});

test('chain info', async t => {
  const { bootstrap, facadeServices } = await commonSetup(t);

  const zone = bootstrap.rootZone;

  const { zcf } = await setupZCFTest();

  const { registerChain, orchestrate } = makeOrchestrationFacade({
    ...facadeServices,
    storageNode: bootstrap.storage.rootNode,
    zcf,
    zone,
  });

  registerChain('mock', mockChainInfo);

  const handle = orchestrate('mock', {}, async orc => {
    return orc.getChain('mock');
  });

  const result = (await handle()) as Chain<any>;
  t.deepEqual(await result.getChainInfo(), mockChainInfo);
});

test('contract upgrade', async t => {
  const { bootstrap, facadeServices } = await commonSetup(t);

  const zone = bootstrap.rootZone;

  const { zcf } = await setupZCFTest();

  // Register once
  {
    const { registerChain } = makeOrchestrationFacade({
      ...facadeServices,
      storageNode: bootstrap.storage.rootNode,
      zcf,
      zone,
    });
    registerChain('mock', mockChainInfo);

    // cannot register again in this incarnation
    t.throws(() => registerChain('mock', mockChainInfo), {
      message: 'key "mock" already registered in collection "chainInfos"',
    });
  }

  // Simulate running again in a new incarnation with the same zone
  {
    const { registerChain } = makeOrchestrationFacade({
      ...facadeServices,
      storageNode: bootstrap.storage.rootNode,
      zcf,
      zone,
    });
    registerChain('mock', mockChainInfo);
  }
});
