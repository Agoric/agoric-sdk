import { BlockParams, type BlockParamsSDKType, EvidenceParams, type EvidenceParamsSDKType, ValidatorParams, type ValidatorParamsSDKType, ABCIParams, type ABCIParamsSDKType } from '../../../tendermint/types/params.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 * @name MsgUpdateParams
 * @package cosmos.consensus.v1
 * @see proto type: cosmos.consensus.v1.MsgUpdateParams
 */
export interface MsgUpdateParams {
    /**
     * authority is the address that controls the module (defaults to x/gov unless overwritten).
     */
    authority: string;
    /**
     * params defines the x/consensus parameters to update.
     * VersionsParams is not included in this Msg because it is tracked
     * separarately in x/upgrade.
     *
     * NOTE: All parameters must be supplied.
     */
    block?: BlockParams;
    evidence?: EvidenceParams;
    validator?: ValidatorParams;
    /**
     * Since: cosmos-sdk 0.50
     */
    abci?: ABCIParams;
}
export interface MsgUpdateParamsProtoMsg {
    typeUrl: '/cosmos.consensus.v1.MsgUpdateParams';
    value: Uint8Array;
}
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 * @name MsgUpdateParamsSDKType
 * @package cosmos.consensus.v1
 * @see proto type: cosmos.consensus.v1.MsgUpdateParams
 */
export interface MsgUpdateParamsSDKType {
    authority: string;
    block?: BlockParamsSDKType;
    evidence?: EvidenceParamsSDKType;
    validator?: ValidatorParamsSDKType;
    abci?: ABCIParamsSDKType;
}
/**
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 * @name MsgUpdateParamsResponse
 * @package cosmos.consensus.v1
 * @see proto type: cosmos.consensus.v1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponse {
}
export interface MsgUpdateParamsResponseProtoMsg {
    typeUrl: '/cosmos.consensus.v1.MsgUpdateParamsResponse';
    value: Uint8Array;
}
/**
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 * @name MsgUpdateParamsResponseSDKType
 * @package cosmos.consensus.v1
 * @see proto type: cosmos.consensus.v1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponseSDKType {
}
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 * @name MsgUpdateParams
 * @package cosmos.consensus.v1
 * @see proto type: cosmos.consensus.v1.MsgUpdateParams
 */
export declare const MsgUpdateParams: {
    typeUrl: "/cosmos.consensus.v1.MsgUpdateParams";
    aminoType: "cosmos-sdk/x/consensus/MsgUpdateParams";
    is(o: any): o is MsgUpdateParams;
    isSDK(o: any): o is MsgUpdateParamsSDKType;
    encode(message: MsgUpdateParams, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateParams;
    fromJSON(object: any): MsgUpdateParams;
    toJSON(message: MsgUpdateParams): JsonSafe<MsgUpdateParams>;
    fromPartial(object: Partial<MsgUpdateParams>): MsgUpdateParams;
    fromProtoMsg(message: MsgUpdateParamsProtoMsg): MsgUpdateParams;
    toProto(message: MsgUpdateParams): Uint8Array;
    toProtoMsg(message: MsgUpdateParams): MsgUpdateParamsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 * @name MsgUpdateParamsResponse
 * @package cosmos.consensus.v1
 * @see proto type: cosmos.consensus.v1.MsgUpdateParamsResponse
 */
export declare const MsgUpdateParamsResponse: {
    typeUrl: "/cosmos.consensus.v1.MsgUpdateParamsResponse";
    aminoType: "cosmos-sdk/MsgUpdateParamsResponse";
    is(o: any): o is MsgUpdateParamsResponse;
    isSDK(o: any): o is MsgUpdateParamsResponseSDKType;
    encode(_: MsgUpdateParamsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateParamsResponse;
    fromJSON(_: any): MsgUpdateParamsResponse;
    toJSON(_: MsgUpdateParamsResponse): JsonSafe<MsgUpdateParamsResponse>;
    fromPartial(_: Partial<MsgUpdateParamsResponse>): MsgUpdateParamsResponse;
    fromProtoMsg(message: MsgUpdateParamsResponseProtoMsg): MsgUpdateParamsResponse;
    toProto(message: MsgUpdateParamsResponse): Uint8Array;
    toProtoMsg(message: MsgUpdateParamsResponse): MsgUpdateParamsResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=tx.d.ts.map