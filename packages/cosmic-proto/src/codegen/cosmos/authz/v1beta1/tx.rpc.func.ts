//@ts-nocheck
import { buildTx } from '../../../helper-func-types.js';
import { MsgGrant, MsgExec, MsgRevoke } from './tx.js';
/**
 * Grant grants the provided authorization to the grantee on the granter's
 * account with the provided expiration time. If there is already a grant
 * for the given (granter, grantee, Authorization) triple, then the grant
 * will be overwritten.
 * @name grant
 * @package cosmos.authz.v1beta1
 * @see proto service: cosmos.authz.v1beta1.Grant
 */
export const grant = buildTx<MsgGrant>({
  msg: MsgGrant,
});
/**
 * Exec attempts to execute the provided messages using
 * authorizations granted to the grantee. Each message should have only
 * one signer corresponding to the granter of the authorization.
 * @name exec
 * @package cosmos.authz.v1beta1
 * @see proto service: cosmos.authz.v1beta1.Exec
 */
export const exec = buildTx<MsgExec>({
  msg: MsgExec,
});
/**
 * Revoke revokes any authorization corresponding to the provided method name on the
 * granter's account that has been granted to the grantee.
 * @name revoke
 * @package cosmos.authz.v1beta1
 * @see proto service: cosmos.authz.v1beta1.Revoke
 */
export const revoke = buildTx<MsgRevoke>({
  msg: MsgRevoke,
});
