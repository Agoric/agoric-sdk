import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import { reincarnate } from '@agoric/swingset-liveslots/tools/setup-vat-data.js';
import { Baggage, makeScalarBigMapStore } from '@agoric/vat-data';
import { prepareSwingsetVowTools } from '@agoric/vow/vat.js';
import { setupZCFTest } from '@agoric/zoe/test/unitTests/zcf/setupZcfTest.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { E } from '@endo/far';
import { type ChainHub, registerAssets } from '../src/exos/chain-hub.js';
import fetchedChainInfo from '../src/fetched-chain-info.js';
import { denomHash } from '../src/utils/denomHash.js';
import { orcUtils } from '../src/utils/orc.js';
import { provideOrchestration } from '../src/utils/start-helper.js';
import { assets } from './assets.fixture.js';
import { addInterchainAsset, commonSetup } from './supports.js';

const makeOrchKit = async (facadeServices, commonPrivateArgs) => {
  // XXX relax again
  reincarnate({ relaxDurabilityRules: true });
  const { zcf } = await setupZCFTest();

  const baggage: Baggage = makeScalarBigMapStore('baggage', { durable: true });
  const zone = makeDurableZone(baggage);
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
  return { vt, orchKit, zone };
};

test.serial('orchestrate() test "template"', async t => {
  const { facadeServices, commonPrivateArgs } = await commonSetup(t);

  const { orchKit } = await makeOrchKit(facadeServices, commonPrivateArgs);
  const { orchestrate } = orchKit;

  const handle = orchestrate('trivial', {}, async _orc => t.pass());
  await handle();
});

const registerAtom = (chainHub: ChainHub) => {
  const atomOn = { cosmoshub: 'uatom', agoric: '?', osmosis: '?' };

  chainHub.registerChain('agoric', fetchedChainInfo.agoric);
  chainHub.registerChain('cosmoshub', fetchedChainInfo.cosmoshub);
  chainHub.registerChain('osmosis', fetchedChainInfo.osmosis);
  registerAssets(
    chainHub,
    'cosmoshub',
    assets.cosmoshub.filter(a => !a.traces),
  );
  for (const { chainName, chainInfo } of [
    { chainName: 'agoric', chainInfo: fetchedChainInfo.agoric },
    { chainName: 'osmosis', chainInfo: fetchedChainInfo.osmosis },
  ]) {
    const { channelId } = chainInfo.connections['cosmoshub-4'].transferChannel;
    const baseDenom = assets.cosmoshub[0].base;
    const d = `ibc/${denomHash({ channelId, denom: baseDenom })}`;
    atomOn[chainName] = d;
    chainHub.registerAsset(d, {
      chainName,
      baseName: 'cosmoshub',
      baseDenom,
    });
  }
  return atomOn;
};

test.serial('ATOM denom agoric -> cosmos hub -> osmosis', async t => {
  const { facadeServices, commonPrivateArgs } = await commonSetup(t);

  const { orchKit, vt } = await makeOrchKit(facadeServices, commonPrivateArgs);
  const { chainHub, orchestrate } = orchKit;

  const atomOn = registerAtom(chainHub);
  t.log('before flow, told chainHub about atom on', Object.keys(atomOn));

  const handle = orchestrate(
    'TradePrep',
    { chainHub },
    // eslint-disable-next-line no-shadow
    async (orch, { chainHub }) => {
      // getBrandInfo() is synchronous,
      // so we have to prompt orch to load the relevant data first
      const agoric = await orch.getChain('agoric'); // cache vbank info
      const cosmoshub = await orch.getChain('cosmoshub');

      const { chain, base, baseDenom } = orch.getBrandInfo(atomOn.agoric);
      t.is(chain, agoric, 'holding chain is agoric');
      t.is(base, cosmoshub, 'base chain is cosmoshub');

      t.log('getBrandInfo', {
        from: { atomOnAgoric: atomOn.agoric },
        to: { cosmoshub: baseDenom },
      });
      t.is(baseDenom, 'uatom');

      const osmosis = await orch.getChain('osmosis');
      const remoteAtom = await orch.getDenomOn(baseDenom, cosmoshub, osmosis);
      t.log('getDenomOn', { baseDenom, remoteAtom });
      t.is(remoteAtom, atomOn.osmosis);
    },
  );

  await vt.when(handle());
});

test.serial('makeOsmosisSwap', async t => {
  const { facadeServices, commonPrivateArgs, bootstrap } = await commonSetup(t);

  const { orchKit, vt } = await makeOrchKit(facadeServices, commonPrivateArgs);
  const { chainHub, orchestrate } = orchKit;

  const atomOn = registerAtom(chainHub);

  const { agoricNamesAdmin } = bootstrap;
  const vbankAdmin = E(agoricNamesAdmin).lookupAdmin('vbankAsset');
  for (const { chainName, base } of [
    { chainName: 'cosmoshub', base: 'uatom' },
    { chainName: 'noble', base: 'uusdc' },
  ]) {
    await addInterchainAsset(
      vbankAdmin,
      assets[chainName].find(a => a.base === base)!,
      'cosmoshub',
    );
  }

  const handle = orchestrate('swapExample stuff', {}, async orch => {
    const vbank = await orch
      .getChain('agoric')
      .then(ch => ch.getVBankAssetInfo())
      .then(as => Object.fromEntries(as.map(a => [a.issuerName, a])));
    t.log('vbank assets', Object.keys(vbank));

    const give = { USDC: AmountMath.make(vbank.USDC.brand, 100n) };
    const offerArgs = { staked: AmountMath.make(vbank.ATOM.brand, 200n) };

    const tiaAddress = {
      value: 'tia1arbitrary',
      chainId: 'celestia-123',
      encoding: 'bech32' as const,
    };

    await orch.getChain('cosmoshub'); // reify intermediate chain

    const xferMsg = await orcUtils.makeOsmosisSwap(
      {
        destChain: 'celestia',
        destAddress: tiaAddress,
        amountIn: give.USDC,
        brandOut: offerArgs.staked.brand,
        slippage: 0.03,
      },
      orch,
    );

    return xferMsg;
  });

  const actual = await vt.when(handle());
  t.deepEqual(actual, {
    osmosis_swap: {
      next_memo: null,
      on_failed_delivery: 'do_nothing',
      output_denom: atomOn.osmosis,
      receiver: 'tia1arbitrary',
      slippage: { twap: { slippage_percentage: '3', window_seconds: 10 } },
    },
  });
});
