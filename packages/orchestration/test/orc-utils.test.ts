import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { E, Far } from '@endo/far';
import type { TestFn } from 'ava';
import { prepareVowTools } from '@agoric/vow';
import { prepareLocalOrchestrationAccountKit } from '../src/exos/local-orchestration-account.js';
import { makeOrchestrationFacade } from '../src/facade.js';
import { connectionKey, makeChainHub } from '../src/exos/chain-hub.js';
import type { VBankAssetInfo } from '../src/exos/chain-hub.js';
import { orcUtils } from '../src/utils/orc.js';
import { commonSetup } from './supports.js';
import { denomHash } from '../src/utils/denomHash.js';

const { fromEntries, values } = Object;

type TheTestContext = Awaited<ReturnType<typeof makeTestContext>>;
const test: TestFn<TheTestContext> = anyTest;

const registerInterchainAssets = async (agoricNamesAdmin, log) => {
  const mockBrand = name => Far(`${name} brand`) as Brand;

  const interchainAsset = {
    'ibc/FE98AAD68F02F03565E9FA39A5E627946699B2B07115889ED812D8BA639576A9': {
      brand: mockBrand('USDC'),
      denom:
        'ibc/FE98AAD68F02F03565E9FA39A5E627946699B2B07115889ED812D8BA639576A9',
      displayInfo: {
        assetKind: 'nat',
        decimalPlaces: 6,
      },
      issuer: { tODO: 'issuer' },
      issuerName: 'USDC',
      proposedName: 'USDC',
    },

    // { port: 'transfer', channel: 'channel-1', denom: 'uatom' }
    'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9': {
      brand: mockBrand('ATOM'),
      denom:
        'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9',
      displayInfo: {
        assetKind: 'nat',
        decimalPlaces: 6,
      },
      issuer: {},
      issuerName: 'ATOM',
      proposedName: 'ATOM',
    },
  };

  // add path info to vbankAsset
  const augment = {};
  const hub = E(agoricNamesAdmin).readonly();
  /** @type {[string, CosmosChainInfo][]} */
  const knownChains = await E(E(hub).lookup('chain')).entries();
  /** @type {[string, IBCConnectionInfo][]} */
  const connections = await E(E(hub).lookup('chainConnection')).entries();
  /** @type {CosmosChainInfo} */
  const agoricInfo = await E(hub).lookup('chain', 'agoric');

  log('joining', {
    chains: knownChains.map(a => a[0]),
    assets: values(interchainAsset).map(a => a.issuerName),
    connections: connections.length,
  });
  for await (const [issuerChain, info] of knownChains) {
    if (!info.stakingTokens) continue;
    const [{ denom: baseDenom }] = info.stakingTokens;
    for await (const [c1c2, { transferChannel }] of connections) {
      if (c1c2 !== connectionKey(agoricInfo.chainId, info.chainId)) continue;

      const { portId, channelId } = transferChannel;
      const h = await denomHash({ portId, channelId, denom: baseDenom });
      const targetDenom = `ibc/${h}`;
      if (!(targetDenom in interchainAsset)) continue;
      // TODO: move to core-eval code for #9211
      const path = `${portId}/${channelId}/${baseDenom}`;
      log('augment', targetDenom, { channelId, baseDenom, path, issuerChain });
      augment[targetDenom] = { channelId, baseDenom, path, issuerChain };
    }
  }

  const admin = E(agoricNamesAdmin).lookupAdmin('vbankAsset');
  for await (const [denom, info] of Object.entries(interchainAsset)) {
    await E(admin).update(denom, { ...info, ...augment[denom] });
  }
};

const makeTestContext = async t => {
  const ctx = await commonSetup(t);
  const { bootstrap } = ctx;
  await registerInterchainAssets(bootstrap.agoricNamesAdmin, t.log);
  return ctx;
};
test.before(async t => (t.context = await makeTestContext(t)));

const mockContractStartup = async (t, chainHub) => {
  const { bootstrap, facadeServices, commonPrivateArgs } = t.context;
  //   const { zcf } = await setupZCFTest(t);
  const zcf = {};
  const { marshaller, timerService } = commonPrivateArgs;
  const zone = bootstrap.rootZone.subZone('orchContractStartup');
  const vowTools = prepareVowTools(zone.subZone('VowTools'));
  const baggage = zone.mapStore('baggage1');
  const { makeRecorderKit } = prepareRecorderKitMakers(baggage, marshaller);
  const makeLocalChainAccountKit = prepareLocalOrchestrationAccountKit(
    zone,
    makeRecorderKit,
    zcf,
    timerService,
    vowTools,
    chainHub,
  );
  return makeOrchestrationFacade({
    ...commonPrivateArgs,
    zcf,
    zone: bootstrap.rootZone.subZone('contract1'),
    chainHub,
    makeLocalChainAccountKit,
    ...facadeServices,
  });
};

test('Agoric ATOM denom -> cosmos hub ATOM denom -> osmosis ATOM denom', async t => {
  const { bootstrap } = t.context;
  const { agoricNames } = bootstrap;

  // somehow (XXX?), we start with the ATOM denom on Agoric
  const assetEntries: [string, VBankAssetInfo][] = await E(
    E(agoricNames).lookup('vbankAsset'),
  ).entries();
  // by issuer name
  const vbank = fromEntries(assetEntries.map(([_d, a]) => [a.issuerName, a]));
  const atomDenomOnAgoric = vbank.ATOM.denom;

  // Contract does typical orchestration setup
  const chainHub = makeChainHub(bootstrap.agoricNames);
  const { orchestrate } = await mockContractStartup(t, chainHub);

  await orchestrate('TradePrep', {}, async orch => {
    // getBrandInfo() is synchronous,
    // so we have to prompt orch to load the relevant data first
    const agoric = await orch.getChain('agoric'); // cache vbank info
    const cosmoshub = await orch.getChain('cosmoshub');

    const { chain, base, baseDenom } = orch.getBrandInfo(atomDenomOnAgoric);
    t.is(chain, agoric, 'holding chain is agoric');
    t.is(base, cosmoshub, 'base chain is cosmoshub');

    t.log({ agoric: atomDenomOnAgoric, cosmoshub: baseDenom });
    t.is(baseDenom, 'uatom');

    // Now use getConnectionInfo() to get transferChannel info
    const osmosis = await orch.getChain('osmosis');
    const osmosisInfo = await osmosis.getChainInfo();
    const hubInfo = await cosmoshub.getChainInfo();
    const { transferChannel } = await chainHub.getConnectionInfo(
      osmosisInfo.chainId,
      hubInfo.chainId,
    );
    t.log('cosmoshub <-> osmosis', transferChannel);

    // orient from osmosis to cosmoshub
    // maybe getConnectionInfo() should help with this?
    const [channelId, portId] =
      osmosisInfo.chainId > hubInfo.chainId
        ? [transferChannel.channelId, transferChannel.portId]
        : [
            transferChannel.counterPartyChannelId,
            transferChannel.counterPartyPortId,
          ];

    const path = `${portId}/${channelId}/${baseDenom}`;
    t.log({ osmosis: baseDenom, osmosisPath: path });
    t.is(path, 'transfer/channel-0/uatom');

    // now we have enough info to _compute_ the denom on osmosis
    // This `denomHash` implementation uses node:crypto.
    // TODO: provide a vat-safe implementation?
    const hash = denomHash({ portId, channelId, denom: baseDenom });
    t.is(
      `ibc/${hash}`,
      'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
    );
  })();
});

test('makeOsmosisSwap', async t => {
  const { bootstrap } = t.context;
  const { agoricNames } = bootstrap;
  // by issuer name
  const vbank = await E(E(agoricNames).lookup('vbankAsset'))
    .entries()
    .then(es => fromEntries(es.map(([d, a]) => [a.issuerName, a])));

  const give = { USDC: AmountMath.make(vbank.USDC.brand, 100n) };
  const offerArgs = { staked: AmountMath.make(vbank.ATOM.brand, 200n) };

  const tiaAddress = {
    address: 'tia1arbitrary',
    chainId: 'celestia-123',
    addressEncoding: 'bech32' as const,
  };

  const actual = orcUtils.makeOsmosisSwap({
    destChain: 'celestia',
    destAddress: tiaAddress,
    amountIn: give.USDC,
    brandOut: offerArgs.staked.brand,
    slippage: 0.03,
  });

  t.deepEqual(actual, 'TODO');
});

test('denomHash', t => {
  const actual = denomHash({ channelId: 'channel-0', denom: 'uatom' });
  t.is(
    `ibc/${actual}`,
    'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
  );
});
