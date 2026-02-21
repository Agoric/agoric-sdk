//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { MsgGrantAllowance, MsgRevokeAllowance, MsgPruneAllowances, } from '@agoric/cosmic-proto/codegen/cosmos/feegrant/v1beta1/tx.js';
/**
 * GrantAllowance grants fee allowance to the grantee on the granter's
 * account with the provided expiration time.
 * @name grantAllowance
 * @package cosmos.feegrant.v1beta1
 * @see proto service: cosmos.feegrant.v1beta1.GrantAllowance
 */
export const grantAllowance = buildTx({
    msg: MsgGrantAllowance,
});
/**
 * RevokeAllowance revokes any fee allowance of granter's account that
 * has been granted to the grantee.
 * @name revokeAllowance
 * @package cosmos.feegrant.v1beta1
 * @see proto service: cosmos.feegrant.v1beta1.RevokeAllowance
 */
export const revokeAllowance = buildTx({
    msg: MsgRevokeAllowance,
});
/**
 * PruneAllowances prunes expired fee allowances, currently up to 75 at a time.
 *
 * Since cosmos-sdk 0.50
 * @name pruneAllowances
 * @package cosmos.feegrant.v1beta1
 * @see proto service: cosmos.feegrant.v1beta1.PruneAllowances
 */
export const pruneAllowances = buildTx({
    msg: MsgPruneAllowances,
});
//# sourceMappingURL=tx.rpc.func.js.map