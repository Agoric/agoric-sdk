import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * SignatureThreshold is the minimum amount of signatures required to attest to
 * a message (the 'm' in a m/n multisig)
 * @param amount the number of signatures required
 * @name SignatureThreshold
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SignatureThreshold
 */
export interface SignatureThreshold {
    amount: number;
}
export interface SignatureThresholdProtoMsg {
    typeUrl: '/circle.cctp.v1.SignatureThreshold';
    value: Uint8Array;
}
/**
 * SignatureThreshold is the minimum amount of signatures required to attest to
 * a message (the 'm' in a m/n multisig)
 * @param amount the number of signatures required
 * @name SignatureThresholdSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SignatureThreshold
 */
export interface SignatureThresholdSDKType {
    amount: number;
}
/**
 * SignatureThreshold is the minimum amount of signatures required to attest to
 * a message (the 'm' in a m/n multisig)
 * @param amount the number of signatures required
 * @name SignatureThreshold
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SignatureThreshold
 */
export declare const SignatureThreshold: {
    typeUrl: "/circle.cctp.v1.SignatureThreshold";
    is(o: any): o is SignatureThreshold;
    isSDK(o: any): o is SignatureThresholdSDKType;
    encode(message: SignatureThreshold, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SignatureThreshold;
    fromJSON(object: any): SignatureThreshold;
    toJSON(message: SignatureThreshold): JsonSafe<SignatureThreshold>;
    fromPartial(object: Partial<SignatureThreshold>): SignatureThreshold;
    fromProtoMsg(message: SignatureThresholdProtoMsg): SignatureThreshold;
    toProto(message: SignatureThreshold): Uint8Array;
    toProtoMsg(message: SignatureThreshold): SignatureThresholdProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=signature_threshold.d.ts.map