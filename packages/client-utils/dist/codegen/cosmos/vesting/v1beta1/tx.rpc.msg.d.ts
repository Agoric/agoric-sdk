import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { MsgCreateVestingAccount, MsgCreateVestingAccountResponse, MsgCreatePermanentLockedAccount, MsgCreatePermanentLockedAccountResponse, MsgCreatePeriodicVestingAccount, MsgCreatePeriodicVestingAccountResponse, MsgCreateClawbackVestingAccount, MsgCreateClawbackVestingAccountResponse, MsgClawback, MsgClawbackResponse, MsgReturnGrants, MsgReturnGrantsResponse } from '@agoric/cosmic-proto/codegen/cosmos/vesting/v1beta1/tx.js';
/** Msg defines the bank Msg service. */
export interface Msg {
    /**
     * CreateVestingAccount defines a method that enables creating a vesting
     * account.
     */
    createVestingAccount(request: MsgCreateVestingAccount): Promise<MsgCreateVestingAccountResponse>;
    /**
     * CreatePermanentLockedAccount defines a method that enables creating a permanent
     * locked account.
     *
     * Since: cosmos-sdk 0.46
     */
    createPermanentLockedAccount(request: MsgCreatePermanentLockedAccount): Promise<MsgCreatePermanentLockedAccountResponse>;
    /**
     * CreatePeriodicVestingAccount defines a method that enables creating a
     * periodic vesting account.
     *
     * Since: cosmos-sdk 0.46
     */
    createPeriodicVestingAccount(request: MsgCreatePeriodicVestingAccount): Promise<MsgCreatePeriodicVestingAccountResponse>;
    /**
     * CreateClawbackVestingAccount defines a method that enables creating a
     * vesting account that is subject to clawback.
     */
    createClawbackVestingAccount(request: MsgCreateClawbackVestingAccount): Promise<MsgCreateClawbackVestingAccountResponse>;
    /** Clawback removes the unvested tokens from a ClawbackVestingAccount. */
    clawback(request: MsgClawback): Promise<MsgClawbackResponse>;
    /** ReturnGrants returns vesting grants to the funder. */
    returnGrants(request: MsgReturnGrants): Promise<MsgReturnGrantsResponse>;
}
export declare class MsgClientImpl implements Msg {
    private readonly rpc;
    constructor(rpc: TxRpc);
    createVestingAccount(request: MsgCreateVestingAccount): Promise<MsgCreateVestingAccountResponse>;
    createPermanentLockedAccount(request: MsgCreatePermanentLockedAccount): Promise<MsgCreatePermanentLockedAccountResponse>;
    createPeriodicVestingAccount(request: MsgCreatePeriodicVestingAccount): Promise<MsgCreatePeriodicVestingAccountResponse>;
    createClawbackVestingAccount(request: MsgCreateClawbackVestingAccount): Promise<MsgCreateClawbackVestingAccountResponse>;
    clawback(request: MsgClawback): Promise<MsgClawbackResponse>;
    returnGrants(request: MsgReturnGrants): Promise<MsgReturnGrantsResponse>;
}
export declare const createClientImpl: (rpc: TxRpc) => MsgClientImpl;
//# sourceMappingURL=tx.rpc.msg.d.ts.map