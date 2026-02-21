import { MsgSwap, MsgWithdrawProtocolFees, MsgWithdrawRewards, MsgPauseByAlgorithm, MsgPauseByPoolIds, MsgUnpauseByAlgorithm, MsgUnpauseByPoolIds } from './tx.js';
/**
 * Swap allows a user to swap one type of token for another, using multiple routes.
 * @name swap
 * @package noble.swap.v1
 * @see proto service: noble.swap.v1.Swap
 */
export declare const swap: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgSwap | MsgSwap[], fee: import("../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * WithdrawProtocolFees allows the protocol to withdraw accumulated fees and move them to another account.
 * @name withdrawProtocolFees
 * @package noble.swap.v1
 * @see proto service: noble.swap.v1.WithdrawProtocolFees
 */
export declare const withdrawProtocolFees: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgWithdrawProtocolFees | MsgWithdrawProtocolFees[], fee: import("../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * WithdrawRewards allows a user to claim their accumulated rewards.
 * @name withdrawRewards
 * @package noble.swap.v1
 * @see proto service: noble.swap.v1.WithdrawRewards
 */
export declare const withdrawRewards: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgWithdrawRewards | MsgWithdrawRewards[], fee: import("../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * PauseByAlgorithm pauses all pools using a specific algorithm.
 * @name pauseByAlgorithm
 * @package noble.swap.v1
 * @see proto service: noble.swap.v1.PauseByAlgorithm
 */
export declare const pauseByAlgorithm: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgPauseByAlgorithm | MsgPauseByAlgorithm[], fee: import("../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * PauseByPoolIds pauses specific pools identified by their pool IDs.
 * @name pauseByPoolIds
 * @package noble.swap.v1
 * @see proto service: noble.swap.v1.PauseByPoolIds
 */
export declare const pauseByPoolIds: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgPauseByPoolIds | MsgPauseByPoolIds[], fee: import("../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * UnpauseByAlgorithm unpauses all pools using a specific algorithm.
 * @name unpauseByAlgorithm
 * @package noble.swap.v1
 * @see proto service: noble.swap.v1.UnpauseByAlgorithm
 */
export declare const unpauseByAlgorithm: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUnpauseByAlgorithm | MsgUnpauseByAlgorithm[], fee: import("../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * UnpauseByPoolIds unpauses specific pools identified by their pool IDs.
 * @name unpauseByPoolIds
 * @package noble.swap.v1
 * @see proto service: noble.swap.v1.UnpauseByPoolIds
 */
export declare const unpauseByPoolIds: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUnpauseByPoolIds | MsgUnpauseByPoolIds[], fee: import("../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map