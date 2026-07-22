//@ts-nocheck
import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import {
  MsgFundCommunityPool,
  MsgFundCommunityPoolResponse,
  MsgCommunityPoolSpend,
  MsgCommunityPoolSpendResponse,
  MsgCreateContinuousFund,
  MsgCreateContinuousFundResponse,
  MsgCancelContinuousFund,
  MsgCancelContinuousFundResponse,
  MsgUpdateParams,
  MsgUpdateParamsResponse,
} from '@agoric/cosmic-proto/codegen/cosmos/protocolpool/v1/tx.js';
/** Msg defines the pool Msg service. */
export interface Msg {
  /**
   * FundCommunityPool defines a method to allow an account to directly
   * fund the community pool.
   */
  fundCommunityPool(
    request: MsgFundCommunityPool,
  ): Promise<MsgFundCommunityPoolResponse>;
  /**
   * CommunityPoolSpend defines a governance operation for sending tokens from
   * the community pool in the x/protocolpool module to another account, which
   * could be the governance module itself. The authority is defined in the
   * keeper.
   */
  communityPoolSpend(
    request: MsgCommunityPoolSpend,
  ): Promise<MsgCommunityPoolSpendResponse>;
  /**
   * CreateContinuousFund defines a method to distribute a percentage of funds to an address continuously.
   * This ContinuousFund can be indefinite or run until a given expiry time.
   * Funds come from validator block rewards from x/distribution, but may also come from
   * any user who funds the ProtocolPoolEscrow module account directly through x/bank.
   */
  createContinuousFund(
    request: MsgCreateContinuousFund,
  ): Promise<MsgCreateContinuousFundResponse>;
  /** CancelContinuousFund defines a method for cancelling continuous fund. */
  cancelContinuousFund(
    request: MsgCancelContinuousFund,
  ): Promise<MsgCancelContinuousFundResponse>;
  /**
   * UpdateParams defines a governance operation for updating the x/protocolpool module parameters.
   * The authority is defined in the keeper.
   */
  updateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse>;
}
export class MsgClientImpl implements Msg {
  private readonly rpc: TxRpc;
  constructor(rpc: TxRpc) {
    this.rpc = rpc;
    this.fundCommunityPool = this.fundCommunityPool.bind(this);
    this.communityPoolSpend = this.communityPoolSpend.bind(this);
    this.createContinuousFund = this.createContinuousFund.bind(this);
    this.cancelContinuousFund = this.cancelContinuousFund.bind(this);
    this.updateParams = this.updateParams.bind(this);
  }
  fundCommunityPool(
    request: MsgFundCommunityPool,
  ): Promise<MsgFundCommunityPoolResponse> {
    const data = MsgFundCommunityPool.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.protocolpool.v1.Msg',
      'FundCommunityPool',
      data,
    );
    return promise.then(data =>
      MsgFundCommunityPoolResponse.decode(new BinaryReader(data)),
    );
  }
  communityPoolSpend(
    request: MsgCommunityPoolSpend,
  ): Promise<MsgCommunityPoolSpendResponse> {
    const data = MsgCommunityPoolSpend.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.protocolpool.v1.Msg',
      'CommunityPoolSpend',
      data,
    );
    return promise.then(data =>
      MsgCommunityPoolSpendResponse.decode(new BinaryReader(data)),
    );
  }
  createContinuousFund(
    request: MsgCreateContinuousFund,
  ): Promise<MsgCreateContinuousFundResponse> {
    const data = MsgCreateContinuousFund.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.protocolpool.v1.Msg',
      'CreateContinuousFund',
      data,
    );
    return promise.then(data =>
      MsgCreateContinuousFundResponse.decode(new BinaryReader(data)),
    );
  }
  cancelContinuousFund(
    request: MsgCancelContinuousFund,
  ): Promise<MsgCancelContinuousFundResponse> {
    const data = MsgCancelContinuousFund.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.protocolpool.v1.Msg',
      'CancelContinuousFund',
      data,
    );
    return promise.then(data =>
      MsgCancelContinuousFundResponse.decode(new BinaryReader(data)),
    );
  }
  updateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse> {
    const data = MsgUpdateParams.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.protocolpool.v1.Msg',
      'UpdateParams',
      data,
    );
    return promise.then(data =>
      MsgUpdateParamsResponse.decode(new BinaryReader(data)),
    );
  }
}
export const createClientImpl = (rpc: TxRpc) => {
  return new MsgClientImpl(rpc);
};
