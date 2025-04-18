import type { NatAmount } from '@agoric/ertp';
import type { EvmHash } from '@agoric/fast-usdc/src/types.ts';
import type {
  AccountId,
  OrchestrationAccount,
  OrchestrationFlow,
  Orchestrator,
} from '@agoric/orchestration';
import { parseAccountId } from '@agoric/orchestration/src/utils/address.js';
import { assertAllDefined, makeTracer } from '@agoric/internal';
import type { StatusManager } from './exos/status-manager.ts';

export interface Context {
  /** e.g., `agoric-3` */
  currentChainReference: string;
  supportsCctp: (destination: AccountId) => boolean;
  log?: Console['log'];
  statusManager: StatusManager;
  getNobleICA: () => OrchestrationAccount<{ chainId: 'noble-1' }>;
  getSettlementAccount: () => OrchestrationAccount<{ chainId: 'agoric-any' }>;
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
    log = makeTracer('FlowForwardFunds'),
    getNobleICA,
    getSettlementAccount,
    statusManager,
  }: Context,
  tx: {
    txHash: EvmHash;
    amount: NatAmount;
    destination: AccountId;
    fundsInNobleIca?: boolean;
  },
) => {
  await null;
  assertAllDefined({
    currentChainReference,
    supportsCctp,
    log,
    getNobleICA,
    getSettlementAccount,
    statusManager,
    tx,
  });
  const { amount, destination, txHash, fundsInNobleIca } = tx;
  log('retrying forward for', amount, 'to', destination, 'for', txHash);

  const { namespace, reference } = parseAccountId(destination);

  if (reference === currentChainReference) {
    return getSettlementAccount().send(destination, amount);
  }

  const intermediateRecipient = getNobleICA().getAddress();

  if (namespace === 'cosmos') {
    try {
      await getSettlementAccount().transfer(destination, amount, {
        forwardOpts: { intermediateRecipient },
      });
      log('forward retry successful for', txHash);
      statusManager.forwarded(tx.txHash);
    } catch (e) {
      log('forward retry unsuccessful for', txHash, e);
      statusManager.forwardFailed(tx.txHash);
    }
  } else if (supportsCctp(destination)) {
    if (fundsInNobleIca) {
      try {
        await getNobleICA().depositForBurn(destination, amount);
        log('forward depositForBurn successful for', txHash);
        statusManager.forwarded(tx.txHash);
      } catch (e) {
        log('forward depositForBurn unsuccessful for', txHash, e);
        statusManager.forwardFailed(tx.txHash);
      }
    } else {
      try {
        await getSettlementAccount().transfer(intermediateRecipient, amount);
      } catch (e) {
        log('forward retry unsuccessful for', txHash);
        statusManager.forwardFailed(tx.txHash);
      }

      try {
        await getNobleICA().depositForBurn(destination, amount);
      } catch (e) {
        log(
          'forward retry transfer successful, but depositForBurn failed for',
          txHash,
        );
        // FIXME how to store that funds reached nobleIca? (fundsInNobleIca: true)
        statusManager.forwardFailed(tx.txHash);
      }
      log('forward transfer and depositForBurn successful for', txHash);
      statusManager.forwarded(tx.txHash);
    }
  }
};
harden(forwardFunds);
