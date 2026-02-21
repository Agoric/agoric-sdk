import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * @name Validator
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.Validator
 */
export interface Validator {
    name: string;
    address: string;
    weight: bigint;
    delegation: string;
    slashQueryProgressTracker: string;
    slashQueryCheckpoint: string;
    sharesToTokensRate: string;
    delegationChangesInProgress: bigint;
    slashQueryInProgress: boolean;
}
export interface ValidatorProtoMsg {
    typeUrl: '/stride.stakeibc.Validator';
    value: Uint8Array;
}
/**
 * @name ValidatorSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.Validator
 */
export interface ValidatorSDKType {
    name: string;
    address: string;
    weight: bigint;
    delegation: string;
    slash_query_progress_tracker: string;
    slash_query_checkpoint: string;
    shares_to_tokens_rate: string;
    delegation_changes_in_progress: bigint;
    slash_query_in_progress: boolean;
}
/**
 * @name Validator
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.Validator
 */
export declare const Validator: {
    typeUrl: "/stride.stakeibc.Validator";
    is(o: any): o is Validator;
    isSDK(o: any): o is ValidatorSDKType;
    encode(message: Validator, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Validator;
    fromJSON(object: any): Validator;
    toJSON(message: Validator): JsonSafe<Validator>;
    fromPartial(object: Partial<Validator>): Validator;
    fromProtoMsg(message: ValidatorProtoMsg): Validator;
    toProto(message: Validator): Uint8Array;
    toProtoMsg(message: Validator): ValidatorProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=validator.d.ts.map