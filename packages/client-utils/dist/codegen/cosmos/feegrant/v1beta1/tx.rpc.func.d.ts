import { MsgGrantAllowance, MsgRevokeAllowance, MsgPruneAllowances } from '@agoric/cosmic-proto/codegen/cosmos/feegrant/v1beta1/tx.js';
/**
 * GrantAllowance grants fee allowance to the grantee on the granter's
 * account with the provided expiration time.
 * @name grantAllowance
 * @package cosmos.feegrant.v1beta1
 * @see proto service: cosmos.feegrant.v1beta1.GrantAllowance
 */
export declare const grantAllowance: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgGrantAllowance | MsgGrantAllowance[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * RevokeAllowance revokes any fee allowance of granter's account that
 * has been granted to the grantee.
 * @name revokeAllowance
 * @package cosmos.feegrant.v1beta1
 * @see proto service: cosmos.feegrant.v1beta1.RevokeAllowance
 */
export declare const revokeAllowance: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgRevokeAllowance | MsgRevokeAllowance[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * PruneAllowances prunes expired fee allowances, currently up to 75 at a time.
 *
 * Since cosmos-sdk 0.50
 * @name pruneAllowances
 * @package cosmos.feegrant.v1beta1
 * @see proto service: cosmos.feegrant.v1beta1.PruneAllowances
 */
export declare const pruneAllowances: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgPruneAllowances | MsgPruneAllowances[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map