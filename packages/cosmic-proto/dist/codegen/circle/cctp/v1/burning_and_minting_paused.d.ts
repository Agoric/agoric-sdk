import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * Message format for BurningAndMintingPaused
 * @param paused true if paused, false if not paused
 * @name BurningAndMintingPaused
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.BurningAndMintingPaused
 */
export interface BurningAndMintingPaused {
    paused: boolean;
}
export interface BurningAndMintingPausedProtoMsg {
    typeUrl: '/circle.cctp.v1.BurningAndMintingPaused';
    value: Uint8Array;
}
/**
 * Message format for BurningAndMintingPaused
 * @param paused true if paused, false if not paused
 * @name BurningAndMintingPausedSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.BurningAndMintingPaused
 */
export interface BurningAndMintingPausedSDKType {
    paused: boolean;
}
/**
 * Message format for BurningAndMintingPaused
 * @param paused true if paused, false if not paused
 * @name BurningAndMintingPaused
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.BurningAndMintingPaused
 */
export declare const BurningAndMintingPaused: {
    typeUrl: "/circle.cctp.v1.BurningAndMintingPaused";
    is(o: any): o is BurningAndMintingPaused;
    isSDK(o: any): o is BurningAndMintingPausedSDKType;
    encode(message: BurningAndMintingPaused, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): BurningAndMintingPaused;
    fromJSON(object: any): BurningAndMintingPaused;
    toJSON(message: BurningAndMintingPaused): JsonSafe<BurningAndMintingPaused>;
    fromPartial(object: Partial<BurningAndMintingPaused>): BurningAndMintingPaused;
    fromProtoMsg(message: BurningAndMintingPausedProtoMsg): BurningAndMintingPaused;
    toProto(message: BurningAndMintingPaused): Uint8Array;
    toProtoMsg(message: BurningAndMintingPaused): BurningAndMintingPausedProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=burning_and_minting_paused.d.ts.map