import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import { protoMsgMockMap } from '@aglocal/boot/tools/ibc/mocks.js';
import {
  AckBehavior,
  insistManagerType,
  makeSwingsetHarness,
} from '@aglocal/boot/tools/supports.js';
import { encodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import {
  MsgDepositForBurn,
  MsgDepositForBurnResponse,
} from '@agoric/cosmic-proto/circle/cctp/v1/tx.js';
import { AmountMath } from '@agoric/ertp';
import { makeRatio } from '@agoric/ertp/src/ratio.js';
import type { CctpTxEvidence, TransactionRecord } from '@agoric/fast-usdc';
import { Offers } from '@agoric/fast-usdc/src/clientSupport.js';
import { MockCctpTxEvidences } from '@agoric/fast-usdc/tools/mock-evidence.js';
import { BridgeId, NonNullish } from '@agoric/internal';
import {
  defaultSerializer,
  documentStorageSchema,
} from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { accountIdTo32Bytes } from '@agoric/orchestration/src/utils/address.js';
import {
  buildMsgResponseString,
  buildTxPacketString,
  buildVTransferEvent,
} from '@agoric/orchestration/tools/ibc-mocks.js';
import { Fail } from '@endo/errors';
import { configurations } from '../src/utils/deploy-config.js';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from './walletFactory.js';

const DENOM_UNIT = 1n * 1_000_000n; // 1 million

const LIQUIDITY_POOL_SIZE = 500n * DENOM_UNIT; // 500 USDC

const test: TestFn<
  WalletFactoryTestContext & {
    attest: (
      evidence: CctpTxEvidence,
      offerIdPrefix: string,
      ...extraArgs: unknown[]
    ) => Promise<void>;
    harness?: ReturnType<typeof makeSwingsetHarness>;
    readTxnRecord({ txHash }: { txHash: string }): TransactionRecord[];
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

const {
  channelId: agoricToNobleChannel,
  counterPartyChannelId: nobleToAgoricChannel,
} = fetchedChainInfo.agoric.connections['noble-1'].transferChannel;

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

  /**
   * Helper to submit evidence from all configured oracles.
   * @param evidence CCTP evidence
   * @param offerIdPrefix Prefix for the offer ID
   * @param extraArgs Additional arguments for SubmitEvidence invitation
   */
  const attest = async (
    evidence: CctpTxEvidence,
    offerIdPrefix: string,
    ...extraArgs: unknown[]
  ) => {
    const { walletFactoryDriver: wfd } = t.context;
    const oracles = await Promise.all(
      oracleAddrs.map(addr => wfd.provideSmartWallet(addr)),
    );

    await Promise.all(
      oracles.map((wallet, i) =>
        wallet.sendOffer({
          id: `${offerIdPrefix}-${i}`,
          invitationSpec: {
            source: 'continuing',
            previousOffer: 'claim-oracle-invitation',
            invitationMakerName: 'SubmitEvidence',
            invitationArgs: [evidence, ...extraArgs],
          },
          proposal: {},
        }),
      ),
    );
    await eventLoopIteration();
  };

  const readTxnRecord = ({ txHash }) =>
    t.context.storage
      .getValues(`published.fastUsdc.txns.${txHash}`)
      .map(defaultSerializer.parse) as TransactionRecord[];

  t.context = { ...ctx, attest, harness, readTxnRecord };
});
test.after.always(t => t.context.shutdown?.());

test.serial('oracles provision before contract deployment', async t => {
  const { walletFactoryDriver: wfd } = t.context;
  const [watcherWallet] = await Promise.all(
    oracleAddrs.map(addr => wfd.provideSmartWallet(addr)),
  );
  t.truthy(watcherWallet);
});

/**
 * Start with the Core Eval from proposal 87, the Fast USDC Beta release.
 *
 * UNTIL https://github.com/Agoric/agoric-sdk/issues/10079
 *
 * Usually, we do upgrade testing from mainnet state in a3p-integration, but that
 * environment does not yet have a connection to Noble (nor any other chains).
 */
test.serial('prop 87: Beta', async t => {
  const { agoricNamesRemotes, evalReleasedProposal, bridgeUtils } = t.context;

  // Proposal 87 doesn't quite complete: noble ICA is mis-configured
  bridgeUtils.setAckBehavior(
    BridgeId.DIBC,
    'startChannelOpenInit',
    AckBehavior.Never,
  );
  await evalReleasedProposal('fast-usdc-beta-1', 'start-fast-usdc').catch(err =>
    // the deployment succeeds so allow the particular known problem
    assert.equal(
      err.message,
      'unsettled value for "kp1205"',
      'unexpected error message',
    ),
  );

  t.truthy(agoricNamesRemotes.instance.fastUsdc);
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

    const watcherWallet = await wfd.provideSmartWallet(oracleAddrs[0]);

    const freshDeploy = false; // prop 87 done
    if (freshDeploy) {
      // inbound `startChannelOpenInit` responses immediately.
      // needed since the Fusdc StartFn relies on an ICA being created
      bridgeUtils.setAckBehavior(
        BridgeId.DIBC,
        'startChannelOpenInit',
        AckBehavior.Immediate,
      );
      bridgeUtils.setBech32Prefix('noble');

      const materials = buildProposal(
        '@aglocal/fast-usdc-deploy/src/start-fast-usdc.build.js',
        ['--net', 'MAINNET'],
      );
      await evalProposal(materials);
    }

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
        USDC: { brand: usdc, value: 98n * DENOM_UNIT },
      },
      want: {
        BADPROPOSAL: { brand: fastLP, value: 567n * DENOM_UNIT },
      },
    },
  });

  await lp.sendOffer(
    Offers.fastUsdc.Deposit(agoricNamesRemotes, {
      offerId: 'deposit-lp-1',
      fastLPAmount: LIQUIDITY_POOL_SIZE,
      usdcAmount: LIQUIDITY_POOL_SIZE,
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
    BigInt(lpBankDeposit.amount) === LIQUIDITY_POOL_SIZE,
    'vbank GIVEs shares to LP',
  );

  const { purses } = lp.getCurrentWalletRecord();
  // XXX #10491 should not need to resort to string match on brand
  t.falsy(
    purses.find(p => `${p.brand}`.match(/FastLP/)),
    'FastLP balance not in wallet record',
  );
});

test.serial('oracles accept invitations', async t => {
  const { walletFactoryDriver: wfd, agoricNamesRemotes } = t.context;
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
  t.log('TODO: check that invitations are used');
  t.pass();
});

test.serial('prop 88: RC1; update noble ICA', async t => {
  const { bridgeUtils, evalReleasedProposal } = t.context;

  bridgeUtils.setAckBehavior(
    BridgeId.DIBC,
    'startChannelOpenInit',
    AckBehavior.Immediate,
  );
  bridgeUtils.setBech32Prefix('noble');

  await evalReleasedProposal('fast-usdc-rc1', 'eval-fast-usdc-reconfigure');

  // XXX bridgeUtils.getOutboundMessages(BridgeId.DIBC) should
  // show the updated connection id, but we struggled to confirm.
  // We'll use multichain-testing to be sure.

  const { storage } = t.context;
  const doc = {
    node: 'fastUsdc',
    owner: 'Fast USDC',
    pattern: /published\.fastUsdc\.(feeConfig|feedPolicy|poolMetrics)/,
    replacement: '',
    showValue: JSON.parse,
  };
  await documentStorageSchema(t, storage, doc);

  await documentStorageSchema(t, storage, {
    node: 'fastUsdc.feeConfig',
    showValue: defaultSerializer.parse,
    note: 'feeConfig: 0.01USDC flat, 0.1% variable, 20% contract cut',
  });

  const outboundDIBC = bridgeUtils.getOutboundMessages(BridgeId.DIBC);
  const icaAccountReqs = outboundDIBC.filter(
    x =>
      x.method === 'startChannelOpenInit' &&
      x.packet.destination_port === 'icahost',
  );
  t.deepEqual(
    icaAccountReqs.map(r => JSON.parse(r.version).hostConnectionId),
    ['connection-40', 'connection-38'],
  );
});

test.serial('writes GTM feed policy to vstorage', async t => {
  const { storage } = t.context;
  const opts = {
    node: 'fastUsdc.feedPolicy',
    owner: 'the general and chain-specific policies for the Fast USDC feed',
    showValue: defaultSerializer.parse,
  };
  await documentStorageSchema(t, storage, opts);
});

test.serial('writes GTM fee config to vstorage', async t => {
  const { storage } = t.context;
  const doc = {
    node: 'fastUsdc.feeConfig',
    owner: 'the fee configuration for Fast USDC',
    showValue: defaultSerializer.parse,
  };
  await documentStorageSchema(t, storage, doc);
});

test.serial('writes GTM account addresses to vstorage', async t => {
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

test.serial('writes pool metrics to vstorage', async t => {
  const { storage } = t.context;
  const doc = {
    node: 'fastUsdc.poolMetrics',
    owner: 'FastUSC LiquidityPool exo',
    showValue: defaultSerializer.parse,
  };
  await documentStorageSchema(t, storage, doc);
});

test.serial('deploy RC2; update Settler reference', async t => {
  const { evalReleasedProposal, getVatDetailsByName } = t.context;
  await evalReleasedProposal('fast-usdc-rc2', 'eval-fast-usdc-settler-ref');
  const [vatDetails] = await getVatDetailsByName('fastUsdc');
  t.is(vatDetails.incarnation, 2);
});

test.serial('deploy HEAD; upgrade to support EVM destinations', async t => {
  const { buildProposal, evalProposal, getVatDetailsByName } = t.context;
  const materials = await buildProposal(
    '@aglocal/fast-usdc-deploy/src/fast-usdc-evm-dests.build.js',
  );
  await evalProposal(materials);
  const [vatDetails] = await getVatDetailsByName('fastUsdc');
  t.is(vatDetails.incarnation, 3);

  const doc = {
    node: 'fastUsdc.feeConfig',
    owner: 'the fee configuration for Fast USDC with `destinationOverrides`',
    showValue: defaultSerializer.parse,
  };
  await documentStorageSchema(t, t.context.storage, doc);
});

test.serial('makes usdc advance', async t => {
  const {
    walletFactoryDriver: wfd,
    readPublished,
    storage,
    harness,
    runUtils: { EV },
  } = t.context;
  const oracles = await Promise.all(
    oracleAddrs.map(addr => wfd.provideSmartWallet(addr)),
  );

  const EUD = 'dydx1anything';
  const { settlementAccount, poolAccount } = readPublished('fastUsdc');
  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO(
    // mock with the real settlementAccount address
    encodeAddressHook(settlementAccount, { EUD }),
  );

  harness?.useRunPolicy(true);
  await t.context.attest(evidence, 'submit-mock-evidence-osmo');
  harness &&
    t.log(
      `fusdc advance computrons (${oracles.length} oracles)`,
      harness.totalComputronCount(),
    );
  harness?.resetRunPolicy();

  t.deepEqual(t.context.readTxnRecord(evidence), [
    { evidence, status: 'OBSERVED' }, // observation includes evidence observed
    { status: 'ADVANCING' },
  ]);

  // Restart contract to make sure it doesn't break advance flow
  const kit = await EV.vat('bootstrap').consumeItem('fastUsdcKit');
  const actual = await EV(kit.adminFacet).restartContract(kit.privateArgs);
  t.deepEqual(actual, { incarnationNumber: 4 });

  const { runInbound } = t.context.bridgeUtils;
  await runInbound(
    BridgeId.VTRANSFER,
    buildVTransferEvent({
      sender: poolAccount,
      target: poolAccount,
      sourceChannel: agoricToNobleChannel,
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
      sourceChannel: nobleToAgoricChannel,
      destinationChannel: agoricToNobleChannel,
    }),
  );

  await eventLoopIteration();
  t.like(t.context.readTxnRecord(evidence), [
    { status: 'OBSERVED' },
    { status: 'ADVANCING' },
    { status: 'ADVANCED' },
    { status: 'DISBURSED', split: { ContractFee: { value: 32_000n } } },
  ]);

  const doc = {
    node: 'fastUsdc.txns',
    owner: 'the Ethereum transactions upon which Fast USDC is acting',
    showValue: defaultSerializer.parse,
  };
  await documentStorageSchema(t, storage, doc);
});

test.serial('minted before observed; forward path', async t => {
  const { bridgeUtils, readPublished, storage } = t.context;

  // Mock user data
  const EUD = 'cosmos1usermintedbeforeobserved';
  const { settlementAccount, nobleICA } = readPublished('fastUsdc');

  // Create mock evidence
  const mintAmt = 500_000n; // 0.5 USDC
  const recipientAddress = encodeAddressHook(settlementAccount, { EUD });
  const evidence = MockCctpTxEvidences.AGORIC_PLUS_AGORIC(recipientAddress);
  evidence.tx.amount = mintAmt;
  t.log('USDC minted before evidence is observed');

  // Simulate USDC being minted and received BEFORE evidence is submitted
  await bridgeUtils.runInbound(
    BridgeId.VTRANSFER,
    buildVTransferEvent({
      sequence: '1',
      amount: evidence.tx.amount,
      denom: 'uusdc',
      sender: evidence.tx.forwardingAddress,
      target: settlementAccount,
      receiver: recipientAddress,
      sourceChannel: nobleToAgoricChannel,
      destinationChannel: agoricToNobleChannel,
    }),
  );

  await eventLoopIteration();
  t.log('USDC funds received in settlement account before evidence submission');

  // Now submit evidence from oracles (after funds already received)
  await t.context.attest(evidence, 'submit-evidence-after-mint');

  // simulate acknowledgement of outgoing forward transfer
  await bridgeUtils.runInbound(
    BridgeId.VTRANSFER,
    buildVTransferEvent({
      sender: settlementAccount,
      target: settlementAccount,
      receiver: nobleICA,
      sourceChannel: agoricToNobleChannel,
      destinationChannel: nobleToAgoricChannel,
      sequence: '2',
      amount: evidence.tx.amount,
      memo: JSON.stringify(
        /** @type {ForwardInfo} */
        {
          forward: {
            receiver: recipientAddress,
            port: 'transfer',
            channel:
              fetchedChainInfo.noble.connections['agoric-3'].transferChannel
                .channelId,
          },
        },
      ),
    }),
  );
  await eventLoopIteration();

  // Verify the transaction status was set to FORWARDED
  t.deepEqual(
    t.context.readTxnRecord(evidence),
    [{ evidence, status: 'OBSERVED' }, { status: 'FORWARDED' }],
    'Transaction status should be FORWARDED when funds arrive before evidence',
  );

  const doc = {
    node: `fastUsdc.txns`,
    owner: `the Ethereum transactions upon which Fast USDC is acting`,
    showValue: defaultSerializer.parse,
  };
  await documentStorageSchema(t, storage, doc);
});

test.serial('distributes fees per BLD staker decision', async t => {
  const { walletFactoryDriver: wd, buildProposal, evalProposal } = t.context;

  const ContractFee = 32000n; // see split above
  t.is(((ContractFee - 16_000n) * 5n) / 10n, 8_000n);

  const cases = [
    { dest: 'agoric1a', args: ['--fixedFees', '0.016'], rxd: '16000' },
    { dest: 'agoric1b', args: ['--feePortion', '0.5'], rxd: '8000' },
  ];
  for (const { dest, args, rxd } of cases) {
    await wd.provideSmartWallet(dest);
    const materials = buildProposal(
      '@aglocal/fast-usdc-deploy/src/fast-usdc-fees.build.js',
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

  await t.context.attest(evidence, 'submit-mock-evidence-dydx-risky', {
    risksIdentified: ['TOO_LARGE_AMOUNT'],
  });

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

test.serial('Ethereum destination', async t => {
  const { readPublished, bridgeUtils } = t.context;

  const { nobleICA, poolAccount, settlementAccount } =
    readPublished('fastUsdc');

  const EUD = 'eip155:1:0x1234567890123456789012345678901234567890';
  const evidence = MockCctpTxEvidences.AGORIC_PLUS_ETHEREUM(
    // mock with the real settlementAccount address
    encodeAddressHook(settlementAccount, {
      EUD,
    }),
  );
  evidence.tx.amount = 93n * DENOM_UNIT; // 93 USDC

  // Register the ack so the inbound doesn't error immediately
  // register handler for ist bank send
  // XXX modify the module constant
  const data = buildTxPacketString([
    MsgDepositForBurn.toProtoMsg({
      amount: '92897000', // 93 USDC minus fees
      burnToken: 'uusdc',
      destinationDomain: 0,
      from: NonNullish(nobleICA),
      mintRecipient: accountIdTo32Bytes(EUD),
    }),
  ]);
  protoMsgMockMap[data] = buildMsgResponseString(MsgDepositForBurnResponse, {});

  await t.context.attest(evidence, 'submit-mock-evidence-eth');

  /* simulate acknowledgement of outgoing forward transfer
   *
   * An outgoing .transfer() from an LCA will not settle until we get an IBC
   * ack. See `sendThenWaitForAck`, which leverages ibc-packet.js and
   * packet-tools.js. Every LocalOrchAccount has a receiveUpcall handler registered
   * by packet-tools. receiveUpcall fires on both outgoing and incoming transfers.
   * It's responsible for handling these acknowledgements + allowing the holder to
   * register their own handler (like we do for SettlementAccount) that can run
   * concurrently */
  await bridgeUtils.runInbound(
    BridgeId.VTRANSFER,
    buildVTransferEvent({
      sequence: '3',
      amount: evidence.tx.amount,
      denom: 'uusdc',
      sender: evidence.tx.forwardingAddress,
      target: poolAccount,
      receiver: evidence.aux.recipientAddress,
      sourceChannel: agoricToNobleChannel,
      destinationChannel: nobleToAgoricChannel,
    }),
  );

  t.deepEqual(
    t.context.readTxnRecord(evidence),
    [
      { evidence, status: 'OBSERVED' }, // observation includes evidence observed
      { status: 'ADVANCING' },
    ],
    'Tx status ADVANCING after evidence submission',
  );

  // for the MsgDepositForBurn ack
  await t.context.bridgeUtils.flushInboundQueue();

  t.like(
    t.context.readTxnRecord(evidence),
    [
      { status: 'OBSERVED' },
      { status: 'ADVANCING' },
      // New since last check
      { status: 'ADVANCED' },
    ],
    'Tx status ADVANCED after inbound queued flushed',
  );

  // in due course, minted USDC arrives
  await bridgeUtils.runInbound(
    BridgeId.VTRANSFER,
    buildVTransferEvent({
      sequence: '1', // arbitrary; not used
      amount: evidence.tx.amount,
      denom: 'uusdc',
      sender: evidence.tx.forwardingAddress,
      target: settlementAccount,
      receiver: encodeAddressHook(settlementAccount, { EUD }),
      sourceChannel: nobleToAgoricChannel,
      destinationChannel: agoricToNobleChannel,
    }),
  );

  t.like(
    t.context.readTxnRecord(evidence),
    [
      { status: 'OBSERVED' },
      { status: 'ADVANCING' },
      { status: 'ADVANCED' },
      // New since last check
      { status: 'DISBURSED', split: { ContractFee: { value: 20_600n } } },
    ],
    'Tx status DISBURSED after simulated mint',
  );
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

// Test timeouts here because,
// 1. Zoe contract tests can't verify the behavior works through incarnations
// 2. Multichain tests integrate more than is relevant to this logic
test.serial('forward timeout', async t => {
  const { bridgeUtils, readPublished } = t.context;

  // Mock user data
  const EUD = 'cosmos1userforwardtimeout';
  const { settlementAccount, nobleICA } = readPublished('fastUsdc');

  // Create mock evidence
  const mintAmt = 600_000n; // 0.6 USDC
  const recipientAddress = encodeAddressHook(settlementAccount, { EUD });
  const evidence = MockCctpTxEvidences.AGORIC_PLUS_AGORIC(recipientAddress);
  evidence.tx.amount = mintAmt;
  // make unique to avoid collision with previous tests
  evidence.txHash =
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  t.log('USDC minted before evidence is observed for timeout test');

  // Simulate USDC being minted and received BEFORE evidence is submitted
  await bridgeUtils.runInbound(
    BridgeId.VTRANSFER,
    buildVTransferEvent({
      sequence: '1', // Sequence doesn't matter for this inbound mint
      amount: evidence.tx.amount,
      denom: 'uusdc',
      sender: evidence.tx.forwardingAddress,
      target: settlementAccount,
      receiver: recipientAddress,
      sourceChannel: nobleToAgoricChannel,
      destinationChannel: agoricToNobleChannel,
    }),
  );

  await eventLoopIteration();
  t.log('USDC funds received in settlement account before evidence submission');

  t.throws(
    () => t.context.readTxnRecord(evidence),
    undefined,
    'Transaction not in VSTORAGE before observation',
  );

  // Prevent auto-ack behavior for the vtransfer channel that the evidence is going to trigger
  // bridgeUtils.setAckBehavior('vtransfer', 'sendPacket', 'NEVER');

  // Now submit evidence from oracles (after funds already received)
  await t.context.attest(evidence, 'submit-evidence-after-mint-timeout');
  await eventLoopIteration(); // Allow contract to process evidence and initiate forward

  // Verify the transaction status was set to OBSERVED initially
  const statuses = t.context.readTxnRecord(evidence);
  t.deepEqual(
    statuses,
    [{ evidence, status: 'OBSERVED' }],
    'Transaction status should be OBSERVED initially',
  );

  // Simulate timeout of the outgoing forward transfer (sequence '2' was used in previous test)
  const firstForward = 4n; // XXX brittle, depends on IBC of previous tests
  const forwardMemo = JSON.stringify(
    /** @type {ForwardInfo} */
    {
      forward: {
        receiver: recipientAddress,
        port: 'transfer',
        channel:
          fetchedChainInfo.noble.connections['agoric-3'].transferChannel
            .channelId,
      },
    },
  );

  const successfulForwardEvent = buildVTransferEvent({
    sender: settlementAccount,
    target: settlementAccount, // Target might not be relevant for timeout event structure
    receiver: nobleICA,
    sourceChannel: agoricToNobleChannel,
    destinationChannel: nobleToAgoricChannel,
    // XXX buildVTransferEvent should take care of casting
    sequence: String(firstForward),
    amount: evidence.tx.amount, // Amount might not be relevant for timeout event structure
    memo: forwardMemo,
  });

  // Construct a corresponding timeout event we can send first
  const { acknowledgement: _, ...timeoutEvent } = {
    ...successfulForwardEvent,
    event: 'timeoutPacket', // Change event type
  };

  await bridgeUtils.runInbound(BridgeId.VTRANSFER, timeoutEvent);
  await eventLoopIteration();

  // Verify the transaction status includes FORWARD_FAILED
  t.deepEqual(
    t.context.readTxnRecord(evidence),
    [{ evidence, status: 'OBSERVED' }, { status: 'FORWARD_FAILED' }],
    'Transaction status should be FORWARD_FAILED after timeout',
  );

  // Simulate successful acknowledgement of the *same* outgoing forward transfer (as if retried)
  successfulForwardEvent.packet.sequence = String(firstForward + 1n); // to match next attempt
  await bridgeUtils.runInbound(BridgeId.VTRANSFER, successfulForwardEvent);

  // Verify the transaction status is now FORWARDED
  t.deepEqual(
    t.context.readTxnRecord(evidence),
    [
      { evidence, status: 'OBSERVED' },
      { status: 'FORWARD_FAILED' },
      { status: 'FORWARDED' }, // Now forwarded
    ],
    'Transaction status should be FORWARDED after successful retry/ack',
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

  // Incarnation 5 because of upgrade, previous test
  t.deepEqual(actual, { incarnationNumber: 5 });
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
    '@aglocal/fast-usdc-deploy/src/add-operators.build.js',
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

test.serial('update fee config', async t => {
  const { buildProposal, evalProposal, readPublished, storage } = t.context;

  // see `const newFlat = AmountMath.make(usdc, 9_999n);` above
  t.is(readPublished(`fastUsdc.feeConfig`).flat.value, 9_999n);

  /**
   * Note: there are no contract changes between this proposal and prop 89,
   * so we don't need to update "deploy HEAD; update Settler reference" to use
   * `evalReleasedProposal` yet
   */
  const updateFlatFee = buildProposal(
    '@aglocal/fast-usdc-deploy/src/fast-usdc-fee-config.build.js',
  );
  await evalProposal(updateFlatFee);

  t.is(readPublished(`fastUsdc.feeConfig`).flat.value, 0n);

  const doc = {
    node: 'fastUsdc.feeConfig',
    owner: 'the fee configuration for Fast USDC',
    showValue: defaultSerializer.parse,
  };
  await documentStorageSchema(t, storage, doc);
});
