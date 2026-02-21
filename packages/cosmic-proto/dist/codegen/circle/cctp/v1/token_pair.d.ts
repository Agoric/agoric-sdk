import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * TokenPair is used to look up the Noble token (i.e. "uusdc") from a remote
 * domain token address Multiple remote_domain + remote_token pairs can map to
 * the same local_token
 *
 * @param remote_domain the remote domain_id corresponding to the token
 * @param remote_token the remote token address
 * @param local_token the corresponding Noble token denom in uunits
 * @name TokenPair
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.TokenPair
 */
export interface TokenPair {
    remoteDomain: number;
    remoteToken: Uint8Array;
    localToken: string;
}
export interface TokenPairProtoMsg {
    typeUrl: '/circle.cctp.v1.TokenPair';
    value: Uint8Array;
}
/**
 * TokenPair is used to look up the Noble token (i.e. "uusdc") from a remote
 * domain token address Multiple remote_domain + remote_token pairs can map to
 * the same local_token
 *
 * @param remote_domain the remote domain_id corresponding to the token
 * @param remote_token the remote token address
 * @param local_token the corresponding Noble token denom in uunits
 * @name TokenPairSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.TokenPair
 */
export interface TokenPairSDKType {
    remote_domain: number;
    remote_token: Uint8Array;
    local_token: string;
}
/**
 * TokenPair is used to look up the Noble token (i.e. "uusdc") from a remote
 * domain token address Multiple remote_domain + remote_token pairs can map to
 * the same local_token
 *
 * @param remote_domain the remote domain_id corresponding to the token
 * @param remote_token the remote token address
 * @param local_token the corresponding Noble token denom in uunits
 * @name TokenPair
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.TokenPair
 */
export declare const TokenPair: {
    typeUrl: "/circle.cctp.v1.TokenPair";
    is(o: any): o is TokenPair;
    isSDK(o: any): o is TokenPairSDKType;
    encode(message: TokenPair, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): TokenPair;
    fromJSON(object: any): TokenPair;
    toJSON(message: TokenPair): JsonSafe<TokenPair>;
    fromPartial(object: Partial<TokenPair>): TokenPair;
    fromProtoMsg(message: TokenPairProtoMsg): TokenPair;
    toProto(message: TokenPair): Uint8Array;
    toProtoMsg(message: TokenPair): TokenPairProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=token_pair.d.ts.map