import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { MsgSwap, MsgSwapResponse, MsgWithdrawProtocolFees, MsgWithdrawProtocolFeesResponse, MsgWithdrawRewards, MsgWithdrawRewardsResponse, MsgPauseByAlgorithm, MsgPauseByAlgorithmResponse, MsgPauseByPoolIds, MsgPauseByPoolIdsResponse, MsgUnpauseByAlgorithm, MsgUnpauseByAlgorithmResponse, MsgUnpauseByPoolIds, MsgUnpauseByPoolIdsResponse } from '@agoric/cosmic-proto/codegen/noble/swap/v1/tx.js';
export interface Msg {
    /** Swap allows a user to swap one type of token for another, using multiple routes. */
    swap(request: MsgSwap): Promise<MsgSwapResponse>;
    /** WithdrawProtocolFees allows the protocol to withdraw accumulated fees and move them to another account. */
    withdrawProtocolFees(request: MsgWithdrawProtocolFees): Promise<MsgWithdrawProtocolFeesResponse>;
    /** WithdrawRewards allows a user to claim their accumulated rewards. */
    withdrawRewards(request: MsgWithdrawRewards): Promise<MsgWithdrawRewardsResponse>;
    /** PauseByAlgorithm pauses all pools using a specific algorithm. */
    pauseByAlgorithm(request: MsgPauseByAlgorithm): Promise<MsgPauseByAlgorithmResponse>;
    /** PauseByPoolIds pauses specific pools identified by their pool IDs. */
    pauseByPoolIds(request: MsgPauseByPoolIds): Promise<MsgPauseByPoolIdsResponse>;
    /** UnpauseByAlgorithm unpauses all pools using a specific algorithm. */
    unpauseByAlgorithm(request: MsgUnpauseByAlgorithm): Promise<MsgUnpauseByAlgorithmResponse>;
    /** UnpauseByPoolIds unpauses specific pools identified by their pool IDs. */
    unpauseByPoolIds(request: MsgUnpauseByPoolIds): Promise<MsgUnpauseByPoolIdsResponse>;
}
export declare class MsgClientImpl implements Msg {
    private readonly rpc;
    constructor(rpc: TxRpc);
    swap(request: MsgSwap): Promise<MsgSwapResponse>;
    withdrawProtocolFees(request: MsgWithdrawProtocolFees): Promise<MsgWithdrawProtocolFeesResponse>;
    withdrawRewards(request: MsgWithdrawRewards): Promise<MsgWithdrawRewardsResponse>;
    pauseByAlgorithm(request: MsgPauseByAlgorithm): Promise<MsgPauseByAlgorithmResponse>;
    pauseByPoolIds(request: MsgPauseByPoolIds): Promise<MsgPauseByPoolIdsResponse>;
    unpauseByAlgorithm(request: MsgUnpauseByAlgorithm): Promise<MsgUnpauseByAlgorithmResponse>;
    unpauseByPoolIds(request: MsgUnpauseByPoolIds): Promise<MsgUnpauseByPoolIdsResponse>;
}
export declare const createClientImpl: (rpc: TxRpc) => MsgClientImpl;
//# sourceMappingURL=tx.rpc.msg.d.ts.map