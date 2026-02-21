import { MsgCreateValidator, MsgEditValidator, MsgDelegate, MsgBeginRedelegate, MsgUndelegate, MsgCancelUnbondingDelegation, MsgUpdateParams } from './tx.js';
/**
 * CreateValidator defines a method for creating a new validator.
 * @name createValidator
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.CreateValidator
 */
export declare const createValidator: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgCreateValidator | MsgCreateValidator[], fee: import("../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * EditValidator defines a method for editing an existing validator.
 * @name editValidator
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.EditValidator
 */
export declare const editValidator: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgEditValidator | MsgEditValidator[], fee: import("../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Delegate defines a method for performing a delegation of coins
 * from a delegator to a validator.
 * @name delegate
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.Delegate
 */
export declare const delegate: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgDelegate | MsgDelegate[], fee: import("../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * BeginRedelegate defines a method for performing a redelegation
 * of coins from a delegator and source validator to a destination validator.
 * @name beginRedelegate
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.BeginRedelegate
 */
export declare const beginRedelegate: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgBeginRedelegate | MsgBeginRedelegate[], fee: import("../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Undelegate defines a method for performing an undelegation from a
 * delegate and a validator.
 * @name undelegate
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.Undelegate
 */
export declare const undelegate: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUndelegate | MsgUndelegate[], fee: import("../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * CancelUnbondingDelegation defines a method for performing canceling the unbonding delegation
 * and delegate back to previous validator.
 *
 * Since: cosmos-sdk 0.46
 * @name cancelUnbondingDelegation
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.CancelUnbondingDelegation
 */
export declare const cancelUnbondingDelegation: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgCancelUnbondingDelegation | MsgCancelUnbondingDelegation[], fee: import("../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * UpdateParams defines an operation for updating the x/staking module
 * parameters.
 * Since: cosmos-sdk 0.47
 * @name updateParams
 * @package cosmos.staking.v1beta1
 * @see proto service: cosmos.staking.v1beta1.UpdateParams
 */
export declare const updateParams: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateParams | MsgUpdateParams[], fee: import("../../../types.ts").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map