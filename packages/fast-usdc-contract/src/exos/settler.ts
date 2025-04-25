/**
 * @file Settler is responsible for monitoring (receiveUpcall) deposits to the
 * settlementAccount. It either "disburses" funds to the Pool (if funds were
 * "advance"d to the payee), or "forwards" funds to the payee (if pool funds
 * were not advanced).
 *
 * main export: @see {prepareSettler}
 */

import { AmountMath } from '@agoric/ertp';
import { assertAllDefined, makeTracer } from '@agoric/internal';
import { CosmosChainAddressShape } from '@agoric/orchestration';
import { atob } from '@endo/base64';
import { E } from '@endo/far';
import { M } from '@endo/patterns';

import { decodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { PendingTxStatus } from '@agoric/fast-usdc/src/constants.js';
import {
  AddressHookShape,
  CctpTxEvidenceShape,
  EvmHashShape,
  makeNatAmountShape,
} from '@agoric/fast-usdc/src/type-guards.js';
import { makeFeeTools } from '@agoric/fast-usdc/src/utils/fees.js';
import { fromOnly } from '@agoric/zoe/src/contractSupport/index.js';

import type { HostInterface, HostOf } from '@agoric/async-flow';
import type { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
import type { Amount, Brand, NatAmount } from '@agoric/ertp';
import type {
  CctpTxEvidence,
  EvmHash,
  FeeConfig,
  LogFn,
  NobleAddress,
} from '@agoric/fast-usdc/src/types.js';
import type {
  AccountId,
  Bech32Address,
  ChainHub,
  Denom,
  OrchestrationAccount,
} from '@agoric/orchestration';
import type { WithdrawToSeat } from '@agoric/orchestration/src/utils/zoe-tools.js';
import { mustMatch, type MapStore } from '@agoric/store';
import type { IBCChannelID, IBCPacket, VTransferIBCEvent } from '@agoric/vats';
import type { TargetRegistration } from '@agoric/vats/src/bridge-target.js';
import type { Vow, VowTools } from '@agoric/vow';
import type { ZCF } from '@agoric/zoe/src/zoeService/zoe.js';
import type { Zone } from '@agoric/zone';
import { asMultiset } from '../utils/store.ts';
import type { LiquidityPoolKit } from './liquidity-pool.js';
import type { StatusManager } from './status-manager.js';

const decodeEventPacket = (
  { data }: IBCPacket,
  remoteDenom: string,
):
  | { nfa: NobleAddress; amount: bigint; EUD: AccountId | Bech32Address }
  | { error: unknown[] } => {
  // NB: may not be a FungibleTokenPacketData or even JSON
  let tx: FungibleTokenPacketData;
  try {
    tx = JSON.parse(atob(data));
  } catch {
    return { error: ['could not parse packet data', data] };
  }

  // given the sourceChannel check, we can be certain of this cast
  const nfa = tx.sender as NobleAddress;

  if (tx.denom !== remoteDenom) {
    const { denom: actual } = tx;
    return { error: ['unexpected denom', { actual, expected: remoteDenom }] };
  }

  let EUD: Bech32Address;
  try {
    const decoded = decodeAddressHook(tx.receiver);
    mustMatch(decoded, AddressHookShape);

    ({ EUD } = decoded.query);
  } catch {
    return { error: ['no query params', tx.receiver] };
  }

  let amount: bigint;
  try {
    amount = BigInt(tx.amount);
  } catch {
    return { error: ['invalid amount', tx.amount] };
  }

  return { nfa, amount, EUD };
};
harden(decodeEventPacket);

/**
 * NOTE: not meant to be parsable.
 *
 * @param {NobleAddress} addr
 * @param {bigint} amount
 */
const makeMintedEarlyKey = (addr: NobleAddress, amount: bigint): string =>
  `pendingTx:${JSON.stringify([addr, String(amount)])}`;

/** @param {Brand<'nat'>} USDC */
export const makeAdvanceDetailsShape = (USDC: Brand<'nat'>) =>
  harden({
    destination: M.string(),
    forwardingAddress: M.string(),
    fullAmount: makeNatAmountShape(USDC),
    txHash: EvmHashShape,
  });

export const stateShape = harden({
  repayer: M.remotable('Repayer'),
  settlementAccount: M.remotable('Account'),
  registration: M.or(M.undefined(), M.remotable('Registration')),
  sourceChannel: M.string(),
  remoteDenom: M.string(),
  mintedEarly: M.remotable('mintedEarly'),
  /** @deprecated */
  intermediateRecipient: M.opt(CosmosChainAddressShape),
});

/**
 * The Settler is responsible for monitoring (using receiveUpcall) deposits to
 * the settlementAccount. It either "disburses" funds to the Pool (if funds were
 * "advance"d to the payee), or "forwards" funds to the payee (if pool funds
 * were not advanced).
 *
 * `receiveUpcall` is configured to receive notifications in
 * `monitorMintingDeposits()`, with a call to
 * `settlementAccount.monitorTransfers()`.
 */
export const prepareSettler = (
  zone: Zone,
  {
    chainHub,
    feeConfig,
    forwardFunds,
    getNobleICA,
    log = makeTracer('Settler', true),
    statusManager,
    USDC,
    vowTools,
    withdrawToSeat,
    zcf,
  }: {
    chainHub: Pick<ChainHub, 'resolveAccountId'>;
    feeConfig: FeeConfig;
    forwardFunds: (tx: {
      txHash: EvmHash;
      amount: NatAmount;
      destination: AccountId;
      fundsInNobleIca?: boolean;
    }) => Vow<void>;
    getNobleICA: () => OrchestrationAccount<{ chainId: 'noble-1' }>;
    log?: LogFn;
    statusManager: StatusManager;
    USDC: Brand<'nat'>;
    vowTools: VowTools;
    withdrawToSeat: HostOf<WithdrawToSeat>;
    zcf: Pick<ZCF, 'makeEmptySeatKit' | 'atomicRearrange'>;
  },
) => {
  assertAllDefined({ statusManager });

  const UsdcAmountShape = makeNatAmountShape(USDC);

  return zone.exoClassKit(
    'Fast USDC Settler',
    {
      creator: M.interface('SettlerCreatorI', {
        monitorMintingDeposits: M.call().returns(M.any()),
      }),
      tap: M.interface('SettlerTapI', {
        receiveUpcall: M.call(M.record()).returns(M.promise()),
      }),
      notifier: M.interface('SettlerNotifyI', {
        notifyAdvancingResult: M.call(
          makeAdvanceDetailsShape(USDC),
          M.boolean(),
        ).returns(),
        checkMintedEarly: M.call(CctpTxEvidenceShape, M.string()).returns(
          M.boolean(),
        ),
      }),
      self: M.interface('SettlerSelfI', {
        addMintedEarly: M.call(M.string(), UsdcAmountShape).returns(),
        disburse: M.call(EvmHashShape, UsdcAmountShape, M.string()).returns(
          M.promise(),
        ),
        forward: M.call(EvmHashShape, UsdcAmountShape, M.string()).returns(),
      }),
      // XXX the following handlers are from before refactoring to an async flow for `forwardFunds`.
      // They must remain implemented for as long as any vow might settle and need their behavior.
      // Once all possible such vows are settled, the methods could be removed but the handler
      // facets must remain to satisfy the kind definition backward compatibility checker.
      transferHandler: M.interface('SettlerTransferI', {
        onFulfilled: M.call(M.undefined(), M.string()).returns(),
        onRejected: M.call(M.error(), M.string()).returns(),
      }),
      intermediateTransferHandler: M.interface('SettlerIntermediateTransferI', {
        onFulfilled: M.call(M.undefined(), M.record()).returns(),
        onRejected: M.call(M.error(), M.record()).returns(),
      }),
      depositForBurnHandler: M.interface('SettlerDepositForBurnI', {
        onFulfilled: M.call(M.undefined(), M.string()).returns(),
        onRejected: M.call(M.error(), M.string()).returns(),
      }),
    },

    (config: {
      sourceChannel: IBCChannelID;
      remoteDenom: Denom;
      repayer: LiquidityPoolKit['repayer'];
      settlementAccount: HostInterface<
        OrchestrationAccount<{ chainId: 'agoric-any' }>
      >;
    }) => {
      log('config', config);
      return {
        ...config,
        // This comes from a power now but the schema requires this key to be set
        intermediateRecipient: undefined,
        registration: undefined as
          | HostInterface<TargetRegistration>
          | undefined,
        mintedEarly: zone.detached().mapStore('mintedEarly') as MapStore<
          ReturnType<typeof makeMintedEarlyKey>,
          number
        >,
      };
    },
    {
      creator: {
        // eslint-disable-next-line no-restricted-syntax -- will resolve before vat restart
        async monitorMintingDeposits() {
          const { settlementAccount } = this.state;
          const registration = await vowTools.when(
            settlementAccount.monitorTransfers(this.facets.tap),
          );
          assert.typeof(registration, 'object');
          this.state.registration = registration;
        },
      },
      tap: {
        async receiveUpcall(event: VTransferIBCEvent) {
          log('upcall event', event.packet.sequence, event.blockTime);
          const { sourceChannel, remoteDenom } = this.state;
          const { packet } = event;
          if (packet.source_channel !== sourceChannel) {
            const { source_channel: actual } = packet;
            // Mismatched source channel is normal when forwarding from SettlementAccount,
            // but in that case the destination channel should match.
            if (packet.destination_channel !== sourceChannel) {
              log('⚠️ unexpected channel', { actual, expected: sourceChannel });
            }
            return;
          }

          const decoded = decodeEventPacket(event.packet, remoteDenom);
          if ('error' in decoded) {
            log('invalid event packet', decoded.error);
            return;
          }

          const { nfa, amount, EUD } = decoded;
          const { self } = this.facets;
          const found = statusManager.dequeueStatus(nfa, amount);
          log('dequeued', found, 'for', nfa, amount);
          const fullValue = AmountMath.make(USDC, amount);

          switch (found?.status) {
            case PendingTxStatus.Advanced:
              return self.disburse(found.txHash, fullValue, EUD);

            case PendingTxStatus.Advancing:
              log('⚠️ tap: minted while advancing', nfa, amount);
              self.addMintedEarly(nfa, fullValue);
              return;

            case PendingTxStatus.AdvanceSkipped:
            case PendingTxStatus.AdvanceFailed:
              return self.forward(found.txHash, fullValue, EUD);

            case undefined:
            default:
              log('⚠️ tap: minted before observed', nfa, amount);
              // XXX consider capturing in vstorage
              // we would need a new key, as this does not have a txHash
              self.addMintedEarly(nfa, fullValue);
          }
        },
      },
      notifier: {
        notifyAdvancingResult(
          {
            txHash,
            forwardingAddress,
            fullAmount,
            destination,
          }: {
            txHash: EvmHash;
            forwardingAddress: NobleAddress;
            fullAmount: Amount<'nat'>;
            destination: AccountId;
          },
          success: boolean,
        ): void {
          const { mintedEarly } = this.state;
          const { value: fullValue } = fullAmount;
          const key = makeMintedEarlyKey(forwardingAddress, fullValue);

          if (mintedEarly.has(key)) {
            asMultiset(mintedEarly).remove(key);
            statusManager.advanceOutcomeForMintedEarly(txHash, success);
            if (success) {
              void this.facets.self.disburse(txHash, fullAmount, destination);
            } else {
              void this.facets.self.forward(txHash, fullAmount, destination);
            }
          } else {
            statusManager.advanceOutcome(forwardingAddress, fullValue, success);
          }
        },
        /**
         * If the EUD received minted funds without an advance, forward the
         * funds to the pool.
         *
         * @param {CctpTxEvidence} evidence
         * @param {AccountId} destination
         * @returns {boolean} whether the EUD received funds without an advance
         */
        checkMintedEarly(
          evidence: CctpTxEvidence,
          destination: AccountId,
        ): boolean {
          const {
            tx: { forwardingAddress, amount },
            txHash,
          } = evidence;
          const key = makeMintedEarlyKey(forwardingAddress, amount);
          const { mintedEarly } = this.state;
          if (mintedEarly.has(key)) {
            log(
              'matched minted early key, initiating forward',
              forwardingAddress,
              amount,
            );
            asMultiset(mintedEarly).remove(key);
            statusManager.advanceOutcomeForUnknownMint(evidence);
            void this.facets.self.forward(
              txHash,
              AmountMath.make(USDC, amount),
              destination,
            );
            return true;
          }
          return false;
        },
      },
      self: {
        /**
         * Helper function to track a minted-early transaction by incrementing or initializing its counter
         * @param address
         * @param amount
         */
        addMintedEarly(address: NobleAddress, amount: NatAmount) {
          const key = makeMintedEarlyKey(address, amount.value);
          const { mintedEarly } = this.state;
          asMultiset(mintedEarly).add(key);
        },
        /**
         * The intended payee received an advance from the pool. When the funds
         * are minted, disburse them to the pool and fee seats.
         */
        // eslint-disable-next-line no-restricted-syntax -- will resolve before vat restart
        async disburse(
          txHash: EvmHash,
          received: NatAmount,
          EUD: AccountId | Bech32Address,
        ) {
          const { repayer, settlementAccount } = this.state;
          const { zcfSeat: settlingSeat } = zcf.makeEmptySeatKit();
          const { calculateSplit } = makeFeeTools(feeConfig);
          // theoretically can throw, but shouldn't since Advancer already validated
          const accountId = chainHub.resolveAccountId(EUD);
          const split = calculateSplit(received, accountId);
          log('disbursing', split);

          // If this throws, which arguably can't occur since we don't ever
          // withdraw more than has been deposited (as denoted by
          // `FungibleTokenPacketData`), funds will remain in the
          // `settlementAccount`. A remediation can occur in a future upgrade.
          await vowTools.when(
            withdrawToSeat(
              // @ts-expect-error LocalAccountMethods vs OrchestrationAccount
              settlementAccount,
              settlingSeat,
              harden({ In: received }),
            ),
          );
          const transferPart = fromOnly(settlingSeat, { In: received });
          repayer.repay(transferPart, split);
          settlingSeat.exit();

          // update status manager, marking tx `DISBURSED`
          statusManager.disbursed(txHash, split);
        },
        /**
         * Funds were not advanced. Forward proceeds to the payee directly.
         *
         * @param {EvmHash} txHash
         * @param {NatAmount} fullValue
         * @param {string} EUD
         */
        forward(
          txHash: EvmHash,
          fullValue: NatAmount,
          EUD: AccountId | Bech32Address,
        ) {
          log('forwarding', fullValue.value, 'to', EUD, 'for', txHash);

          const dest: AccountId | null = (() => {
            try {
              return chainHub.resolveAccountId(EUD);
            } catch {
              log(
                '⚠️ forward not attempted',
                'unresolvable destination',
                txHash,
                EUD,
              );
              statusManager.forwardSkipped(txHash);
              return null;
            }
          })();
          if (!dest) return;

          // This synchronous function returns a Vow that does its own error handling.
          void forwardFunds({ txHash, amount: fullValue, destination: dest });
        },
      },
      transferHandler: {
        onFulfilled(_result: unknown, txHash: EvmHash) {
          // update status manager, marking tx `FORWARDED` without fee split
          statusManager.forwarded(txHash);
        },
        onRejected(reason: unknown, txHash: EvmHash) {
          // funds remain in `settlementAccount` and must be recovered via a
          // contract upgrade
          log('🚨 forward transfer rejected!', reason, txHash);
          // update status manager, flagging a terminal state that needs to be
          // manual intervention or a code update to remediate
          statusManager.forwardFailed(txHash);
        },
      },
      intermediateTransferHandler: {
        onFulfilled(
          _result: unknown,
          {
            amt,
            dest,
            txHash,
          }: { amt: NatAmount; dest: AccountId; txHash: EvmHash },
        ) {
          const nobleIca = getNobleICA();
          const burnAmount = {
            denom: this.state.remoteDenom,
            value: amt.value,
          };
          void vowTools.watch(
            E(nobleIca).depositForBurn(dest, burnAmount),
            this.facets.depositForBurnHandler,
            txHash,
          );
        },
        onRejected(
          reason: unknown,
          { txHash }: { amt: NatAmount; dest: AccountId; txHash: EvmHash },
        ) {
          // funds remain in `settlementAccount` and must be recovered via a
          // contract upgrade
          log('🚨 forward intermediate transfer rejected!', reason, txHash);
          // update status manager, flagging a terminal state that needs manual
          // intervention or a code update to remediate
          statusManager.forwardFailed(txHash);
        },
      },
      depositForBurnHandler: {
        onFulfilled(_result: unknown, txHash: EvmHash) {
          // update status manager, marking tx `FORWARDED` without fee split
          statusManager.forwarded(txHash);
        },
        onRejected(reason: unknown, txHash: EvmHash) {
          // funds remain in `nobleAccount` and must be recovered via a
          // contract upgrade
          log('🚨 forward depositForBurn rejected!', reason, txHash);
          // update status manager, flagging a terminal state that needs manual
          // intervention or a code update to remediate
          statusManager.forwardFailed(txHash);
        },
      },
    },
    {
      stateShape,
    },
  );
};
harden(prepareSettler);

// Expose the whole kit because the contract needs `creatorFacet` and the Advancer needs `notifier`
export type SettlerKit = ReturnType<ReturnType<typeof prepareSettler>>;
