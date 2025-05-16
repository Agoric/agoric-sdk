/** @file exercise Fast USDC contract in iterations; see chain-impact.test.ts */
import type { ExecutionContext } from 'ava';

import { AckBehavior } from '@aglocal/boot/tools/supports.js';
import {
  encodeAddressHook,
  encodeBech32,
} from '@agoric/cosmic-proto/address-hooks.js';
import type {
  CctpTxEvidence,
  ContractRecord,
  EvmAddress,
  NobleAddress,
  PoolMetrics,
} from '@agoric/fast-usdc';
import { Offers } from '@agoric/fast-usdc/src/clientSupport.js';
import type { OperatorKit } from '@aglocal/fast-usdc-contract/src/exos/operator-kit.js';
import { BridgeId, type Remote } from '@agoric/internal';
import { defaultMarshaller } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { CosmosChainAddress } from '@agoric/orchestration';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type { IBCChannelID } from '@agoric/vats';
import { makePromiseKit } from '@endo/promise-kit';
import { configurations } from '../src/utils/deploy-config.js';
import { type WalletFactoryTestContext } from './walletFactory.js';

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
  ctx: WalletFactoryTestContext,
  name: string,
  addr: string,
) => {
  const { agoricNamesRemotes, walletFactoryDriver: wfd } = ctx;
  const walletPK = makePromiseKit<SmartWallet>();

  return harden({
    async provision() {
      walletPK.resolve(wfd.provideSmartWallet(addr));
      await walletPK.promise;
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
    },
  });
};

const makeDirectTxOracle = (ctx: WalletFactoryTestContext, name: string) => {
  const {
    runUtils: { EV },
  } = ctx;
  const operatorKit = makePromiseKit<Remote<OperatorKit['operator']>>();

  return harden({
    async provision() {
      const { creatorFacet } =
        await EV.vat('bootstrap').consumeItem('fastUsdcKit');
      operatorKit.resolve(EV(creatorFacet).initOperator(name));
    },
    async claim() {
      await operatorKit.promise;
    },
    async submit(evidence: CctpTxEvidence) {
      const operator = await operatorKit.promise;
      await EV(operator).submitEvidence(evidence);
    },
  });
};

type TxOracle = Pick<ReturnType<typeof makeTxOracle>, 'submit'>;

const makeFastUsdcQuery = (ctx: WalletFactoryTestContext) => {
  const { storage } = ctx;
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

const makeLP = (ctx: WalletFactoryTestContext, addr: string) => {
  const { agoricNamesRemotes, walletFactoryDriver: wfd } = ctx;
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
  ctx: WalletFactoryTestContext,
  forwardingChannel: IBCChannelID,
  destinationChannel: IBCChannelID,
) => {
  const { runInbound } = ctx.bridgeUtils;

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
    async mint(
      amount: bigint,
      sender: CosmosChainAddress['value'],
      target: CosmosChainAddress['value'],
      receiver: CosmosChainAddress['value'],
    ) {
      // in due course, minted USDC arrives
      await runInbound(
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
      );
    },
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
  bridgeUtils: WalletFactoryTestContext['bridgeUtils'],
  sourceChannel: IBCChannelID,
) => {
  const { runInbound } = bridgeUtils;
  let sequence = 0;
  return harden({
    async ack(sender: CosmosChainAddress['value']) {
      await runInbound(
        BridgeId.VTRANSFER,
        buildVTransferEvent({
          sender,
          target: sender,
          sourceChannel,
          sequence: `${(sequence += 1)}`,
        }),
      );
    },
  });
};

export const makeSimulation = (
  ctx: WalletFactoryTestContext,
  directOracles: boolean = false,
) => {
  const makeOracle = directOracles ? makeDirectTxOracle : makeTxOracle;

  const cctp = makeCctp(ctx, nobleAgoricChannelId, 'channel-62');
  const toNoble = makeIBCChannel(ctx.bridgeUtils, 'channel-62');
  const oracles = Object.entries(configurations.MAINNET.oracles).map(
    ([name, addr]) => makeOracle(ctx, name, addr),
  );

  const fastQ = makeFastUsdcQuery(ctx);
  const lps = range(3).map(ix =>
    makeLP(ctx, encodeBech32('agoric', [100, ix])),
  );
  const users = prefixedRange(5, `0xFEED`).map(addr =>
    makeUA(addr as EvmAddress, fastQ, cctp, oracles),
  );

  return harden({
    oracles,
    lps,
    users,

    async deployContract(context: WalletFactoryTestContext) {
      const {
        agoricNamesRemotes,
        bridgeUtils,
        buildProposal,
        evalProposal,
        refreshAgoricNamesRemotes,
      } = context;

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
        ['--net', 'MAINNET', '--noOracle'],
      );
      await evalProposal(materials);
      refreshAgoricNamesRemotes();
      return agoricNamesRemotes.instance.fastUsdc;
    },

    async beforeIterations(t: ExecutionContext<WalletFactoryTestContext>) {
      const { buildProposal, evalProposal } = t.context;

      t.log('provision oracles');
      await Promise.all(oracles.map(o => o.provision()));

      if (!directOracles) {
        const materials = buildProposal(
          '@aglocal/fast-usdc-deploy/src/add-operators.build.js',
          ['--net', 'MAINNET'],
        );
        await evalProposal(materials);

        t.log('oracles accept invitations');
        await Promise.all(oracles.map(o => o.claim()));
      }
    },

    async iteration(t: ExecutionContext, iter: number) {
      const lpIx = iter % lps.length;
      const lp = lps[lpIx];
      await lp.deposit(BigInt((lpIx + 1) * 2000) * 1_000_000n, iter);

      const { settlementAccount, poolAccount } = fastQ.contractRecord();

      const {
        shareWorth: { numerator: poolBeforeAdvance },
      } = await fastQ.metrics();
      const part = Number(poolBeforeAdvance.value) / users.length;

      const who = iter % users.length;
      const webUI = users[who];
      const destAddr = encodeBech32('dydx', [1, 2, 3, who, iter]);
      const amount = BigInt(Math.round(part * (1 - who * 0.1)));

      const { recipientAddress, forwardingAddress, evidence } =
        await webUI.advance(t, amount, destAddr, iter * users.length + who);

      await toNoble.ack(poolAccount);
      await eventLoopIteration();

      // in due course, minted USDC arrives
      await cctp.mint(
        amount,
        forwardingAddress,
        settlementAccount,
        recipientAddress,
      );
      await eventLoopIteration();
      t.like(fastQ.txStatus(evidence.txHash), [
        { status: 'OBSERVED' },
        { status: 'ADVANCING' },
        { status: 'ADVANCED' },
        { status: 'DISBURSED' },
      ]);

      await eventLoopIteration();

      const beforeWithdraw = await fastQ.metrics();
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
