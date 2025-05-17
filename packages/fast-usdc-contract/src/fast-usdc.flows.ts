import type { GuestOf } from '@agoric/async-flow';
import { decodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { AmountMath, type Brand, type NatAmount } from '@agoric/ertp';
import { AddressHookShape } from '@agoric/fast-usdc/src/type-guards.js';
import type {
  EvidenceWithRisk,
  EvmHash,
  FeeConfig,
} from '@agoric/fast-usdc/src/types.ts';
import { makeFeeTools } from '@agoric/fast-usdc/src/utils/fees.js';
import { assertAllDefined, mustMatch } from '@agoric/internal';
import type {
  AccountId,
  ChainHub,
  CosmosChainAddress,
  Denom,
  OrchestrationAccount,
  OrchestrationFlow,
  Orchestrator,
} from '@agoric/orchestration';
import {
  chainOfAccount,
  parseAccountId,
  parseAccountIdArg,
} from '@agoric/orchestration/src/utils/address.js';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import type { ZCFSeat } from '@agoric/zoe';
import { Fail, q } from '@endo/errors';
import type { CopyRecord } from '@endo/pass-style';
import type { LiquidityPoolKit } from './exos/liquidity-pool.ts';
import type { SettlerKit } from './exos/settler.ts';
import type { StatusManager } from './exos/status-manager.ts';
import { makeSupportsCctp } from './utils/cctp.ts';

const FORWARD_TIMEOUT = {
  sec: 10n * 60n,
  p: '10m',
} as const;
harden(FORWARD_TIMEOUT);

export interface Context {
  /** e.g., `agoric-3` */
  currentChainReference: string;
  supportsCctp: (destination: AccountId) => boolean;
  log: Console['log'];
  statusManager: StatusManager;
  getNobleICA: () => OrchestrationAccount<{ chainId: 'noble-1' }>;
  settlementAccount: Promise<OrchestrationAccount<{ chainId: 'agoric-any' }>>;
}

export const makeLocalAccount = (async (orch: Orchestrator) => {
  const agoricChain = await orch.getChain('agoric');
  return agoricChain.makeAccount();
}) satisfies OrchestrationFlow;
harden(makeLocalAccount);

export const makeNobleAccount = (async (orch: Orchestrator) => {
  const nobleChain = await orch.getChain('noble');
  return nobleChain.makeAccount();
}) satisfies OrchestrationFlow;
harden(makeNobleAccount);

export const forwardFunds = async (
  orch: Orchestrator,
  {
    currentChainReference,
    supportsCctp,
    log,
    getNobleICA,
    settlementAccount,
    statusManager,
  }: Context,
  tx: {
    txHash: EvmHash;
    amount: NatAmount;
    destination: AccountId;
  },
) => {
  await null;
  assertAllDefined({
    currentChainReference,
    supportsCctp,
    log,
    getNobleICA,
    settlementAccount,
    statusManager,
    tx,
  });
  const { amount, destination, txHash } = tx;
  log('trying forward for', amount, 'to', destination, 'for', txHash);

  const { namespace, reference } = parseAccountId(destination);

  const settlement = await settlementAccount;
  const intermediateRecipient = getNobleICA().getAddress();

  if (namespace === 'cosmos') {
    const completion =
      reference === currentChainReference
        ? settlement.send(destination, amount)
        : settlement.transfer(destination, amount, {
            timeoutRelativeSeconds: FORWARD_TIMEOUT.sec,
            forwardOpts: {
              intermediateRecipient,
              timeout: FORWARD_TIMEOUT.p,
            },
          });
    try {
      statusManager.forwarding(txHash);
      await completion;
      log('forward successful for', txHash);
      statusManager.forwarded(txHash, {
        txHash,
        destination,
        amount: amount.value,
      });
    } catch (reason) {
      log('⚠️ forward transfer rejected', reason, txHash);
      // funds remain in `settlementAccount`
      statusManager.forwardFailed(txHash, {
        txHash,
        destination,
        amount: amount.value,
      });
    }
  } else if (supportsCctp(destination)) {
    try {
      statusManager.forwarding(txHash);
      await settlement.transfer(intermediateRecipient, amount, {
        timeoutRelativeSeconds: FORWARD_TIMEOUT.sec,
      });
    } catch (reason) {
      log('⚠️ forward intermediate transfer rejected', reason, txHash);
      // funds remain in `settlementAccount`
      statusManager.forwardFailed(txHash, {
        txHash,
        destination,
        amount: amount.value,
      });
    }

    // UNTIL #10449
    const burnAmount = { denom: 'uusdc', value: amount.value };

    try {
      await getNobleICA().depositForBurn(destination, burnAmount);
      log('forward transfer and depositForBurn successful for', txHash);
      statusManager.forwarded(tx.txHash);
    } catch (reason) {
      log('⚠️ forward depositForBurn rejected', reason, txHash);
      // funds remain in `nobleAccount`
      statusManager.forwardFailed(txHash, {
        txHash,
        destination,
        amount: amount.value,
        fundsInNobleIca: true,
      });
    }
  } else {
    // The user requested a destination that is not supported. No OpCo UIs would do this.
    // If a user circumvents the UI and does this, it will not be forwarded and the
    // minted funds will remain in the settlement account.
    // Receiving the funds would require a contract upgrade that adds support for the destination
    // and some way to reattempt skipped forwards.
    log(
      '⚠️ forward not attempted',
      'unsupported destination',
      txHash,
      destination,
    );
    statusManager.forwardSkipped(txHash);
  }
};
harden(forwardFunds);

export interface ContextAdvance {
  chainHubTools: Pick<ChainHub, 'getChainInfoByChainId' | 'resolveAccountId'>;
  feeConfig: FeeConfig;
  getNobleICA: () => OrchestrationAccount<{ chainId: 'noble-1' }>;
  log: Console['log'];
  statusManager: StatusManager;
  usdc: { brand: Brand<'nat'>; denom: Denom };
  zcfTools: { makeEmptyZCFSeat: () => ZCFSeat };
  zoeTools: ZoeTools;
}

export const advanceFunds = (async (
  orch: Orchestrator,
  {
    chainHubTools,
    feeConfig,
    getNobleICA,
    log,
    statusManager,
    usdc,
    zcfTools,
    zoeTools: { localTransfer, withdrawToSeat },
  }: ContextAdvance,
  { evidence, risk }: EvidenceWithRisk,
  config: {
    notifier: SettlerKit['notifier'];
    borrower: LiquidityPoolKit['borrower'];
    poolAccount: OrchestrationAccount<{ chainId: 'agoric-any' }>;
    settlementAddress: CosmosChainAddress;
  } & CopyRecord, // XXX membrane type debt UNTIL #9822
) => {
  const feeTools = makeFeeTools(feeConfig);
  const toAmount = (value: bigint) => AmountMath.make(usdc.brand, value);
  const supportsCctp = makeSupportsCctp(chainHubTools);

  await null;
  try {
    if (statusManager.hasBeenObserved(evidence)) {
      log('txHash already seen:', evidence.txHash);
      return;
    }

    if (risk.risksIdentified?.length) {
      log('risks identified, skipping advance');
      statusManager.skipAdvance(evidence, risk.risksIdentified);
      return;
    }

    const { settlementAddress } = config;
    const { EUD } = (() => {
      const { recipientAddress } = evidence.aux;
      const decoded = decodeAddressHook(recipientAddress);
      mustMatch(decoded, AddressHookShape);
      if (decoded.baseAddress !== settlementAddress.value) {
        throw Fail`⚠️ baseAddress of address hook ${q(decoded.baseAddress)} does not match the expected address ${q(settlementAddress.value)}`;
      }
      return decoded.query;
    })();
    log(`decoded EUD: ${EUD}`);

    // throws if it's neither CAIP-10 nor bare bech32.
    const destination = chainHubTools.resolveAccountId(EUD);
    const accountId = parseAccountId(destination);

    // Dest must be a Cosmos account or support CCTP
    if (!(accountId.namespace === 'cosmos' || supportsCctp(destination))) {
      const destChain = chainOfAccount(destination);
      statusManager.skipAdvance(evidence, [
        `Transfer to ${destChain} not supported.`,
      ]);
      return;
    }

    const fullAmount = toAmount(evidence.tx.amount);
    const { borrower, notifier, poolAccount } = config;
    // do not advance if we've already received a mint/settlement
    const mintedEarly = notifier.checkMintedEarly(evidence, destination);
    if (mintedEarly) return;

    // throws if requested does not exceed fees
    const advanceAmount = feeTools.calculateAdvance(fullAmount, destination);
    const amount = harden({ denom: usdc.denom, value: advanceAmount.value });

    const tmpSeat = zcfTools.makeEmptyZCFSeat();
    // throws if the pool has insufficient funds
    borrower.borrow(tmpSeat, advanceAmount);

    // this cannot throw since `.isSeen()` is called in the same turn
    statusManager.advance(evidence);
    const detail = {
      txHash: evidence.txHash,
      forwardingAddress: evidence.tx.forwardingAddress,
      fullAmount,
      destination,
    };

    try {
      // XXX async flow types
      await (localTransfer as unknown as GuestOf<typeof localTransfer>)(
        tmpSeat,
        poolAccount,
        harden({ USDC: advanceAmount }),
      );

      // depositHandler.onfulFilled
      tmpSeat.exit();

      const intermediateRecipient = getNobleICA().getAddress();

      const destInfo = parseAccountIdArg(destination);
      if (destInfo.namespace === 'cosmos') {
        try {
          await (destInfo.reference === settlementAddress.chainId
            ? // local
              poolAccount.send(destination, amount)
            : // via IBC
              poolAccount.transfer(destination, amount, {
                forwardOpts: {
                  intermediateRecipient,
                },
              }));
          // transferHandler.onFulfilled
          log('Advance succeeded', { advanceAmount, destination });
          notifier.notifyAdvancingResult(detail, true);
        } catch (error) {
          await transferRejected(error);
        }
      } else if (supportsCctp(destination)) {
        // send USDC via CCTP
        try {
          await poolAccount.transfer(intermediateRecipient, amount);
        } catch (error) {
          return transferRejected(error);
        }
        // transferCctpHandler.onFulfilled
        // assets are on noble, transfer to dest.
        const intermediaryAccount = getNobleICA();
        try {
          await intermediaryAccount.depositForBurn(destination, amount);
        } catch (error) {
          return cctpFromNobleRejected(error);
        }
        // transferHandler.onFulfilled
        log('Advance succeeded', { advanceAmount, destination });
        notifier.notifyAdvancingResult(detail, true);
      } else {
        // This is supposed to be caught in handleTransactionEvent()
        Fail`🚨 can only transfer to Agoric addresses, via IBC, or via CCTP`;
      }
    } catch (error) {
      depositRejected(error);
    }

    function depositRejected(error: any) {
      // depositHandler.onRejected
      log(
        '⚠️ deposit to localOrchAccount failed, attempting to return payment to LP',
        error,
      );
      try {
        notifier.notifyAdvancingResult(detail, false);
        borrower.returnToPool(tmpSeat, advanceAmount);
        tmpSeat.exit();
      } catch (e) {
        log('🚨 deposit to localOrchAccount failure recovery failed', e);
      }
    }

    async function repayPool() {
      const tmpReturnSeat = zcfTools.makeEmptyZCFSeat();
      await null;

      try {
        // XXX async flow types
        await (withdrawToSeat as unknown as GuestOf<typeof withdrawToSeat>)(
          poolAccount,
          tmpReturnSeat,
          harden({ USDC: advanceAmount }),
        );

        // withdrawHandler.onFulfilled
        try {
          borrower.returnToPool(tmpReturnSeat, advanceAmount);
        } catch (e) {
          // If we reach here, the unused advance funds will remain in `tmpReturnSeat`
          // and must be retrieved from recovery sets.
          log(
            `🚨 return ${q(advanceAmount)} to pool failed. funds remain on "tmpReturnSeat"`,
            e,
          );
        }
      } catch (error) {
        withdrawRejected(error, tmpReturnSeat);
      }
    }

    async function transferRejected(reason: any) {
      log('Advance failed', reason);
      notifier.notifyAdvancingResult(detail, false);
      return repayPool();
    }

    function withdrawRejected(error: any, tmpReturnSeat: ZCFSeat) {
      log(
        `🚨 withdraw ${q(advanceAmount)} from "poolAccount" to return to pool failed`,
        error,
      );
      // If we reach here, the unused advance funds will remain in the `poolAccount`.
      // A contract update will be required to return them to the LiquidityPool.
      tmpReturnSeat.exit();
    }

    async function cctpFromNobleRejected(reason: any) {
      log('⚠️ CCTP transfer failed', reason);
      notifier.notifyAdvancingResult(detail, false);
      await null;
      try {
        await getNobleICA().transfer(poolAccount.getAddress(), amount);
      } catch (error) {
        // XXX should retry?
        log('🚨 failed to transfer back from noble ICA', amount.value, error);
      }
      return repayPool();
    }
  } catch (error) {
    log('Advancer error:', error);
    statusManager.skipAdvance(evidence, [(error as Error).message]);
  }
}) satisfies OrchestrationFlow;
harden(advanceFunds);
