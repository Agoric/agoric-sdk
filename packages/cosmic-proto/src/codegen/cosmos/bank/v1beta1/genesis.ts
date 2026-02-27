//@ts-nocheck
import {
  Params,
  type ParamsSDKType,
  Metadata,
  type MetadataSDKType,
  SendEnabled,
  type SendEnabledSDKType,
} from './bank.js';
import { Coin, type CoinSDKType } from '../../base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * GenesisState defines the bank module's genesis state.
 * @name GenesisState
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.GenesisState
 */
export interface GenesisState {
  /**
   * params defines all the parameters of the module.
   */
  params: Params;
  /**
   * balances is an array containing the balances of all the accounts.
   */
  balances: Balance[];
  /**
   * supply represents the total supply. If it is left empty, then supply will be calculated based on the provided
   * balances. Otherwise, it will be used to validate that the sum of the balances equals this amount.
   */
  supply: Coin[];
  /**
   * denom_metadata defines the metadata of the different coins.
   */
  denomMetadata: Metadata[];
  /**
   * send_enabled defines the denoms where send is enabled or disabled.
   *
   * Since: cosmos-sdk 0.47
   */
  sendEnabled: SendEnabled[];
}
export interface GenesisStateProtoMsg {
  typeUrl: '/cosmos.bank.v1beta1.GenesisState';
  value: Uint8Array;
}
/**
 * GenesisState defines the bank module's genesis state.
 * @name GenesisStateSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.GenesisState
 */
export interface GenesisStateSDKType {
  params: ParamsSDKType;
  balances: BalanceSDKType[];
  supply: CoinSDKType[];
  denom_metadata: MetadataSDKType[];
  send_enabled: SendEnabledSDKType[];
}
/**
 * Balance defines an account address and balance pair used in the bank module's
 * genesis state.
 * @name Balance
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.Balance
 */
export interface Balance {
  /**
   * address is the address of the balance holder.
   */
  address: string;
  /**
   * coins defines the different coins this balance holds.
   */
  coins: Coin[];
}
export interface BalanceProtoMsg {
  typeUrl: '/cosmos.bank.v1beta1.Balance';
  value: Uint8Array;
}
/**
 * Balance defines an account address and balance pair used in the bank module's
 * genesis state.
 * @name BalanceSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.Balance
 */
export interface BalanceSDKType {
  address: string;
  coins: CoinSDKType[];
}
function createBaseGenesisState(): GenesisState {
  return {
    params: Params.fromPartial({}),
    balances: [],
    supply: [],
    denomMetadata: [],
    sendEnabled: [],
  };
}
/**
 * GenesisState defines the bank module's genesis state.
 * @name GenesisState
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.GenesisState
 */
export const GenesisState = {
  typeUrl: '/cosmos.bank.v1beta1.GenesisState' as const,
  aminoType: 'cosmos-sdk/GenesisState' as const,
  is(o: any): o is GenesisState {
    return (
      o &&
      (o.$typeUrl === GenesisState.typeUrl ||
        (Params.is(o.params) &&
          Array.isArray(o.balances) &&
          (!o.balances.length || Balance.is(o.balances[0])) &&
          Array.isArray(o.supply) &&
          (!o.supply.length || Coin.is(o.supply[0])) &&
          Array.isArray(o.denomMetadata) &&
          (!o.denomMetadata.length || Metadata.is(o.denomMetadata[0])) &&
          Array.isArray(o.sendEnabled) &&
          (!o.sendEnabled.length || SendEnabled.is(o.sendEnabled[0]))))
    );
  },
  isSDK(o: any): o is GenesisStateSDKType {
    return (
      o &&
      (o.$typeUrl === GenesisState.typeUrl ||
        (Params.isSDK(o.params) &&
          Array.isArray(o.balances) &&
          (!o.balances.length || Balance.isSDK(o.balances[0])) &&
          Array.isArray(o.supply) &&
          (!o.supply.length || Coin.isSDK(o.supply[0])) &&
          Array.isArray(o.denom_metadata) &&
          (!o.denom_metadata.length || Metadata.isSDK(o.denom_metadata[0])) &&
          Array.isArray(o.send_enabled) &&
          (!o.send_enabled.length || SendEnabled.isSDK(o.send_enabled[0]))))
    );
  },
  encode(
    message: GenesisState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.balances) {
      Balance.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.supply) {
      Coin.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    for (const v of message.denomMetadata) {
      Metadata.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    for (const v of message.sendEnabled) {
      SendEnabled.encode(v!, writer.uint32(42).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): GenesisState {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGenesisState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.params = Params.decode(reader, reader.uint32());
          break;
        case 2:
          message.balances.push(Balance.decode(reader, reader.uint32()));
          break;
        case 3:
          message.supply.push(Coin.decode(reader, reader.uint32()));
          break;
        case 4:
          message.denomMetadata.push(Metadata.decode(reader, reader.uint32()));
          break;
        case 5:
          message.sendEnabled.push(SendEnabled.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GenesisState {
    return {
      params: isSet(object.params) ? Params.fromJSON(object.params) : undefined,
      balances: Array.isArray(object?.balances)
        ? object.balances.map((e: any) => Balance.fromJSON(e))
        : [],
      supply: Array.isArray(object?.supply)
        ? object.supply.map((e: any) => Coin.fromJSON(e))
        : [],
      denomMetadata: Array.isArray(object?.denomMetadata)
        ? object.denomMetadata.map((e: any) => Metadata.fromJSON(e))
        : [],
      sendEnabled: Array.isArray(object?.sendEnabled)
        ? object.sendEnabled.map((e: any) => SendEnabled.fromJSON(e))
        : [],
    };
  },
  toJSON(message: GenesisState): JsonSafe<GenesisState> {
    const obj: any = {};
    message.params !== undefined &&
      (obj.params = message.params ? Params.toJSON(message.params) : undefined);
    if (message.balances) {
      obj.balances = message.balances.map(e =>
        e ? Balance.toJSON(e) : undefined,
      );
    } else {
      obj.balances = [];
    }
    if (message.supply) {
      obj.supply = message.supply.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.supply = [];
    }
    if (message.denomMetadata) {
      obj.denomMetadata = message.denomMetadata.map(e =>
        e ? Metadata.toJSON(e) : undefined,
      );
    } else {
      obj.denomMetadata = [];
    }
    if (message.sendEnabled) {
      obj.sendEnabled = message.sendEnabled.map(e =>
        e ? SendEnabled.toJSON(e) : undefined,
      );
    } else {
      obj.sendEnabled = [];
    }
    return obj;
  },
  fromPartial(object: Partial<GenesisState>): GenesisState {
    const message = createBaseGenesisState();
    message.params =
      object.params !== undefined && object.params !== null
        ? Params.fromPartial(object.params)
        : undefined;
    message.balances = object.balances?.map(e => Balance.fromPartial(e)) || [];
    message.supply = object.supply?.map(e => Coin.fromPartial(e)) || [];
    message.denomMetadata =
      object.denomMetadata?.map(e => Metadata.fromPartial(e)) || [];
    message.sendEnabled =
      object.sendEnabled?.map(e => SendEnabled.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: GenesisStateProtoMsg): GenesisState {
    return GenesisState.decode(message.value);
  },
  toProto(message: GenesisState): Uint8Array {
    return GenesisState.encode(message).finish();
  },
  toProtoMsg(message: GenesisState): GenesisStateProtoMsg {
    return {
      typeUrl: '/cosmos.bank.v1beta1.GenesisState',
      value: GenesisState.encode(message).finish(),
    };
  },
};
function createBaseBalance(): Balance {
  return {
    address: '',
    coins: [],
  };
}
/**
 * Balance defines an account address and balance pair used in the bank module's
 * genesis state.
 * @name Balance
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.Balance
 */
export const Balance = {
  typeUrl: '/cosmos.bank.v1beta1.Balance' as const,
  aminoType: 'cosmos-sdk/Balance' as const,
  is(o: any): o is Balance {
    return (
      o &&
      (o.$typeUrl === Balance.typeUrl ||
        (typeof o.address === 'string' &&
          Array.isArray(o.coins) &&
          (!o.coins.length || Coin.is(o.coins[0]))))
    );
  },
  isSDK(o: any): o is BalanceSDKType {
    return (
      o &&
      (o.$typeUrl === Balance.typeUrl ||
        (typeof o.address === 'string' &&
          Array.isArray(o.coins) &&
          (!o.coins.length || Coin.isSDK(o.coins[0]))))
    );
  },
  encode(
    message: Balance,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.address !== '') {
      writer.uint32(10).string(message.address);
    }
    for (const v of message.coins) {
      Coin.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Balance {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBalance();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.string();
          break;
        case 2:
          message.coins.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Balance {
    return {
      address: isSet(object.address) ? String(object.address) : '',
      coins: Array.isArray(object?.coins)
        ? object.coins.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(message: Balance): JsonSafe<Balance> {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    if (message.coins) {
      obj.coins = message.coins.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.coins = [];
    }
    return obj;
  },
  fromPartial(object: Partial<Balance>): Balance {
    const message = createBaseBalance();
    message.address = object.address ?? '';
    message.coins = object.coins?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: BalanceProtoMsg): Balance {
    return Balance.decode(message.value);
  },
  toProto(message: Balance): Uint8Array {
    return Balance.encode(message).finish();
  },
  toProtoMsg(message: Balance): BalanceProtoMsg {
    return {
      typeUrl: '/cosmos.bank.v1beta1.Balance',
      value: Balance.encode(message).finish(),
    };
  },
};
