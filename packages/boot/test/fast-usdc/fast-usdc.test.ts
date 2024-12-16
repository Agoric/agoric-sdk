import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { TestFn } from 'ava';
import { configurations } from '@agoric/fast-usdc/src/utils/deploy-config.js';
import { MockCctpTxEvidences } from '@agoric/fast-usdc/test/fixtures.js';
import { documentStorageSchema } from '@agoric/governance/tools/storageDoc.js';
import { Fail } from '@endo/errors';
import { unmarshalFromVstorage } from '@agoric/internal/src/marshal.js';
import { makeMarshal } from '@endo/marshal';
import {
  defaultMarshaller,
  defaultSerializer,
} from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { BridgeId } from '@agoric/internal';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '../bootstrapTests/walletFactory.js';
import {
  makeSwingsetHarness,
  insistManagerType,
  AckBehavior,
} from '../../tools/supports.js';

const test: TestFn<
  WalletFactoryTestContext & {
    harness?: ReturnType<typeof makeSwingsetHarness>;
  }
> = anyTest;

const {
  SLOGFILE: slogFile,
  SWINGSET_WORKER_TYPE: defaultManagerType = 'local',
} = process.env;

test.before('bootstrap', async t => {
  const config = '@agoric/vm-config/decentral-itest-orchestration-config.json';
  insistManagerType(defaultManagerType);
  const harness = ['xs-worker', 'xsnap'].includes(defaultManagerType)
    ? makeSwingsetHarness()
    : undefined;
  const ctx = await makeWalletFactoryContext(t, config, {
    slogFile,
    defaultManagerType,
    harness,
  });
  t.context = { ...ctx, harness };
});
test.after.always(t => t.context.shutdown?.());

test.serial('oracles provision before contract deployment', async t => {
  const { walletFactoryDriver: wd } = t.context;
  const watcherWallet = await wd.provideSmartWallet('agoric1watcher1');
  t.truthy(watcherWallet);
});

test.serial(
  'contract starts; adds to agoricNames; sends invitation',
  async t => {
    const {
      agoricNamesRemotes,
      bridgeUtils,
      buildProposal,
      evalProposal,
      refreshAgoricNamesRemotes,
      storage,
      walletFactoryDriver: wd,
    } = t.context;

    const { oracles } = configurations.MAINNET;
    const [watcherWallet] = await Promise.all(
      Object.values(oracles).map(addr => wd.provideSmartWallet(addr)),
    );

    // inbound `startChannelOpenInit` responses immediately.
    // needed since the Fusdc StartFn relies on an ICA being created
    bridgeUtils.setAckBehavior(
      BridgeId.DIBC,
      'startChannelOpenInit',
      AckBehavior.Immediate,
    );
    bridgeUtils.setBech32Prefix('noble');

    const materials = buildProposal(
      '@agoric/builders/scripts/fast-usdc/init-fast-usdc.js',
      ['--net', 'MAINNET'],
    );
    await evalProposal(materials);

    // update now that fastUsdc is instantiated
    refreshAgoricNamesRemotes();
    t.truthy(agoricNamesRemotes.instance.fastUsdc);
    t.truthy(agoricNamesRemotes.brand.FastLP);

    const { EV } = t.context.runUtils;
    const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');
    const board = await EV.vat('bootstrap').consumeItem('board');
    const getBoardAux = async name => {
      const brand = await EV(agoricNames).lookup('brand', name);
      const id = await EV(board).getId(brand);
      t.truthy(storage.data.get(`published.boardAux.${id}`));
      return unmarshalFromVstorage(
        storage.data,
        `published.boardAux.${id}`,
        makeMarshal().fromCapData,
        -1,
      );
    };
    t.like(
      await getBoardAux('FastLP'),
      {
        allegedName: 'PoolShares', // misnomer, in some contexts
        displayInfo: {
          assetKind: 'nat',
          decimalPlaces: 6,
        },
      },
      'brand displayInfo available in boardAux',
    );

    const current = watcherWallet.getCurrentWalletRecord();

    // XXX We should be able to compare objects by identity like this:
    //
    // const invitationPurse = current.purses.find(
    //   p => p.brand === agoricNamesRemotes.brand.Invitation,
    // );
    //
    // But agoricNamesRemotes and walletFactoryDriver
    // don't share a marshal context.
    // We should be able to map between them using
    // const walletStuff = w.fromCapData(a.toCapData(aStuff))
    // but the marshallers don't even preserve identity within themselves.

    current.purses.length === 1 || Fail`test limited to 1 purse`;
    const [thePurse] = current.purses;
    const details = thePurse.balance.value as Array<any>;
    Array.isArray(details) || Fail`expected SET value`;
    t.is(details.length, 1, 'oracle wallet has 1 invitation');
    t.is(details[0].description, 'oracle operator invitation');
    // XXX t.is(details.instance, agoricNames.instance.fastUsdc) should work
  },
);

test.serial('writes feed policy to vstorage', async t => {
  const { storage } = t.context;
  const opts = {
    node: 'fastUsdc.feedPolicy',
    owner: 'the general and chain-specific policies for the Fast USDC feed',
    showValue: JSON.parse,
  };
  await documentStorageSchema(t, storage, opts);
});

test.serial('writes fee config to vstorage', async t => {
  const { storage } = t.context;
  const doc = {
    node: 'fastUsdc.feeConfig',
    owner: 'the fee configuration for Fast USDC',
    showValue: defaultSerializer.parse,
  };
  await documentStorageSchema(t, storage, doc);
});

test.serial('writes pool metrics to vstorage', async t => {
  const { storage } = t.context;
  const doc = {
    node: 'fastUsdc.poolMetrics',
    owner: 'FastUSC LiquidityPool exo',
    showValue: defaultSerializer.parse,
  };
  await documentStorageSchema(t, storage, doc);
});

test.serial('writes account addresses to vstorage', async t => {
  const { storage } = t.context;
  const doc = {
    node: 'fastUsdc',
    showValue: JSON.parse,
    pattern: /published\.fastUsdc\.(feeConfig|feedPolicy|poolMetrics)/,
    replacement: '',
    note: `Under "published", the "fastUsdc" node is delegated to FastUSDC contract.
    Note: published.fastUsdc.[settleAcctAddr], published.fastUsdc.[poolAcctAddr],
    and published.fastUsdc.[intermediateAcctAddr] are published by @agoric/orchestration
    via 'withOrchestration' and (local|cosmos)-orch-account-kit.js.
    `,
  };

  await documentStorageSchema(t, storage, doc);
});

test.serial('makes usdc advance', async t => {
  const {
    walletFactoryDriver: wd,
    storage,
    agoricNamesRemotes,
    harness,
  } = t.context;
  const oracles = await Promise.all([
    wd.provideSmartWallet('agoric19uscwxdac6cf6z7d5e26e0jm0lgwstc47cpll8'),
    wd.provideSmartWallet('agoric1krunjcqfrf7la48zrvdfeeqtls5r00ep68mzkr'),
    wd.provideSmartWallet('agoric1n4fcxsnkxe4gj6e24naec99hzmc4pjfdccy5nj'),
  ]);
  await Promise.all(
    oracles.map(wallet =>
      wallet.sendOffer({
        id: 'claim-oracle-invitation',
        invitationSpec: {
          source: 'purse',
          instance: agoricNamesRemotes.instance.fastUsdc,
          description: 'oracle operator invitation',
        },
        proposal: {},
      }),
    ),
  );

  // @ts-expect-error it doesnt recognize usdc as a Brand type
  const usdc = agoricNamesRemotes.vbankAsset.USDC.brand as Brand<'nat'>;
  await oracles[0].sendOffer({
    id: 'deposit-lp-0',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['fastUsdc'],
      callPipe: [['makeDepositInvitation', []]],
    },
    proposal: {
      give: {
        USDC: { brand: usdc, value: 150_000_000n },
      },
    },
  });
  await eventLoopIteration();

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  harness?.useRunPolicy(true);
  await Promise.all(
    oracles.map(wallet =>
      wallet.sendOffer({
        id: 'submit-mock-evidence-osmo',
        invitationSpec: {
          source: 'continuing',
          previousOffer: 'claim-oracle-invitation',
          invitationMakerName: 'SubmitEvidence',
          invitationArgs: [evidence],
        },
        proposal: {},
      }),
    ),
  );
  await eventLoopIteration();
  harness &&
    t.log(
      `fusdc advance computrons (${oracles.length} oracles)`,
      harness.totalComputronCount(),
    );
  harness?.resetRunPolicy();

  const doc = {
    node: `fastUsdc.txns`,
    owner: `the Ethereum transactions upon which Fast USDC is acting`,
  };
  await documentStorageSchema(t, storage, doc);
});

test.serial('restart contract', async t => {
  const { EV } = t.context.runUtils;
  await null;
  const kit = await EV.vat('bootstrap').consumeItem('fastUsdcKit');
  const actual = await EV(kit.adminFacet).restartContract(kit.privateArgs);
  t.deepEqual(actual, { incarnationNumber: 1 });
});
