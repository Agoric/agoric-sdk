import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * PerMessageBurnLimit is the maximum amount of a certain denom that can be
 * burned in an single burn
 * @param denom the denom
 * @param amount the amount that can be burned (in microunits).  An amount of
 * 1000000 uusdc is equivalent to 1USDC
 * @name PerMessageBurnLimit
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.PerMessageBurnLimit
 */
export interface PerMessageBurnLimit {
    denom: string;
    amount: string;
}
export interface PerMessageBurnLimitProtoMsg {
    typeUrl: '/circle.cctp.v1.PerMessageBurnLimit';
    value: Uint8Array;
}
/**
 * PerMessageBurnLimit is the maximum amount of a certain denom that can be
 * burned in an single burn
 * @param denom the denom
 * @param amount the amount that can be burned (in microunits).  An amount of
 * 1000000 uusdc is equivalent to 1USDC
 * @name PerMessageBurnLimitSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.PerMessageBurnLimit
 */
export interface PerMessageBurnLimitSDKType {
    denom: string;
    amount: string;
}
/**
 * PerMessageBurnLimit is the maximum amount of a certain denom that can be
 * burned in an single burn
 * @param denom the denom
 * @param amount the amount that can be burned (in microunits).  An amount of
 * 1000000 uusdc is equivalent to 1USDC
 * @name PerMessageBurnLimit
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.PerMessageBurnLimit
 */
export declare const PerMessageBurnLimit: {
    typeUrl: "/circle.cctp.v1.PerMessageBurnLimit";
    is(o: any): o is PerMessageBurnLimit;
    isSDK(o: any): o is PerMessageBurnLimitSDKType;
    encode(message: PerMessageBurnLimit, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): PerMessageBurnLimit;
    fromJSON(object: any): PerMessageBurnLimit;
    toJSON(message: PerMessageBurnLimit): JsonSafe<PerMessageBurnLimit>;
    fromPartial(object: Partial<PerMessageBurnLimit>): PerMessageBurnLimit;
    fromProtoMsg(message: PerMessageBurnLimitProtoMsg): PerMessageBurnLimit;
    toProto(message: PerMessageBurnLimit): Uint8Array;
    toProtoMsg(message: PerMessageBurnLimit): PerMessageBurnLimitProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=per_message_burn_limit.d.ts.map