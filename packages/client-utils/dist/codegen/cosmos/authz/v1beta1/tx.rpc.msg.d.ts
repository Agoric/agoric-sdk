import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { MsgGrant, MsgGrantResponse, MsgExec, MsgExecResponse, MsgRevoke, MsgRevokeResponse } from '@agoric/cosmic-proto/codegen/cosmos/authz/v1beta1/tx.js';
/** Msg defines the authz Msg service. */
export interface Msg {
    /**
     * Grant grants the provided authorization to the grantee on the granter's
     * account with the provided expiration time. If there is already a grant
     * for the given (granter, grantee, Authorization) triple, then the grant
     * will be overwritten.
     */
    grant(request: MsgGrant): Promise<MsgGrantResponse>;
    /**
     * Exec attempts to execute the provided messages using
     * authorizations granted to the grantee. Each message should have only
     * one signer corresponding to the granter of the authorization.
     */
    exec(request: MsgExec): Promise<MsgExecResponse>;
    /**
     * Revoke revokes any authorization corresponding to the provided method name on the
     * granter's account that has been granted to the grantee.
     */
    revoke(request: MsgRevoke): Promise<MsgRevokeResponse>;
}
export declare class MsgClientImpl implements Msg {
    private readonly rpc;
    constructor(rpc: TxRpc);
    grant(request: MsgGrant): Promise<MsgGrantResponse>;
    exec(request: MsgExec): Promise<MsgExecResponse>;
    revoke(request: MsgRevoke): Promise<MsgRevokeResponse>;
}
export declare const createClientImpl: (rpc: TxRpc) => MsgClientImpl;
//# sourceMappingURL=tx.rpc.msg.d.ts.map