//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { MsgLock, MsgUnlock, MsgSetPausedState, } from '@agoric/cosmic-proto/codegen/noble/dollar/vaults/v1/tx.js';
/**
 * @name lock
 * @package noble.dollar.vaults.v1
 * @see proto service: noble.dollar.vaults.v1.Lock
 */
export const lock = buildTx({
    msg: MsgLock,
});
/**
 * @name unlock
 * @package noble.dollar.vaults.v1
 * @see proto service: noble.dollar.vaults.v1.Unlock
 */
export const unlock = buildTx({
    msg: MsgUnlock,
});
/**
 * @name setPausedState
 * @package noble.dollar.vaults.v1
 * @see proto service: noble.dollar.vaults.v1.SetPausedState
 */
export const setPausedState = buildTx({
    msg: MsgSetPausedState,
});
//# sourceMappingURL=tx.rpc.func.js.map