import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { prepareSwingsetVowTools } from '@agoric/vow/vat.js';
import type { CosmosChainInfo, IBCConnectionInfo } from '../src/cosmos-api.js';
import fetchedChainInfo from '../src/fetched-chain-info.js'; // Refresh with scripts/refresh-chain-info.ts
import type { Chain } from '../src/orchestration-api.js';
import { denomHash } from '../src/utils/denomHash.js';
import { provideOrchestration } from '../src/utils/start-helper.js';
import { commonSetup } from './supports.js';
import { provideDurableZone, provideFreshRootZone } from './durability.js';

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

// @ts-expect-error mock
const mockZcf: ZCF = {
  setTestJig: () => {},
};

test('chain info', async t => {
  const { facadeServices, commonPrivateArgs } = await commonSetup(t);

  const zone = provideFreshRootZone();
  const vt = prepareSwingsetVowTools(zone);

  const orchKit = provideOrchestration(
    mockZcf,
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

test('missing chain info', async t => {
  const { facadeServices, commonPrivateArgs } = await commonSetup(t);

  const zone = provideFreshRootZone();
  const vt = prepareSwingsetVowTools(zone);

  const orchKit = provideOrchestration(
    mockZcf,
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

  const { orchestrate } = orchKit;

  const handle = orchestrate('mock', {}, async orc => {
    const chain = await orc.getChain('mock');
    const account = await chain.makeAccount();
    return account;
  });

  await t.throwsAsync(vt.when(handle()), {
    message: 'chain not found:mock',
  });
});

test('racy chain info', async t => {
  const { facadeServices, commonPrivateArgs } = await commonSetup(t);

  const zone = provideFreshRootZone();
  const vt = prepareSwingsetVowTools(zone);

  const orchKit = provideOrchestration(
    mockZcf,
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

test('asset / denom info', async t => {
  const { facadeServices, commonPrivateArgs } = await commonSetup(t);

  const zone = provideFreshRootZone();
  const vt = prepareSwingsetVowTools(zone);
  const orchKit = provideOrchestration(
    mockZcf,
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
  chainHub.registerChain('mock', mockChainInfo);
  chainHub.registerConnection(
    'agoric-3',
    mockChainInfo.chainId,
    mockChainConnection,
  );

  chainHub.registerAsset('utoken1', {
    chainName: 'mock',
    baseName: 'mock',
    baseDenom: 'utoken1',
  });

  const { channelId } = mockChainConnection.transferChannel;
  const agDenom = `ibc/${denomHash({ denom: 'utoken1', channelId })}`;
  const { brand } = makeIssuerKit('Token1');
  t.log(`utoken1 over ${channelId}: ${agDenom}`);
  chainHub.registerAsset(agDenom, {
    chainName: 'agoric',
    baseName: 'mock',
    baseDenom: 'utoken1',
    brand,
  });

  const handle = orchestrate(
    'useDenoms',
    { brand },
    // eslint-disable-next-line no-shadow
    async (orc, { brand }) => {
      const c1 = await orc.getChain('mock');

      {
        const actual = orc.getDenomInfo(
          'utoken1',
          // @ts-expect-error 'mock' not a KnownChain
          'mock',
        );
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
      t.throws(() => orc.getDenomInfo(agDenom, 'agoric'), {
        message: /^wait until getChain\("agoric"\) completes/,
      });
      const ag = await agP;
      {
        const actual = orc.getDenomInfo(agDenom, 'agoric');

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
    const actual = orc.getDenomInfo(
      'utoken2',
      // @ts-expect-error 'mock' not a KnownChain
      'anotherChain',
    );
  });

  await t.throwsAsync(vt.when(missingGetChain()), {
    message: 'use getChain("anotherChain") before getDenomInfo("utoken2")',
  });
});

test.todo('contract upgrade');
