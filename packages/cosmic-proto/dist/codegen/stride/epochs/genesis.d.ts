import { Timestamp, type TimestampSDKType } from '../../google/protobuf/timestamp.js';
import { Duration, type DurationSDKType } from '../../google/protobuf/duration.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * @name EpochInfo
 * @package stride.epochs
 * @see proto type: stride.epochs.EpochInfo
 */
export interface EpochInfo {
    identifier: string;
    startTime: Timestamp;
    duration: Duration;
    currentEpoch: bigint;
    currentEpochStartTime: Timestamp;
    epochCountingStarted: boolean;
    currentEpochStartHeight: bigint;
}
export interface EpochInfoProtoMsg {
    typeUrl: '/stride.epochs.EpochInfo';
    value: Uint8Array;
}
/**
 * @name EpochInfoSDKType
 * @package stride.epochs
 * @see proto type: stride.epochs.EpochInfo
 */
export interface EpochInfoSDKType {
    identifier: string;
    start_time: TimestampSDKType;
    duration: DurationSDKType;
    current_epoch: bigint;
    current_epoch_start_time: TimestampSDKType;
    epoch_counting_started: boolean;
    current_epoch_start_height: bigint;
}
/**
 * GenesisState defines the epochs module's genesis state.
 * @name GenesisState
 * @package stride.epochs
 * @see proto type: stride.epochs.GenesisState
 */
export interface GenesisState {
    epochs: EpochInfo[];
}
export interface GenesisStateProtoMsg {
    typeUrl: '/stride.epochs.GenesisState';
    value: Uint8Array;
}
/**
 * GenesisState defines the epochs module's genesis state.
 * @name GenesisStateSDKType
 * @package stride.epochs
 * @see proto type: stride.epochs.GenesisState
 */
export interface GenesisStateSDKType {
    epochs: EpochInfoSDKType[];
}
/**
 * @name EpochInfo
 * @package stride.epochs
 * @see proto type: stride.epochs.EpochInfo
 */
export declare const EpochInfo: {
    typeUrl: "/stride.epochs.EpochInfo";
    is(o: any): o is EpochInfo;
    isSDK(o: any): o is EpochInfoSDKType;
    encode(message: EpochInfo, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): EpochInfo;
    fromJSON(object: any): EpochInfo;
    toJSON(message: EpochInfo): JsonSafe<EpochInfo>;
    fromPartial(object: Partial<EpochInfo>): EpochInfo;
    fromProtoMsg(message: EpochInfoProtoMsg): EpochInfo;
    toProto(message: EpochInfo): Uint8Array;
    toProtoMsg(message: EpochInfo): EpochInfoProtoMsg;
    registerTypeUrl(): void;
};
/**
 * GenesisState defines the epochs module's genesis state.
 * @name GenesisState
 * @package stride.epochs
 * @see proto type: stride.epochs.GenesisState
 */
export declare const GenesisState: {
    typeUrl: "/stride.epochs.GenesisState";
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