//@ts-nocheck
import { type Rpc } from '../../../helpers.js';
import { BinaryReader } from '../../../binary.js';
import {
  MsgSetWithdrawAddress,
  MsgSetWithdrawAddressResponse,
  MsgWithdrawDelegatorReward,
  MsgWithdrawDelegatorRewardResponse,
  MsgWithdrawValidatorCommission,
  MsgWithdrawValidatorCommissionResponse,
  MsgFundCommunityPool,
  MsgFundCommunityPoolResponse,
  MsgUpdateParams,
  MsgUpdateParamsResponse,
  MsgCommunityPoolSpend,
  MsgCommunityPoolSpendResponse,
} from './tx.js';
/** Msg defines the distribution Msg service. */
export interface Msg {
  /**
   * SetWithdrawAddress defines a method to change the withdraw address
   * for a delegator (or validator self-delegation).
   */
  setWithdrawAddress(
    request: MsgSetWithdrawAddress,
  ): Promise<MsgSetWithdrawAddressResponse>;
  /**
   * WithdrawDelegatorReward defines a method to withdraw rewards of delegator
   * from a single validator.
   */
  withdrawDelegatorReward(
    request: MsgWithdrawDelegatorReward,
  ): Promise<MsgWithdrawDelegatorRewardResponse>;
  /**
   * WithdrawValidatorCommission defines a method to withdraw the
   * full commission to the validator address.
   */
  withdrawValidatorCommission(
    request: MsgWithdrawValidatorCommission,
  ): Promise<MsgWithdrawValidatorCommissionResponse>;
  /**
   * FundCommunityPool defines a method to allow an account to directly
   * fund the community pool.
   */
  fundCommunityPool(
    request: MsgFundCommunityPool,
  ): Promise<MsgFundCommunityPoolResponse>;
  /**
   * UpdateParams defines a governance operation for updating the x/distribution
   * module parameters. The authority is defined in the keeper.
   *
   * Since: cosmos-sdk 0.47
   */
  updateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse>;
  /**
   * CommunityPoolSpend defines a governance operation for sending tokens from
   * the community pool in the x/distribution module to another account, which
   * could be the governance module itself. The authority is defined in the
   * keeper.
   *
   * Since: cosmos-sdk 0.47
   */
  communityPoolSpend(
    request: MsgCommunityPoolSpend,
  ): Promise<MsgCommunityPoolSpendResponse>;
}
export class MsgClientImpl implements Msg {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.setWithdrawAddress = this.setWithdrawAddress.bind(this);
    this.withdrawDelegatorReward = this.withdrawDelegatorReward.bind(this);
    this.withdrawValidatorCommission =
      this.withdrawValidatorCommission.bind(this);
    this.fundCommunityPool = this.fundCommunityPool.bind(this);
    this.updateParams = this.updateParams.bind(this);
    this.communityPoolSpend = this.communityPoolSpend.bind(this);
  }
  setWithdrawAddress(
    request: MsgSetWithdrawAddress,
  ): Promise<MsgSetWithdrawAddressResponse> {
    const data = MsgSetWithdrawAddress.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.distribution.v1beta1.Msg',
      'SetWithdrawAddress',
      data,
    );
    return promise.then(data =>
      MsgSetWithdrawAddressResponse.decode(new BinaryReader(data)),
    );
  }
  withdrawDelegatorReward(
    request: MsgWithdrawDelegatorReward,
  ): Promise<MsgWithdrawDelegatorRewardResponse> {
    const data = MsgWithdrawDelegatorReward.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.distribution.v1beta1.Msg',
      'WithdrawDelegatorReward',
      data,
    );
    return promise.then(data =>
      MsgWithdrawDelegatorRewardResponse.decode(new BinaryReader(data)),
    );
  }
  withdrawValidatorCommission(
    request: MsgWithdrawValidatorCommission,
  ): Promise<MsgWithdrawValidatorCommissionResponse> {
    const data = MsgWithdrawValidatorCommission.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.distribution.v1beta1.Msg',
      'WithdrawValidatorCommission',
      data,
    );
    return promise.then(data =>
      MsgWithdrawValidatorCommissionResponse.decode(new BinaryReader(data)),
    );
  }
  fundCommunityPool(
    request: MsgFundCommunityPool,
  ): Promise<MsgFundCommunityPoolResponse> {
    const data = MsgFundCommunityPool.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.distribution.v1beta1.Msg',
      'FundCommunityPool',
      data,
    );
    return promise.then(data =>
      MsgFundCommunityPoolResponse.decode(new BinaryReader(data)),
    );
  }
  updateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse> {
    const data = MsgUpdateParams.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.distribution.v1beta1.Msg',
      'UpdateParams',
      data,
    );
    return promise.then(data =>
      MsgUpdateParamsResponse.decode(new BinaryReader(data)),
    );
  }
  communityPoolSpend(
    request: MsgCommunityPoolSpend,
  ): Promise<MsgCommunityPoolSpendResponse> {
    const data = MsgCommunityPoolSpend.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.distribution.v1beta1.Msg',
      'CommunityPoolSpend',
      data,
    );
    return promise.then(data =>
      MsgCommunityPoolSpendResponse.decode(new BinaryReader(data)),
    );
  }
}
