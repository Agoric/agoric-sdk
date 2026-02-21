import { Params as Params1 } from '../../controller/v1/controller.js';
import { type ParamsSDKType as Params1SDKType } from '../../controller/v1/controller.js';
import { Params as Params2 } from '../../host/v1/host.js';
import { type ParamsSDKType as Params2SDKType } from '../../host/v1/host.js';
import { BinaryReader, BinaryWriter } from '../../../../../binary.js';
import { type JsonSafe } from '../../../../../json-safe.js';
/**
 * GenesisState defines the interchain accounts genesis state
 * @name GenesisState
 * @package ibc.applications.interchain_accounts.genesis.v1
 * @see proto type: ibc.applications.interchain_accounts.genesis.v1.GenesisState
 */
export interface GenesisState {
    controllerGenesisState: ControllerGenesisState;
    hostGenesisState: HostGenesisState;
}
export interface GenesisStateProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.genesis.v1.GenesisState';
    value: Uint8Array;
}
/**
 * GenesisState defines the interchain accounts genesis state
 * @name GenesisStateSDKType
 * @package ibc.applications.interchain_accounts.genesis.v1
 * @see proto type: ibc.applications.interchain_accounts.genesis.v1.GenesisState
 */
export interface GenesisStateSDKType {
    controller_genesis_state: ControllerGenesisStateSDKType;
    host_genesis_state: HostGenesisStateSDKType;
}
/**
 * ControllerGenesisState defines the interchain accounts controller genesis state
 * @name ControllerGenesisState
 * @package ibc.applications.interchain_accounts.genesis.v1
 * @see proto type: ibc.applications.interchain_accounts.genesis.v1.ControllerGenesisState
 */
export interface ControllerGenesisState {
    activeChannels: ActiveChannel[];
    interchainAccounts: RegisteredInterchainAccount[];
    ports: string[];
    params: Params1;
}
export interface ControllerGenesisStateProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.genesis.v1.ControllerGenesisState';
    value: Uint8Array;
}
/**
 * ControllerGenesisState defines the interchain accounts controller genesis state
 * @name ControllerGenesisStateSDKType
 * @package ibc.applications.interchain_accounts.genesis.v1
 * @see proto type: ibc.applications.interchain_accounts.genesis.v1.ControllerGenesisState
 */
export interface ControllerGenesisStateSDKType {
    active_channels: ActiveChannelSDKType[];
    interchain_accounts: RegisteredInterchainAccountSDKType[];
    ports: string[];
    params: Params1SDKType;
}
/**
 * HostGenesisState defines the interchain accounts host genesis state
 * @name HostGenesisState
 * @package ibc.applications.interchain_accounts.genesis.v1
 * @see proto type: ibc.applications.interchain_accounts.genesis.v1.HostGenesisState
 */
export interface HostGenesisState {
    activeChannels: ActiveChannel[];
    interchainAccounts: RegisteredInterchainAccount[];
    port: string;
    params: Params2;
}
export interface HostGenesisStateProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.genesis.v1.HostGenesisState';
    value: Uint8Array;
}
/**
 * HostGenesisState defines the interchain accounts host genesis state
 * @name HostGenesisStateSDKType
 * @package ibc.applications.interchain_accounts.genesis.v1
 * @see proto type: ibc.applications.interchain_accounts.genesis.v1.HostGenesisState
 */
export interface HostGenesisStateSDKType {
    active_channels: ActiveChannelSDKType[];
    interchain_accounts: RegisteredInterchainAccountSDKType[];
    port: string;
    params: Params2SDKType;
}
/**
 * ActiveChannel contains a connection ID, port ID and associated active channel ID, as well as a boolean flag to
 * indicate if the channel is middleware enabled
 * @name ActiveChannel
 * @package ibc.applications.interchain_accounts.genesis.v1
 * @see proto type: ibc.applications.interchain_accounts.genesis.v1.ActiveChannel
 */
export interface ActiveChannel {
    connectionId: string;
    portId: string;
    channelId: string;
    isMiddlewareEnabled: boolean;
}
export interface ActiveChannelProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.genesis.v1.ActiveChannel';
    value: Uint8Array;
}
/**
 * ActiveChannel contains a connection ID, port ID and associated active channel ID, as well as a boolean flag to
 * indicate if the channel is middleware enabled
 * @name ActiveChannelSDKType
 * @package ibc.applications.interchain_accounts.genesis.v1
 * @see proto type: ibc.applications.interchain_accounts.genesis.v1.ActiveChannel
 */
export interface ActiveChannelSDKType {
    connection_id: string;
    port_id: string;
    channel_id: string;
    is_middleware_enabled: boolean;
}
/**
 * RegisteredInterchainAccount contains a connection ID, port ID and associated interchain account address
 * @name RegisteredInterchainAccount
 * @package ibc.applications.interchain_accounts.genesis.v1
 * @see proto type: ibc.applications.interchain_accounts.genesis.v1.RegisteredInterchainAccount
 */
export interface RegisteredInterchainAccount {
    connectionId: string;
    portId: string;
    accountAddress: string;
}
export interface RegisteredInterchainAccountProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.genesis.v1.RegisteredInterchainAccount';
    value: Uint8Array;
}
/**
 * RegisteredInterchainAccount contains a connection ID, port ID and associated interchain account address
 * @name RegisteredInterchainAccountSDKType
 * @package ibc.applications.interchain_accounts.genesis.v1
 * @see proto type: ibc.applications.interchain_accounts.genesis.v1.RegisteredInterchainAccount
 */
export interface RegisteredInterchainAccountSDKType {
    connection_id: string;
    port_id: string;
    account_address: string;
}
/**
 * GenesisState defines the interchain accounts genesis state
 * @name GenesisState
 * @package ibc.applications.interchain_accounts.genesis.v1
 * @see proto type: ibc.applications.interchain_accounts.genesis.v1.GenesisState
 */
export declare const GenesisState: {
    typeUrl: "/ibc.applications.interchain_accounts.genesis.v1.GenesisState";
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
 * ControllerGenesisState defines the interchain accounts controller genesis state
 * @name ControllerGenesisState
 * @package ibc.applications.interchain_accounts.genesis.v1
 * @see proto type: ibc.applications.interchain_accounts.genesis.v1.ControllerGenesisState
 */
export declare const ControllerGenesisState: {
    typeUrl: "/ibc.applications.interchain_accounts.genesis.v1.ControllerGenesisState";
    aminoType: "cosmos-sdk/ControllerGenesisState";
    is(o: any): o is ControllerGenesisState;
    isSDK(o: any): o is ControllerGenesisStateSDKType;
    encode(message: ControllerGenesisState, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ControllerGenesisState;
    fromJSON(object: any): ControllerGenesisState;
    toJSON(message: ControllerGenesisState): JsonSafe<ControllerGenesisState>;
    fromPartial(object: Partial<ControllerGenesisState>): ControllerGenesisState;
    fromProtoMsg(message: ControllerGenesisStateProtoMsg): ControllerGenesisState;
    toProto(message: ControllerGenesisState): Uint8Array;
    toProtoMsg(message: ControllerGenesisState): ControllerGenesisStateProtoMsg;
    registerTypeUrl(): void;
};
/**
 * HostGenesisState defines the interchain accounts host genesis state
 * @name HostGenesisState
 * @package ibc.applications.interchain_accounts.genesis.v1
 * @see proto type: ibc.applications.interchain_accounts.genesis.v1.HostGenesisState
 */
export declare const HostGenesisState: {
    typeUrl: "/ibc.applications.interchain_accounts.genesis.v1.HostGenesisState";
    aminoType: "cosmos-sdk/HostGenesisState";
    is(o: any): o is HostGenesisState;
    isSDK(o: any): o is HostGenesisStateSDKType;
    encode(message: HostGenesisState, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): HostGenesisState;
    fromJSON(object: any): HostGenesisState;
    toJSON(message: HostGenesisState): JsonSafe<HostGenesisState>;
    fromPartial(object: Partial<HostGenesisState>): HostGenesisState;
    fromProtoMsg(message: HostGenesisStateProtoMsg): HostGenesisState;
    toProto(message: HostGenesisState): Uint8Array;
    toProtoMsg(message: HostGenesisState): HostGenesisStateProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ActiveChannel contains a connection ID, port ID and associated active channel ID, as well as a boolean flag to
 * indicate if the channel is middleware enabled
 * @name ActiveChannel
 * @package ibc.applications.interchain_accounts.genesis.v1
 * @see proto type: ibc.applications.interchain_accounts.genesis.v1.ActiveChannel
 */
export declare const ActiveChannel: {
    typeUrl: "/ibc.applications.interchain_accounts.genesis.v1.ActiveChannel";
    aminoType: "cosmos-sdk/ActiveChannel";
    is(o: any): o is ActiveChannel;
    isSDK(o: any): o is ActiveChannelSDKType;
    encode(message: ActiveChannel, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ActiveChannel;
    fromJSON(object: any): ActiveChannel;
    toJSON(message: ActiveChannel): JsonSafe<ActiveChannel>;
    fromPartial(object: Partial<ActiveChannel>): ActiveChannel;
    fromProtoMsg(message: ActiveChannelProtoMsg): ActiveChannel;
    toProto(message: ActiveChannel): Uint8Array;
    toProtoMsg(message: ActiveChannel): ActiveChannelProtoMsg;
    registerTypeUrl(): void;
};
/**
 * RegisteredInterchainAccount contains a connection ID, port ID and associated interchain account address
 * @name RegisteredInterchainAccount
 * @package ibc.applications.interchain_accounts.genesis.v1
 * @see proto type: ibc.applications.interchain_accounts.genesis.v1.RegisteredInterchainAccount
 */
export declare const RegisteredInterchainAccount: {
    typeUrl: "/ibc.applications.interchain_accounts.genesis.v1.RegisteredInterchainAccount";
    aminoType: "cosmos-sdk/RegisteredInterchainAccount";
    is(o: any): o is RegisteredInterchainAccount;
    isSDK(o: any): o is RegisteredInterchainAccountSDKType;
    encode(message: RegisteredInterchainAccount, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RegisteredInterchainAccount;
    fromJSON(object: any): RegisteredInterchainAccount;
    toJSON(message: RegisteredInterchainAccount): JsonSafe<RegisteredInterchainAccount>;
    fromPartial(object: Partial<RegisteredInterchainAccount>): RegisteredInterchainAccount;
    fromProtoMsg(message: RegisteredInterchainAccountProtoMsg): RegisteredInterchainAccount;
    toProto(message: RegisteredInterchainAccount): Uint8Array;
    toProtoMsg(message: RegisteredInterchainAccount): RegisteredInterchainAccountProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=genesis.d.ts.map