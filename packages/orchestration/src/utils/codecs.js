import { CodecHelper } from '@agoric/cosmic-proto';
import {
  MsgDepositForBurn as MsgDepositForBurnType,
  MsgDepositForBurnResponse as MsgDepositForBurnResponseType,
  MsgDepositForBurnWithCaller as MsgDepositForBurnWithCallerType,
  MsgDepositForBurnWithCallerResponse as MsgDepositForBurnWithCallerResponseType,
} from '@agoric/cosmic-proto/circle/cctp/v1/tx.js';
import {
  QueryAllBalancesRequest as QueryAllBalancesRequestType,
  QueryAllBalancesResponse as QueryAllBalancesResponseType,
  QueryBalanceRequest as QueryBalanceRequestType,
  QueryBalanceResponse as QueryBalanceResponseType,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import {
  MsgSendResponse as MsgSendResponseType,
  MsgSend as MsgSendType,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/tx.js';
import {
  QueryDelegationRewardsRequest as QueryDelegationRewardsRequestType,
  QueryDelegationRewardsResponse as QueryDelegationRewardsResponseType,
  QueryDelegationTotalRewardsRequest as QueryDelegationTotalRewardsRequestType,
  QueryDelegationTotalRewardsResponse as QueryDelegationTotalRewardsResponseType,
} from '@agoric/cosmic-proto/cosmos/distribution/v1beta1/query.js';
import {
  MsgWithdrawDelegatorReward as MsgWithdrawDelegatorRewardType,
  MsgWithdrawDelegatorRewardResponse as MsgWithdrawDelegatorRewardResponseType,
} from '@agoric/cosmic-proto/cosmos/distribution/v1beta1/tx.js';
import {
  QueryDelegationRequest as QueryDelegationRequestType,
  QueryDelegationResponse as QueryDelegationResponseType,
  QueryDelegatorDelegationsRequest as QueryDelegatorDelegationsRequestType,
  QueryDelegatorDelegationsResponse as QueryDelegatorDelegationsResponseType,
  QueryDelegatorUnbondingDelegationsRequest as QueryDelegatorUnbondingDelegationsRequestType,
  QueryDelegatorUnbondingDelegationsResponse as QueryDelegatorUnbondingDelegationsResponseType,
  QueryRedelegationsRequest as QueryRedelegationsRequestType,
  QueryRedelegationsResponse as QueryRedelegationsResponseType,
  QueryUnbondingDelegationRequest as QueryUnbondingDelegationRequestType,
  QueryUnbondingDelegationResponse as QueryUnbondingDelegationResponseType,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js';
import {
  MsgBeginRedelegate as MsgBeginRedelegateType,
  MsgBeginRedelegateResponse as MsgBeginRedelegateResponseType,
  MsgDelegate as MsgDelegateType,
  MsgDelegateResponse as MsgDelegateResponseType,
  MsgUndelegate as MsgUndelegateType,
  MsgUndelegateResponse as MsgUndelegateResponseType,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { Any as AnyType } from '@agoric/cosmic-proto/google/protobuf/any.js';
import {
  MsgTransferResponse as MsgTransferResponseType,
  MsgTransfer as MsgTransferType,
} from '@agoric/cosmic-proto/ibc/applications/transfer/v1/tx.js';

/**
 * @import {TypeFromUrl} from '@agoric/cosmic-proto';
 */

export const MsgDepositForBurn = CodecHelper(MsgDepositForBurnType);
export const MsgDepositForBurnResponse = CodecHelper(
  MsgDepositForBurnResponseType,
);
export { MsgDepositForBurnType, MsgDepositForBurnResponseType };
export const MsgDepositForBurnWithCaller = CodecHelper(
  MsgDepositForBurnWithCallerType,
);
export const MsgDepositForBurnWithCallerResponse = CodecHelper(
  MsgDepositForBurnWithCallerResponseType,
);
export {
  MsgDepositForBurnWithCallerType,
  MsgDepositForBurnWithCallerResponseType,
};
export const MsgSend = CodecHelper(MsgSendType);
export const MsgSendResponse = CodecHelper(MsgSendResponseType);
export { MsgSendType, MsgSendResponseType };
export const MsgWithdrawDelegatorReward = CodecHelper(
  MsgWithdrawDelegatorRewardType,
);
export { MsgWithdrawDelegatorRewardType };
export const MsgWithdrawDelegatorRewardResponse = CodecHelper(
  MsgWithdrawDelegatorRewardResponseType,
);
export const QueryAllBalancesRequest = CodecHelper(QueryAllBalancesRequestType);
export const QueryAllBalancesResponse = CodecHelper(
  QueryAllBalancesResponseType,
);
export { QueryAllBalancesRequestType, QueryAllBalancesResponseType };
export const QueryBalanceRequest = CodecHelper(QueryBalanceRequestType);
export const QueryBalanceResponse = CodecHelper(QueryBalanceResponseType);
export { QueryBalanceRequestType, QueryBalanceResponseType };
export const QueryDelegationRewardsRequest = CodecHelper(
  QueryDelegationRewardsRequestType,
);
export {
  QueryDelegationRewardsRequestType,
  QueryDelegationRewardsResponseType,
};
export const QueryDelegationRewardsResponse = CodecHelper(
  QueryDelegationRewardsResponseType,
);
export const QueryDelegationTotalRewardsRequest = CodecHelper(
  QueryDelegationTotalRewardsRequestType,
);
export const QueryDelegationTotalRewardsResponse = CodecHelper(
  QueryDelegationTotalRewardsResponseType,
);
export {
  QueryDelegationTotalRewardsRequestType,
  QueryDelegationTotalRewardsResponseType,
};
export const QueryDelegationRequest = CodecHelper(QueryDelegationRequestType);
export const QueryDelegationResponse = CodecHelper(QueryDelegationResponseType);
export { QueryDelegationRequestType, QueryDelegationResponseType };
export const QueryDelegatorDelegationsRequest = CodecHelper(
  QueryDelegatorDelegationsRequestType,
);
export const QueryDelegatorDelegationsResponse = CodecHelper(
  QueryDelegatorDelegationsResponseType,
);
export {
  QueryDelegatorDelegationsRequestType,
  QueryDelegatorDelegationsResponseType,
};
export const QueryDelegatorUnbondingDelegationsRequest = CodecHelper(
  QueryDelegatorUnbondingDelegationsRequestType,
);
export const QueryDelegatorUnbondingDelegationsResponse = CodecHelper(
  QueryDelegatorUnbondingDelegationsResponseType,
);
export {
  QueryDelegatorUnbondingDelegationsRequestType,
  QueryDelegatorUnbondingDelegationsResponseType,
};
export const QueryRedelegationsRequest = CodecHelper(
  QueryRedelegationsRequestType,
);
export const QueryRedelegationsResponse = CodecHelper(
  QueryRedelegationsResponseType,
);
export { QueryRedelegationsRequestType, QueryRedelegationsResponseType };
export const QueryUnbondingDelegationRequest = CodecHelper(
  QueryUnbondingDelegationRequestType,
);
export const QueryUnbondingDelegationResponse = CodecHelper(
  QueryUnbondingDelegationResponseType,
);
export {
  QueryUnbondingDelegationRequestType,
  QueryUnbondingDelegationResponseType,
};
export const MsgBeginRedelegate = CodecHelper(MsgBeginRedelegateType);
export const MsgBeginRedelegateResponse = CodecHelper(
  MsgBeginRedelegateResponseType,
);
export { MsgBeginRedelegateType, MsgBeginRedelegateResponseType };
export const MsgDelegate = CodecHelper(MsgDelegateType);
export const MsgDelegateResponse = CodecHelper(MsgDelegateResponseType);
export { MsgDelegateType, MsgDelegateResponseType };
export const MsgUndelegate = CodecHelper(MsgUndelegateType);
export const MsgUndelegateResponse = CodecHelper(MsgUndelegateResponseType);
export { MsgUndelegateType, MsgUndelegateResponseType };
export const MsgTransfer = CodecHelper(MsgTransferType);
export const MsgTransferResponse = CodecHelper(MsgTransferResponseType);
export { MsgTransferType, MsgTransferResponseType };

const AnyRawHelper = CodecHelper(AnyType);
const AnyToJSON = {
  /**
   * TypeScript 6 note: Removed {string} constraint on TU as keyof infers to string | number | symbol
   * @template [TU=keyof TypeFromUrl]
   * @param {Partial<Omit<AnyType, 'typeUrl'> & { typeUrl: TU }>} msg
   */
  toJSON: msg => {
    const ne = AnyRawHelper.toJSON(msg);
    return /** @type {Omit<typeof ne, 'typeUrl'> & { typeUrl: TU }} */ (ne);
  },
};

/** @type {Omit<typeof AnyRawHelper, 'toJSON'> & typeof AnyToJSON} */
export const Any = Object.freeze({
  ...AnyRawHelper,
  ...AnyToJSON,
});
export { AnyType };

export const responseCodecForTypeUrl = /** @type {const} */ ({
  [MsgDepositForBurn.typeUrl]: MsgDepositForBurnResponse,
  [MsgDepositForBurnWithCaller.typeUrl]: MsgDepositForBurnWithCallerResponse,
  [MsgUndelegate.typeUrl]: MsgUndelegateResponse,
  [MsgBeginRedelegate.typeUrl]: MsgBeginRedelegateResponse,
  [MsgDelegate.typeUrl]: MsgDelegateResponse,
  [MsgWithdrawDelegatorReward.typeUrl]: MsgWithdrawDelegatorRewardResponse,
  [MsgSend.typeUrl]: MsgSendResponse,
  [MsgTransfer.typeUrl]: MsgTransferResponse,
  [QueryBalanceRequest.typeUrl]: QueryBalanceResponse,
  [QueryAllBalancesRequest.typeUrl]: QueryAllBalancesResponse,
  [QueryDelegationRequest.typeUrl]: QueryDelegationResponse,
  [QueryDelegatorDelegationsRequest.typeUrl]: QueryDelegatorDelegationsResponse,
  [QueryDelegatorUnbondingDelegationsRequest.typeUrl]:
    QueryDelegatorUnbondingDelegationsResponse,
  [QueryRedelegationsRequest.typeUrl]: QueryRedelegationsResponse,
  [QueryUnbondingDelegationRequest.typeUrl]: QueryUnbondingDelegationResponse,
  [QueryDelegationRewardsRequest.typeUrl]: QueryDelegationRewardsResponse,
  [QueryDelegationTotalRewardsRequest.typeUrl]:
    QueryDelegationTotalRewardsResponse,
});
