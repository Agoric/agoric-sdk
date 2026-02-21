//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { MsgSetWithdrawAddress, MsgWithdrawDelegatorReward, MsgWithdrawValidatorCommission, MsgFundCommunityPool, MsgUpdateParams, MsgCommunityPoolSpend, MsgDepositValidatorRewardsPool, } from '@agoric/cosmic-proto/codegen/cosmos/distribution/v1beta1/tx.js';
/**
 * SetWithdrawAddress defines a method to change the withdraw address
 * for a delegator (or validator self-delegation).
 * @name setWithdrawAddress
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.SetWithdrawAddress
 */
export const setWithdrawAddress = buildTx({
    msg: MsgSetWithdrawAddress,
});
/**
 * WithdrawDelegatorReward defines a method to withdraw rewards of delegator
 * from a single validator.
 * @name withdrawDelegatorReward
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.WithdrawDelegatorReward
 */
export const withdrawDelegatorReward = buildTx({
    msg: MsgWithdrawDelegatorReward,
});
/**
 * WithdrawValidatorCommission defines a method to withdraw the
 * full commission to the validator address.
 * @name withdrawValidatorCommission
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.WithdrawValidatorCommission
 */
export const withdrawValidatorCommission = buildTx({
    msg: MsgWithdrawValidatorCommission,
});
/**
 * FundCommunityPool defines a method to allow an account to directly
 * fund the community pool.
 * @name fundCommunityPool
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.FundCommunityPool
 */
export const fundCommunityPool = buildTx({
    msg: MsgFundCommunityPool,
});
/**
 * UpdateParams defines a governance operation for updating the x/distribution
 * module parameters. The authority is defined in the keeper.
 *
 * Since: cosmos-sdk 0.47
 * @name updateParams
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.UpdateParams
 */
export const updateParams = buildTx({
    msg: MsgUpdateParams,
});
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
export const communityPoolSpend = buildTx({
    msg: MsgCommunityPoolSpend,
});
/**
 * DepositValidatorRewardsPool defines a method to provide additional rewards
 * to delegators to a specific validator.
 *
 * Since: cosmos-sdk 0.50
 * @name depositValidatorRewardsPool
 * @package cosmos.distribution.v1beta1
 * @see proto service: cosmos.distribution.v1beta1.DepositValidatorRewardsPool
 */
export const depositValidatorRewardsPool = buildTx({
    msg: MsgDepositValidatorRewardsPool,
});
//# sourceMappingURL=tx.rpc.func.js.map