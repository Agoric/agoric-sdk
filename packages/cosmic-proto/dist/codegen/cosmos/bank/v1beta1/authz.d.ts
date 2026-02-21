import { Coin, type CoinSDKType } from '../../base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * SendAuthorization allows the grantee to spend up to spend_limit coins from
 * the granter's account.
 *
 * Since: cosmos-sdk 0.43
 * @name SendAuthorization
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.SendAuthorization
 */
export interface SendAuthorization {
    $typeUrl?: '/cosmos.bank.v1beta1.SendAuthorization';
    spendLimit: Coin[];
    /**
     * allow_list specifies an optional list of addresses to whom the grantee can send tokens on behalf of the
     * granter. If omitted, any recipient is allowed.
     *
     * Since: cosmos-sdk 0.47
     */
    allowList: string[];
}
export interface SendAuthorizationProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.SendAuthorization';
    value: Uint8Array;
}
/**
 * SendAuthorization allows the grantee to spend up to spend_limit coins from
 * the granter's account.
 *
 * Since: cosmos-sdk 0.43
 * @name SendAuthorizationSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.SendAuthorization
 */
export interface SendAuthorizationSDKType {
    $typeUrl?: '/cosmos.bank.v1beta1.SendAuthorization';
    spend_limit: CoinSDKType[];
    allow_list: string[];
}
/**
 * SendAuthorization allows the grantee to spend up to spend_limit coins from
 * the granter's account.
 *
 * Since: cosmos-sdk 0.43
 * @name SendAuthorization
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.SendAuthorization
 */
export declare const SendAuthorization: {
    typeUrl: "/cosmos.bank.v1beta1.SendAuthorization";
    aminoType: "cosmos-sdk/SendAuthorization";
    is(o: any): o is SendAuthorization;
    isSDK(o: any): o is SendAuthorizationSDKType;
    encode(message: SendAuthorization, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SendAuthorization;
    fromJSON(object: any): SendAuthorization;
    toJSON(message: SendAuthorization): JsonSafe<SendAuthorization>;
    fromPartial(object: Partial<SendAuthorization>): SendAuthorization;
    fromProtoMsg(message: SendAuthorizationProtoMsg): SendAuthorization;
    toProto(message: SendAuthorization): Uint8Array;
    toProtoMsg(message: SendAuthorization): SendAuthorizationProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=authz.d.ts.map