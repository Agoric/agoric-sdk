import { HostZone, type HostZoneSDKType, DelegationRecord, type DelegationRecordSDKType, UnbondingRecord, type UnbondingRecordSDKType, RedemptionRecord, type RedemptionRecordSDKType, SlashRecord, type SlashRecordSDKType } from './staketia.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * Params defines the staketia module parameters.
 * @name Params
 * @package stride.staketia
 * @see proto type: stride.staketia.Params
 */
export interface Params {
}
export interface ParamsProtoMsg {
    typeUrl: '/stride.staketia.Params';
    value: Uint8Array;
}
/**
 * Params defines the staketia module parameters.
 * @name ParamsSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.Params
 */
export interface ParamsSDKType {
}
/**
 * TransferInProgressRecordIds stores record IDs for delegation records
 * that have a transfer in progress
 * @name TransferInProgressRecordIds
 * @package stride.staketia
 * @see proto type: stride.staketia.TransferInProgressRecordIds
 */
export interface TransferInProgressRecordIds {
    channelId: string;
    sequence: bigint;
    recordId: bigint;
}
export interface TransferInProgressRecordIdsProtoMsg {
    typeUrl: '/stride.staketia.TransferInProgressRecordIds';
    value: Uint8Array;
}
/**
 * TransferInProgressRecordIds stores record IDs for delegation records
 * that have a transfer in progress
 * @name TransferInProgressRecordIdsSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.TransferInProgressRecordIds
 */
export interface TransferInProgressRecordIdsSDKType {
    channel_id: string;
    sequence: bigint;
    record_id: bigint;
}
/**
 * GenesisState defines the staketia module's genesis state.
 * @name GenesisState
 * @package stride.staketia
 * @see proto type: stride.staketia.GenesisState
 */
export interface GenesisState {
    params: Params;
    hostZone: HostZone;
    delegationRecords: DelegationRecord[];
    unbondingRecords: UnbondingRecord[];
    redemptionRecords: RedemptionRecord[];
    slashRecords: SlashRecord[];
    transferInProgressRecordIds: TransferInProgressRecordIds[];
}
export interface GenesisStateProtoMsg {
    typeUrl: '/stride.staketia.GenesisState';
    value: Uint8Array;
}
/**
 * GenesisState defines the staketia module's genesis state.
 * @name GenesisStateSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.GenesisState
 */
export interface GenesisStateSDKType {
    params: ParamsSDKType;
    host_zone: HostZoneSDKType;
    delegation_records: DelegationRecordSDKType[];
    unbonding_records: UnbondingRecordSDKType[];
    redemption_records: RedemptionRecordSDKType[];
    slash_records: SlashRecordSDKType[];
    transfer_in_progress_record_ids: TransferInProgressRecordIdsSDKType[];
}
/**
 * Params defines the staketia module parameters.
 * @name Params
 * @package stride.staketia
 * @see proto type: stride.staketia.Params
 */
export declare const Params: {
    typeUrl: "/stride.staketia.Params";
    is(o: any): o is Params;
    isSDK(o: any): o is ParamsSDKType;
    encode(_: Params, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Params;
    fromJSON(_: any): Params;
    toJSON(_: Params): JsonSafe<Params>;
    fromPartial(_: Partial<Params>): Params;
    fromProtoMsg(message: ParamsProtoMsg): Params;
    toProto(message: Params): Uint8Array;
    toProtoMsg(message: Params): ParamsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * TransferInProgressRecordIds stores record IDs for delegation records
 * that have a transfer in progress
 * @name TransferInProgressRecordIds
 * @package stride.staketia
 * @see proto type: stride.staketia.TransferInProgressRecordIds
 */
export declare const TransferInProgressRecordIds: {
    typeUrl: "/stride.staketia.TransferInProgressRecordIds";
    is(o: any): o is TransferInProgressRecordIds;
    isSDK(o: any): o is TransferInProgressRecordIdsSDKType;
    encode(message: TransferInProgressRecordIds, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): TransferInProgressRecordIds;
    fromJSON(object: any): TransferInProgressRecordIds;
    toJSON(message: TransferInProgressRecordIds): JsonSafe<TransferInProgressRecordIds>;
    fromPartial(object: Partial<TransferInProgressRecordIds>): TransferInProgressRecordIds;
    fromProtoMsg(message: TransferInProgressRecordIdsProtoMsg): TransferInProgressRecordIds;
    toProto(message: TransferInProgressRecordIds): Uint8Array;
    toProtoMsg(message: TransferInProgressRecordIds): TransferInProgressRecordIdsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * GenesisState defines the staketia module's genesis state.
 * @name GenesisState
 * @package stride.staketia
 * @see proto type: stride.staketia.GenesisState
 */
export declare const GenesisState: {
    typeUrl: "/stride.staketia.GenesisState";
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
//# sourceMappingURL=genesis.d.ts.map