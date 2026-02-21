//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { MsgConnectionOpenInit, MsgConnectionOpenTry, MsgConnectionOpenAck, MsgConnectionOpenConfirm, MsgUpdateParams, } from '@agoric/cosmic-proto/codegen/ibc/core/connection/v1/tx.js';
/**
 * ConnectionOpenInit defines a rpc handler method for MsgConnectionOpenInit.
 * @name connectionOpenInit
 * @package ibc.core.connection.v1
 * @see proto service: ibc.core.connection.v1.ConnectionOpenInit
 */
export const connectionOpenInit = buildTx({
    msg: MsgConnectionOpenInit,
});
/**
 * ConnectionOpenTry defines a rpc handler method for MsgConnectionOpenTry.
 * @name connectionOpenTry
 * @package ibc.core.connection.v1
 * @see proto service: ibc.core.connection.v1.ConnectionOpenTry
 */
export const connectionOpenTry = buildTx({
    msg: MsgConnectionOpenTry,
});
/**
 * ConnectionOpenAck defines a rpc handler method for MsgConnectionOpenAck.
 * @name connectionOpenAck
 * @package ibc.core.connection.v1
 * @see proto service: ibc.core.connection.v1.ConnectionOpenAck
 */
export const connectionOpenAck = buildTx({
    msg: MsgConnectionOpenAck,
});
/**
 * ConnectionOpenConfirm defines a rpc handler method for
 * MsgConnectionOpenConfirm.
 * @name connectionOpenConfirm
 * @package ibc.core.connection.v1
 * @see proto service: ibc.core.connection.v1.ConnectionOpenConfirm
 */
export const connectionOpenConfirm = buildTx({
    msg: MsgConnectionOpenConfirm,
});
/**
 * UpdateConnectionParams defines a rpc handler method for
 * MsgUpdateParams.
 * @name updateConnectionParams
 * @package ibc.core.connection.v1
 * @see proto service: ibc.core.connection.v1.UpdateConnectionParams
 */
export const updateConnectionParams = buildTx({
    msg: MsgUpdateParams,
});
//# sourceMappingURL=tx.rpc.func.js.map