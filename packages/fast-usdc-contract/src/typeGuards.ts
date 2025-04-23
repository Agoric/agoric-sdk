import { type Amount, AmountShape } from '@agoric/ertp';
import { EvmHashShape } from '@agoric/fast-usdc/src/type-guards.js';
import type { EvmHash } from '@agoric/fast-usdc/src/types.ts';
import type { TypedPattern } from '@agoric/internal';
import type { AccountId } from '@agoric/orchestration';
import { M } from '@endo/patterns';

/**
 * A transaction for which Forwarding was attempted and failed.
 */
export type ForwardFailedTx = {
  /** EUD, potentially coerced to `AccountId` */
  destination: AccountId;
  /** the amount being forwarded to the EUD */
  amount: Amount<'nat'>;
  /** the unique identifier for the EUD transaction */
  txHash: EvmHash;
  /**
   * If present, indicates a partial success to CCTP destinations where
   * the IBC Transfer was successful but `MsgDepositForBurn` via the ICA was
   * unsuccessful.
   * When this transaction is retried, only `MsgDepositForBurn` should be attempted.
   */
  fundsInNobleIca?: boolean;
};

export const ForwardFailedTxShape = M.splitRecord(
  {
    destination: M.string(),
    amount: AmountShape,
    txHash: EvmHashShape,
  },
  {
    fundsInNobleIca: M.boolean(),
  },
) as TypedPattern<ForwardFailedTx>;
