// Keep this import first to avoid: VatData unavailable
// see also https://github.com/endojs/endo/issues/1467
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { PortfolioPlanner } from '@aglocal/portfolio-contract/src/planner.exo.ts';
import * as contractExports from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import {
  gmpAddresses,
  makeUSDNIBCTraffic,
} from '@aglocal/portfolio-contract/test/mocks.js';
import { setupPortfolioTest } from '@aglocal/portfolio-contract/test/supports.ts';
import { makeTrader } from '@aglocal/portfolio-contract/tools/portfolio-actors.ts';
import { makeWallet } from '@aglocal/portfolio-contract/tools/wallet-offer-tools.ts';
import {
  defaultSerializer,
  documentStorageSchema,
} from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { SmartWallet } from '@agoric/smart-wallet/src/smartWallet.js';
import { deploy as deployWalletFactory } from '@agoric/smart-wallet/tools/wf-tools.js';
import { makePromiseSpace } from '@agoric/vats';
import { makeWellKnownSpaces } from '@agoric/vats/src/core/utils.js';
import type { EMethods } from '@agoric/vow/src/E.js';
import type { Instance, ZoeService } from '@agoric/zoe';
import type { ContractStartFunction } from '@agoric/zoe/src/zoeService/utils';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, passStyleOf } from '@endo/far';
import { produceAttenuatedDeposit } from '../src/attenuated-deposit.core.js';
import { axelarConfig } from '../src/axelar-configs.js';
import type { ChainInfoPowers } from '../src/chain-info.core.js';
import { toExternalConfig } from '../src/config-marshal.js';
import { delegatePortfolioContract } from '../src/portfolio-control.core.js';
import {
  portfolioDeployConfigShape,
  startPortfolio,
  type PortfolioDeployConfig,
} from '../src/portfolio-start.core.js';
import type {
  PortfolioBootPowers,
  StartFn,
} from '../src/portfolio-start.type.ts';
import { name as contractName } from '../src/portfolio.contract.permit.js';
import * as postalServiceExports from '../src/postal-service.contract.js';
import { deployPostalService } from '../src/postal-service.core.js';

const { entries, keys } = Object;

const docOpts = {
  note: 'YMax VStorage Schema',
  // XXX?
  // node: 'orchtest.ymax0',
  // owner: 'ymax',
  // pattern: 'orchtest.',
  // replacement: 'published.',
  showValue: defaultSerializer.parse,
};

const getCapDataStructure = cell => {
  const { body, slots } = JSON.parse(cell);
  const structure = JSON.parse(body.replace(/^#/, ''));
  return { structure, slots };
};

const makeBootstrap = async t => {
  const common = await setupPortfolioTest(t);
  const { bootstrap } = common;
  const { agoricNamesAdmin } = bootstrap;
  const wk = await makeWellKnownSpaces(agoricNamesAdmin);
  const log = () => {}; // console.log
  const { produce, consume } = makePromiseSpace({ log });
  const powers = { produce, consume, ...wk } as unknown as BootstrapPowers &
    PortfolioBootPowers &
    ChainInfoPowers;
  // XXX type of zoe from setUpZoeForTest is any???
  const { zoe: zoeAny, bundleAndInstall } = await setUpZoeForTest();
  const zoe: ZoeService = zoeAny;
  const { usdc, bld, poc26 } = common.brands;

  {
    t.log('produce bootstrap entries from commonSetup()', keys(bootstrap));
    for (const [n, v] of entries(bootstrap)) {
      switch (n) {
        case 'timer':
          produce.chainTimerService.resolve(v);
          break;
        case 'storage':
          // @ts-expect-error one of these things is not like the others :)
          produce.chainStorage.resolve(v.rootNode);
          break;
        default:
          produce[n].resolve(v);
      }
    }

    for (const [name, { brand, issuer }] of entries({
      BLD: bld,
      USDC: usdc,
      PoC26: poc26,
    })) {
      t.log('produce brand, issuer for', name);
      wk.brand.produce[name].resolve(brand);
      wk.issuer.produce[name].resolve(issuer);
    }

    t.log('produce startUpgradable');
    produce.startUpgradable.resolve(
      ({ label, installation, issuerKeywordRecord, privateArgs, terms }) =>
        E(zoe).startInstance(
          installation,
          issuerKeywordRecord,
          terms,
          privateArgs,
          label,
        ),
    );
    produce.zoe.resolve(zoe);
  }

  const { storage } = bootstrap;
  const readLegible = async (path: string) => {
    await eventLoopIteration();
    return getCapDataStructure(storage.getValues(path).at(-1));
  };
  const { provisionSmartWallet } = await deployWalletFactory({
    boot: async () => {
      return {
        ...common.bootstrap,
        zoe: zoe as any, // XXX Guarded<ZoeService>
        utils: { ...common.utils, readLegible, bundleAndInstall },
      };
    },
  });

  produce.chainInfoPublished.resolve(true);
  return { common, powers, zoe, bundleAndInstall, provisionSmartWallet };
};

const ymaxOptions = toExternalConfig(
  harden({ axelarConfig, gmpAddresses } as PortfolioDeployConfig),
  {},
  portfolioDeployConfigShape,
);

test('coreEval code without swingset', async t => {
  const { common, powers, zoe, bundleAndInstall } = await makeBootstrap(t);
  const { bootstrap, utils } = common;
  const { usdc, bld, poc26 } = common.brands;

  // script from agoric run does this step
  t.log('produce installation using test bundle');
  powers.installation.produce[contractName].resolve(
    await bundleAndInstall(contractExports),
  );

  t.log('invoke coreEval');
  await t.notThrowsAsync(startPortfolio(powers, { options: ymaxOptions }));

  // TODO:  common.mocks.ibcBridge.setAddressPrefix('noble');
  for (const { msg, ack } of Object.values(
    makeUSDNIBCTraffic(undefined, `${3333 * 1_000_000}`),
  )) {
    common.mocks.ibcBridge.addMockAck(msg, ack);
  }

  const { agoricNames } = bootstrap;
  const instance = (await E(agoricNames).lookup(
    'instance',
    'ymax0',
  )) as Instance<StartFn>;
  t.log('found instance', instance);
  t.is(passStyleOf(instance), 'remotable');

  const { vowTools, pourPayment } = utils;
  const { mint: _, ...poc26sansMint } = poc26;
  const { mint: _2, ...bldSansMint } = bld;
  const wallet = makeWallet(
    { USDC: usdc, BLD: bldSansMint, Access: poc26sansMint },
    zoe,
    vowTools.when,
  );
  await wallet.deposit(await pourPayment(usdc.units(10_000)));
  await wallet.deposit(poc26.mint.mintPayment(poc26.make(100n)));
  const silvia = makeTrader(wallet, instance);
  const amount = usdc.units(3_333);
  const detail = { usdnOut: amount.value }; // XXX  * 99n / 100n
  const actualP = silvia.openPortfolio(
    t,
    { Deposit: amount, Access: poc26.make(1n) },
    {
      flow: [
        { src: '<Deposit>', dest: '@agoric', amount },
        { src: '@agoric', dest: '@noble', amount },
        { src: '@noble', dest: 'USDNVault', amount, detail },
      ],
    },
  );
  // ack IBC transfer for forward
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  const actual = await actualP;
  t.like(actual, {
    payouts: { Deposit: { value: 0n } },
    result: {
      publicSubscribers: {
        portfolio: {
          description: 'Portfolio',
          storagePath: `orchtest.ymax0.portfolios.portfolio0`,
        },
      },
    },
  });

  const { storage } = common.bootstrap;
  await documentStorageSchema(t, storage, docOpts);
});

/**
 * Reflect wallet store, supporting type-safe invokeEntry
 *
 * @param wallet
 */
const reflectWalletStore = (wallet: SmartWallet) => {
  let nonce = 0;

  // XXX should check `published.wallet.${addr}` for updated: 'invocation'
  const watchInvocation = (id: string | number): Promise<void> =>
    eventLoopIteration();
  // XXX should check `published.wallet.${addr}` for updated: 'offerStatus'
  const watchOffer = (id: string | number): Promise<void> =>
    eventLoopIteration();

  let resultName: string | undefined = undefined;
  const savingResult = async <T>(name: string, thunk: () => Promise<T>) => {
    assert(!resultName, 'already saving');
    resultName = name;
    const result = await thunk();
    resultName = undefined;
    return result;
  };
  const makeEntryProxy = (targetName: string) =>
    new Proxy(harden({}), {
      get(_t, method, _rx) {
        assert.typeof(method, 'string');
        if (method === 'then') return undefined;
        const boundMethod = async (...args) => {
          const id = `${method}.${(nonce += 1)}`;
          await E(E(wallet).getInvokeFacet()).invokeEntry({
            id,
            targetName,
            method,
            args,
            ...(resultName ? { saveResult: { name: resultName } } : {}),
          });
          await watchInvocation(id);
          return resultName ? makeEntryProxy(resultName) : undefined;
        };
        return harden(boundMethod);
      },
    });

  const saveOfferResult = async <T = unknown>(
    { instance, description }: { instance: Instance; description: string },
    name: string = description,
  ) => {
    const id = `${description}.${(nonce += 1)}`;
    await E(E(wallet).getOffersFacet()).executeOffer({
      id,
      invitationSpec: { source: 'purse', description, instance },
      proposal: {},
      saveResult: { name, overwrite: true },
    });
    await watchOffer(id);
    return makeEntryProxy(name) as EMethods<T>;
  };

  const get = <T>(name: string) => makeEntryProxy(name) as EMethods<T>;

  return harden({ get, saveOfferResult, savingResult });
};

type YMaxStartFn = typeof contractExports.start;

// XXX ContractControl isn't quite parameterized right, but it's already deployed
interface ContractControl<SF extends ContractStartFunction> {
  getCreatorFacet(): StartedInstanceKit<SF>['creatorFacet'];
}

test('delegate ymax control; invite planner; submit plan', async t => {
  const { common, powers, bundleAndInstall, provisionSmartWallet } =
    await makeBootstrap(t);
  const { rootZone } = common.utils;

  // script from agoric run does this step
  const coreEvalPreamble = (
    installations: Record<string, ERef<Installation>>,
  ) => {
    for (const [name, installationP] of Object.entries(installations)) {
      powers.installation.produce[name].resolve(installationP);
    }
  };

  t.log('start ymax0');
  {
    coreEvalPreamble({ [contractName]: bundleAndInstall(contractExports) });
    await Promise.all([
      startPortfolio(powers, { options: ymaxOptions }),
      // produce getDepositFacet as in usdc-resolve core eval
      produceAttenuatedDeposit(powers as any),
    ]);
  }

  t.log('deploy postalService');
  {
    coreEvalPreamble({ postalService: bundleAndInstall(postalServiceExports) });
    await deployPostalService(powers as any);
  }

  t.log('delegate control of ymax');
  const addrCtrl = 'agoric1ymaxcontrol';
  const [_d, [walletCtrl]] = await Promise.all([
    // XXX wan't supposed to await smartWallet but does
    delegatePortfolioContract(
      // @ts-expect-error mock
      { ...powers, zone: rootZone.subZone('bootstrap vat') },
      { options: { ymaxControlAddress: addrCtrl } },
    ),
    // has to happen after walletFactory upgrade
    provisionSmartWallet(addrCtrl),
  ]);
  await eventLoopIteration(); // delegatePortfolioContract doesn't block on delivery

  t.log('redeem ymaxControl invitation');
  const storeCtrl = reflectWalletStore(walletCtrl);
  const { agoricNames } = common.bootstrap;
  const pInst = await E(agoricNames).lookup('instance', 'postalService');
  const ymaxControl = await storeCtrl.saveOfferResult<
    ContractControl<YMaxStartFn>
  >({ description: 'deliver ymaxControl', instance: pInst }, 'ymaxControl');

  t.log('getCreatorFacet');
  const creatorFacet = await storeCtrl.savingResult('creatorFacet', () =>
    ymaxControl.getCreatorFacet(),
  );

  t.log('invite planner');
  const addrPl = 'agoric1planner';
  const [walletPl] = await provisionSmartWallet(addrPl);
  await creatorFacet.deliverPlannerInvitation(addrPl, pInst);

  t.log('redeem planner invitation');
  const yInst = await E(agoricNames).lookup('instance', contractName);
  const storePl = reflectWalletStore(walletPl);
  const planner = await storePl.saveOfferResult<PortfolioPlanner>({
    description: 'planner',
    instance: yInst,
  });

  t.log('make a portfolio');
  const { poc26 } = common.brands;
  const accessToken = poc26.mint.mintPayment(poc26.make(1n));
  const [walletTrader] = await provisionSmartWallet('agoric1trader1');
  await E(E(walletTrader).getDepositFacet()).receive(accessToken);
  await E(E(walletTrader).getOffersFacet()).executeOffer({
    id: 1,
    invitationSpec: {
      source: 'contract',
      instance: yInst,
      publicInvitationMaker: 'makeOpenPortfolioInvitation',
    },
    proposal: { give: { Access: poc26.make(1n) } },
    offerArgs: {},
  });
  await eventLoopIteration(); // wait for offer result to settle

  t.log('invoke planner');
  await planner.submit(0, []);

  t.pass('happy path complete');
});
