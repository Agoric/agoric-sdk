import { MsgGrant, MsgExec, MsgRevoke } from '@agoric/cosmic-proto/codegen/cosmos/authz/v1beta1/tx.js';
/**
 * Grant grants the provided authorization to the grantee on the granter's
 * account with the provided expiration time. If there is already a grant
 * for the given (granter, grantee, Authorization) triple, then the grant
 * will be overwritten.
 * @name grant
 * @package cosmos.authz.v1beta1
 * @see proto service: cosmos.authz.v1beta1.Grant
 */
export declare const grant: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgGrant | MsgGrant[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Exec attempts to execute the provided messages using
 * authorizations granted to the grantee. Each message should have only
 * one signer corresponding to the granter of the authorization.
 * @name exec
 * @package cosmos.authz.v1beta1
 * @see proto service: cosmos.authz.v1beta1.Exec
 */
export declare const exec: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgExec | MsgExec[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Revoke revokes any authorization corresponding to the provided method name on the
 * granter's account that has been granted to the grantee.
 * @name revoke
 * @package cosmos.authz.v1beta1
 * @see proto service: cosmos.authz.v1beta1.Revoke
 */
export declare const revoke: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgRevoke | MsgRevoke[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map