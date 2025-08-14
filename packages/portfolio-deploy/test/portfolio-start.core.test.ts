// Keep this import first to avoid: VatData unavailable
// see also https://github.com/endojs/endo/issues/1467
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

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
import { makePromiseSpace } from '@agoric/vats';
import { makeWellKnownSpaces } from '@agoric/vats/src/core/utils.js';
import type { Instance, Invitation, ZoeService } from '@agoric/zoe';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, Far, passStyleOf } from '@endo/far';
import { makePromiseKit, type PromiseKit } from '@endo/promise-kit';
import { axelarConfig } from '../src/axelar-configs.js';
import type { ChainInfoPowers } from '../src/chain-info.core.js';
import { toExternalConfig } from '../src/config-marshal.js';
import type { ContractControl } from '../src/contract-control.js';
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
import { delegatePortfolioContract } from '../src/portfolio-control.core.js';
import * as postalServiceExports from '../src/postal-service.contract.js';
import { deployPostalService } from '../src/postal-service.core.js';
import { produceAttenuatedDeposit } from '../src/attenuated-deposit.core.js';

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

  produce.chainInfoPublished.resolve(true);
  return { common, powers, zoe, bundleAndInstall };
};

test('coreEval code without swingset', async t => {
  const { common, powers, zoe, bundleAndInstall } = await makeBootstrap(t);
  const { bootstrap, utils } = common;
  const { usdc, bld, poc26 } = common.brands;

  // script from agoric run does this step
  t.log('produce installation using test bundle');
  powers.installation.produce[contractName].resolve(
    await bundleAndInstall(contractExports),
  );

  const options = toExternalConfig(
    harden({ axelarConfig, gmpAddresses } as PortfolioDeployConfig),
    {},
    portfolioDeployConfigShape,
  );
  t.log('invoke coreEval');
  await t.notThrowsAsync(startPortfolio(powers, { options }));

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

test('delegate ymax control', async t => {
  const { common, powers, zoe, bundleAndInstall } = await makeBootstrap(t);
  const { rootZone } = common.utils;

  t.log('produce getDepositFacet');
  await produceAttenuatedDeposit(powers as any);

  // script from agoric run does this step
  const pContractName = 'postalService';
  {
    t.log('produce postalService installation using test bundle');
    const postalInstall = await bundleAndInstall(postalServiceExports);
    powers.installation.produce[pContractName].resolve(postalInstall);
    const { agoricNamesAdmin } = common.bootstrap;
    await E(E(agoricNamesAdmin).lookupAdmin('installation')).update(
      pContractName,
      postalInstall,
    );
  }

  console.log('awaited namesByAddress');
  await deployPostalService(powers as any);
  t.log('deployPostalService done');
  const { agoricNames } = common.bootstrap;
  const pInst = await E(agoricNames).lookup('instance', pContractName);
  t.is(passStyleOf(pInst), 'remotable');
  const pPub = await E(zoe).getPublicFacet(pInst);
  t.is(passStyleOf(pPub), 'remotable');

  const addr = 'agoric1ymaxcontrol';
  const { namesByAddressAdmin } = common.bootstrap;
  const ctrlKit: PromiseKit<ContractControl<StartFn>> = makePromiseKit();
  namesByAddressAdmin.update(
    addr,
    Far('ymax control nameHub', {
      lookup: key => {
        t.is(key, 'depositFacet');
        return Far('DF', {
          receive: async (pmt: Invitation<ContractControl<StartFn>>) => {
            const seat = E(zoe).offer(pmt);
            const prize = await E(seat).getOfferResult();
            t.log('prize', prize);
            t.is(passStyleOf(prize), 'remotable');
            // XXX fragile: relies on getting the control prize before creatorFacet
            ctrlKit.resolve(prize);
          },
        });
      },
    }),
  );

  const zone = rootZone.subZone('bootstrap vat');
  powers.produce.ymax0Kit.resolve({
    creatorFacet: Far('mockCreator'),
    adminFacet: Far('mockAdmin'),
    instance: Far('mockInstance'),
  } as any);
  await delegatePortfolioContract(
    // @ts-expect-error mock
    { ...powers, zone },
    { options: { ymaxControlAddress: addr } },
  );
  const ctrl = await ctrlKit.promise;

  // eslint-disable-next-line no-underscore-dangle
  t.deepEqual(await E(ctrl as any).__getMethodNames__(), [
    '__getInterfaceGuard__',
    '__getMethodNames__',
    'getCreatorFacet',
    'getPublicFacet',
    'install',
    'installAndStart',
    'pruneChainStorage',
    'start',
    'terminate',
    'upgrade',
  ]);
});
