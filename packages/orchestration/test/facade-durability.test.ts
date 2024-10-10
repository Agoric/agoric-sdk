import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { reincarnate } from '@agoric/swingset-liveslots/tools/setup-vat-data.js';
import { prepareSwingsetVowTools } from '@agoric/vow/vat.js';
import { setupZCFTest } from '@agoric/zoe/test/unitTests/zcf/setupZcfTest.js';
import type { CosmosChainInfo, IBCConnectionInfo } from '../src/cosmos-api.js';
import fetchedChainInfo from '../src/fetched-chain-info.js'; // Refresh with scripts/refresh-chain-info.ts
import type { Chain } from '../src/orchestration-api.js';
import { denomHash } from '../src/utils/denomHash.js';
import { provideOrchestration } from '../src/utils/start-helper.js';
import { commonSetup, provideDurableZone } from './supports.js';

const test = anyTest;

const mockChainInfo: CosmosChainInfo = harden({
  chainId: 'mock-1',
  icaEnabled: false,
  icqEnabled: false,
  pfmEnabled: false,
  ibcHooksEnabled: false,
  stakingTokens: [{ denom: 'umock' }],
});
const mockChainConnection: IBCConnectionInfo = {
  id: 'connection-0',
  client_id: '07-tendermint-2',
  counterparty: {
    client_id: '07-tendermint-2',
    connection_id: 'connection-1',
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

test.serial('chain info', async t => {
  const { bootstrap, facadeServices, commonPrivateArgs } = await commonSetup(t);

  const { zcf } = await setupZCFTest();

  // After setupZCFTest because this disables relaxDurabilityRules
  // which breaks Zoe test setup's fakeVatAdmin
  const zone = provideDurableZone('test');
  const vt = prepareSwingsetVowTools(zone);

  const orchKit = provideOrchestration(
    zcf,
    zone.mapStore('test'),
    {
      agoricNames: facadeServices.agoricNames,
      timerService: facadeServices.timerService,
      storageNode: commonPrivateArgs.storageNode,
      orchestrationService: facadeServices.orchestrationService,
      localchain: facadeServices.localchain,
    },
    commonPrivateArgs.marshaller,
  );

  const { chainHub, orchestrate } = orchKit;

  chainHub.registerChain('mock', mockChainInfo);
  chainHub.registerConnection(
    'agoric-3',
    mockChainInfo.chainId,
    mockChainConnection,
  );

  const handle = orchestrate('mock', {}, async orc => {
    return orc.getChain('mock');
  });

  const result = (await vt.when(handle())) as Chain<any>;
  t.deepEqual(await vt.when(result.getChainInfo()), mockChainInfo);
});

test.serial('faulty chain info', async t => {
  const { facadeServices, commonPrivateArgs } = await commonSetup(t);

  // XXX relax again so setupZCFTest can run. This is also why the tests are serial.
  reincarnate({ relaxDurabilityRules: true });
  const { zcf } = await setupZCFTest();

  // After setupZCFTest because this disables relaxDurabilityRules
  // which breaks Zoe test setup's fakeVatAdmin
  const zone = provideDurableZone('test');
  const vt = prepareSwingsetVowTools(zone);

  const orchKit = provideOrchestration(
    zcf,
    zone.mapStore('test'),
    {
      agoricNames: facadeServices.agoricNames,
      timerService: facadeServices.timerService,
      storageNode: commonPrivateArgs.storageNode,
      orchestrationService: facadeServices.orchestrationService,
      localchain: facadeServices.localchain,
    },
    commonPrivateArgs.marshaller,
  );

  const { chainHub, orchestrate } = orchKit;

  const { stakingTokens, ...sansStakingTokens } = mockChainInfo;

  chainHub.registerChain('mock', sansStakingTokens);
  chainHub.registerConnection(
    'agoric-3',
    mockChainInfo.chainId,
    mockChainConnection,
  );

  const handle = orchestrate('mock', {}, async orc => {
    const chain = await orc.getChain('mock');
    const account = await chain.makeAccount();
    return account;
  });

  await t.throwsAsync(vt.when(handle()), {
    message: 'chain info lacks staking denom',
  });
});

test.serial('racy chain info', async t => {
  const { facadeServices, commonPrivateArgs } = await commonSetup(t);

  // XXX relax again
  reincarnate({ relaxDurabilityRules: true });
  const { zcf } = await setupZCFTest();

  // After setupZCFTest because this disables relaxDurabilityRules
  // which breaks Zoe test setup's fakeVatAdmin
  const zone = provideDurableZone('test');
  const vt = prepareSwingsetVowTools(zone);

  const orchKit = provideOrchestration(
    zcf,
    zone.mapStore('test'),
    {
      agoricNames: facadeServices.agoricNames,
      timerService: facadeServices.timerService,
      storageNode: commonPrivateArgs.storageNode,
      orchestrationService: facadeServices.orchestrationService,
      localchain: facadeServices.localchain,
    },
    commonPrivateArgs.marshaller,
  );

  const { chainHub, orchestrate } = orchKit;

  chainHub.registerChain('mock', mockChainInfo);
  chainHub.registerConnection(
    'agoric-3',
    mockChainInfo.chainId,
    mockChainConnection,
  );

  const raceGetChain = orchestrate('race', {}, async orc => {
    return Promise.all([orc.getChain('mock'), orc.getChain('mock')]);
  });

  const resultP = vt.when(raceGetChain());
  await t.notThrowsAsync(resultP);
  const result = await resultP;
  t.is(result[0], result[1], 'same chain facade');
  const chainInfos = await vt.when(
    vt.allVows([result[0].getChainInfo(), result[1].getChainInfo()]),
  );
  t.deepEqual(await chainInfos[0], mockChainInfo);
  t.deepEqual(await chainInfos[1], mockChainInfo);
});

test.serial('asset / denom info', async t => {
  const { facadeServices, commonPrivateArgs } = await commonSetup(t);

  // XXX relax again
  reincarnate({ relaxDurabilityRules: true });
  const { zcf } = await setupZCFTest();
  const zone = provideDurableZone('test');
  const vt = prepareSwingsetVowTools(zone);
  const orchKit = provideOrchestration(
    zcf,
    zone.mapStore('test'),
    {
      agoricNames: facadeServices.agoricNames,
      timerService: facadeServices.timerService,
      storageNode: commonPrivateArgs.storageNode,
      orchestrationService: facadeServices.orchestrationService,
      localchain: facadeServices.localchain,
    },
    commonPrivateArgs.marshaller,
  );
  const { chainHub, orchestrate } = orchKit;

  chainHub.registerChain('agoric', fetchedChainInfo.agoric);
  chainHub.registerChain(mockChainInfo.chainId, mockChainInfo);
  chainHub.registerConnection(
    'agoric-3',
    mockChainInfo.chainId,
    mockChainConnection,
  );

  chainHub.registerAsset('utoken1', {
    chainName: mockChainInfo.chainId,
    baseName: mockChainInfo.chainId,
    baseDenom: 'utoken1',
  });

  const { channelId } = mockChainConnection.transferChannel;
  const agDenom = `ibc/${denomHash({ denom: 'utoken1', channelId })}`;
  const { brand } = makeIssuerKit('Token1');
  t.log(`utoken1 over ${channelId}: ${agDenom}`);
  chainHub.registerAsset(agDenom, {
    chainName: 'agoric',
    baseName: mockChainInfo.chainId,
    baseDenom: 'utoken1',
    brand,
  });

  const handle = orchestrate(
    'useDenoms',
    { brand },
    // eslint-disable-next-line no-shadow
    async (orc, { brand }) => {
      const c1 = await orc.getChain(mockChainInfo.chainId);

      {
        const actual = orc.getDenomInfo('utoken1');
        console.log('actual', actual);
        const info = await actual.chain.getChainInfo();
        t.deepEqual(info, mockChainInfo);

        t.deepEqual(actual, {
          base: c1,
          chain: c1,
          baseDenom: 'utoken1',
          brand: undefined,
        });
      }

      const agP = orc.getChain('agoric');
      t.throws(() => orc.getDenomInfo(agDenom), {
        message: /^wait until getChain\("agoric"\) completes/,
      });
      const ag = await agP;
      {
        const actual = orc.getDenomInfo(agDenom);

        t.deepEqual(actual, {
          chain: ag,
          base: c1,
          baseDenom: 'utoken1',
          brand,
        });
      }
    },
  );

  await vt.when(handle());

  chainHub.registerChain('anotherChain', mockChainInfo);
  chainHub.registerConnection('agoric-3', 'anotherChain', mockChainConnection);
  chainHub.registerAsset('utoken2', {
    chainName: 'anotherChain',
    baseName: 'anotherChain',
    baseDenom: 'utoken2',
  });

  const missingGetChain = orchestrate('missing getChain', {}, async orc => {
    const actual = orc.getDenomInfo('utoken2');
  });

  await t.throwsAsync(vt.when(missingGetChain()), {
    message: 'use getChain("anotherChain") before getDenomInfo("utoken2")',
  });
});

test.todo('contract upgrade');
