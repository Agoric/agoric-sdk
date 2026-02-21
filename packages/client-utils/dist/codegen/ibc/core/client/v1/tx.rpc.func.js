//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { MsgCreateClient, MsgUpdateClient, MsgUpgradeClient, MsgSubmitMisbehaviour, MsgRecoverClient, MsgIBCSoftwareUpgrade, MsgUpdateParams, } from '@agoric/cosmic-proto/codegen/ibc/core/client/v1/tx.js';
/**
 * CreateClient defines a rpc handler method for MsgCreateClient.
 * @name createClient
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.CreateClient
 */
export const createClient = buildTx({
    msg: MsgCreateClient,
});
/**
 * UpdateClient defines a rpc handler method for MsgUpdateClient.
 * @name updateClient
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.UpdateClient
 */
export const updateClient = buildTx({
    msg: MsgUpdateClient,
});
/**
 * UpgradeClient defines a rpc handler method for MsgUpgradeClient.
 * @name upgradeClient
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.UpgradeClient
 */
export const upgradeClient = buildTx({
    msg: MsgUpgradeClient,
});
/**
 * SubmitMisbehaviour defines a rpc handler method for MsgSubmitMisbehaviour.
 * @name submitMisbehaviour
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.SubmitMisbehaviour
 */
export const submitMisbehaviour = buildTx({
    msg: MsgSubmitMisbehaviour,
});
/**
 * RecoverClient defines a rpc handler method for MsgRecoverClient.
 * @name recoverClient
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.RecoverClient
 */
export const recoverClient = buildTx({
    msg: MsgRecoverClient,
});
/**
 * IBCSoftwareUpgrade defines a rpc handler method for MsgIBCSoftwareUpgrade.
 * @name iBCSoftwareUpgrade
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.IBCSoftwareUpgrade
 */
export const iBCSoftwareUpgrade = buildTx({
    msg: MsgIBCSoftwareUpgrade,
});
/**
 * UpdateClientParams defines a rpc handler method for MsgUpdateParams.
 * @name updateClientParams
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.UpdateClientParams
 */
export const updateClientParams = buildTx({
    msg: MsgUpdateParams,
});
//# sourceMappingURL=tx.rpc.func.js.map