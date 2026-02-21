//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { MsgSoftwareUpgrade, MsgCancelUpgrade, } from '@agoric/cosmic-proto/codegen/cosmos/upgrade/v1beta1/tx.js';
/**
 * SoftwareUpgrade is a governance operation for initiating a software upgrade.
 *
 * Since: cosmos-sdk 0.46
 * @name softwareUpgrade
 * @package cosmos.upgrade.v1beta1
 * @see proto service: cosmos.upgrade.v1beta1.SoftwareUpgrade
 */
export const softwareUpgrade = buildTx({
    msg: MsgSoftwareUpgrade,
});
/**
 * CancelUpgrade is a governance operation for cancelling a previously
 * approved software upgrade.
 *
 * Since: cosmos-sdk 0.46
 * @name cancelUpgrade
 * @package cosmos.upgrade.v1beta1
 * @see proto service: cosmos.upgrade.v1beta1.CancelUpgrade
 */
export const cancelUpgrade = buildTx({
    msg: MsgCancelUpgrade,
});
//# sourceMappingURL=tx.rpc.func.js.map