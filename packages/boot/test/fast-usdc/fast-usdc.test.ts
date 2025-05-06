import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import { encodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { configurations } from '@agoric/fast-usdc/src/utils/deploy-config.js';
import { MockCctpTxEvidences } from '@agoric/fast-usdc/test/fixtures.js';
import { Offers } from '@agoric/fast-usdc/src/clientSupport.js';
import { documentStorageSchema } from '@agoric/governance/tools/storageDoc.js';
import { BridgeId, NonNullish } from '@agoric/internal';
import { unmarshalFromVstorage } from '@agoric/internal/src/marshal.js';
import { defaultSerializer } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { Fail } from '@endo/errors';
import { makeMarshal } from '@endo/marshal';
import { AmountMath } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio.js';
import {
  AckBehavior,
  insistManagerType,
  makeSwingsetHarness,
} from '../../tools/supports.js';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '../bootstrapTests/walletFactory.js';

const test: TestFn<
  WalletFactoryTestContext & {
    harness?: ReturnType<typeof makeSwingsetHarness>;
  }
> = anyTest;

// oracles, which were started with MAINNET config
const theConfig = configurations.MAINNET;
const { oracles: oracleRecord } = theConfig;
const oracleAddrs = Object.values(oracleRecord);

const {
  SLOGFILE: slogFile,
  SWINGSET_WORKER_TYPE: defaultManagerType = 'local',
} = process.env;

test.before('bootstrap', async t => {
  const config = '@agoric/vm-config/decentral-itest-fast-usdc-config.json';
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
  const { walletFactoryDriver: wfd } = t.context;
  const watcherWallet = await wfd.provideSmartWallet('agoric1watcher1');
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
      readPublished,
      walletFactoryDriver: wfd,
    } = t.context;

    const [watcherWallet] = await Promise.all(
      oracleAddrs.map(addr => wfd.provideSmartWallet(addr)),
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
      '@agoric/builders/scripts/fast-usdc/start-fast-usdc.build.js',
      ['--net', 'MAINNET'],
    );
    await evalProposal(materials);

    // update now that fastUsdc is instantiated
    refreshAgoricNamesRemotes();
    t.truthy(agoricNamesRemotes.instance.fastUsdc);
    t.truthy(agoricNamesRemotes.brand.FastLP);
    const lpAsset = agoricNamesRemotes.vbankAsset.FastLP;
    t.like(lpAsset, {
      issuerName: 'FastLP',
      denom: 'ufastlp',
      displayInfo: { assetKind: 'nat', decimalPlaces: 6 },
    });
    const lpId = lpAsset.brand.getBoardId() || assert.fail('impossible');
    t.is(agoricNamesRemotes.brand.FastLP.getBoardId(), lpId);

    const { EV } = t.context.runUtils;
    const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');
    const board = await EV.vat('bootstrap').consumeItem('board');
    const getBoardAux = async name => {
      const brand = await EV(agoricNames).lookup('brand', name);
      const id = await EV(board).getId(brand);
      assert.equal(id, lpId);
      return readPublished(`boardAux.${id}`);
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

    // XXX #10491 We should be able to compare objects by identity like this:
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
    showValue: defaultSerializer.parse,
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

test.serial('writes account addresses to vstorage', async t => {
  const { storage } = t.context;
  const doc = {
    node: 'fastUsdc',
    showValue: JSON.parse,
    pattern: /published\.fastUsdc\.(feeConfig|feedPolicy|poolMetrics)/,
    replacement: '',
    note: 'Under "published", the "fastUsdc" node is delegated to FastUSDC contract.',
  };

  await documentStorageSchema(t, storage, doc);
});

test.serial('LP deposits', async t => {
  const { walletFactoryDriver: wfd, agoricNamesRemotes } = t.context;
  const lp = await wfd.provideSmartWallet(
    'agoric19uscwxdac6cf6z7d5e26e0jm0lgwstc47cpll8',
  );

  // @ts-expect-error it doesnt recognize USDC as a Brand type
  const usdc = agoricNamesRemotes.vbankAsset.USDC.brand as Brand<'nat'>;
  // @ts-expect-error it doesnt recognize FastLP as a Brand type
  const fastLP = agoricNamesRemotes.vbankAsset.FastLP.brand as Brand<'nat'>;

  // Send a bad proposal first to make sure it's recoverable.
  await lp.sendOffer({
    id: 'deposit-lp-0',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['fastUsdc'],
      callPipe: [['makeDepositInvitation', []]],
    },
    proposal: {
      give: {
        USDC: { brand: usdc, value: 98_000_000n },
      },
      want: {
        BADPROPOSAL: { brand: fastLP, value: 567_000_000n },
      },
    },
  });

  await lp.sendOffer(
    Offers.fastUsdc.Deposit(agoricNamesRemotes, {
      offerId: 'deposit-lp-1',
      fastLPAmount: 150_000_000n,
      usdcAmount: 150_000_000n,
    }),
  );
  await eventLoopIteration();

  const { getOutboundMessages } = t.context.bridgeUtils;
  const lpBankDeposit = getOutboundMessages(BridgeId.BANK).find(
    obj =>
      obj.type === 'VBANK_GIVE' &&
      obj.denom === 'ufastlp' &&
      obj.recipient === lp.getAddress(),
  );
  t.log('LP vbank deposits', lpBankDeposit);
  t.true(
    BigInt(lpBankDeposit.amount) === 150_000_000n,
    'vbank GIVEs shares to LP',
  );

  const { purses } = lp.getCurrentWalletRecord();
  // XXX #10491 should not need to resort to string match on brand
  t.falsy(
    purses.find(p => `${p.brand}`.match(/FastLP/)),
    'FastLP balance not in wallet record',
  );
});

test.serial('makes usdc advance', async t => {
  const {
    walletFactoryDriver: wfd,
    storage,
    agoricNamesRemotes,
    harness,
    runUtils: { EV },
  } = t.context;
  const oracles = await Promise.all(
    oracleAddrs.map(addr => wfd.provideSmartWallet(addr)),
  );
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

  const EUD = 'dydx1anything';
  const { settlementAccount, poolAccount } = readPublished('fastUsdc');
  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO(
    // mock with the real settlementAccount address
    encodeAddressHook(settlementAccount, { EUD }),
  );

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

  const getTxStatus = txHash =>
    storage
      .getValues(`published.fastUsdc.txns.${txHash}`)
      .map(defaultSerializer.parse);

  t.deepEqual(getTxStatus(evidence.txHash), [
    { evidence, status: 'OBSERVED' }, // observation includes evidence observed
    { status: 'ADVANCING' },
  ]);

  // Restart contract to make sure it doesn't break advance flow
  const kit = await EV.vat('bootstrap').consumeItem('fastUsdcKit');
  const actual = await EV(kit.adminFacet).restartContract(kit.privateArgs);
  t.deepEqual(actual, { incarnationNumber: 1 });

  const { runInbound } = t.context.bridgeUtils;
  await runInbound(
    BridgeId.VTRANSFER,
    buildVTransferEvent({
      sender: poolAccount,
      target: poolAccount,
      sourceChannel: 'channel-62',
      sequence: '1',
    }),
  );

  // in due course, minted USDC arrives
  await runInbound(
    BridgeId.VTRANSFER,

    buildVTransferEvent({
      sequence: '1', // arbitrary; not used
      amount: evidence.tx.amount,
      denom: 'uusdc',
      sender: evidence.tx.forwardingAddress,
      target: settlementAccount,
      receiver: encodeAddressHook(settlementAccount, { EUD }),
      sourceChannel: evidence.aux.forwardingChannel,
      destinationChannel: 'channel-62', // fetchedChainInfo
      // destinationChannel: evidence.aux.forwardingChannel,
      // sourceChannel: 'channel-62', // fetchedChainInfo
    }),
  );

  await eventLoopIteration();
  t.like(getTxStatus(evidence.txHash), [
    { status: 'OBSERVED' },
    { status: 'ADVANCING' },
    { status: 'ADVANCED' },
    { status: 'DISBURSED', split: { ContractFee: { value: 302000n } } },
  ]);

  const doc = {
    node: `fastUsdc.txns`,
    owner: `the Ethereum transactions upon which Fast USDC is acting`,
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

test.serial('distributes fees per BLD staker decision', async t => {
  const { walletFactoryDriver: wd, buildProposal, evalProposal } = t.context;

  const ContractFee = 302000n; // see split above
  t.is(((ContractFee - 250000n) * 5n) / 10n, 26000n);

  const cases = [
    { dest: 'agoric1a', args: ['--fixedFees', '0.25'], rxd: '250000' },
    { dest: 'agoric1b', args: ['--feePortion', '0.5'], rxd: '26000' },
  ];
  for (const { dest, args, rxd } of cases) {
    await wd.provideSmartWallet(dest);
    const materials = buildProposal(
      '@agoric/builders/scripts/fast-usdc/fast-usdc-fees.build.js',
      ['--destinationAddress', dest, ...args],
    );
    await evalProposal(materials);

    const { getOutboundMessages } = t.context.bridgeUtils;
    const found = getOutboundMessages(BridgeId.BANK).find(
      msg => msg.recipient === dest && msg.type === 'VBANK_GIVE',
    );
    t.log('dest vbank msg', found);
    t.like(found, { amount: rxd });
  }
});

test.serial('skips usdc advance when risks identified', async t => {
  const { walletFactoryDriver: wfd, readPublished, storage } = t.context;
  await Promise.all(oracleAddrs.map(addr => wfd.provideSmartWallet(addr)));

  const EUD = 'dydx1riskyeud';
  const { settlementAccount } = readPublished('fastUsdc');
  const evidence = MockCctpTxEvidences.AGORIC_PLUS_DYDX(
    // mock with the real settlementAccount address
    encodeAddressHook(settlementAccount, { EUD }),
  );

  await Promise.all(
    oracles.map(wallet =>
      wallet.sendOffer({
        id: 'submit-mock-evidence-dydx-risky',
        invitationSpec: {
          source: 'continuing',
          previousOffer: 'claim-oracle-invitation',
          invitationMakerName: 'SubmitEvidence',
          invitationArgs: [evidence, { risksIdentified: ['TOO_LARGE_AMOUNT'] }],
        },
        proposal: {},
      }),
    ),
  );
  await eventLoopIteration();

  t.deepEqual(
    storage
      .getValues(`published.fastUsdc.txns.${evidence.txHash}`)
      .map(defaultSerializer.parse),
    [
      { evidence, status: 'OBSERVED' }, // observation includes evidence observed
      { status: 'ADVANCE_SKIPPED', risksIdentified: ['TOO_LARGE_AMOUNT'] },
    ],
  );

  const doc = {
    node: `fastUsdc.txns`,
    owner: `the Ethereum transactions upon which Fast USDC is acting`,
    showValue: defaultSerializer.parse,
  };
  await documentStorageSchema(t, storage, doc);
});

test.serial('LP withdraws', async t => {
  const { walletFactoryDriver: wfd, agoricNamesRemotes } = t.context;
  const lp = await wfd.provideSmartWallet(
    'agoric19uscwxdac6cf6z7d5e26e0jm0lgwstc47cpll8',
  );

  // @ts-expect-error it doesnt recognize USDC as a Brand type
  const usdc = agoricNamesRemotes.vbankAsset.USDC.brand as Brand<'nat'>;
  // @ts-expect-error it doesnt recognize FastLP as a Brand type
  const fastLP = agoricNamesRemotes.vbankAsset.FastLP.brand as Brand<'nat'>;

  // Send a bad proposal first to make sure it's recoverable.
  await lp.sendOffer({
    id: 'withdraw-lp-bad-shape',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['fastUsdc'],
      callPipe: [['makeWithdrawInvitation', []]],
    },
    proposal: {
      give: {
        PoolShare: { brand: fastLP, value: 777_000n },
      },
      want: {
        BADPROPOSALSHAPE: { brand: usdc, value: 777_000n },
      },
    },
  });

  await lp.sendOffer(
    Offers.fastUsdc.Withdraw(agoricNamesRemotes, {
      offerId: 'withdraw-lp-1',
      fastLPAmount: 369_000n,
      usdcAmount: 369_000n,
    }),
  );
  await eventLoopIteration();

  const { denom: usdcDenom } = agoricNamesRemotes.vbankAsset.USDC;
  const { getOutboundMessages } = t.context.bridgeUtils;
  const lpBankDeposits = getOutboundMessages(BridgeId.BANK).filter(
    obj =>
      obj.type === 'VBANK_GIVE' &&
      obj.denom === usdcDenom &&
      obj.recipient === lp.getAddress(),
  );
  t.log('LP vbank deposits', lpBankDeposits);
  // Check index 2. Indexes 0 and 1 would be from the deposit offers in prior testcase.
  t.true(
    BigInt(lpBankDeposits[2].amount) >= 369_000n,
    'vbank GIVEs USDC back to LP',
  );
});

test.serial('restart contract', async t => {
  const {
    runUtils: { EV },
    storage,
  } = t.context;
  const kit = await EV.vat('bootstrap').consumeItem('fastUsdcKit');
  const usdc = kit.privateArgs.feeConfig.flat.brand;
  const newFlat = AmountMath.make(usdc, 9_999n);
  const newVariableRate = makeRatio(3n, usdc, 100n, usdc);
  const newContractRate = makeRatio(1n, usdc, 11n, usdc);
  const newArgs = {
    ...kit.privateArgs,
    feeConfig: {
      flat: newFlat,
      variableRate: newVariableRate,
      contractRate: newContractRate,
    },
  };

  const actual = await EV(kit.adminFacet).restartContract(newArgs);

  // Incarnation 2 because previous test already restarted it once.
  t.deepEqual(actual, { incarnationNumber: 2 });
  const { flat, variableRate, contractRate } = storage
    .getValues(`published.fastUsdc.feeConfig`)
    .map(defaultSerializer.parse)
    .at(-1) as typeof newArgs.feeConfig;
  // Omitting brands UNTIL https://github.com/Agoric/agoric-sdk/issues/10491
  t.is(flat.value, newFlat.value);
  t.is(variableRate.numerator.value, newVariableRate.numerator.value);
  t.is(variableRate.denominator.value, newVariableRate.denominator.value);
  t.is(contractRate.numerator.value, newContractRate.numerator.value);
  t.is(contractRate.denominator.value, newContractRate.denominator.value);

  const doc = {
    node: 'fastUsdc.feeConfig',
    owner: 'the updated fee configuration for Fast USDC after contract upgrade',
    showValue: defaultSerializer.parse,
  };
  await documentStorageSchema(t, storage, doc);
});

test.serial('replace operators', async t => {
  const {
    agoricNamesRemotes,
    buildProposal,
    evalProposal,
    readPublished,
    runUtils: { EV },
    walletFactoryDriver: wfd,
  } = t.context;
  const { creatorFacet } = await EV.vat('bootstrap').consumeItem('fastUsdcKit');

  const EUD = 'dydx1anything';
  const { settlementAccount } = readPublished('fastUsdc');
  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO(
    // mock with the real settlementAccount address
    encodeAddressHook(settlementAccount, { EUD }),
  );

  // Remove old oracle operators (nested in block to isolate bindings)
  {
    for (const [name, address] of Object.entries(oracleRecord)) {
      t.log('Removing operator', name, 'at', address);
      await EV(creatorFacet).removeOperator(address);
    }

    const wallets = await Promise.all(
      oracleAddrs.map(addr => wfd.provideSmartWallet(addr)),
    );

    await Promise.all(
      wallets.map(wallet =>
        wallet.sendOffer({
          id: 'submit-while-disabled',
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
    for (const wd of wallets) {
      t.like(wd.getLatestUpdateRecord(), {
        status: {
          id: 'submit-while-disabled',
          error: 'Error: submitEvidence for disabled operator',
        },
      });
    }
  }

  // Add some new oracle operator
  const {
    // any one would do
    oracles: { gov1: address },
  } = configurations.A3P_INTEGRATION;
  const wallet = await wfd.provideSmartWallet(address);

  const addOperators = buildProposal(
    '@agoric/builders/scripts/fast-usdc/add-operators.build.js',
    ['--oracle', `gov1a3p:${address}`],
  );
  await evalProposal(addOperators);

  await wallet.sendOffer({
    id: 'claim-oracle-invitation',
    invitationSpec: {
      source: 'purse',
      instance: agoricNamesRemotes.instance.fastUsdc,
      description: 'oracle operator invitation',
    },
    proposal: {},
  });
  console.log('accepted invitation');

  await wallet.sendOffer({
    id: 'submit',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'claim-oracle-invitation',
      invitationMakerName: 'SubmitEvidence',
      invitationArgs: [evidence],
    },
    proposal: {},
  });
  console.log('submitted price');
  t.like(wallet.getLatestUpdateRecord(), {
    status: {
      id: 'submit',
      result: 'inert; nothing should be expected from this offer',
    },
  });
});
