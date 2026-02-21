import { MsgLock, MsgUnlock, MsgSetPausedState } from './tx.js';
/**
 * @name lock
 * @package noble.dollar.vaults.v1
 * @see proto service: noble.dollar.vaults.v1.Lock
 */
export declare const lock: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgLock | MsgLock[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name unlock
 * @package noble.dollar.vaults.v1
 * @see proto service: noble.dollar.vaults.v1.Unlock
 */
export declare const unlock: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUnlock | MsgUnlock[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name setPausedState
 * @package noble.dollar.vaults.v1
 * @see proto service: noble.dollar.vaults.v1.SetPausedState
 */
export declare const setPausedState: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgSetPausedState | MsgSetPausedState[], fee: import("../../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map