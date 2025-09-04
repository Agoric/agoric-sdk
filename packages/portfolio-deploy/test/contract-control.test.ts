import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

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
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/eventual-send';
import { passStyleOf } from '@endo/pass-style';
import { makePromiseKit } from '@endo/promise-kit';
import type { TestFn } from 'ava';
import {
  prepareContractControl,
  type ContractControl,
} from '../src/contract-control.js';

type YMaxStartFn = typeof ymaxExports.start;

const test: TestFn<Awaited<ReturnType<typeof makeTestContext>>> = anyTest;

const makeTestContext = async t => {
  const common = await setupPortfolioTest(t);
  const { rootZone } = common.utils;
  // XXX type of zoe from setUpZoeForTest is any???
  const { zoe: zoeAny, bundleAndInstall } = await setUpZoeForTest();
  const zoe: ZoeService = zoeAny;
  const startedKitPK = makePromiseKit<StartedInstanceKit<any>>();

  const startUpgradable = (async ({
    label,
    installation,
    issuerKeywordRecord,
    privateArgs,
    terms,
  }) => {
    const kit = await E(zoe).startInstance(
      installation,
      issuerKeywordRecord,
      terms,
      privateArgs,
      label,
    );

    startedKitPK.resolve(kit);
    return harden({ ...kit, label });
  }) as StartUpgradable;

  const zone = rootZone.subZone('bootstrap vat');
  const { agoricNamesAdmin, board } = common.bootstrap;

  const makeContractControl = prepareContractControl(zone, {
    agoricNamesAdmin,
    board,
    startUpgradable,
    zoe,
  });

  return {
    common,
    zoe,
    bundleAndInstall,
    startUpgradable,
    makeContractControl,
    ymaxControlPK: makePromiseKit<ContractControl<YMaxStartFn>>(), // analog to wallet/purse
    startedKitP: startedKitPK.promise,
  };
};

test.before(async t => (t.context = await makeTestContext(t)));

const contractName = 'ymax0';

const ymaxDataPrivateArgs: Omit<
  Parameters<YMaxStartFn>[1],
  | 'agoricNames'
  | 'localchain'
  | 'marshaller'
  | 'orchestrationService'
  | 'storageNode'
  | 'timerService'
> = harden({
  chainInfo: Object.fromEntries(
    // XXX factor out of contract-setup.ts?
    [
      'agoric',
      'noble',
      'axelar',
      'osmosis',
      'Polygon',
      'Optimism',
      'Avalanche',
      'Arbitrum',
    ].map(name => [name, chainInfoWithCCTP[name]]),
  ),
  assetInfo: [],
  axelarIds: axelarIdsMock,
  contracts: contractsMock,
  gmpAddresses,
});
harden(ymaxDataPrivateArgs);

test.serial('make, deliver ContractControl for ymax', async t => {
  const { common, makeContractControl } = t.context;

  const { rootNode: chainStorage } = common.bootstrap.storage;
  const storageNode = await E(chainStorage).makeChildNode(contractName);

  const initialPrivateArgs = {
    ...ymaxDataPrivateArgs,
    ...common.commonPrivateArgs,
  };

  const cc = makeContractControl({
    name: contractName,
    storageNode,
    initialPrivateArgs,
  });

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
    'start',
    'terminate',
    'upgrade',
  ]);

  t.context.ymaxControlPK.resolve(cc);
});

const arbBundleId = 'b2-arbitrary-teeFae9u';

test.serial('install ymax0 updates agoricNames.installation', async t => {
  const { bundleAndInstall } = t.context;
  await bundleAndInstall(
    './dist/portfolio.contract.bundle.js', // package-relative
    arbBundleId,
  );
  const cc = await t.context.ymaxControlPK.promise;
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
  const { common } = t.context;
  const cc = await t.context.ymaxControlPK.promise;

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
  const { common, bundleAndInstall } = t.context;
  const cc = await t.context.ymaxControlPK.promise;

  const installation = await bundleAndInstall(ymaxExports);

  const { usdc, bld } = common.brands;
  const issuers = { USDC: usdc.issuer, Fee: bld.issuer, BLD: bld.issuer };

  await E(cc).start({ installation, issuers });

  const { agoricNames } = common.bootstrap;
  const instance = await E(agoricNames).lookup('instance', contractName);
  t.log('instance', instance);
  t.is(passStyleOf(instance), 'remotable');
});

test.serial('getCreatorFacet', async t => {
  const cc = await t.context.ymaxControlPK.promise;
  const cf = await E(cc).getCreatorFacet();
  t.log('creatorFacet', cf);
  t.is(passStyleOf(cf), 'remotable');
});

test.serial('limited upgrade test', async t => {
  const cc = await t.context.ymaxControlPK.promise;

  t.log('fakeVatAdmin does not support upgrade');
  await t.throwsAsync(E(cc).upgrade(arbBundleId), {
    message: 'upgrade not faked',
  });
});

test.serial('starting while already running fails', async t => {
  const { bundleAndInstall } = t.context;
  const cc = await t.context.ymaxControlPK.promise;

  const installation = await bundleAndInstall(ymaxExports);

  const issuers = {};

  await t.throwsAsync(E(cc).start({ installation, issuers }), {
    message: '"ymax0" already started',
  });
});

test.serial('terminate continues after error', async t => {
  const { common, startedKitP, bundleAndInstall } = t.context;
  const cc = await t.context.ymaxControlPK.promise;

  const { adminFacet } = await startedKitP;
  await E(adminFacet).terminateContract(Error('testing early termination'));

  await t.notThrowsAsync(E(cc).terminate());

  // start for next test
  const installation = await bundleAndInstall(ymaxExports);
  const { usdc, bld } = common.brands;
  const issuers = { USDC: usdc.issuer, Fee: bld.issuer, BLD: bld.issuer };
  await E(cc).start({ installation, issuers });
});

test.serial('prune ymax0 vstorage', async t => {
  const { common, zoe } = t.context;
  const { agoricNames } = common.bootstrap;

  const instance = await E(agoricNames).lookup('instance', contractName);
  const pf = await E(zoe).getPublicFacet(instance);
  const toOpen = await E(pf).makeOpenPortfolioInvitation();
  const offerArgs = { targetAllocation: { USDN: 100n } };
  const seat = await E(zoe).offer(toOpen, {}, {}, offerArgs);
  t.log('payouts', await E(seat).getPayouts());
  const { storage } = common.bootstrap;
  const keysPre = [...storage.data.keys()];
  t.log('ymax storage keys with 1 portfolio', keysPre);

  const cc = await t.context.ymaxControlPK.promise;
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
  const { common } = t.context;
  const { agoricNames, board } = common.bootstrap;
  const cc = await t.context.ymaxControlPK.promise;

  const instance = await E(agoricNames).lookup('instance', contractName);
  const target = await E(board).getId(instance);
  t.log('before', instance, target);
  await E(cc).terminate({ message: 'have done with ye', target });

  const instancesPost = await E(E(agoricNames).lookup('instance')).keys();
  t.log('after', instancesPost);
  t.false(instancesPost.includes(contractName));

  // NOTE: setUpZoeForTest() uses a fakeVatAdmin where terminate is a noop
});

test.serial('revoke', async t => {
  const cc = await t.context.ymaxControlPK.promise;
  await E(cc)
    .terminate({ revoke: true })
    .catch(() => {});
  await t.throwsAsync(E(cc).getCreatorFacet(), { message: 'revoked' });
});
