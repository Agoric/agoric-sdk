/** @file exercise Fast USDC contract in iterations; see chain-impact.test.ts */
import type { ExecutionContext } from 'ava';

import { type WalletFactoryTestContext } from '@aglocal/boot/test/bootstrapTests/walletFactory.js';
import { AckBehavior } from '@aglocal/boot/tools/supports.js';
import { configurations } from '@aglocal/fast-usdc-deploy/src/utils/deploy-config.js';
import {
  encodeAddressHook,
  encodeBech32,
} from '@agoric/cosmic-proto/address-hooks.js';
import { buildProposal } from '@agoric/cosmic-swingset/tools/test-proposal-utils.ts';
import type {
  CctpTxEvidence,
  ContractRecord,
  EvmAddress,
  NobleAddress,
  PoolMetrics,
} from '@agoric/fast-usdc';
import { Offers } from '@agoric/fast-usdc/src/clientSupport.js';
import { BridgeId } from '@agoric/internal';
import { defaultMarshaller } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { CosmosChainAddress } from '@agoric/orchestration';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type { IBCChannelID } from '@agoric/vats';
import { makePromiseKit } from '@endo/promise-kit';

type SmartWallet = Awaited<
  ReturnType<
    WalletFactoryTestContext['walletFactoryDriver']['provideSmartWallet']
  >
>;

const range = (n: number) => Array.from(Array(n).keys());
const prefixedRange = (n: number, pfx: string) =>
  range(n).map(ix => `${pfx}${ix}`);

const nobleAgoricChannelId = 'channel-21';

const makeTxOracle = (
  context: WalletFactoryTestContext,
  name: string,
  addr: string,
) => {
  const { agoricNamesRemotes, walletFactoryDriver: wfd } = context;
  const walletPK = makePromiseKit<SmartWallet>();

  return harden({
    async provision() {
      walletPK.resolve(wfd.provideSmartWallet(addr));
      return walletPK.promise;
    },
    async claim() {
      const wallet = await walletPK.promise;
      await wallet.sendOffer({
        id: 'claim-oracle-invitation',
        invitationSpec: {
          source: 'purse',
          instance: agoricNamesRemotes.instance.fastUsdc,
          description: 'oracle operator invitation',
        },
        proposal: {},
      });
    },
    async submit(evidence: CctpTxEvidence, nonce: number) {
      const wallet = await walletPK.promise;
      const it: OfferSpec = {
        id: `submit-evidence-${nonce}`,
        invitationSpec: {
          source: 'continuing',
          previousOffer: 'claim-oracle-invitation',
          invitationMakerName: 'SubmitEvidence',
          invitationArgs: [evidence],
        },
        proposal: {},
      };
      await wallet.sendOffer(it);
      return it;
    },
  });
};
type TxOracle = ReturnType<typeof makeTxOracle>;

const makeFastUsdcQuery = (context: WalletFactoryTestContext) => {
  const { storage } = context;
  return harden({
    metrics: () => {
      const metrics: PoolMetrics = defaultMarshaller.fromCapData(
        JSON.parse(storage.getValues('published.fastUsdc.poolMetrics').at(-1)!),
      );
      return metrics;
    },
    contractRecord: () => {
      const values = storage.getValues('published.fastUsdc');
      const it: ContractRecord = JSON.parse(values.at(-1)!);
      return it;
    },
    txStatus: (txHash: string) =>
      storage
        .getValues(`published.fastUsdc.txns.${txHash}`)
        .map(txt => defaultMarshaller.fromCapData(JSON.parse(txt))),
  });
};

const makeLP = (context: WalletFactoryTestContext, addr: string) => {
  const { agoricNamesRemotes, walletFactoryDriver: wfd } = context;
  const lpP = wfd.provideSmartWallet(addr);

  const pollOffer = async (lp: SmartWallet, id: string) => {
    for (;;) {
      const info = lp.getLatestUpdateRecord();
      if (info.updated !== 'offerStatus') continue;
      if (info.status.id !== id) continue;
      if (info.status.error) throw Error(info.status.error);
      if (info.status.payouts) return info.status;
      await eventLoopIteration();
    }
  };

  return harden({
    async deposit(value: bigint, nonce: number) {
      const offerId = `lp-deposit-${nonce}`;
      const offerSpec = Offers.fastUsdc.Deposit(agoricNamesRemotes, {
        offerId,
        fastLPAmount: BigInt(Math.round(Number(value) * 0.6)), // XXX use poolMetrics?,
        usdcAmount: value,
      });
      const lp = await lpP;
      await lp.sendOffer(offerSpec);
      await pollOffer(lp, offerId);
      return offerSpec;
    },
    async withdraw(value: bigint, nonce: number) {
      const offerId = `lp-withdraw-${nonce}`;
      const offerSpec = Offers.fastUsdc.Withdraw(agoricNamesRemotes, {
        offerId,
        fastLPAmount: value,
        usdcAmount: BigInt(Math.round(Number(value) * 0.9)), // XXX use poolMetrics?
      });
      const lp = await lpP;
      await lp.sendOffer(offerSpec);
      await pollOffer(lp, offerId);
      return offerSpec;
    },
  });
};

const makeCctp = (
  context: WalletFactoryTestContext,
  forwardingChannel: IBCChannelID,
  destinationChannel: IBCChannelID,
) => {
  const { bridgeInbound } = context;

  const modern = new Date('2020-01-01');

  return harden({
    depositForBurn(
      amount: bigint,
      sender: EvmAddress,
      forwardingAddress: NobleAddress,
      nonce: number,
    ) {
      const hex1 = (nonce * 51).toString(16);
      const hex2 = (nonce * 73).toString(16);
      const txInfo: Omit<CctpTxEvidence, 'aux'> = harden({
        blockHash: `0x${hex2.repeat(64 / hex2.length)}`,
        blockNumber: 21037663n + BigInt(nonce),
        blockTimestamp: BigInt(modern.getTime() + nonce * 1000),
        txHash: `0x${hex1.repeat(64 / hex1.length)}`,
        tx: { amount, forwardingAddress, sender },
        chainId: 42161,
      });
      return txInfo;
    },
    mint: async (
      amount: bigint,
      sender: CosmosChainAddress['value'],
      target: CosmosChainAddress['value'],
      receiver: CosmosChainAddress['value'],
    ) =>
      // in due course, minted USDC arrives
      bridgeInbound(
        BridgeId.VTRANSFER,
        buildVTransferEvent({
          sequence: '1', // arbitrary; not used
          amount,
          denom: 'uusdc',
          sender,
          target,
          receiver,
          sourceChannel: forwardingChannel,
          destinationChannel,
        }),
      ),
  });
};

/**
 * https://github.com/noble-assets/forwarding/blob/main/types/account.go#L19
 *
 * @param channel
 * @param recipient
 * @param fallback
 */
const deriveNobleForwardingAddress = (
  channel: IBCChannelID,
  recipient: string,
  fallback: string,
) => {
  if (fallback) throw Error('not supported');
  const out: NobleAddress = `noble1${channel}${recipient.slice(-30)}`;
  return out;
};

const makeUA = (
  address: EvmAddress,
  fastQ: ReturnType<typeof makeFastUsdcQuery>,
  cctp: ReturnType<typeof makeCctp>,
  oracles: TxOracle[],
) => {
  return harden({
    async advance(
      t: ExecutionContext,
      amount: bigint,
      EUD: string,
      nonce: number,
    ) {
      const { settlementAccount } = fastQ.contractRecord();
      const recipientAddress = encodeAddressHook(settlementAccount, { EUD });
      const forwardingAddress = deriveNobleForwardingAddress(
        nobleAgoricChannelId,
        recipientAddress,
        '',
      );
      const txInfo = cctp.depositForBurn(
        amount,
        address,
        forwardingAddress,
        nonce,
      );
      const evidence: CctpTxEvidence = {
        ...txInfo,
        aux: { forwardingChannel: nobleAgoricChannelId, recipientAddress },
      };

      // TODO: connect this to the CCTP contract?
      await Promise.all(oracles.map(o => o.submit(evidence, nonce)));

      t.like(fastQ.txStatus(evidence.txHash), [
        { status: 'OBSERVED' },
        { status: 'ADVANCING' },
      ]);

      return { recipientAddress, forwardingAddress, evidence };
    },
  });
};

const makeIBCChannel = (
  context: WalletFactoryTestContext,
  sourceChannel: IBCChannelID,
) => {
  const { bridgeInbound } = context;
  let sequence = 0;
  return harden({
    ack: (sender: CosmosChainAddress['value']) =>
      bridgeInbound(
        BridgeId.VTRANSFER,
        buildVTransferEvent({
          sender,
          target: sender,
          sourceChannel,
          sequence: `${(sequence += 1)}`,
        }),
      ),
  });
};

export const makeSimulation = (context: WalletFactoryTestContext) => {
  const cctp = makeCctp(context, nobleAgoricChannelId, 'channel-62');
  const toNoble = makeIBCChannel(context, 'channel-62');
  const oracles = Object.entries(configurations.MAINNET.oracles).map(
    ([name, addr]) => makeTxOracle(context, name, addr),
  );

  const fastQ = makeFastUsdcQuery(context);
  const lps = range(3).map(ix =>
    makeLP(context, encodeBech32('agoric', [100, ix])),
  );
  const users = prefixedRange(5, `0xFEED`).map(addr =>
    makeUA(addr as EvmAddress, fastQ, cctp, oracles),
  );

  return harden({
    oracles,
    lps,
    users,

    async beforeDeploy(t: ExecutionContext) {
      t.log('provision oracle smart wallets');
      await Promise.all(oracles.map(o => o.provision()));
    },

    async deployContract(_context: WalletFactoryTestContext) {
      const {
        agoricNamesRemotes,
        bridgeUtils,
        evaluateProposal,
        refreshAgoricNamesRemotes,
      } = _context;

      // inbound `startChannelOpenInit` responses immediately.
      // needed since the Fusdc StartFn relies on an ICA being created
      bridgeUtils.setAckBehavior(
        BridgeId.DIBC,
        'startChannelOpenInit',
        AckBehavior.Immediate,
      );
      bridgeUtils.setBech32Prefix('noble');

      const materials = await buildProposal(
        '@aglocal/fast-usdc-deploy/src/start-fast-usdc.build.js',
        ['--net', 'MAINNET'],
      );
      await evaluateProposal(materials);
      refreshAgoricNamesRemotes();
      return agoricNamesRemotes.instance.fastUsdc;
    },

    async beforeIterations(t: ExecutionContext) {
      t.log('oracles accept invitations');
      await Promise.all(oracles.map(o => o.claim()));
    },

    async iteration(
      t: ExecutionContext<WalletFactoryTestContext>,
      iter: number,
    ) {
      const lpIx = iter % lps.length;
      const lp = lps[lpIx];
      await lp.deposit(BigInt((lpIx + 1) * 2000) * 1_000_000n, iter);

      const { settlementAccount, poolAccount } = fastQ.contractRecord();

      const {
        shareWorth: { numerator: poolBeforeAdvance },
      } = fastQ.metrics();
      const part = Number(poolBeforeAdvance.value) / users.length;

      const who = iter % users.length;
      const webUI = users[who];
      const destAddr = encodeBech32('dydx', [1, 2, 3, who, iter]);
      const amount = BigInt(Math.round(part * (1 - who * 0.1)));

      const { recipientAddress, forwardingAddress, evidence } =
        await webUI.advance(t, amount, destAddr, iter * users.length + who);

      toNoble.ack(poolAccount);
      await t.context.runUntilQueuesEmpty();

      // in due course, minted USDC arrives
      await cctp.mint(
        amount,
        forwardingAddress,
        settlementAccount,
        recipientAddress,
      );
      await t.context.runUntilQueuesEmpty();

      t.like(fastQ.txStatus(evidence.txHash), [
        { status: 'OBSERVED' },
        { status: 'ADVANCING' },
        { status: 'ADVANCED' },
        { status: 'DISBURSED' },
      ]);

      const beforeWithdraw = fastQ.metrics();
      if (beforeWithdraw.encumberedBalance.value > 0n) {
        throw t.fail(`still encumbered: ${beforeWithdraw.encumberedBalance}`);
      }
      const partWd =
        Number(beforeWithdraw.shareWorth.numerator.value) / lps.length;
      // 0.8 to avoid: Withdrawal of X failed because the purse only contained Y
      const amountWd = BigInt(Math.round(partWd * (0.8 - lpIx * 0.1)));
      // XXX simulate failed withrawals?
      await lp.withdraw(amountWd, iter);
    },

    async cleanup(doCoreEval: (specifier: string) => Promise<void>) {
      await doCoreEval(
        '@aglocal/fast-usdc-deploy/scripts/delete-completed-txs.js',
      );
    },
  });
};
