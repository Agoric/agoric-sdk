import type { NatAmount } from '@agoric/ertp';
import type { EvmHash } from '@agoric/fast-usdc/src/types.ts';
import type {
  AccountId,
  OrchestrationAccount,
  OrchestrationFlow,
  Orchestrator,
} from '@agoric/orchestration';
import { parseAccountId } from '@agoric/orchestration/src/utils/address.js';
import { assertAllDefined } from '@agoric/internal';
import type { StatusManager } from './exos/status-manager.ts';

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
