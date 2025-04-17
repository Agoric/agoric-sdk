import type { ForwardFailedTx, LogFn } from '@agoric/fast-usdc/src/types.ts';
import type {
  ChainHub,
  CosmosChainAddress,
  OrchestrationAccount,
  OrchestrationFlow,
  Orchestrator,
} from '@agoric/orchestration';
import { parseAccountId } from '@agoric/orchestration/src/utils/address.js';
import { makeSupportsCctp } from './utils/cctp.ts';
import type { StatusManager } from './exos/status-manager.ts';

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

export const retryForward = async (
  orch: Orchestrator,
  {
    currentChainReference,
    chainHub,
    log,
    statusManager,
  }: {
    /** e.g., `agoric-3` */
    currentChainReference: string;
    chainHub: ChainHub;
    log: LogFn;
    statusManager: StatusManager;
  },
  tx: ForwardFailedTx,
  // XXX can we curry these two before?
  nobleIca: OrchestrationAccount<{ chainId: 'noble-any' }>,
  settlementAccount: OrchestrationAccount<{ chainId: 'agoric-any' }>,
) => {
  await null;
  const { amount, destination, txHash, fundsInNobleIca } = tx;
  log('retrying forward for', amount, 'to', destination, 'for', txHash);

  const { namespace, reference } = parseAccountId(destination);

  if (reference === currentChainReference) {
    return settlementAccount.send(destination, amount);
  }

  if (namespace === 'cosmos') {
    try {
      await settlementAccount.transfer(destination, amount, {
        forwardOpts: { intermediateRecipient: nobleIca.getAddress() },
      });
      log('forward retry successful for', txHash);
      statusManager.forwarded(tx, true);
      return;
    } catch (e) {
      log('forward retry unsuccessful for', txHash, e);
      statusManager.forwarded(tx, false);
      return;
    }
  }
  // XXX pass in via ctx?
  const supportsCctp = makeSupportsCctp(chainHub);

  if (supportsCctp(destination) && fundsInNobleIca) {
    try {
      await nobleIca.depositForBurn(destination, amount);
      log('forward depositForBurn successful for', txHash);
      statusManager.forwarded(tx, true);
      return;
    } catch (e) {
      log('forward depositForBurn unsuccessful for', txHash, e);
      statusManager.forwarded(tx, false);
      return;
    }
  }

  if (supportsCctp(destination)) {
    try {
      await settlementAccount.transfer(nobleIca.getAddress(), amount);
    } catch (e) {
      log('forward retry unsuccessful for', txHash);
      statusManager.forwarded(tx, false);
    }

    try {
      await nobleIca.depositForBurn(destination, amount);
    } catch (e) {
      log(
        'forward retry transfer successful, but depositForBurn failed for',
        txHash,
      );
      statusManager.forwarded(harden({ ...tx, fundsInNobleIca: true }), false);
    }
    log('forward transfer and depositForBurn successful for', txHash);
    statusManager.forwarded(tx, true);
  }
};
harden(retryForward);
