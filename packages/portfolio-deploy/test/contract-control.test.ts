import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { expectType } from 'tsd';

import * as ymaxExports from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import {
  axelarIdsMock,
  contractsMock,
  gmpAddresses,
} from '@aglocal/portfolio-contract/test/mocks.js';
import {
  chainInfoWithCCTP,
  setupPortfolioTest,
} from '@aglocal/portfolio-contract/test/supports.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makePromiseSpace } from '@agoric/vats';
import {
  produceDiagnostics,
  produceStartUpgradable,
} from '@agoric/vats/src/core/basic-behaviors.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/eventual-send';
import { passStyleOf } from '@endo/pass-style';
import type { ExecutionContext, TestFn } from 'ava';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { ZoeService } from '@agoric/zoe';
import type {
  WellKnownSpaces,
  BootstrapSpace,
  PromiseSpaceOf,
} from '@agoric/vats/src/core/types.js';
import type { StartedInstanceKit } from '@agoric/zoe/src/zoeService/utils.js';
import {
  prepareContractControl,
  type ContractControl,
} from '../src/contract-control.js';

const nodeRequire = createRequire(import.meta.url);
const asset = (spec: string) => readFile(nodeRequire.resolve(spec), 'utf8');

type YMaxStartFn = typeof ymaxExports.start;

type Space = WellKnownSpaces &
  BootstrapSpace &
  PromiseSpaceOf<{ ymaxControl: ContractControl<YMaxStartFn> }>;

const ackNFA = (utils, ix = 0) =>
  utils.transmitVTransferEvent('acknowledgementPacket', ix);

const test: TestFn<Awaited<ReturnType<typeof makeTestContext>>> = anyTest;

const makeTestContext = async (t: ExecutionContext) => {
  const common = await setupPortfolioTest(t);
  const { rootZone, wellKnownSpaces } = common.utils;
  // XXX type of zoe from setUpZoeForTest is any???
  const { zoe: zoeAny, bundleAndInstall } = await setUpZoeForTest();
  const zoe: ZoeService = zoeAny;

  const space = { ...wellKnownSpaces, ...makePromiseSpace(t.log) } as Space;
  const zone = rootZone.subZone('bootstrap vat');

  space.produce.zoe.resolve(zoe);
  space.produce.agoricNames.resolve(common.bootstrap.agoricNames);
  space.produce.agoricNamesAdmin.resolve(common.bootstrap.agoricNamesAdmin);

  await produceDiagnostics(space);
  await produceStartUpgradable({ zone, ...space });

  const startUpgradable = await space.consume.startUpgradable;

  const { agoricNamesAdmin, board } = common.bootstrap;

  const updatePrivateArgs = (_instance, _privateArgs) => {
    // TODO: upgrade test not functional in fakeZoe
  };

  const makeContractControl = prepareContractControl(zone, {
    agoricNamesAdmin,
    board,
    startUpgradable,
    updatePrivateArgs,
    zoe,
  });

  const { bytecode: walletBytecode } = JSON.parse(
    await asset('@aglocal/portfolio-deploy/tools/evm-orch/Wallet.json'),
  );

  return {
    common,
    zoe,
    bundleAndInstall,
    startUpgradable,
    makeContractControl,
    space,
    walletBytecode,
  };
};

test.before(async t => (t.context = await makeTestContext(t)));

const contractName = 'ymax0';
const makeYmaxDataPrivateArgs = (walletBytecode: string) =>
  harden({
    chainInfo: Object.fromEntries(
      // XXX factor out of contract-setup.ts?
      [
        'agoric',
        'noble',
        'axelar',
        'osmosis',
        'Optimism',
        'Avalanche',
        'Arbitrum',
      ].map(name => [name, chainInfoWithCCTP[name]]),
    ),
    assetInfo: [],
    axelarIds: axelarIdsMock,
    contracts: contractsMock,
    gmpAddresses,
    walletBytecode,
  });

test.serial('make, deliver ContractControl for ymax', async t => {
  const { common, makeContractControl, space, walletBytecode } = t.context;

  const { rootNode: chainStorage } = common.bootstrap.storage;
  const storageNode = await E(chainStorage).makeChildNode(contractName);

  const ymaxDataPrivateArgs = makeYmaxDataPrivateArgs(walletBytecode);
  const initialPrivateArgs = {
    ...ymaxDataPrivateArgs,
    // @ts-expect-error some commonPrivateArgs types are sus
    ...(common.commonPrivateArgs as ymaxExports.PortfolioPrivateArgs),
  };

  // Without a kit, makeContractControl cannot infer the type
  const cc = makeContractControl<YMaxStartFn>({
    name: contractName,
    storageNode,
    initialPrivateArgs,
  });
  // Need to check in that direction instead of `expectType<ContractControl<YMaxStartFn>>(cc)`
  expectType<typeof cc>(undefined as unknown as ContractControl<YMaxStartFn>);

  t.is(passStyleOf(cc), 'remotable');
  // eslint-disable-next-line no-underscore-dangle
  t.deepEqual((cc as any).__getMethodNames__(), [
    '__getInterfaceGuard__',
    '__getMethodNames__',
    'getCreatorFacet',
    'getPublicFacet',
    'install',
    'installAndStart',
    'pruneChainStorage',
    'revoke',
    'start',
    'terminate',
    'upgrade',
  ]);

  space.produce.ymaxControl.resolve(cc);
});

const arbBundleId = 'b2-arbitrary-teeFae9u';

test.serial('install ymax0 updates agoricNames.installation', async t => {
  const { bundleAndInstall, space } = t.context;
  await bundleAndInstall(
    './dist/portfolio.contract.bundle.js', // package-relative
    arbBundleId,
  );
  const cc = await space.consume.ymaxControl;
  const actual = await E(cc).install(arbBundleId);
  t.is(passStyleOf(actual), 'copyRecord');
  const { agoricNames } = t.context.common.bootstrap;
  const installation = await E(agoricNames).lookup(
    'installation',
    contractName,
  );
  t.is(installation, actual.installation);
});

test.serial('installAndStart ymax0', async t => {
  const { common, space } = t.context;
  const cc = await space.consume.ymaxControl;

  const { usdc, bld } = common.brands;
  const issuers = { USDC: usdc.issuer, Fee: bld.issuer, BLD: bld.issuer };

  await E(cc).installAndStart({ bundleId: arbBundleId, issuers });

  const { agoricNames } = common.bootstrap;
  const instance = await E(agoricNames).lookup('instance', contractName);
  t.log('instance', instance);
  t.is(passStyleOf(instance), 'remotable');

  await E(cc).terminate({ message: 'prepare for next test' });
});

test.serial('start ymax0 using contractExport', async t => {
  const { common, bundleAndInstall, space } = t.context;
  const cc = await space.consume.ymaxControl;

  const installation = await bundleAndInstall(ymaxExports);
  const installationAdmin = E(common.bootstrap.agoricNamesAdmin).lookupAdmin(
    'installation',
  );
  await E(installationAdmin).update(contractName, installation);

  const { usdc, bld } = common.brands;
  const issuers = { USDC: usdc.issuer, Fee: bld.issuer, BLD: bld.issuer };

  await E(cc).start({ installation, issuers });

  const { agoricNames } = common.bootstrap;
  const instance = await E(agoricNames).lookup('instance', contractName);
  t.log('instance', instance);
  t.is(passStyleOf(instance), 'remotable');
});

test.serial('getCreatorFacet', async t => {
  const cc = await t.context.space.consume.ymaxControl;
  const cf = await E(cc).getCreatorFacet();
  t.log('creatorFacet', cf);
  t.is(passStyleOf(cf), 'remotable');
});

test.serial('limited upgrade test', async t => {
  const cc = await t.context.space.consume.ymaxControl;

  t.log('fakeVatAdmin does not support upgrade');
  await t.throwsAsync(E(cc).upgrade(arbBundleId), {
    message: 'upgrade not faked',
  });
});

test.serial('starting while already running fails', async t => {
  const { bundleAndInstall, space } = t.context;
  const cc = await space.consume.ymaxControl;

  const installation = await bundleAndInstall(ymaxExports);

  const issuers = {};

  await t.throwsAsync(E(cc).start({ installation, issuers }), {
    message: '"ymax0" already started',
  });
});

test.serial('terminate continues after error', async t => {
  const { common, bundleAndInstall, space } = t.context;
  const { agoricNames } = common.bootstrap;

  const contractKits = await space.consume.contractKits;
  const instance = await E(agoricNames).lookup('instance', contractName);

  const { adminFacet } = contractKits.get(instance);
  await E(adminFacet).terminateContract(Error('testing early termination'));

  const cc = await space.consume.ymaxControl;
  await t.notThrowsAsync(E(cc).terminate());

  // start for next test
  const installation = await bundleAndInstall(ymaxExports);
  const { usdc, bld } = common.brands;
  const issuers = { USDC: usdc.issuer, Fee: bld.issuer, BLD: bld.issuer };
  await E(cc).start({ installation, issuers });
});

test.serial('prune ymax0 vstorage', async t => {
  const { common, zoe, space } = t.context;
  const { agoricNames } = common.bootstrap;

  const instance = await E(agoricNames).lookup('instance', contractName);
  const pf = await E(zoe).getPublicFacet(instance);
  const toOpen = await E(pf).makeOpenPortfolioInvitation();
  const offerArgs = { targetAllocation: { USDN: 100n } };
  const seat = await E(zoe).offer(toOpen, {}, {}, offerArgs);
  t.log(
    'payouts',
    await Promise.all([E(seat).getPayouts(), ackNFA(common.utils)]),
  );
  const { storage } = common.bootstrap;
  const keysPre = [...storage.data.keys()];
  t.log('ymax storage keys with 1 portfolio', keysPre);

  const cc = await space.consume.ymaxControl;
  await E(cc).pruneChainStorage({
    'orchtest.ymax0.portfolios': ['portfolio0'],
    'orchtest.ymax0': ['portfolios'],
  });
  await eventLoopIteration();
  const keysPost = [...storage.data.keys()];
  t.log('ymax storage after pruning', keysPost);
  t.false(keysPost.includes('orchtest.ymax0.portfolios.portfolio0'));
  t.false(keysPost.includes('orchtest.ymax0.portfolios'));
});

test.serial('terminate ymax0', async t => {
  const { common, space } = t.context;
  const { agoricNames, board } = common.bootstrap;
  const cc = await space.consume.ymaxControl;

  const instance = await E(agoricNames).lookup('instance', contractName);
  const target = await E(board).getId(instance);
  t.log('before', instance, target);
  await E(cc).terminate({ message: 'have done with ye', target });

  const instancesPost = await E(E(agoricNames).lookup('instance')).keys();
  t.log('after', instancesPost);
  t.false(instancesPost.includes(contractName));

  // NOTE: setUpZoeForTest() uses a fakeVatAdmin where terminate is a noop
});

test.serial('restart ymax0', async t => {
  const { common, space } = t.context;
  const { agoricNames } = common.bootstrap;

  const { usdc, bld } = common.brands;
  const issuers = { USDC: usdc.issuer, Fee: bld.issuer, BLD: bld.issuer };

  const installation = await E(agoricNames).lookup(
    'installation',
    contractName,
  );

  const cc = await space.consume.ymaxControl;
  await E(cc).start({ installation, issuers });

  const instance = await E(agoricNames).lookup('instance', contractName);
  t.log('instance', instance);
  t.is(passStyleOf(instance), 'remotable');
});

test.serial('revoke', async t => {
  const { space } = t.context;
  const cc = await space.consume.ymaxControl;
  await E(cc).revoke();
  await t.throwsAsync(E(cc).getCreatorFacet(), { message: 'revoked' });
  space.produce.ymaxControl.reset();
});

test.serial('create from kit', async t => {
  const { common, space, makeContractControl } = t.context;
  const { agoricNames } = common.bootstrap;

  const contractKits = await space.consume.contractKits;
  const instance = await E(agoricNames).lookup('instance', contractName);

  const kit = contractKits.get(instance) as StartedInstanceKit<YMaxStartFn>;
  const initialPrivateArgs = common.commonPrivateArgs;

  const { rootNode: chainStorage } = common.bootstrap.storage;
  const storageNode = await E(chainStorage).makeChildNode(contractName);

  const cc = makeContractControl({
    name: contractName,
    storageNode,
    kit,
    // @ts-expect-error commonPrivateArgs is not actually PortfolioPrivateArgs
    initialPrivateArgs,
  });
  expectType<typeof cc>(undefined as unknown as ContractControl<YMaxStartFn>);
  space.produce.ymaxControl.resolve(cc);

  const cf = await E(cc).getCreatorFacet();
  t.log('creatorFacet', cf);
  t.is(cf, kit.creatorFacet);
});

test.serial('terminate with revoke', async t => {
  const cc = await t.context.space.consume.ymaxControl;
  await E(cc).terminate({ message: 'terminate and revoke', revoke: true });
  await t.throwsAsync(E(cc).getCreatorFacet(), { message: 'revoked' });
});
