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
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { deploy as deployWalletFactory } from '@agoric/smart-wallet/tools/wf-tools.js';
import { makePromiseSpace } from '@agoric/vats';
import { makeWellKnownSpaces } from '@agoric/vats/src/core/utils.js';
import {
  produceDiagnostics,
  produceStartUpgradable,
} from '@agoric/vats/src/core/basic-behaviors.js';
import type { Instance, ZoeService } from '@agoric/zoe';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import { passStyleOf, type CopyRecord } from '@endo/pass-style';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { keccak256 } from 'viem/utils';
import type { BootstrapPowers } from '@agoric/vats/src/core/types.js';
import { produceAttenuatedDeposit } from '@agoric/deploy-script-support/src/control/attenuated-deposit.core.js';
import type { ChainInfoPowers } from '@agoric/deploy-script-support/src/control/chain-info.core.js';
import { deployPostalService } from '@agoric/deploy-script-support/src/control/postal-service.core.js';
import { produceDeliverContractControl } from '@agoric/deploy-script-support/src/control/contract-control.core.js';
import { produceGetUpgradeKit } from '@agoric/deploy-script-support/src/control/get-upgrade-kit.core.js';
import { axelarConfig } from '../src/axelar-configs.js';
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
import * as postalServiceExports from '../src/control/postal-service.contract.js';

const { entries, keys } = Object;

const nodeRequire = createRequire(import.meta.url);
const asset = (spec: string) => readFile(nodeRequire.resolve(spec), 'utf8');

const { bytecode: walletBytecode } = JSON.parse(
  await asset('@aglocal/portfolio-deploy/tools/evm-orch/Wallet.json'),
);

const { bytecode: remoteAccountBytecode } = JSON.parse(
  await asset('@aglocal/portfolio-deploy/tools/evm-orch/RemoteAccount.json'),
);
const remoteAccountBytecodeHash = keccak256(remoteAccountBytecode);

const docOpts = {
  note: 'YMax VStorage Schema',
  // XXX?
  // node: 'orchtest.ymax0',
  // owner: 'ymax',
  // pattern: 'orchtest.',
  // replacement: 'published.',
  showValue: defaultSerializer.parse,
};

const ackNFA = (utils, ix = 0) =>
  utils.transmitVTransferEvent('acknowledgementPacket', ix);

const getCapDataStructure = cell => {
  const { body, slots } = JSON.parse(cell);
  const structure = JSON.parse(body.replace(/^#/, ''));
  return { structure, slots };
};

const makeBootstrap = async t => {
  const common = await setupPortfolioTest(t);
  const {
    bootstrap,
    utils: { rootZone },
  } = common;
  const { agoricNamesAdmin, agoricNames } = bootstrap;
  const wk = await makeWellKnownSpaces(agoricNamesAdmin);
  const log = () => {}; // console.log
  const { produce, consume } = makePromiseSpace({ log });
  const zone = rootZone.subZone('bootstrap vat');
  const powers = {
    zone,
    produce,
    consume,
    ...wk,
  } as unknown as BootstrapPowers & PortfolioBootPowers & ChainInfoPowers;
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

    powers.produce.zoe.resolve(zoe);
    powers.produce.agoricNames.resolve(agoricNames);
    powers.produce.agoricNamesAdmin.resolve(agoricNamesAdmin);

    await produceDiagnostics(powers);
    await produceStartUpgradable(powers);
  }

  const { storage } = bootstrap;
  const readLegible = async (path: string) => {
    await eventLoopIteration();
    return getCapDataStructure(storage.getValues(path).at(-1));
  };
  const getTestJig = () => ({});
  const { provisionSmartWallet } = await deployWalletFactory({
    boot: async () => {
      return {
        ...common.bootstrap,
        zoe: zoe as any, // XXX Guarded<ZoeService>
        utils: { ...common.utils, readLegible, bundleAndInstall, getTestJig },
      };
    },
  });

  produce.chainInfoPublished.resolve(true);
  return { common, powers, zoe, bundleAndInstall, provisionSmartWallet };
};

const ymaxOptions = toExternalConfig(
  harden({
    axelarConfig,
    gmpAddresses,
    walletBytecode,
    remoteAccountBytecodeHash,
  } as PortfolioDeployConfig),
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

  common.mocks.ibcBridge.setAddressPrefix('noble');
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
  // ack IBC transfer for NFA, forward
  await common.utils.transmitVTransferEvent('acknowledgementPacket', 0);
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

test('delegate ymax control; invite planner; submit plan', async t => {
  const { common, powers, zoe, bundleAndInstall, provisionSmartWallet } =
    await makeBootstrap(t);

  t.log('produce getDepositFacet');
  await produceAttenuatedDeposit(powers as any);

  t.log('start ymax0 as in 101');
  powers.installation.produce[contractName].resolve(
    await bundleAndInstall(contractExports, 'b2-ymax-bundleId'),
  );
  await startPortfolio(powers, { options: ymaxOptions });

  t.log('terminate ymax0 as in 103');
  {
    const { adminFacet } = await (powers as PortfolioBootPowers).consume
      .ymax0Kit;
    await E(adminFacet).terminateContract(Error('as in 103'));
  }

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
  t.log('produce deliverContractControl');
  await produceDeliverContractControl(powers as any);
  t.log('produce getUpgradeKit');
  await produceGetUpgradeKit(powers as any);
  const { agoricNames } = common.bootstrap;
  const pInst = await E(agoricNames).lookup('instance', pContractName);
  t.is(passStyleOf(pInst), 'remotable');
  const pPub = await E(zoe).getPublicFacet(pInst);
  t.is(passStyleOf(pPub), 'remotable');

  const addrCtrl = 'agoric1ymaxcontrol';
  const [walletCtrl] = await provisionSmartWallet(addrCtrl);

  await delegatePortfolioContract(
    // @ts-expect-error mock
    powers,
    { options: { ymaxControlAddress: addrCtrl, contractName: 'ymax0' } },
  );
  await eventLoopIteration(); // core eval doesn't block on delivery

  t.log('redeem ymaxControl invitation');
  await E(E(walletCtrl).getOffersFacet()).executeOffer({
    id: 0,
    invitationSpec: {
      source: 'purse',
      description: 'deliver ymaxControl',
      instance: pInst,
    },
    proposal: {},
    saveResult: { name: 'ymaxControl' },
  });

  // New portfolio-control passes existing kit. Call terminate to make it forget it.
  // The portfolio control on chain didn't pass kit in
  t.log('terminate to forget kit');
  {
    await E(E(walletCtrl).getInvokeFacet()).invokeEntry({
      targetName: 'ymaxControl',
      method: 'terminate',
      args: [{ message: 'forget kit' }],
    });
    await eventLoopIteration(); // terminate is async
  }

  t.log('installAndStart');
  {
    const { issuer } = powers;
    const [BLD, USDC, PoC26] = await Promise.all([
      issuer.consume.BLD,
      issuer.consume.USDC,
      issuer.consume.PoC26,
    ]);
    const issuers = { USDC, Access: PoC26, Fee: BLD, BLD };
    const { privateArgs } = await (powers as PortfolioBootPowers).consume
      .ymax0Kit;

    // New portfolio-control does not use privateArgs from previous kit
    const privateArgsOverrides = {
      assetInfo: privateArgs.assetInfo,
      axelarIds: privateArgs.axelarIds,
      chainInfo: privateArgs.chainInfo,
      contracts: privateArgs.contracts,
      gmpAddresses: privateArgs.gmpAddresses,
      walletBytecode,
      remoteAccountBytecodeHash,
    } as CopyRecord;

    await E(E(walletCtrl).getInvokeFacet()).invokeEntry({
      targetName: 'ymaxControl',
      method: 'installAndStart',
      args: [{ bundleId: 'b2-ymax-bundleId', issuers, privateArgsOverrides }],
    });
    await eventLoopIteration(); // installAndStart is async
  }

  t.log('getCreatorFacet');
  await E(E(walletCtrl).getInvokeFacet()).invokeEntry({
    targetName: 'ymaxControl',
    method: 'getCreatorFacet',
    args: [],
    saveResult: { name: 'ymax0.creatorFacet' },
  });

  t.log('invite planner');
  const addrPl = 'agoric1planner';
  const [walletPl] = await provisionSmartWallet(addrPl);
  await E(E(walletCtrl).getInvokeFacet()).invokeEntry({
    targetName: 'ymax0.creatorFacet',
    method: 'deliverPlannerInvitation',
    args: [addrPl, pInst],
  });
  await eventLoopIteration(); // wait for vow to settle

  t.log('redeem planner invitation');
  const yInst = await E(agoricNames).lookup('instance', contractName);
  await E(E(walletPl).getOffersFacet()).executeOffer({
    id: 0,
    invitationSpec: {
      source: 'purse',
      description: 'planner',
      instance: yInst,
    },
    proposal: {},
    saveResult: { name: 'planner' },
  });

  t.log('make a portfolio');
  const { poc26 } = common.brands;
  const accessToken = poc26.mint.mintPayment(poc26.make(1n));
  const [walletTrader] = await provisionSmartWallet('agoric1trader1');
  await E(E(walletTrader).getDepositFacet()).receive(accessToken);
  const openP = E(E(walletTrader).getOffersFacet()).executeOffer({
    id: 1,
    invitationSpec: {
      source: 'contract',
      instance: yInst,
      publicInvitationMaker: 'makeOpenPortfolioInvitation',
    },
    proposal: { give: { Access: poc26.make(1n) } },
    offerArgs: {},
  });

  await Promise.all([openP, ackNFA(common.utils)]);

  t.log('invoke planner');
  await E(E(walletPl).getInvokeFacet()).invokeEntry({
    targetName: 'planner',
    method: 'submit',
    args: [0, [], 0, 0],
  });
});
