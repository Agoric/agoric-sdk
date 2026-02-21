import { Params, type ParamsSDKType, Metadata, type MetadataSDKType, SendEnabled, type SendEnabledSDKType } from './bank.js';
import { Coin, type CoinSDKType } from '../../base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
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
/**
 * GenesisState defines the bank module's genesis state.
 * @name GenesisState
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.GenesisState
 */
export declare const GenesisState: {
    typeUrl: "/cosmos.bank.v1beta1.GenesisState";
    aminoType: "cosmos-sdk/GenesisState";
    is(o: any): o is GenesisState;
    isSDK(o: any): o is GenesisStateSDKType;
    encode(message: GenesisState, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): GenesisState;
    fromJSON(object: any): GenesisState;
    toJSON(message: GenesisState): JsonSafe<GenesisState>;
    fromPartial(object: Partial<GenesisState>): GenesisState;
    fromProtoMsg(message: GenesisStateProtoMsg): GenesisState;
    toProto(message: GenesisState): Uint8Array;
    toProtoMsg(message: GenesisState): GenesisStateProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Balance defines an account address and balance pair used in the bank module's
 * genesis state.
 * @name Balance
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.Balance
 */
export declare const Balance: {
    typeUrl: "/cosmos.bank.v1beta1.Balance";
    aminoType: "cosmos-sdk/Balance";
    is(o: any): o is Balance;
    isSDK(o: any): o is BalanceSDKType;
    encode(message: Balance, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Balance;
    fromJSON(object: any): Balance;
    toJSON(message: Balance): JsonSafe<Balance>;
    fromPartial(object: Partial<Balance>): Balance;
    fromProtoMsg(message: BalanceProtoMsg): Balance;
    toProto(message: Balance): Uint8Array;
    toProtoMsg(message: Balance): BalanceProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=genesis.d.ts.map