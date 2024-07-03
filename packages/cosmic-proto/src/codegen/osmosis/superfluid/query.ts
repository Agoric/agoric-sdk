//@ts-nocheck
import {
  PageRequest,
  PageRequestSDKType,
  PageResponse,
  PageResponseSDKType,
} from '../../cosmos/base/query/v1beta1/pagination.js';
import { Params, ParamsSDKType } from './params.js';
import {
  SuperfluidAssetType,
  SuperfluidAsset,
  SuperfluidAssetSDKType,
  OsmoEquivalentMultiplierRecord,
  OsmoEquivalentMultiplierRecordSDKType,
  SuperfluidDelegationRecord,
  SuperfluidDelegationRecordSDKType,
  superfluidAssetTypeFromJSON,
  superfluidAssetTypeToJSON,
} from './superfluid.js';
import { Coin, CoinSDKType } from '../../cosmos/base/v1beta1/coin.js';
import { SyntheticLock, SyntheticLockSDKType } from '../lockup/lock.js';
import {
  DelegationResponse,
  DelegationResponseSDKType,
} from '../../cosmos/staking/v1beta1/staking.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { JsonSafe } from '../../json-safe.js';
import { isSet } from '../../helpers.js';
export interface QueryParamsRequest {}
export interface QueryParamsRequestProtoMsg {
  typeUrl: '/osmosis.superfluid.QueryParamsRequest';
  value: Uint8Array;
}
export interface QueryParamsRequestSDKType {}
export interface QueryParamsResponse {
  /** params defines the parameters of the module. */
  params: Params;
}
export interface QueryParamsResponseProtoMsg {
  typeUrl: '/osmosis.superfluid.QueryParamsResponse';
  value: Uint8Array;
}
export interface QueryParamsResponseSDKType {
  params: ParamsSDKType;
}
export interface AssetTypeRequest {
  denom: string;
}
export interface AssetTypeRequestProtoMsg {
  typeUrl: '/osmosis.superfluid.AssetTypeRequest';
  value: Uint8Array;
}
export interface AssetTypeRequestSDKType {
  denom: string;
}
export interface AssetTypeResponse {
  assetType: SuperfluidAssetType;
}
export interface AssetTypeResponseProtoMsg {
  typeUrl: '/osmosis.superfluid.AssetTypeResponse';
  value: Uint8Array;
}
export interface AssetTypeResponseSDKType {
  asset_type: SuperfluidAssetType;
}
export interface AllAssetsRequest {}
export interface AllAssetsRequestProtoMsg {
  typeUrl: '/osmosis.superfluid.AllAssetsRequest';
  value: Uint8Array;
}
export interface AllAssetsRequestSDKType {}
export interface AllAssetsResponse {
  assets: SuperfluidAsset[];
}
export interface AllAssetsResponseProtoMsg {
  typeUrl: '/osmosis.superfluid.AllAssetsResponse';
  value: Uint8Array;
}
export interface AllAssetsResponseSDKType {
  assets: SuperfluidAssetSDKType[];
}
export interface AssetMultiplierRequest {
  denom: string;
}
export interface AssetMultiplierRequestProtoMsg {
  typeUrl: '/osmosis.superfluid.AssetMultiplierRequest';
  value: Uint8Array;
}
export interface AssetMultiplierRequestSDKType {
  denom: string;
}
export interface AssetMultiplierResponse {
  osmoEquivalentMultiplier?: OsmoEquivalentMultiplierRecord;
}
export interface AssetMultiplierResponseProtoMsg {
  typeUrl: '/osmosis.superfluid.AssetMultiplierResponse';
  value: Uint8Array;
}
export interface AssetMultiplierResponseSDKType {
  osmo_equivalent_multiplier?: OsmoEquivalentMultiplierRecordSDKType;
}
export interface SuperfluidIntermediaryAccountInfo {
  denom: string;
  valAddr: string;
  gaugeId: bigint;
  address: string;
}
export interface SuperfluidIntermediaryAccountInfoProtoMsg {
  typeUrl: '/osmosis.superfluid.SuperfluidIntermediaryAccountInfo';
  value: Uint8Array;
}
export interface SuperfluidIntermediaryAccountInfoSDKType {
  denom: string;
  val_addr: string;
  gauge_id: bigint;
  address: string;
}
export interface AllIntermediaryAccountsRequest {
  pagination?: PageRequest;
}
export interface AllIntermediaryAccountsRequestProtoMsg {
  typeUrl: '/osmosis.superfluid.AllIntermediaryAccountsRequest';
  value: Uint8Array;
}
export interface AllIntermediaryAccountsRequestSDKType {
  pagination?: PageRequestSDKType;
}
export interface AllIntermediaryAccountsResponse {
  accounts: SuperfluidIntermediaryAccountInfo[];
  pagination?: PageResponse;
}
export interface AllIntermediaryAccountsResponseProtoMsg {
  typeUrl: '/osmosis.superfluid.AllIntermediaryAccountsResponse';
  value: Uint8Array;
}
export interface AllIntermediaryAccountsResponseSDKType {
  accounts: SuperfluidIntermediaryAccountInfoSDKType[];
  pagination?: PageResponseSDKType;
}
export interface ConnectedIntermediaryAccountRequest {
  lockId: bigint;
}
export interface ConnectedIntermediaryAccountRequestProtoMsg {
  typeUrl: '/osmosis.superfluid.ConnectedIntermediaryAccountRequest';
  value: Uint8Array;
}
export interface ConnectedIntermediaryAccountRequestSDKType {
  lock_id: bigint;
}
export interface ConnectedIntermediaryAccountResponse {
  account?: SuperfluidIntermediaryAccountInfo;
}
export interface ConnectedIntermediaryAccountResponseProtoMsg {
  typeUrl: '/osmosis.superfluid.ConnectedIntermediaryAccountResponse';
  value: Uint8Array;
}
export interface ConnectedIntermediaryAccountResponseSDKType {
  account?: SuperfluidIntermediaryAccountInfoSDKType;
}
export interface QueryTotalDelegationByValidatorForDenomRequest {
  denom: string;
}
export interface QueryTotalDelegationByValidatorForDenomRequestProtoMsg {
  typeUrl: '/osmosis.superfluid.QueryTotalDelegationByValidatorForDenomRequest';
  value: Uint8Array;
}
export interface QueryTotalDelegationByValidatorForDenomRequestSDKType {
  denom: string;
}
export interface QueryTotalDelegationByValidatorForDenomResponse {
  assets: Delegations[];
}
export interface QueryTotalDelegationByValidatorForDenomResponseProtoMsg {
  typeUrl: '/osmosis.superfluid.QueryTotalDelegationByValidatorForDenomResponse';
  value: Uint8Array;
}
export interface QueryTotalDelegationByValidatorForDenomResponseSDKType {
  assets: DelegationsSDKType[];
}
export interface Delegations {
  valAddr: string;
  amountSfsd: string;
  osmoEquivalent: string;
}
export interface DelegationsProtoMsg {
  typeUrl: '/osmosis.superfluid.Delegations';
  value: Uint8Array;
}
export interface DelegationsSDKType {
  val_addr: string;
  amount_sfsd: string;
  osmo_equivalent: string;
}
export interface TotalSuperfluidDelegationsRequest {}
export interface TotalSuperfluidDelegationsRequestProtoMsg {
  typeUrl: '/osmosis.superfluid.TotalSuperfluidDelegationsRequest';
  value: Uint8Array;
}
export interface TotalSuperfluidDelegationsRequestSDKType {}
export interface TotalSuperfluidDelegationsResponse {
  totalDelegations: string;
}
export interface TotalSuperfluidDelegationsResponseProtoMsg {
  typeUrl: '/osmosis.superfluid.TotalSuperfluidDelegationsResponse';
  value: Uint8Array;
}
export interface TotalSuperfluidDelegationsResponseSDKType {
  total_delegations: string;
}
export interface SuperfluidDelegationAmountRequest {
  delegatorAddress: string;
  validatorAddress: string;
  denom: string;
}
export interface SuperfluidDelegationAmountRequestProtoMsg {
  typeUrl: '/osmosis.superfluid.SuperfluidDelegationAmountRequest';
  value: Uint8Array;
}
export interface SuperfluidDelegationAmountRequestSDKType {
  delegator_address: string;
  validator_address: string;
  denom: string;
}
export interface SuperfluidDelegationAmountResponse {
  amount: Coin[];
}
export interface SuperfluidDelegationAmountResponseProtoMsg {
  typeUrl: '/osmosis.superfluid.SuperfluidDelegationAmountResponse';
  value: Uint8Array;
}
export interface SuperfluidDelegationAmountResponseSDKType {
  amount: CoinSDKType[];
}
export interface SuperfluidDelegationsByDelegatorRequest {
  delegatorAddress: string;
}
export interface SuperfluidDelegationsByDelegatorRequestProtoMsg {
  typeUrl: '/osmosis.superfluid.SuperfluidDelegationsByDelegatorRequest';
  value: Uint8Array;
}
export interface SuperfluidDelegationsByDelegatorRequestSDKType {
  delegator_address: string;
}
export interface SuperfluidDelegationsByDelegatorResponse {
  superfluidDelegationRecords: SuperfluidDelegationRecord[];
  totalDelegatedCoins: Coin[];
  totalEquivalentStakedAmount: Coin;
}
export interface SuperfluidDelegationsByDelegatorResponseProtoMsg {
  typeUrl: '/osmosis.superfluid.SuperfluidDelegationsByDelegatorResponse';
  value: Uint8Array;
}
export interface SuperfluidDelegationsByDelegatorResponseSDKType {
  superfluid_delegation_records: SuperfluidDelegationRecordSDKType[];
  total_delegated_coins: CoinSDKType[];
  total_equivalent_staked_amount: CoinSDKType;
}
export interface SuperfluidUndelegationsByDelegatorRequest {
  delegatorAddress: string;
  denom: string;
}
export interface SuperfluidUndelegationsByDelegatorRequestProtoMsg {
  typeUrl: '/osmosis.superfluid.SuperfluidUndelegationsByDelegatorRequest';
  value: Uint8Array;
}
export interface SuperfluidUndelegationsByDelegatorRequestSDKType {
  delegator_address: string;
  denom: string;
}
export interface SuperfluidUndelegationsByDelegatorResponse {
  superfluidDelegationRecords: SuperfluidDelegationRecord[];
  totalUndelegatedCoins: Coin[];
  syntheticLocks: SyntheticLock[];
}
export interface SuperfluidUndelegationsByDelegatorResponseProtoMsg {
  typeUrl: '/osmosis.superfluid.SuperfluidUndelegationsByDelegatorResponse';
  value: Uint8Array;
}
export interface SuperfluidUndelegationsByDelegatorResponseSDKType {
  superfluid_delegation_records: SuperfluidDelegationRecordSDKType[];
  total_undelegated_coins: CoinSDKType[];
  synthetic_locks: SyntheticLockSDKType[];
}
export interface SuperfluidDelegationsByValidatorDenomRequest {
  validatorAddress: string;
  denom: string;
}
export interface SuperfluidDelegationsByValidatorDenomRequestProtoMsg {
  typeUrl: '/osmosis.superfluid.SuperfluidDelegationsByValidatorDenomRequest';
  value: Uint8Array;
}
export interface SuperfluidDelegationsByValidatorDenomRequestSDKType {
  validator_address: string;
  denom: string;
}
export interface SuperfluidDelegationsByValidatorDenomResponse {
  superfluidDelegationRecords: SuperfluidDelegationRecord[];
}
export interface SuperfluidDelegationsByValidatorDenomResponseProtoMsg {
  typeUrl: '/osmosis.superfluid.SuperfluidDelegationsByValidatorDenomResponse';
  value: Uint8Array;
}
export interface SuperfluidDelegationsByValidatorDenomResponseSDKType {
  superfluid_delegation_records: SuperfluidDelegationRecordSDKType[];
}
export interface EstimateSuperfluidDelegatedAmountByValidatorDenomRequest {
  validatorAddress: string;
  denom: string;
}
export interface EstimateSuperfluidDelegatedAmountByValidatorDenomRequestProtoMsg {
  typeUrl: '/osmosis.superfluid.EstimateSuperfluidDelegatedAmountByValidatorDenomRequest';
  value: Uint8Array;
}
export interface EstimateSuperfluidDelegatedAmountByValidatorDenomRequestSDKType {
  validator_address: string;
  denom: string;
}
export interface EstimateSuperfluidDelegatedAmountByValidatorDenomResponse {
  totalDelegatedCoins: Coin[];
}
export interface EstimateSuperfluidDelegatedAmountByValidatorDenomResponseProtoMsg {
  typeUrl: '/osmosis.superfluid.EstimateSuperfluidDelegatedAmountByValidatorDenomResponse';
  value: Uint8Array;
}
export interface EstimateSuperfluidDelegatedAmountByValidatorDenomResponseSDKType {
  total_delegated_coins: CoinSDKType[];
}
export interface QueryTotalDelegationByDelegatorRequest {
  delegatorAddress: string;
}
export interface QueryTotalDelegationByDelegatorRequestProtoMsg {
  typeUrl: '/osmosis.superfluid.QueryTotalDelegationByDelegatorRequest';
  value: Uint8Array;
}
export interface QueryTotalDelegationByDelegatorRequestSDKType {
  delegator_address: string;
}
export interface QueryTotalDelegationByDelegatorResponse {
  superfluidDelegationRecords: SuperfluidDelegationRecord[];
  delegationResponse: DelegationResponse[];
  totalDelegatedCoins: Coin[];
  totalEquivalentStakedAmount: Coin;
}
export interface QueryTotalDelegationByDelegatorResponseProtoMsg {
  typeUrl: '/osmosis.superfluid.QueryTotalDelegationByDelegatorResponse';
  value: Uint8Array;
}
export interface QueryTotalDelegationByDelegatorResponseSDKType {
  superfluid_delegation_records: SuperfluidDelegationRecordSDKType[];
  delegation_response: DelegationResponseSDKType[];
  total_delegated_coins: CoinSDKType[];
  total_equivalent_staked_amount: CoinSDKType;
}
export interface QueryUnpoolWhitelistRequest {}
export interface QueryUnpoolWhitelistRequestProtoMsg {
  typeUrl: '/osmosis.superfluid.QueryUnpoolWhitelistRequest';
  value: Uint8Array;
}
export interface QueryUnpoolWhitelistRequestSDKType {}
export interface QueryUnpoolWhitelistResponse {
  poolIds: bigint[];
}
export interface QueryUnpoolWhitelistResponseProtoMsg {
  typeUrl: '/osmosis.superfluid.QueryUnpoolWhitelistResponse';
  value: Uint8Array;
}
export interface QueryUnpoolWhitelistResponseSDKType {
  pool_ids: bigint[];
}
function createBaseQueryParamsRequest(): QueryParamsRequest {
  return {};
}
export const QueryParamsRequest = {
  typeUrl: '/osmosis.superfluid.QueryParamsRequest',
  encode(
    _: QueryParamsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryParamsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryParamsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): QueryParamsRequest {
    return {};
  },
  toJSON(_: QueryParamsRequest): JsonSafe<QueryParamsRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<QueryParamsRequest>): QueryParamsRequest {
    const message = createBaseQueryParamsRequest();
    return message;
  },
  fromProtoMsg(message: QueryParamsRequestProtoMsg): QueryParamsRequest {
    return QueryParamsRequest.decode(message.value);
  },
  toProto(message: QueryParamsRequest): Uint8Array {
    return QueryParamsRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryParamsRequest): QueryParamsRequestProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.QueryParamsRequest',
      value: QueryParamsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryParamsResponse(): QueryParamsResponse {
  return {
    params: Params.fromPartial({}),
  };
}
export const QueryParamsResponse = {
  typeUrl: '/osmosis.superfluid.QueryParamsResponse',
  encode(
    message: QueryParamsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryParamsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryParamsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.params = Params.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryParamsResponse {
    return {
      params: isSet(object.params) ? Params.fromJSON(object.params) : undefined,
    };
  },
  toJSON(message: QueryParamsResponse): JsonSafe<QueryParamsResponse> {
    const obj: any = {};
    message.params !== undefined &&
      (obj.params = message.params ? Params.toJSON(message.params) : undefined);
    return obj;
  },
  fromPartial(object: Partial<QueryParamsResponse>): QueryParamsResponse {
    const message = createBaseQueryParamsResponse();
    message.params =
      object.params !== undefined && object.params !== null
        ? Params.fromPartial(object.params)
        : undefined;
    return message;
  },
  fromProtoMsg(message: QueryParamsResponseProtoMsg): QueryParamsResponse {
    return QueryParamsResponse.decode(message.value);
  },
  toProto(message: QueryParamsResponse): Uint8Array {
    return QueryParamsResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryParamsResponse): QueryParamsResponseProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.QueryParamsResponse',
      value: QueryParamsResponse.encode(message).finish(),
    };
  },
};
function createBaseAssetTypeRequest(): AssetTypeRequest {
  return {
    denom: '',
  };
}
export const AssetTypeRequest = {
  typeUrl: '/osmosis.superfluid.AssetTypeRequest',
  encode(
    message: AssetTypeRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.denom !== '') {
      writer.uint32(10).string(message.denom);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): AssetTypeRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAssetTypeRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.denom = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AssetTypeRequest {
    return {
      denom: isSet(object.denom) ? String(object.denom) : '',
    };
  },
  toJSON(message: AssetTypeRequest): JsonSafe<AssetTypeRequest> {
    const obj: any = {};
    message.denom !== undefined && (obj.denom = message.denom);
    return obj;
  },
  fromPartial(object: Partial<AssetTypeRequest>): AssetTypeRequest {
    const message = createBaseAssetTypeRequest();
    message.denom = object.denom ?? '';
    return message;
  },
  fromProtoMsg(message: AssetTypeRequestProtoMsg): AssetTypeRequest {
    return AssetTypeRequest.decode(message.value);
  },
  toProto(message: AssetTypeRequest): Uint8Array {
    return AssetTypeRequest.encode(message).finish();
  },
  toProtoMsg(message: AssetTypeRequest): AssetTypeRequestProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.AssetTypeRequest',
      value: AssetTypeRequest.encode(message).finish(),
    };
  },
};
function createBaseAssetTypeResponse(): AssetTypeResponse {
  return {
    assetType: 0,
  };
}
export const AssetTypeResponse = {
  typeUrl: '/osmosis.superfluid.AssetTypeResponse',
  encode(
    message: AssetTypeResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.assetType !== 0) {
      writer.uint32(8).int32(message.assetType);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): AssetTypeResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAssetTypeResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.assetType = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AssetTypeResponse {
    return {
      assetType: isSet(object.assetType)
        ? superfluidAssetTypeFromJSON(object.assetType)
        : -1,
    };
  },
  toJSON(message: AssetTypeResponse): JsonSafe<AssetTypeResponse> {
    const obj: any = {};
    message.assetType !== undefined &&
      (obj.assetType = superfluidAssetTypeToJSON(message.assetType));
    return obj;
  },
  fromPartial(object: Partial<AssetTypeResponse>): AssetTypeResponse {
    const message = createBaseAssetTypeResponse();
    message.assetType = object.assetType ?? 0;
    return message;
  },
  fromProtoMsg(message: AssetTypeResponseProtoMsg): AssetTypeResponse {
    return AssetTypeResponse.decode(message.value);
  },
  toProto(message: AssetTypeResponse): Uint8Array {
    return AssetTypeResponse.encode(message).finish();
  },
  toProtoMsg(message: AssetTypeResponse): AssetTypeResponseProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.AssetTypeResponse',
      value: AssetTypeResponse.encode(message).finish(),
    };
  },
};
function createBaseAllAssetsRequest(): AllAssetsRequest {
  return {};
}
export const AllAssetsRequest = {
  typeUrl: '/osmosis.superfluid.AllAssetsRequest',
  encode(
    _: AllAssetsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): AllAssetsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAllAssetsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): AllAssetsRequest {
    return {};
  },
  toJSON(_: AllAssetsRequest): JsonSafe<AllAssetsRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<AllAssetsRequest>): AllAssetsRequest {
    const message = createBaseAllAssetsRequest();
    return message;
  },
  fromProtoMsg(message: AllAssetsRequestProtoMsg): AllAssetsRequest {
    return AllAssetsRequest.decode(message.value);
  },
  toProto(message: AllAssetsRequest): Uint8Array {
    return AllAssetsRequest.encode(message).finish();
  },
  toProtoMsg(message: AllAssetsRequest): AllAssetsRequestProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.AllAssetsRequest',
      value: AllAssetsRequest.encode(message).finish(),
    };
  },
};
function createBaseAllAssetsResponse(): AllAssetsResponse {
  return {
    assets: [],
  };
}
export const AllAssetsResponse = {
  typeUrl: '/osmosis.superfluid.AllAssetsResponse',
  encode(
    message: AllAssetsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.assets) {
      SuperfluidAsset.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): AllAssetsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAllAssetsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.assets.push(SuperfluidAsset.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AllAssetsResponse {
    return {
      assets: Array.isArray(object?.assets)
        ? object.assets.map((e: any) => SuperfluidAsset.fromJSON(e))
        : [],
    };
  },
  toJSON(message: AllAssetsResponse): JsonSafe<AllAssetsResponse> {
    const obj: any = {};
    if (message.assets) {
      obj.assets = message.assets.map(e =>
        e ? SuperfluidAsset.toJSON(e) : undefined,
      );
    } else {
      obj.assets = [];
    }
    return obj;
  },
  fromPartial(object: Partial<AllAssetsResponse>): AllAssetsResponse {
    const message = createBaseAllAssetsResponse();
    message.assets =
      object.assets?.map(e => SuperfluidAsset.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: AllAssetsResponseProtoMsg): AllAssetsResponse {
    return AllAssetsResponse.decode(message.value);
  },
  toProto(message: AllAssetsResponse): Uint8Array {
    return AllAssetsResponse.encode(message).finish();
  },
  toProtoMsg(message: AllAssetsResponse): AllAssetsResponseProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.AllAssetsResponse',
      value: AllAssetsResponse.encode(message).finish(),
    };
  },
};
function createBaseAssetMultiplierRequest(): AssetMultiplierRequest {
  return {
    denom: '',
  };
}
export const AssetMultiplierRequest = {
  typeUrl: '/osmosis.superfluid.AssetMultiplierRequest',
  encode(
    message: AssetMultiplierRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.denom !== '') {
      writer.uint32(10).string(message.denom);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AssetMultiplierRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAssetMultiplierRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.denom = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AssetMultiplierRequest {
    return {
      denom: isSet(object.denom) ? String(object.denom) : '',
    };
  },
  toJSON(message: AssetMultiplierRequest): JsonSafe<AssetMultiplierRequest> {
    const obj: any = {};
    message.denom !== undefined && (obj.denom = message.denom);
    return obj;
  },
  fromPartial(object: Partial<AssetMultiplierRequest>): AssetMultiplierRequest {
    const message = createBaseAssetMultiplierRequest();
    message.denom = object.denom ?? '';
    return message;
  },
  fromProtoMsg(
    message: AssetMultiplierRequestProtoMsg,
  ): AssetMultiplierRequest {
    return AssetMultiplierRequest.decode(message.value);
  },
  toProto(message: AssetMultiplierRequest): Uint8Array {
    return AssetMultiplierRequest.encode(message).finish();
  },
  toProtoMsg(message: AssetMultiplierRequest): AssetMultiplierRequestProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.AssetMultiplierRequest',
      value: AssetMultiplierRequest.encode(message).finish(),
    };
  },
};
function createBaseAssetMultiplierResponse(): AssetMultiplierResponse {
  return {
    osmoEquivalentMultiplier: undefined,
  };
}
export const AssetMultiplierResponse = {
  typeUrl: '/osmosis.superfluid.AssetMultiplierResponse',
  encode(
    message: AssetMultiplierResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.osmoEquivalentMultiplier !== undefined) {
      OsmoEquivalentMultiplierRecord.encode(
        message.osmoEquivalentMultiplier,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AssetMultiplierResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAssetMultiplierResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.osmoEquivalentMultiplier =
            OsmoEquivalentMultiplierRecord.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AssetMultiplierResponse {
    return {
      osmoEquivalentMultiplier: isSet(object.osmoEquivalentMultiplier)
        ? OsmoEquivalentMultiplierRecord.fromJSON(
            object.osmoEquivalentMultiplier,
          )
        : undefined,
    };
  },
  toJSON(message: AssetMultiplierResponse): JsonSafe<AssetMultiplierResponse> {
    const obj: any = {};
    message.osmoEquivalentMultiplier !== undefined &&
      (obj.osmoEquivalentMultiplier = message.osmoEquivalentMultiplier
        ? OsmoEquivalentMultiplierRecord.toJSON(
            message.osmoEquivalentMultiplier,
          )
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<AssetMultiplierResponse>,
  ): AssetMultiplierResponse {
    const message = createBaseAssetMultiplierResponse();
    message.osmoEquivalentMultiplier =
      object.osmoEquivalentMultiplier !== undefined &&
      object.osmoEquivalentMultiplier !== null
        ? OsmoEquivalentMultiplierRecord.fromPartial(
            object.osmoEquivalentMultiplier,
          )
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: AssetMultiplierResponseProtoMsg,
  ): AssetMultiplierResponse {
    return AssetMultiplierResponse.decode(message.value);
  },
  toProto(message: AssetMultiplierResponse): Uint8Array {
    return AssetMultiplierResponse.encode(message).finish();
  },
  toProtoMsg(
    message: AssetMultiplierResponse,
  ): AssetMultiplierResponseProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.AssetMultiplierResponse',
      value: AssetMultiplierResponse.encode(message).finish(),
    };
  },
};
function createBaseSuperfluidIntermediaryAccountInfo(): SuperfluidIntermediaryAccountInfo {
  return {
    denom: '',
    valAddr: '',
    gaugeId: BigInt(0),
    address: '',
  };
}
export const SuperfluidIntermediaryAccountInfo = {
  typeUrl: '/osmosis.superfluid.SuperfluidIntermediaryAccountInfo',
  encode(
    message: SuperfluidIntermediaryAccountInfo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.denom !== '') {
      writer.uint32(10).string(message.denom);
    }
    if (message.valAddr !== '') {
      writer.uint32(18).string(message.valAddr);
    }
    if (message.gaugeId !== BigInt(0)) {
      writer.uint32(24).uint64(message.gaugeId);
    }
    if (message.address !== '') {
      writer.uint32(34).string(message.address);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SuperfluidIntermediaryAccountInfo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSuperfluidIntermediaryAccountInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.denom = reader.string();
          break;
        case 2:
          message.valAddr = reader.string();
          break;
        case 3:
          message.gaugeId = reader.uint64();
          break;
        case 4:
          message.address = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SuperfluidIntermediaryAccountInfo {
    return {
      denom: isSet(object.denom) ? String(object.denom) : '',
      valAddr: isSet(object.valAddr) ? String(object.valAddr) : '',
      gaugeId: isSet(object.gaugeId)
        ? BigInt(object.gaugeId.toString())
        : BigInt(0),
      address: isSet(object.address) ? String(object.address) : '',
    };
  },
  toJSON(
    message: SuperfluidIntermediaryAccountInfo,
  ): JsonSafe<SuperfluidIntermediaryAccountInfo> {
    const obj: any = {};
    message.denom !== undefined && (obj.denom = message.denom);
    message.valAddr !== undefined && (obj.valAddr = message.valAddr);
    message.gaugeId !== undefined &&
      (obj.gaugeId = (message.gaugeId || BigInt(0)).toString());
    message.address !== undefined && (obj.address = message.address);
    return obj;
  },
  fromPartial(
    object: Partial<SuperfluidIntermediaryAccountInfo>,
  ): SuperfluidIntermediaryAccountInfo {
    const message = createBaseSuperfluidIntermediaryAccountInfo();
    message.denom = object.denom ?? '';
    message.valAddr = object.valAddr ?? '';
    message.gaugeId =
      object.gaugeId !== undefined && object.gaugeId !== null
        ? BigInt(object.gaugeId.toString())
        : BigInt(0);
    message.address = object.address ?? '';
    return message;
  },
  fromProtoMsg(
    message: SuperfluidIntermediaryAccountInfoProtoMsg,
  ): SuperfluidIntermediaryAccountInfo {
    return SuperfluidIntermediaryAccountInfo.decode(message.value);
  },
  toProto(message: SuperfluidIntermediaryAccountInfo): Uint8Array {
    return SuperfluidIntermediaryAccountInfo.encode(message).finish();
  },
  toProtoMsg(
    message: SuperfluidIntermediaryAccountInfo,
  ): SuperfluidIntermediaryAccountInfoProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.SuperfluidIntermediaryAccountInfo',
      value: SuperfluidIntermediaryAccountInfo.encode(message).finish(),
    };
  },
};
function createBaseAllIntermediaryAccountsRequest(): AllIntermediaryAccountsRequest {
  return {
    pagination: undefined,
  };
}
export const AllIntermediaryAccountsRequest = {
  typeUrl: '/osmosis.superfluid.AllIntermediaryAccountsRequest',
  encode(
    message: AllIntermediaryAccountsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AllIntermediaryAccountsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAllIntermediaryAccountsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AllIntermediaryAccountsRequest {
    return {
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: AllIntermediaryAccountsRequest,
  ): JsonSafe<AllIntermediaryAccountsRequest> {
    const obj: any = {};
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<AllIntermediaryAccountsRequest>,
  ): AllIntermediaryAccountsRequest {
    const message = createBaseAllIntermediaryAccountsRequest();
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: AllIntermediaryAccountsRequestProtoMsg,
  ): AllIntermediaryAccountsRequest {
    return AllIntermediaryAccountsRequest.decode(message.value);
  },
  toProto(message: AllIntermediaryAccountsRequest): Uint8Array {
    return AllIntermediaryAccountsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: AllIntermediaryAccountsRequest,
  ): AllIntermediaryAccountsRequestProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.AllIntermediaryAccountsRequest',
      value: AllIntermediaryAccountsRequest.encode(message).finish(),
    };
  },
};
function createBaseAllIntermediaryAccountsResponse(): AllIntermediaryAccountsResponse {
  return {
    accounts: [],
    pagination: undefined,
  };
}
export const AllIntermediaryAccountsResponse = {
  typeUrl: '/osmosis.superfluid.AllIntermediaryAccountsResponse',
  encode(
    message: AllIntermediaryAccountsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.accounts) {
      SuperfluidIntermediaryAccountInfo.encode(
        v!,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): AllIntermediaryAccountsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAllIntermediaryAccountsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.accounts.push(
            SuperfluidIntermediaryAccountInfo.decode(reader, reader.uint32()),
          );
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): AllIntermediaryAccountsResponse {
    return {
      accounts: Array.isArray(object?.accounts)
        ? object.accounts.map((e: any) =>
            SuperfluidIntermediaryAccountInfo.fromJSON(e),
          )
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: AllIntermediaryAccountsResponse,
  ): JsonSafe<AllIntermediaryAccountsResponse> {
    const obj: any = {};
    if (message.accounts) {
      obj.accounts = message.accounts.map(e =>
        e ? SuperfluidIntermediaryAccountInfo.toJSON(e) : undefined,
      );
    } else {
      obj.accounts = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<AllIntermediaryAccountsResponse>,
  ): AllIntermediaryAccountsResponse {
    const message = createBaseAllIntermediaryAccountsResponse();
    message.accounts =
      object.accounts?.map(e =>
        SuperfluidIntermediaryAccountInfo.fromPartial(e),
      ) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: AllIntermediaryAccountsResponseProtoMsg,
  ): AllIntermediaryAccountsResponse {
    return AllIntermediaryAccountsResponse.decode(message.value);
  },
  toProto(message: AllIntermediaryAccountsResponse): Uint8Array {
    return AllIntermediaryAccountsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: AllIntermediaryAccountsResponse,
  ): AllIntermediaryAccountsResponseProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.AllIntermediaryAccountsResponse',
      value: AllIntermediaryAccountsResponse.encode(message).finish(),
    };
  },
};
function createBaseConnectedIntermediaryAccountRequest(): ConnectedIntermediaryAccountRequest {
  return {
    lockId: BigInt(0),
  };
}
export const ConnectedIntermediaryAccountRequest = {
  typeUrl: '/osmosis.superfluid.ConnectedIntermediaryAccountRequest',
  encode(
    message: ConnectedIntermediaryAccountRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.lockId !== BigInt(0)) {
      writer.uint32(8).uint64(message.lockId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ConnectedIntermediaryAccountRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseConnectedIntermediaryAccountRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.lockId = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ConnectedIntermediaryAccountRequest {
    return {
      lockId: isSet(object.lockId)
        ? BigInt(object.lockId.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: ConnectedIntermediaryAccountRequest,
  ): JsonSafe<ConnectedIntermediaryAccountRequest> {
    const obj: any = {};
    message.lockId !== undefined &&
      (obj.lockId = (message.lockId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<ConnectedIntermediaryAccountRequest>,
  ): ConnectedIntermediaryAccountRequest {
    const message = createBaseConnectedIntermediaryAccountRequest();
    message.lockId =
      object.lockId !== undefined && object.lockId !== null
        ? BigInt(object.lockId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: ConnectedIntermediaryAccountRequestProtoMsg,
  ): ConnectedIntermediaryAccountRequest {
    return ConnectedIntermediaryAccountRequest.decode(message.value);
  },
  toProto(message: ConnectedIntermediaryAccountRequest): Uint8Array {
    return ConnectedIntermediaryAccountRequest.encode(message).finish();
  },
  toProtoMsg(
    message: ConnectedIntermediaryAccountRequest,
  ): ConnectedIntermediaryAccountRequestProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.ConnectedIntermediaryAccountRequest',
      value: ConnectedIntermediaryAccountRequest.encode(message).finish(),
    };
  },
};
function createBaseConnectedIntermediaryAccountResponse(): ConnectedIntermediaryAccountResponse {
  return {
    account: undefined,
  };
}
export const ConnectedIntermediaryAccountResponse = {
  typeUrl: '/osmosis.superfluid.ConnectedIntermediaryAccountResponse',
  encode(
    message: ConnectedIntermediaryAccountResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.account !== undefined) {
      SuperfluidIntermediaryAccountInfo.encode(
        message.account,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ConnectedIntermediaryAccountResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseConnectedIntermediaryAccountResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.account = SuperfluidIntermediaryAccountInfo.decode(
            reader,
            reader.uint32(),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ConnectedIntermediaryAccountResponse {
    return {
      account: isSet(object.account)
        ? SuperfluidIntermediaryAccountInfo.fromJSON(object.account)
        : undefined,
    };
  },
  toJSON(
    message: ConnectedIntermediaryAccountResponse,
  ): JsonSafe<ConnectedIntermediaryAccountResponse> {
    const obj: any = {};
    message.account !== undefined &&
      (obj.account = message.account
        ? SuperfluidIntermediaryAccountInfo.toJSON(message.account)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<ConnectedIntermediaryAccountResponse>,
  ): ConnectedIntermediaryAccountResponse {
    const message = createBaseConnectedIntermediaryAccountResponse();
    message.account =
      object.account !== undefined && object.account !== null
        ? SuperfluidIntermediaryAccountInfo.fromPartial(object.account)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: ConnectedIntermediaryAccountResponseProtoMsg,
  ): ConnectedIntermediaryAccountResponse {
    return ConnectedIntermediaryAccountResponse.decode(message.value);
  },
  toProto(message: ConnectedIntermediaryAccountResponse): Uint8Array {
    return ConnectedIntermediaryAccountResponse.encode(message).finish();
  },
  toProtoMsg(
    message: ConnectedIntermediaryAccountResponse,
  ): ConnectedIntermediaryAccountResponseProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.ConnectedIntermediaryAccountResponse',
      value: ConnectedIntermediaryAccountResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryTotalDelegationByValidatorForDenomRequest(): QueryTotalDelegationByValidatorForDenomRequest {
  return {
    denom: '',
  };
}
export const QueryTotalDelegationByValidatorForDenomRequest = {
  typeUrl: '/osmosis.superfluid.QueryTotalDelegationByValidatorForDenomRequest',
  encode(
    message: QueryTotalDelegationByValidatorForDenomRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.denom !== '') {
      writer.uint32(10).string(message.denom);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryTotalDelegationByValidatorForDenomRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryTotalDelegationByValidatorForDenomRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.denom = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryTotalDelegationByValidatorForDenomRequest {
    return {
      denom: isSet(object.denom) ? String(object.denom) : '',
    };
  },
  toJSON(
    message: QueryTotalDelegationByValidatorForDenomRequest,
  ): JsonSafe<QueryTotalDelegationByValidatorForDenomRequest> {
    const obj: any = {};
    message.denom !== undefined && (obj.denom = message.denom);
    return obj;
  },
  fromPartial(
    object: Partial<QueryTotalDelegationByValidatorForDenomRequest>,
  ): QueryTotalDelegationByValidatorForDenomRequest {
    const message = createBaseQueryTotalDelegationByValidatorForDenomRequest();
    message.denom = object.denom ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryTotalDelegationByValidatorForDenomRequestProtoMsg,
  ): QueryTotalDelegationByValidatorForDenomRequest {
    return QueryTotalDelegationByValidatorForDenomRequest.decode(message.value);
  },
  toProto(message: QueryTotalDelegationByValidatorForDenomRequest): Uint8Array {
    return QueryTotalDelegationByValidatorForDenomRequest.encode(
      message,
    ).finish();
  },
  toProtoMsg(
    message: QueryTotalDelegationByValidatorForDenomRequest,
  ): QueryTotalDelegationByValidatorForDenomRequestProtoMsg {
    return {
      typeUrl:
        '/osmosis.superfluid.QueryTotalDelegationByValidatorForDenomRequest',
      value:
        QueryTotalDelegationByValidatorForDenomRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryTotalDelegationByValidatorForDenomResponse(): QueryTotalDelegationByValidatorForDenomResponse {
  return {
    assets: [],
  };
}
export const QueryTotalDelegationByValidatorForDenomResponse = {
  typeUrl:
    '/osmosis.superfluid.QueryTotalDelegationByValidatorForDenomResponse',
  encode(
    message: QueryTotalDelegationByValidatorForDenomResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.assets) {
      Delegations.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryTotalDelegationByValidatorForDenomResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryTotalDelegationByValidatorForDenomResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.assets.push(Delegations.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryTotalDelegationByValidatorForDenomResponse {
    return {
      assets: Array.isArray(object?.assets)
        ? object.assets.map((e: any) => Delegations.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: QueryTotalDelegationByValidatorForDenomResponse,
  ): JsonSafe<QueryTotalDelegationByValidatorForDenomResponse> {
    const obj: any = {};
    if (message.assets) {
      obj.assets = message.assets.map(e =>
        e ? Delegations.toJSON(e) : undefined,
      );
    } else {
      obj.assets = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryTotalDelegationByValidatorForDenomResponse>,
  ): QueryTotalDelegationByValidatorForDenomResponse {
    const message = createBaseQueryTotalDelegationByValidatorForDenomResponse();
    message.assets = object.assets?.map(e => Delegations.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryTotalDelegationByValidatorForDenomResponseProtoMsg,
  ): QueryTotalDelegationByValidatorForDenomResponse {
    return QueryTotalDelegationByValidatorForDenomResponse.decode(
      message.value,
    );
  },
  toProto(
    message: QueryTotalDelegationByValidatorForDenomResponse,
  ): Uint8Array {
    return QueryTotalDelegationByValidatorForDenomResponse.encode(
      message,
    ).finish();
  },
  toProtoMsg(
    message: QueryTotalDelegationByValidatorForDenomResponse,
  ): QueryTotalDelegationByValidatorForDenomResponseProtoMsg {
    return {
      typeUrl:
        '/osmosis.superfluid.QueryTotalDelegationByValidatorForDenomResponse',
      value:
        QueryTotalDelegationByValidatorForDenomResponse.encode(
          message,
        ).finish(),
    };
  },
};
function createBaseDelegations(): Delegations {
  return {
    valAddr: '',
    amountSfsd: '',
    osmoEquivalent: '',
  };
}
export const Delegations = {
  typeUrl: '/osmosis.superfluid.Delegations',
  encode(
    message: Delegations,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.valAddr !== '') {
      writer.uint32(10).string(message.valAddr);
    }
    if (message.amountSfsd !== '') {
      writer.uint32(18).string(message.amountSfsd);
    }
    if (message.osmoEquivalent !== '') {
      writer.uint32(26).string(message.osmoEquivalent);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Delegations {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDelegations();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.valAddr = reader.string();
          break;
        case 2:
          message.amountSfsd = reader.string();
          break;
        case 3:
          message.osmoEquivalent = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Delegations {
    return {
      valAddr: isSet(object.valAddr) ? String(object.valAddr) : '',
      amountSfsd: isSet(object.amountSfsd) ? String(object.amountSfsd) : '',
      osmoEquivalent: isSet(object.osmoEquivalent)
        ? String(object.osmoEquivalent)
        : '',
    };
  },
  toJSON(message: Delegations): JsonSafe<Delegations> {
    const obj: any = {};
    message.valAddr !== undefined && (obj.valAddr = message.valAddr);
    message.amountSfsd !== undefined && (obj.amountSfsd = message.amountSfsd);
    message.osmoEquivalent !== undefined &&
      (obj.osmoEquivalent = message.osmoEquivalent);
    return obj;
  },
  fromPartial(object: Partial<Delegations>): Delegations {
    const message = createBaseDelegations();
    message.valAddr = object.valAddr ?? '';
    message.amountSfsd = object.amountSfsd ?? '';
    message.osmoEquivalent = object.osmoEquivalent ?? '';
    return message;
  },
  fromProtoMsg(message: DelegationsProtoMsg): Delegations {
    return Delegations.decode(message.value);
  },
  toProto(message: Delegations): Uint8Array {
    return Delegations.encode(message).finish();
  },
  toProtoMsg(message: Delegations): DelegationsProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.Delegations',
      value: Delegations.encode(message).finish(),
    };
  },
};
function createBaseTotalSuperfluidDelegationsRequest(): TotalSuperfluidDelegationsRequest {
  return {};
}
export const TotalSuperfluidDelegationsRequest = {
  typeUrl: '/osmosis.superfluid.TotalSuperfluidDelegationsRequest',
  encode(
    _: TotalSuperfluidDelegationsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): TotalSuperfluidDelegationsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTotalSuperfluidDelegationsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): TotalSuperfluidDelegationsRequest {
    return {};
  },
  toJSON(
    _: TotalSuperfluidDelegationsRequest,
  ): JsonSafe<TotalSuperfluidDelegationsRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<TotalSuperfluidDelegationsRequest>,
  ): TotalSuperfluidDelegationsRequest {
    const message = createBaseTotalSuperfluidDelegationsRequest();
    return message;
  },
  fromProtoMsg(
    message: TotalSuperfluidDelegationsRequestProtoMsg,
  ): TotalSuperfluidDelegationsRequest {
    return TotalSuperfluidDelegationsRequest.decode(message.value);
  },
  toProto(message: TotalSuperfluidDelegationsRequest): Uint8Array {
    return TotalSuperfluidDelegationsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: TotalSuperfluidDelegationsRequest,
  ): TotalSuperfluidDelegationsRequestProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.TotalSuperfluidDelegationsRequest',
      value: TotalSuperfluidDelegationsRequest.encode(message).finish(),
    };
  },
};
function createBaseTotalSuperfluidDelegationsResponse(): TotalSuperfluidDelegationsResponse {
  return {
    totalDelegations: '',
  };
}
export const TotalSuperfluidDelegationsResponse = {
  typeUrl: '/osmosis.superfluid.TotalSuperfluidDelegationsResponse',
  encode(
    message: TotalSuperfluidDelegationsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.totalDelegations !== '') {
      writer.uint32(10).string(message.totalDelegations);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): TotalSuperfluidDelegationsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTotalSuperfluidDelegationsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.totalDelegations = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): TotalSuperfluidDelegationsResponse {
    return {
      totalDelegations: isSet(object.totalDelegations)
        ? String(object.totalDelegations)
        : '',
    };
  },
  toJSON(
    message: TotalSuperfluidDelegationsResponse,
  ): JsonSafe<TotalSuperfluidDelegationsResponse> {
    const obj: any = {};
    message.totalDelegations !== undefined &&
      (obj.totalDelegations = message.totalDelegations);
    return obj;
  },
  fromPartial(
    object: Partial<TotalSuperfluidDelegationsResponse>,
  ): TotalSuperfluidDelegationsResponse {
    const message = createBaseTotalSuperfluidDelegationsResponse();
    message.totalDelegations = object.totalDelegations ?? '';
    return message;
  },
  fromProtoMsg(
    message: TotalSuperfluidDelegationsResponseProtoMsg,
  ): TotalSuperfluidDelegationsResponse {
    return TotalSuperfluidDelegationsResponse.decode(message.value);
  },
  toProto(message: TotalSuperfluidDelegationsResponse): Uint8Array {
    return TotalSuperfluidDelegationsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: TotalSuperfluidDelegationsResponse,
  ): TotalSuperfluidDelegationsResponseProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.TotalSuperfluidDelegationsResponse',
      value: TotalSuperfluidDelegationsResponse.encode(message).finish(),
    };
  },
};
function createBaseSuperfluidDelegationAmountRequest(): SuperfluidDelegationAmountRequest {
  return {
    delegatorAddress: '',
    validatorAddress: '',
    denom: '',
  };
}
export const SuperfluidDelegationAmountRequest = {
  typeUrl: '/osmosis.superfluid.SuperfluidDelegationAmountRequest',
  encode(
    message: SuperfluidDelegationAmountRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.delegatorAddress !== '') {
      writer.uint32(10).string(message.delegatorAddress);
    }
    if (message.validatorAddress !== '') {
      writer.uint32(18).string(message.validatorAddress);
    }
    if (message.denom !== '') {
      writer.uint32(26).string(message.denom);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SuperfluidDelegationAmountRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSuperfluidDelegationAmountRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.delegatorAddress = reader.string();
          break;
        case 2:
          message.validatorAddress = reader.string();
          break;
        case 3:
          message.denom = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SuperfluidDelegationAmountRequest {
    return {
      delegatorAddress: isSet(object.delegatorAddress)
        ? String(object.delegatorAddress)
        : '',
      validatorAddress: isSet(object.validatorAddress)
        ? String(object.validatorAddress)
        : '',
      denom: isSet(object.denom) ? String(object.denom) : '',
    };
  },
  toJSON(
    message: SuperfluidDelegationAmountRequest,
  ): JsonSafe<SuperfluidDelegationAmountRequest> {
    const obj: any = {};
    message.delegatorAddress !== undefined &&
      (obj.delegatorAddress = message.delegatorAddress);
    message.validatorAddress !== undefined &&
      (obj.validatorAddress = message.validatorAddress);
    message.denom !== undefined && (obj.denom = message.denom);
    return obj;
  },
  fromPartial(
    object: Partial<SuperfluidDelegationAmountRequest>,
  ): SuperfluidDelegationAmountRequest {
    const message = createBaseSuperfluidDelegationAmountRequest();
    message.delegatorAddress = object.delegatorAddress ?? '';
    message.validatorAddress = object.validatorAddress ?? '';
    message.denom = object.denom ?? '';
    return message;
  },
  fromProtoMsg(
    message: SuperfluidDelegationAmountRequestProtoMsg,
  ): SuperfluidDelegationAmountRequest {
    return SuperfluidDelegationAmountRequest.decode(message.value);
  },
  toProto(message: SuperfluidDelegationAmountRequest): Uint8Array {
    return SuperfluidDelegationAmountRequest.encode(message).finish();
  },
  toProtoMsg(
    message: SuperfluidDelegationAmountRequest,
  ): SuperfluidDelegationAmountRequestProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.SuperfluidDelegationAmountRequest',
      value: SuperfluidDelegationAmountRequest.encode(message).finish(),
    };
  },
};
function createBaseSuperfluidDelegationAmountResponse(): SuperfluidDelegationAmountResponse {
  return {
    amount: [],
  };
}
export const SuperfluidDelegationAmountResponse = {
  typeUrl: '/osmosis.superfluid.SuperfluidDelegationAmountResponse',
  encode(
    message: SuperfluidDelegationAmountResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.amount) {
      Coin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SuperfluidDelegationAmountResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSuperfluidDelegationAmountResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.amount.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SuperfluidDelegationAmountResponse {
    return {
      amount: Array.isArray(object?.amount)
        ? object.amount.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: SuperfluidDelegationAmountResponse,
  ): JsonSafe<SuperfluidDelegationAmountResponse> {
    const obj: any = {};
    if (message.amount) {
      obj.amount = message.amount.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.amount = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<SuperfluidDelegationAmountResponse>,
  ): SuperfluidDelegationAmountResponse {
    const message = createBaseSuperfluidDelegationAmountResponse();
    message.amount = object.amount?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: SuperfluidDelegationAmountResponseProtoMsg,
  ): SuperfluidDelegationAmountResponse {
    return SuperfluidDelegationAmountResponse.decode(message.value);
  },
  toProto(message: SuperfluidDelegationAmountResponse): Uint8Array {
    return SuperfluidDelegationAmountResponse.encode(message).finish();
  },
  toProtoMsg(
    message: SuperfluidDelegationAmountResponse,
  ): SuperfluidDelegationAmountResponseProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.SuperfluidDelegationAmountResponse',
      value: SuperfluidDelegationAmountResponse.encode(message).finish(),
    };
  },
};
function createBaseSuperfluidDelegationsByDelegatorRequest(): SuperfluidDelegationsByDelegatorRequest {
  return {
    delegatorAddress: '',
  };
}
export const SuperfluidDelegationsByDelegatorRequest = {
  typeUrl: '/osmosis.superfluid.SuperfluidDelegationsByDelegatorRequest',
  encode(
    message: SuperfluidDelegationsByDelegatorRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.delegatorAddress !== '') {
      writer.uint32(10).string(message.delegatorAddress);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SuperfluidDelegationsByDelegatorRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSuperfluidDelegationsByDelegatorRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.delegatorAddress = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SuperfluidDelegationsByDelegatorRequest {
    return {
      delegatorAddress: isSet(object.delegatorAddress)
        ? String(object.delegatorAddress)
        : '',
    };
  },
  toJSON(
    message: SuperfluidDelegationsByDelegatorRequest,
  ): JsonSafe<SuperfluidDelegationsByDelegatorRequest> {
    const obj: any = {};
    message.delegatorAddress !== undefined &&
      (obj.delegatorAddress = message.delegatorAddress);
    return obj;
  },
  fromPartial(
    object: Partial<SuperfluidDelegationsByDelegatorRequest>,
  ): SuperfluidDelegationsByDelegatorRequest {
    const message = createBaseSuperfluidDelegationsByDelegatorRequest();
    message.delegatorAddress = object.delegatorAddress ?? '';
    return message;
  },
  fromProtoMsg(
    message: SuperfluidDelegationsByDelegatorRequestProtoMsg,
  ): SuperfluidDelegationsByDelegatorRequest {
    return SuperfluidDelegationsByDelegatorRequest.decode(message.value);
  },
  toProto(message: SuperfluidDelegationsByDelegatorRequest): Uint8Array {
    return SuperfluidDelegationsByDelegatorRequest.encode(message).finish();
  },
  toProtoMsg(
    message: SuperfluidDelegationsByDelegatorRequest,
  ): SuperfluidDelegationsByDelegatorRequestProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.SuperfluidDelegationsByDelegatorRequest',
      value: SuperfluidDelegationsByDelegatorRequest.encode(message).finish(),
    };
  },
};
function createBaseSuperfluidDelegationsByDelegatorResponse(): SuperfluidDelegationsByDelegatorResponse {
  return {
    superfluidDelegationRecords: [],
    totalDelegatedCoins: [],
    totalEquivalentStakedAmount: Coin.fromPartial({}),
  };
}
export const SuperfluidDelegationsByDelegatorResponse = {
  typeUrl: '/osmosis.superfluid.SuperfluidDelegationsByDelegatorResponse',
  encode(
    message: SuperfluidDelegationsByDelegatorResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.superfluidDelegationRecords) {
      SuperfluidDelegationRecord.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.totalDelegatedCoins) {
      Coin.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.totalEquivalentStakedAmount !== undefined) {
      Coin.encode(
        message.totalEquivalentStakedAmount,
        writer.uint32(26).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SuperfluidDelegationsByDelegatorResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSuperfluidDelegationsByDelegatorResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.superfluidDelegationRecords.push(
            SuperfluidDelegationRecord.decode(reader, reader.uint32()),
          );
          break;
        case 2:
          message.totalDelegatedCoins.push(
            Coin.decode(reader, reader.uint32()),
          );
          break;
        case 3:
          message.totalEquivalentStakedAmount = Coin.decode(
            reader,
            reader.uint32(),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SuperfluidDelegationsByDelegatorResponse {
    return {
      superfluidDelegationRecords: Array.isArray(
        object?.superfluidDelegationRecords,
      )
        ? object.superfluidDelegationRecords.map((e: any) =>
            SuperfluidDelegationRecord.fromJSON(e),
          )
        : [],
      totalDelegatedCoins: Array.isArray(object?.totalDelegatedCoins)
        ? object.totalDelegatedCoins.map((e: any) => Coin.fromJSON(e))
        : [],
      totalEquivalentStakedAmount: isSet(object.totalEquivalentStakedAmount)
        ? Coin.fromJSON(object.totalEquivalentStakedAmount)
        : undefined,
    };
  },
  toJSON(
    message: SuperfluidDelegationsByDelegatorResponse,
  ): JsonSafe<SuperfluidDelegationsByDelegatorResponse> {
    const obj: any = {};
    if (message.superfluidDelegationRecords) {
      obj.superfluidDelegationRecords = message.superfluidDelegationRecords.map(
        e => (e ? SuperfluidDelegationRecord.toJSON(e) : undefined),
      );
    } else {
      obj.superfluidDelegationRecords = [];
    }
    if (message.totalDelegatedCoins) {
      obj.totalDelegatedCoins = message.totalDelegatedCoins.map(e =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.totalDelegatedCoins = [];
    }
    message.totalEquivalentStakedAmount !== undefined &&
      (obj.totalEquivalentStakedAmount = message.totalEquivalentStakedAmount
        ? Coin.toJSON(message.totalEquivalentStakedAmount)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<SuperfluidDelegationsByDelegatorResponse>,
  ): SuperfluidDelegationsByDelegatorResponse {
    const message = createBaseSuperfluidDelegationsByDelegatorResponse();
    message.superfluidDelegationRecords =
      object.superfluidDelegationRecords?.map(e =>
        SuperfluidDelegationRecord.fromPartial(e),
      ) || [];
    message.totalDelegatedCoins =
      object.totalDelegatedCoins?.map(e => Coin.fromPartial(e)) || [];
    message.totalEquivalentStakedAmount =
      object.totalEquivalentStakedAmount !== undefined &&
      object.totalEquivalentStakedAmount !== null
        ? Coin.fromPartial(object.totalEquivalentStakedAmount)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: SuperfluidDelegationsByDelegatorResponseProtoMsg,
  ): SuperfluidDelegationsByDelegatorResponse {
    return SuperfluidDelegationsByDelegatorResponse.decode(message.value);
  },
  toProto(message: SuperfluidDelegationsByDelegatorResponse): Uint8Array {
    return SuperfluidDelegationsByDelegatorResponse.encode(message).finish();
  },
  toProtoMsg(
    message: SuperfluidDelegationsByDelegatorResponse,
  ): SuperfluidDelegationsByDelegatorResponseProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.SuperfluidDelegationsByDelegatorResponse',
      value: SuperfluidDelegationsByDelegatorResponse.encode(message).finish(),
    };
  },
};
function createBaseSuperfluidUndelegationsByDelegatorRequest(): SuperfluidUndelegationsByDelegatorRequest {
  return {
    delegatorAddress: '',
    denom: '',
  };
}
export const SuperfluidUndelegationsByDelegatorRequest = {
  typeUrl: '/osmosis.superfluid.SuperfluidUndelegationsByDelegatorRequest',
  encode(
    message: SuperfluidUndelegationsByDelegatorRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.delegatorAddress !== '') {
      writer.uint32(10).string(message.delegatorAddress);
    }
    if (message.denom !== '') {
      writer.uint32(18).string(message.denom);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SuperfluidUndelegationsByDelegatorRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSuperfluidUndelegationsByDelegatorRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.delegatorAddress = reader.string();
          break;
        case 2:
          message.denom = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SuperfluidUndelegationsByDelegatorRequest {
    return {
      delegatorAddress: isSet(object.delegatorAddress)
        ? String(object.delegatorAddress)
        : '',
      denom: isSet(object.denom) ? String(object.denom) : '',
    };
  },
  toJSON(
    message: SuperfluidUndelegationsByDelegatorRequest,
  ): JsonSafe<SuperfluidUndelegationsByDelegatorRequest> {
    const obj: any = {};
    message.delegatorAddress !== undefined &&
      (obj.delegatorAddress = message.delegatorAddress);
    message.denom !== undefined && (obj.denom = message.denom);
    return obj;
  },
  fromPartial(
    object: Partial<SuperfluidUndelegationsByDelegatorRequest>,
  ): SuperfluidUndelegationsByDelegatorRequest {
    const message = createBaseSuperfluidUndelegationsByDelegatorRequest();
    message.delegatorAddress = object.delegatorAddress ?? '';
    message.denom = object.denom ?? '';
    return message;
  },
  fromProtoMsg(
    message: SuperfluidUndelegationsByDelegatorRequestProtoMsg,
  ): SuperfluidUndelegationsByDelegatorRequest {
    return SuperfluidUndelegationsByDelegatorRequest.decode(message.value);
  },
  toProto(message: SuperfluidUndelegationsByDelegatorRequest): Uint8Array {
    return SuperfluidUndelegationsByDelegatorRequest.encode(message).finish();
  },
  toProtoMsg(
    message: SuperfluidUndelegationsByDelegatorRequest,
  ): SuperfluidUndelegationsByDelegatorRequestProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.SuperfluidUndelegationsByDelegatorRequest',
      value: SuperfluidUndelegationsByDelegatorRequest.encode(message).finish(),
    };
  },
};
function createBaseSuperfluidUndelegationsByDelegatorResponse(): SuperfluidUndelegationsByDelegatorResponse {
  return {
    superfluidDelegationRecords: [],
    totalUndelegatedCoins: [],
    syntheticLocks: [],
  };
}
export const SuperfluidUndelegationsByDelegatorResponse = {
  typeUrl: '/osmosis.superfluid.SuperfluidUndelegationsByDelegatorResponse',
  encode(
    message: SuperfluidUndelegationsByDelegatorResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.superfluidDelegationRecords) {
      SuperfluidDelegationRecord.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.totalUndelegatedCoins) {
      Coin.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.syntheticLocks) {
      SyntheticLock.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SuperfluidUndelegationsByDelegatorResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSuperfluidUndelegationsByDelegatorResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.superfluidDelegationRecords.push(
            SuperfluidDelegationRecord.decode(reader, reader.uint32()),
          );
          break;
        case 2:
          message.totalUndelegatedCoins.push(
            Coin.decode(reader, reader.uint32()),
          );
          break;
        case 3:
          message.syntheticLocks.push(
            SyntheticLock.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SuperfluidUndelegationsByDelegatorResponse {
    return {
      superfluidDelegationRecords: Array.isArray(
        object?.superfluidDelegationRecords,
      )
        ? object.superfluidDelegationRecords.map((e: any) =>
            SuperfluidDelegationRecord.fromJSON(e),
          )
        : [],
      totalUndelegatedCoins: Array.isArray(object?.totalUndelegatedCoins)
        ? object.totalUndelegatedCoins.map((e: any) => Coin.fromJSON(e))
        : [],
      syntheticLocks: Array.isArray(object?.syntheticLocks)
        ? object.syntheticLocks.map((e: any) => SyntheticLock.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: SuperfluidUndelegationsByDelegatorResponse,
  ): JsonSafe<SuperfluidUndelegationsByDelegatorResponse> {
    const obj: any = {};
    if (message.superfluidDelegationRecords) {
      obj.superfluidDelegationRecords = message.superfluidDelegationRecords.map(
        e => (e ? SuperfluidDelegationRecord.toJSON(e) : undefined),
      );
    } else {
      obj.superfluidDelegationRecords = [];
    }
    if (message.totalUndelegatedCoins) {
      obj.totalUndelegatedCoins = message.totalUndelegatedCoins.map(e =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.totalUndelegatedCoins = [];
    }
    if (message.syntheticLocks) {
      obj.syntheticLocks = message.syntheticLocks.map(e =>
        e ? SyntheticLock.toJSON(e) : undefined,
      );
    } else {
      obj.syntheticLocks = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<SuperfluidUndelegationsByDelegatorResponse>,
  ): SuperfluidUndelegationsByDelegatorResponse {
    const message = createBaseSuperfluidUndelegationsByDelegatorResponse();
    message.superfluidDelegationRecords =
      object.superfluidDelegationRecords?.map(e =>
        SuperfluidDelegationRecord.fromPartial(e),
      ) || [];
    message.totalUndelegatedCoins =
      object.totalUndelegatedCoins?.map(e => Coin.fromPartial(e)) || [];
    message.syntheticLocks =
      object.syntheticLocks?.map(e => SyntheticLock.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: SuperfluidUndelegationsByDelegatorResponseProtoMsg,
  ): SuperfluidUndelegationsByDelegatorResponse {
    return SuperfluidUndelegationsByDelegatorResponse.decode(message.value);
  },
  toProto(message: SuperfluidUndelegationsByDelegatorResponse): Uint8Array {
    return SuperfluidUndelegationsByDelegatorResponse.encode(message).finish();
  },
  toProtoMsg(
    message: SuperfluidUndelegationsByDelegatorResponse,
  ): SuperfluidUndelegationsByDelegatorResponseProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.SuperfluidUndelegationsByDelegatorResponse',
      value:
        SuperfluidUndelegationsByDelegatorResponse.encode(message).finish(),
    };
  },
};
function createBaseSuperfluidDelegationsByValidatorDenomRequest(): SuperfluidDelegationsByValidatorDenomRequest {
  return {
    validatorAddress: '',
    denom: '',
  };
}
export const SuperfluidDelegationsByValidatorDenomRequest = {
  typeUrl: '/osmosis.superfluid.SuperfluidDelegationsByValidatorDenomRequest',
  encode(
    message: SuperfluidDelegationsByValidatorDenomRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.validatorAddress !== '') {
      writer.uint32(10).string(message.validatorAddress);
    }
    if (message.denom !== '') {
      writer.uint32(18).string(message.denom);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SuperfluidDelegationsByValidatorDenomRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSuperfluidDelegationsByValidatorDenomRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.validatorAddress = reader.string();
          break;
        case 2:
          message.denom = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SuperfluidDelegationsByValidatorDenomRequest {
    return {
      validatorAddress: isSet(object.validatorAddress)
        ? String(object.validatorAddress)
        : '',
      denom: isSet(object.denom) ? String(object.denom) : '',
    };
  },
  toJSON(
    message: SuperfluidDelegationsByValidatorDenomRequest,
  ): JsonSafe<SuperfluidDelegationsByValidatorDenomRequest> {
    const obj: any = {};
    message.validatorAddress !== undefined &&
      (obj.validatorAddress = message.validatorAddress);
    message.denom !== undefined && (obj.denom = message.denom);
    return obj;
  },
  fromPartial(
    object: Partial<SuperfluidDelegationsByValidatorDenomRequest>,
  ): SuperfluidDelegationsByValidatorDenomRequest {
    const message = createBaseSuperfluidDelegationsByValidatorDenomRequest();
    message.validatorAddress = object.validatorAddress ?? '';
    message.denom = object.denom ?? '';
    return message;
  },
  fromProtoMsg(
    message: SuperfluidDelegationsByValidatorDenomRequestProtoMsg,
  ): SuperfluidDelegationsByValidatorDenomRequest {
    return SuperfluidDelegationsByValidatorDenomRequest.decode(message.value);
  },
  toProto(message: SuperfluidDelegationsByValidatorDenomRequest): Uint8Array {
    return SuperfluidDelegationsByValidatorDenomRequest.encode(
      message,
    ).finish();
  },
  toProtoMsg(
    message: SuperfluidDelegationsByValidatorDenomRequest,
  ): SuperfluidDelegationsByValidatorDenomRequestProtoMsg {
    return {
      typeUrl:
        '/osmosis.superfluid.SuperfluidDelegationsByValidatorDenomRequest',
      value:
        SuperfluidDelegationsByValidatorDenomRequest.encode(message).finish(),
    };
  },
};
function createBaseSuperfluidDelegationsByValidatorDenomResponse(): SuperfluidDelegationsByValidatorDenomResponse {
  return {
    superfluidDelegationRecords: [],
  };
}
export const SuperfluidDelegationsByValidatorDenomResponse = {
  typeUrl: '/osmosis.superfluid.SuperfluidDelegationsByValidatorDenomResponse',
  encode(
    message: SuperfluidDelegationsByValidatorDenomResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.superfluidDelegationRecords) {
      SuperfluidDelegationRecord.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SuperfluidDelegationsByValidatorDenomResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSuperfluidDelegationsByValidatorDenomResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.superfluidDelegationRecords.push(
            SuperfluidDelegationRecord.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SuperfluidDelegationsByValidatorDenomResponse {
    return {
      superfluidDelegationRecords: Array.isArray(
        object?.superfluidDelegationRecords,
      )
        ? object.superfluidDelegationRecords.map((e: any) =>
            SuperfluidDelegationRecord.fromJSON(e),
          )
        : [],
    };
  },
  toJSON(
    message: SuperfluidDelegationsByValidatorDenomResponse,
  ): JsonSafe<SuperfluidDelegationsByValidatorDenomResponse> {
    const obj: any = {};
    if (message.superfluidDelegationRecords) {
      obj.superfluidDelegationRecords = message.superfluidDelegationRecords.map(
        e => (e ? SuperfluidDelegationRecord.toJSON(e) : undefined),
      );
    } else {
      obj.superfluidDelegationRecords = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<SuperfluidDelegationsByValidatorDenomResponse>,
  ): SuperfluidDelegationsByValidatorDenomResponse {
    const message = createBaseSuperfluidDelegationsByValidatorDenomResponse();
    message.superfluidDelegationRecords =
      object.superfluidDelegationRecords?.map(e =>
        SuperfluidDelegationRecord.fromPartial(e),
      ) || [];
    return message;
  },
  fromProtoMsg(
    message: SuperfluidDelegationsByValidatorDenomResponseProtoMsg,
  ): SuperfluidDelegationsByValidatorDenomResponse {
    return SuperfluidDelegationsByValidatorDenomResponse.decode(message.value);
  },
  toProto(message: SuperfluidDelegationsByValidatorDenomResponse): Uint8Array {
    return SuperfluidDelegationsByValidatorDenomResponse.encode(
      message,
    ).finish();
  },
  toProtoMsg(
    message: SuperfluidDelegationsByValidatorDenomResponse,
  ): SuperfluidDelegationsByValidatorDenomResponseProtoMsg {
    return {
      typeUrl:
        '/osmosis.superfluid.SuperfluidDelegationsByValidatorDenomResponse',
      value:
        SuperfluidDelegationsByValidatorDenomResponse.encode(message).finish(),
    };
  },
};
function createBaseEstimateSuperfluidDelegatedAmountByValidatorDenomRequest(): EstimateSuperfluidDelegatedAmountByValidatorDenomRequest {
  return {
    validatorAddress: '',
    denom: '',
  };
}
export const EstimateSuperfluidDelegatedAmountByValidatorDenomRequest = {
  typeUrl:
    '/osmosis.superfluid.EstimateSuperfluidDelegatedAmountByValidatorDenomRequest',
  encode(
    message: EstimateSuperfluidDelegatedAmountByValidatorDenomRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.validatorAddress !== '') {
      writer.uint32(10).string(message.validatorAddress);
    }
    if (message.denom !== '') {
      writer.uint32(18).string(message.denom);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): EstimateSuperfluidDelegatedAmountByValidatorDenomRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message =
      createBaseEstimateSuperfluidDelegatedAmountByValidatorDenomRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.validatorAddress = reader.string();
          break;
        case 2:
          message.denom = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(
    object: any,
  ): EstimateSuperfluidDelegatedAmountByValidatorDenomRequest {
    return {
      validatorAddress: isSet(object.validatorAddress)
        ? String(object.validatorAddress)
        : '',
      denom: isSet(object.denom) ? String(object.denom) : '',
    };
  },
  toJSON(
    message: EstimateSuperfluidDelegatedAmountByValidatorDenomRequest,
  ): JsonSafe<EstimateSuperfluidDelegatedAmountByValidatorDenomRequest> {
    const obj: any = {};
    message.validatorAddress !== undefined &&
      (obj.validatorAddress = message.validatorAddress);
    message.denom !== undefined && (obj.denom = message.denom);
    return obj;
  },
  fromPartial(
    object: Partial<EstimateSuperfluidDelegatedAmountByValidatorDenomRequest>,
  ): EstimateSuperfluidDelegatedAmountByValidatorDenomRequest {
    const message =
      createBaseEstimateSuperfluidDelegatedAmountByValidatorDenomRequest();
    message.validatorAddress = object.validatorAddress ?? '';
    message.denom = object.denom ?? '';
    return message;
  },
  fromProtoMsg(
    message: EstimateSuperfluidDelegatedAmountByValidatorDenomRequestProtoMsg,
  ): EstimateSuperfluidDelegatedAmountByValidatorDenomRequest {
    return EstimateSuperfluidDelegatedAmountByValidatorDenomRequest.decode(
      message.value,
    );
  },
  toProto(
    message: EstimateSuperfluidDelegatedAmountByValidatorDenomRequest,
  ): Uint8Array {
    return EstimateSuperfluidDelegatedAmountByValidatorDenomRequest.encode(
      message,
    ).finish();
  },
  toProtoMsg(
    message: EstimateSuperfluidDelegatedAmountByValidatorDenomRequest,
  ): EstimateSuperfluidDelegatedAmountByValidatorDenomRequestProtoMsg {
    return {
      typeUrl:
        '/osmosis.superfluid.EstimateSuperfluidDelegatedAmountByValidatorDenomRequest',
      value:
        EstimateSuperfluidDelegatedAmountByValidatorDenomRequest.encode(
          message,
        ).finish(),
    };
  },
};
function createBaseEstimateSuperfluidDelegatedAmountByValidatorDenomResponse(): EstimateSuperfluidDelegatedAmountByValidatorDenomResponse {
  return {
    totalDelegatedCoins: [],
  };
}
export const EstimateSuperfluidDelegatedAmountByValidatorDenomResponse = {
  typeUrl:
    '/osmosis.superfluid.EstimateSuperfluidDelegatedAmountByValidatorDenomResponse',
  encode(
    message: EstimateSuperfluidDelegatedAmountByValidatorDenomResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.totalDelegatedCoins) {
      Coin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): EstimateSuperfluidDelegatedAmountByValidatorDenomResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message =
      createBaseEstimateSuperfluidDelegatedAmountByValidatorDenomResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.totalDelegatedCoins.push(
            Coin.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(
    object: any,
  ): EstimateSuperfluidDelegatedAmountByValidatorDenomResponse {
    return {
      totalDelegatedCoins: Array.isArray(object?.totalDelegatedCoins)
        ? object.totalDelegatedCoins.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: EstimateSuperfluidDelegatedAmountByValidatorDenomResponse,
  ): JsonSafe<EstimateSuperfluidDelegatedAmountByValidatorDenomResponse> {
    const obj: any = {};
    if (message.totalDelegatedCoins) {
      obj.totalDelegatedCoins = message.totalDelegatedCoins.map(e =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.totalDelegatedCoins = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<EstimateSuperfluidDelegatedAmountByValidatorDenomResponse>,
  ): EstimateSuperfluidDelegatedAmountByValidatorDenomResponse {
    const message =
      createBaseEstimateSuperfluidDelegatedAmountByValidatorDenomResponse();
    message.totalDelegatedCoins =
      object.totalDelegatedCoins?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: EstimateSuperfluidDelegatedAmountByValidatorDenomResponseProtoMsg,
  ): EstimateSuperfluidDelegatedAmountByValidatorDenomResponse {
    return EstimateSuperfluidDelegatedAmountByValidatorDenomResponse.decode(
      message.value,
    );
  },
  toProto(
    message: EstimateSuperfluidDelegatedAmountByValidatorDenomResponse,
  ): Uint8Array {
    return EstimateSuperfluidDelegatedAmountByValidatorDenomResponse.encode(
      message,
    ).finish();
  },
  toProtoMsg(
    message: EstimateSuperfluidDelegatedAmountByValidatorDenomResponse,
  ): EstimateSuperfluidDelegatedAmountByValidatorDenomResponseProtoMsg {
    return {
      typeUrl:
        '/osmosis.superfluid.EstimateSuperfluidDelegatedAmountByValidatorDenomResponse',
      value:
        EstimateSuperfluidDelegatedAmountByValidatorDenomResponse.encode(
          message,
        ).finish(),
    };
  },
};
function createBaseQueryTotalDelegationByDelegatorRequest(): QueryTotalDelegationByDelegatorRequest {
  return {
    delegatorAddress: '',
  };
}
export const QueryTotalDelegationByDelegatorRequest = {
  typeUrl: '/osmosis.superfluid.QueryTotalDelegationByDelegatorRequest',
  encode(
    message: QueryTotalDelegationByDelegatorRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.delegatorAddress !== '') {
      writer.uint32(10).string(message.delegatorAddress);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryTotalDelegationByDelegatorRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryTotalDelegationByDelegatorRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.delegatorAddress = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryTotalDelegationByDelegatorRequest {
    return {
      delegatorAddress: isSet(object.delegatorAddress)
        ? String(object.delegatorAddress)
        : '',
    };
  },
  toJSON(
    message: QueryTotalDelegationByDelegatorRequest,
  ): JsonSafe<QueryTotalDelegationByDelegatorRequest> {
    const obj: any = {};
    message.delegatorAddress !== undefined &&
      (obj.delegatorAddress = message.delegatorAddress);
    return obj;
  },
  fromPartial(
    object: Partial<QueryTotalDelegationByDelegatorRequest>,
  ): QueryTotalDelegationByDelegatorRequest {
    const message = createBaseQueryTotalDelegationByDelegatorRequest();
    message.delegatorAddress = object.delegatorAddress ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryTotalDelegationByDelegatorRequestProtoMsg,
  ): QueryTotalDelegationByDelegatorRequest {
    return QueryTotalDelegationByDelegatorRequest.decode(message.value);
  },
  toProto(message: QueryTotalDelegationByDelegatorRequest): Uint8Array {
    return QueryTotalDelegationByDelegatorRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryTotalDelegationByDelegatorRequest,
  ): QueryTotalDelegationByDelegatorRequestProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.QueryTotalDelegationByDelegatorRequest',
      value: QueryTotalDelegationByDelegatorRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryTotalDelegationByDelegatorResponse(): QueryTotalDelegationByDelegatorResponse {
  return {
    superfluidDelegationRecords: [],
    delegationResponse: [],
    totalDelegatedCoins: [],
    totalEquivalentStakedAmount: Coin.fromPartial({}),
  };
}
export const QueryTotalDelegationByDelegatorResponse = {
  typeUrl: '/osmosis.superfluid.QueryTotalDelegationByDelegatorResponse',
  encode(
    message: QueryTotalDelegationByDelegatorResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.superfluidDelegationRecords) {
      SuperfluidDelegationRecord.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.delegationResponse) {
      DelegationResponse.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.totalDelegatedCoins) {
      Coin.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    if (message.totalEquivalentStakedAmount !== undefined) {
      Coin.encode(
        message.totalEquivalentStakedAmount,
        writer.uint32(34).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryTotalDelegationByDelegatorResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryTotalDelegationByDelegatorResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.superfluidDelegationRecords.push(
            SuperfluidDelegationRecord.decode(reader, reader.uint32()),
          );
          break;
        case 2:
          message.delegationResponse.push(
            DelegationResponse.decode(reader, reader.uint32()),
          );
          break;
        case 3:
          message.totalDelegatedCoins.push(
            Coin.decode(reader, reader.uint32()),
          );
          break;
        case 4:
          message.totalEquivalentStakedAmount = Coin.decode(
            reader,
            reader.uint32(),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryTotalDelegationByDelegatorResponse {
    return {
      superfluidDelegationRecords: Array.isArray(
        object?.superfluidDelegationRecords,
      )
        ? object.superfluidDelegationRecords.map((e: any) =>
            SuperfluidDelegationRecord.fromJSON(e),
          )
        : [],
      delegationResponse: Array.isArray(object?.delegationResponse)
        ? object.delegationResponse.map((e: any) =>
            DelegationResponse.fromJSON(e),
          )
        : [],
      totalDelegatedCoins: Array.isArray(object?.totalDelegatedCoins)
        ? object.totalDelegatedCoins.map((e: any) => Coin.fromJSON(e))
        : [],
      totalEquivalentStakedAmount: isSet(object.totalEquivalentStakedAmount)
        ? Coin.fromJSON(object.totalEquivalentStakedAmount)
        : undefined,
    };
  },
  toJSON(
    message: QueryTotalDelegationByDelegatorResponse,
  ): JsonSafe<QueryTotalDelegationByDelegatorResponse> {
    const obj: any = {};
    if (message.superfluidDelegationRecords) {
      obj.superfluidDelegationRecords = message.superfluidDelegationRecords.map(
        e => (e ? SuperfluidDelegationRecord.toJSON(e) : undefined),
      );
    } else {
      obj.superfluidDelegationRecords = [];
    }
    if (message.delegationResponse) {
      obj.delegationResponse = message.delegationResponse.map(e =>
        e ? DelegationResponse.toJSON(e) : undefined,
      );
    } else {
      obj.delegationResponse = [];
    }
    if (message.totalDelegatedCoins) {
      obj.totalDelegatedCoins = message.totalDelegatedCoins.map(e =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.totalDelegatedCoins = [];
    }
    message.totalEquivalentStakedAmount !== undefined &&
      (obj.totalEquivalentStakedAmount = message.totalEquivalentStakedAmount
        ? Coin.toJSON(message.totalEquivalentStakedAmount)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryTotalDelegationByDelegatorResponse>,
  ): QueryTotalDelegationByDelegatorResponse {
    const message = createBaseQueryTotalDelegationByDelegatorResponse();
    message.superfluidDelegationRecords =
      object.superfluidDelegationRecords?.map(e =>
        SuperfluidDelegationRecord.fromPartial(e),
      ) || [];
    message.delegationResponse =
      object.delegationResponse?.map(e => DelegationResponse.fromPartial(e)) ||
      [];
    message.totalDelegatedCoins =
      object.totalDelegatedCoins?.map(e => Coin.fromPartial(e)) || [];
    message.totalEquivalentStakedAmount =
      object.totalEquivalentStakedAmount !== undefined &&
      object.totalEquivalentStakedAmount !== null
        ? Coin.fromPartial(object.totalEquivalentStakedAmount)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryTotalDelegationByDelegatorResponseProtoMsg,
  ): QueryTotalDelegationByDelegatorResponse {
    return QueryTotalDelegationByDelegatorResponse.decode(message.value);
  },
  toProto(message: QueryTotalDelegationByDelegatorResponse): Uint8Array {
    return QueryTotalDelegationByDelegatorResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryTotalDelegationByDelegatorResponse,
  ): QueryTotalDelegationByDelegatorResponseProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.QueryTotalDelegationByDelegatorResponse',
      value: QueryTotalDelegationByDelegatorResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryUnpoolWhitelistRequest(): QueryUnpoolWhitelistRequest {
  return {};
}
export const QueryUnpoolWhitelistRequest = {
  typeUrl: '/osmosis.superfluid.QueryUnpoolWhitelistRequest',
  encode(
    _: QueryUnpoolWhitelistRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryUnpoolWhitelistRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryUnpoolWhitelistRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): QueryUnpoolWhitelistRequest {
    return {};
  },
  toJSON(
    _: QueryUnpoolWhitelistRequest,
  ): JsonSafe<QueryUnpoolWhitelistRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<QueryUnpoolWhitelistRequest>,
  ): QueryUnpoolWhitelistRequest {
    const message = createBaseQueryUnpoolWhitelistRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryUnpoolWhitelistRequestProtoMsg,
  ): QueryUnpoolWhitelistRequest {
    return QueryUnpoolWhitelistRequest.decode(message.value);
  },
  toProto(message: QueryUnpoolWhitelistRequest): Uint8Array {
    return QueryUnpoolWhitelistRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryUnpoolWhitelistRequest,
  ): QueryUnpoolWhitelistRequestProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.QueryUnpoolWhitelistRequest',
      value: QueryUnpoolWhitelistRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryUnpoolWhitelistResponse(): QueryUnpoolWhitelistResponse {
  return {
    poolIds: [],
  };
}
export const QueryUnpoolWhitelistResponse = {
  typeUrl: '/osmosis.superfluid.QueryUnpoolWhitelistResponse',
  encode(
    message: QueryUnpoolWhitelistResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    writer.uint32(10).fork();
    for (const v of message.poolIds) {
      writer.uint64(v);
    }
    writer.ldelim();
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryUnpoolWhitelistResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryUnpoolWhitelistResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.poolIds.push(reader.uint64());
            }
          } else {
            message.poolIds.push(reader.uint64());
          }
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryUnpoolWhitelistResponse {
    return {
      poolIds: Array.isArray(object?.poolIds)
        ? object.poolIds.map((e: any) => BigInt(e.toString()))
        : [],
    };
  },
  toJSON(
    message: QueryUnpoolWhitelistResponse,
  ): JsonSafe<QueryUnpoolWhitelistResponse> {
    const obj: any = {};
    if (message.poolIds) {
      obj.poolIds = message.poolIds.map(e => (e || BigInt(0)).toString());
    } else {
      obj.poolIds = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryUnpoolWhitelistResponse>,
  ): QueryUnpoolWhitelistResponse {
    const message = createBaseQueryUnpoolWhitelistResponse();
    message.poolIds = object.poolIds?.map(e => BigInt(e.toString())) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryUnpoolWhitelistResponseProtoMsg,
  ): QueryUnpoolWhitelistResponse {
    return QueryUnpoolWhitelistResponse.decode(message.value);
  },
  toProto(message: QueryUnpoolWhitelistResponse): Uint8Array {
    return QueryUnpoolWhitelistResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryUnpoolWhitelistResponse,
  ): QueryUnpoolWhitelistResponseProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.QueryUnpoolWhitelistResponse',
      value: QueryUnpoolWhitelistResponse.encode(message).finish(),
    };
  },
};
