import type { VstorageKit } from '@agoric/client-utils';
import { mustMatch, type ERemote } from '@agoric/internal';
import { defaultSerializer } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { ROOT_STORAGE_PATH } from '@agoric/orchestration/tools/contract-tests.js';
import type { Installation, Invitation, ZoeService } from '@agoric/zoe';
import buildZoeManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import { passStyleOf } from '@endo/pass-style';
import { M } from '@endo/patterns';
import type { ExecutionContext } from 'ava';
import type { Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { PortfolioPrivateArgs } from '../src/portfolio.contract.ts';
import * as contractExports from '../src/portfolio.contract.ts';
import type { PublishedTx, TxId, TxStatus } from '../src/resolver/types.ts';
import { makeEvmTrader, makeTrader } from '../tools/portfolio-actors.ts';
import { makeWallet } from '../tools/wallet-offer-tools.ts';
import {
  axelarIdsMock,
  contractsMock,
  evmTrader0PrivateKey,
  gmpAddresses,
  makeCCTPTraffic,
  makeUSDNIBCTraffic,
} from './mocks.ts';
import { getResolverMakers, settleTransaction } from './resolver-helpers.ts';
import { chainInfoWithCCTP, setupPortfolioTest } from './supports.ts';

const contractName = 'ymax0';
type StartFn = typeof contractExports.start;
const { values } = Object;

const makeReadPublished = (
  storage: Awaited<
    ReturnType<typeof setupPortfolioTest>
  >['bootstrap']['storage'],
) =>
  (async subpath => {
    await eventLoopIteration();
    const val = storage
      .getDeserialized(`${ROOT_STORAGE_PATH}.${subpath}`)
      .at(-1);
    return val;
  }) as unknown as VstorageKit['readPublished'];

const makeEvmWalletHandler = async (
  zoe: ZoeService,
  creatorFacet: ERemote<{
    makeEVMWalletHandlerInvitation: () => Promise<unknown>;
  }>,
) => {
  const invitation = (await E(
    creatorFacet,
  ).makeEVMWalletHandlerInvitation()) as Invitation;
  const seat = await E(zoe).offer(invitation, {});
  return E(seat).getOfferResult();
};

export const deploy = async (
  t: ExecutionContext,
  overrides: Partial<PortfolioPrivateArgs> = {},
) => {
  const common = await setupPortfolioTest(t);
  let testJig;
  const setJig = jig => (testJig = jig);
  const getTestJig = () => testJig;
  const { zoe, bundleAndInstall } = await setUpZoeForTest({ setJig });
  t.log('contract deployment', contractName);

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractExports);
  t.is(passStyleOf(installation), 'remotable');

  const { usdc, poc26, bld } = common.brands;
  const timerService = buildZoeManualTimer();

  // List of all chains whose `chainInfo` is utilized by the Portfolio contract.
  // Includes both Cosmos-based and EVM-based chains (mainnet and testnet).
  const selectedChains = [
    'agoric',
    'noble',
    'axelar',
    'osmosis',
    'Optimism',
    'Avalanche',
    'Arbitrum',
    'Ethereum',
    'Base',
  ];

  const chainInfo = Object.fromEntries(
    selectedChains.map(name => [name, chainInfoWithCCTP[name]]),
  );

  const makePrivateArgs = (
    privateArgOverrides: Partial<PortfolioPrivateArgs> = {},
  ): PortfolioPrivateArgs => ({
    ...common.commonPrivateArgs,
    axelarIds: axelarIdsMock,
    contracts: contractsMock,
    walletBytecode: '0x1234',
    gmpAddresses,
    timerService,
    chainInfo,
    ...privateArgOverrides,
  });

  const started = await E(zoe).startInstance(
    installation,
    { USDC: usdc.issuer, Fee: bld.issuer, Access: poc26.issuer },
    {}, // terms
    makePrivateArgs(overrides), // privateArgs
  );
  t.notThrows(() =>
    mustMatch(
      started,
      M.splitRecord({
        adminFacet: M.remotable(),
        instance: M.remotable(),
        publicFacet: M.remotable(),
        creatorFacet: M.remotable(),
        // ...others are not relevant here
      }),
    ),
  );
  const { baggage: contractBaggage } = getTestJig();
  return {
    common: {
      ...common,
      utils: { ...common.utils, bundleAndInstall, getTestJig, makePrivateArgs },
    },
    zoe,
    contractBaggage,
    started,
    timerService,
  };
};

export const setupTrader = async (
  t,
  initial = 10_000,
  overrides: Partial<PortfolioPrivateArgs> = {},
) => {
  const deployed = await deploy(t, overrides);
  const { common, zoe, started } = deployed;
  const { usdc, bld, poc26 } = common.brands;
  const { when } = common.utils.vowTools;

  const { storage } = common.bootstrap;
  const readPublished = makeReadPublished(storage);

  const makeFundedTrader = async () => {
    const myBalance = usdc.units(initial);
    const funds = await common.utils.pourPayment(myBalance);
    const { mint: _, ...poc26SansMint } = poc26;
    const { mint: _b, ...bldSansMint } = bld;
    const myWallet = makeWallet(
      { USDC: usdc, BLD: bldSansMint, Access: poc26SansMint },
      zoe,
      when,
    );
    await E(myWallet).deposit(funds);
    await E(myWallet).deposit(poc26.mint.mintPayment(poc26.make(1n)));
    await E(myWallet).deposit(bld.mint.mintPayment(bld.make(10_000n)));
    return makeTrader(myWallet, started.instance, readPublished);
  };
  const trader1 = await makeFundedTrader();
  const trader2 = await makeFundedTrader();
  const { ibcBridge } = common.mocks;
  ibcBridge.setAddressPrefix('noble');
  for (const { msg, ack } of values(makeUSDNIBCTraffic())) {
    ibcBridge.addMockAck(msg, ack);
  }
  for (const { msg, ack } of values(makeCCTPTraffic())) {
    ibcBridge.addMockAck(msg, ack);
  }

  const resolverMakers = await getResolverMakers(zoe, started.creatorFacet);

  /**
   * Read pure data (CapData that has no slots) from the storage path
   */
  const getDeserialized = (path: string): unknown[] => {
    return storage.getValues(path).map(defaultSerializer.parse);
  };

  const txResolver = harden({
    findPending: async () => {
      await eventLoopIteration();
      const paths = [...storage.data.keys()].filter(k =>
        k.includes('.pendingTxs.'),
      );
      const txIds: TxId[] = [];
      const txIdToNext: Map<TxId, TxId | undefined> = new Map();
      const settledTxs: Set<TxId> = new Set();
      for (const p of paths) {
        const info = getDeserialized(p).at(-1) as PublishedTx;
        const txId = p.split('.').at(-1) as TxId;

        if (info.status === 'success' || info.status === 'failed') {
          settledTxs.add(txId);
        }
        if (info.status !== 'pending') continue;

        // IBC_FROM_REMOTE is not yet implemented in resolver.
        if (info.type === 'IBC_FROM_REMOTE') continue;

        if (info.nextTxId) {
          // Chain-level support; consider it settled only when its dependents are.
          txIdToNext.set(txId, info.nextTxId);
          continue;
        }
        txIds.push(txId);
      }

      // See which of the dependencies are now eligible for settlement.
      for (const [txId, nextId] of txIdToNext.entries()) {
        // Check if the dependendency is settled.
        if (!nextId || settledTxs.has(nextId)) {
          txIds.push(txId);
        }
      }
      return harden(txIds);
    },
    drainPending: async (status: Exclude<TxStatus, 'pending'> = 'success') => {
      // For GMP flows, pair `transmitVTransferEvent('acknowledgementPacket', ...)`
      // with `drainPending()` to complete the pendingTxs lifecycle.
      const done: `tx${number}`[] = [];
      for (;;) {
        const txIds = await txResolver.findPending();
        if (!txIds.length) break;
        for (const txId of txIds) {
          const txNum = Number(txId.replace(/^tx/, ''));
          await settleTransaction(zoe, resolverMakers, txNum, status);
          done.push(txId);
        }
      }
      return harden(done);
    },
  });

  return { ...deployed, makeFundedTrader, trader1, trader2, txResolver };
};

export const makeEvmTraderKit = async (
  deployed: Awaited<ReturnType<typeof deploy>>,
  {
    privateKey = evmTrader0PrivateKey,
  }: {
    privateKey?: Hex;
  } = {},
) => {
  const { common, zoe, started, timerService } = deployed;
  const { when } = common.utils.vowTools;
  const { storage } = common.bootstrap;
  const readPublished = makeReadPublished(storage);
  const evmWalletHandler = (await makeEvmWalletHandler(
    zoe,
    started.creatorFacet,
  )) as ERemote<
    import('../src/evm-wallet-handler.exo.ts').EVMWalletMessageHandler
  >;
  const account = privateKeyToAccount(privateKey);
  const evmTrader = makeEvmTrader({
    evmWalletHandler,
    account,
    contractsByChain: contractsMock,
    chainInfoByName: chainInfoWithCCTP,
    timerService,
    readPublished,
    when,
  });
  return { evmTrader, evmWalletHandler, evmAccount: account, readPublished };
};

export const setupEvmTrader = async (
  t: ExecutionContext,
  overrides: Partial<PortfolioPrivateArgs> = {},
  options?: Parameters<typeof makeEvmTraderKit>[1],
) => {
  const deployed = await deploy(t, overrides);
  const evmKit = await makeEvmTraderKit(deployed, options);
  return { ...deployed, ...evmKit };
};

export const simulateCCTPAck = async utils => {
  // ack CCTP
  return utils
    .transmitVTransferEvent('acknowledgementPacket', -1)
    .then(() => eventLoopIteration())
    .finally(() => {
      // console.debug('ack CCTP done');
    });
};

// ack IBC transfer to Axelar to open Aave position
export const simulateAckTransferToAxelar = async utils => {
  return utils
    .transmitVTransferEvent('acknowledgementPacket', -1)
    .finally(() => {
      // console.debug('ack Axelar done');
    });
};
