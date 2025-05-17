import type { ExecutionContext } from 'ava';
import type { Denom } from '@agoric/orchestration';
import { makeFundAndTransfer } from './ibc-transfer.js';
import type { MultichainRegistry } from './registry.js';
import type { RetryUntilCondition } from './sleep.js';
import type { AgdTools } from './agd-tools.js';
import { makeTracer } from '@agoric/internal';

const trace = makeTracer('Faucet');

type ChainName = string;

// 90% of default faucet pour
const DEFAULT_QTY = (10_000_000_000n * 9n) / 10n;

/**
 * Determines the agoric `faucet` address and sends funds to it.
 *
 * Allows use of brands like OSMO, ATOM, etc. with `provisionSmartWallet`.
 */
export const makeFaucetTools = (
  t: ExecutionContext,
  agd: AgdTools['agd'],
  retryUntilCondition: RetryUntilCondition,
  useChain: MultichainRegistry['useChain'],
) => {
  const fundAndTransfer = makeFundAndTransfer(t, retryUntilCondition, useChain);
  return {
    /**
     * @param assets denom on the issuing chain
     * @param [qty] number of tokens
     */
    fundFaucet: async (assets: [ChainName, Denom][], qty = DEFAULT_QTY) => {
      const faucetAddr = agd.keys.showAddress('faucet');
      trace(`Faucet address: ${faucetAddr}`);

      for (const [chainName, denom] of assets) {
        await fundAndTransfer(chainName, faucetAddr, qty, denom);
      }
    },
  };
};
