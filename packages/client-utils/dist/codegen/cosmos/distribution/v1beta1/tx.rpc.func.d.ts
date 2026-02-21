import { MsgSetWithdrawAddress, MsgWithdrawDelegatorReward, MsgWithdrawValidatorCommission, MsgFundCommunityPool, MsgUpdateParams, MsgCommunityPoolSpend, MsgDepositValidatorRewardsPool } from '@agoric/cosmic-proto/codegen/cosmos/distribution/v1beta1/tx.js';
/**
 * SetWithdrawAddress defines a method to change the withdraw address
 * for a delegator (or validator self-delegation).
 * @name setWithdrawAddress
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.SetWithdrawAddress
 */
export declare const setWithdrawAddress: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgSetWithdrawAddress | MsgSetWithdrawAddress[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * WithdrawDelegatorReward defines a method to withdraw rewards of delegator
 * from a single validator.
 * @name withdrawDelegatorReward
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.WithdrawDelegatorReward
 */
export declare const withdrawDelegatorReward: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgWithdrawDelegatorReward | MsgWithdrawDelegatorReward[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * WithdrawValidatorCommission defines a method to withdraw the
 * full commission to the validator address.
 * @name withdrawValidatorCommission
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.WithdrawValidatorCommission
 */
export declare const withdrawValidatorCommission: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgWithdrawValidatorCommission | MsgWithdrawValidatorCommission[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * FundCommunityPool defines a method to allow an account to directly
 * fund the community pool.
 * @name fundCommunityPool
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.FundCommunityPool
 */
export declare const fundCommunityPool: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgFundCommunityPool | MsgFundCommunityPool[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * UpdateParams defines a governance operation for updating the x/distribution
 * module parameters. The authority is defined in the keeper.
 *
 * Since: cosmos-sdk 0.47
 * @name updateParams
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.UpdateParams
 */
export declare const updateParams: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgUpdateParams | MsgUpdateParams[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * CommunityPoolSpend defines a governance operation for sending tokens from
 * the community pool in the x/distribution module to another account, which
 * could be the governance module itself. The authority is defined in the
 * keeper.
 *
 * Since: cosmos-sdk 0.47
 * @name communityPoolSpend
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.CommunityPoolSpend
 */
export declare const communityPoolSpend: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgCommunityPoolSpend | MsgCommunityPoolSpend[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * DepositValidatorRewardsPool defines a method to provide additional rewards
 * to delegators to a specific validator.
 *
 * Since: cosmos-sdk 0.50
 * @name depositValidatorRewardsPool
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.DepositValidatorRewardsPool
 */
export declare const depositValidatorRewardsPool: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgDepositValidatorRewardsPool | MsgDepositValidatorRewardsPool[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map