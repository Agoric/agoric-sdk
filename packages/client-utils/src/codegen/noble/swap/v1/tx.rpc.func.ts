//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import {
  MsgSwap,
  MsgWithdrawProtocolFees,
  MsgWithdrawRewards,
  MsgPauseByAlgorithm,
  MsgPauseByPoolIds,
  MsgUnpauseByAlgorithm,
  MsgUnpauseByPoolIds,
} from '@agoric/cosmic-proto/codegen/noble/swap/v1/tx.js';
/**
 * Swap allows a user to swap one type of token for another, using multiple routes.
 * @name swap
 * @package noble.swap.v1
 * @see proto service: noble.swap.v1.Swap
 */
export const swap = buildTx<MsgSwap>({
  msg: MsgSwap,
});
/**
 * WithdrawProtocolFees allows the protocol to withdraw accumulated fees and move them to another account.
 * @name withdrawProtocolFees
 * @package noble.swap.v1
 * @see proto service: noble.swap.v1.WithdrawProtocolFees
 */
export const withdrawProtocolFees = buildTx<MsgWithdrawProtocolFees>({
  msg: MsgWithdrawProtocolFees,
});
/**
 * WithdrawRewards allows a user to claim their accumulated rewards.
 * @name withdrawRewards
 * @package noble.swap.v1
 * @see proto service: noble.swap.v1.WithdrawRewards
 */
export const withdrawRewards = buildTx<MsgWithdrawRewards>({
  msg: MsgWithdrawRewards,
});
/**
 * PauseByAlgorithm pauses all pools using a specific algorithm.
 * @name pauseByAlgorithm
 * @package noble.swap.v1
 * @see proto service: noble.swap.v1.PauseByAlgorithm
 */
export const pauseByAlgorithm = buildTx<MsgPauseByAlgorithm>({
  msg: MsgPauseByAlgorithm,
});
/**
 * PauseByPoolIds pauses specific pools identified by their pool IDs.
 * @name pauseByPoolIds
 * @package noble.swap.v1
 * @see proto service: noble.swap.v1.PauseByPoolIds
 */
export const pauseByPoolIds = buildTx<MsgPauseByPoolIds>({
  msg: MsgPauseByPoolIds,
});
/**
 * UnpauseByAlgorithm unpauses all pools using a specific algorithm.
 * @name unpauseByAlgorithm
 * @package noble.swap.v1
 * @see proto service: noble.swap.v1.UnpauseByAlgorithm
 */
export const unpauseByAlgorithm = buildTx<MsgUnpauseByAlgorithm>({
  msg: MsgUnpauseByAlgorithm,
});
/**
 * UnpauseByPoolIds unpauses specific pools identified by their pool IDs.
 * @name unpauseByPoolIds
 * @package noble.swap.v1
 * @see proto service: noble.swap.v1.UnpauseByPoolIds
 */
export const unpauseByPoolIds = buildTx<MsgUnpauseByPoolIds>({
  msg: MsgUnpauseByPoolIds,
});
