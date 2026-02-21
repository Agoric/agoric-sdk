//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { MsgStoreCode, MsgRemoveChecksum, MsgMigrateContract, } from '@agoric/cosmic-proto/codegen/ibc/lightclients/wasm/v1/tx.js';
/**
 * StoreCode defines a rpc handler method for MsgStoreCode.
 * @name storeCode
 * @package ibc.lightclients.wasm.v1
 * @see proto service: ibc.lightclients.wasm.v1.StoreCode
 */
export const storeCode = buildTx({
    msg: MsgStoreCode,
});
/**
 * RemoveChecksum defines a rpc handler method for MsgRemoveChecksum.
 * @name removeChecksum
 * @package ibc.lightclients.wasm.v1
 * @see proto service: ibc.lightclients.wasm.v1.RemoveChecksum
 */
export const removeChecksum = buildTx({
    msg: MsgRemoveChecksum,
});
/**
 * MigrateContract defines a rpc handler method for MsgMigrateContract.
 * @name migrateContract
 * @package ibc.lightclients.wasm.v1
 * @see proto service: ibc.lightclients.wasm.v1.MigrateContract
 */
export const migrateContract = buildTx({
    msg: MsgMigrateContract,
});
//# sourceMappingURL=tx.rpc.func.js.map