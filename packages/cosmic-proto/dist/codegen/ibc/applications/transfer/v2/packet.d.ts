import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * FungibleTokenPacketData defines a struct for the packet payload
 * See FungibleTokenPacketData spec:
 * https://github.com/cosmos/ibc/tree/master/spec/app/ics-020-fungible-token-transfer#data-structures
 * @name FungibleTokenPacketData
 * @package ibc.applications.transfer.v2
 * @see proto type: ibc.applications.transfer.v2.FungibleTokenPacketData
 */
export interface FungibleTokenPacketData {
    /**
     * the token denomination to be transferred
     */
    denom: string;
    /**
     * the token amount to be transferred
     */
    amount: string;
    /**
     * the sender address
     */
    sender: string;
    /**
     * the recipient address on the destination chain
     */
    receiver: string;
    /**
     * optional memo
     */
    memo: string;
}
export interface FungibleTokenPacketDataProtoMsg {
    typeUrl: '/ibc.applications.transfer.v2.FungibleTokenPacketData';
    value: Uint8Array;
}
/**
 * FungibleTokenPacketData defines a struct for the packet payload
 * See FungibleTokenPacketData spec:
 * https://github.com/cosmos/ibc/tree/master/spec/app/ics-020-fungible-token-transfer#data-structures
 * @name FungibleTokenPacketDataSDKType
 * @package ibc.applications.transfer.v2
 * @see proto type: ibc.applications.transfer.v2.FungibleTokenPacketData
 */
export interface FungibleTokenPacketDataSDKType {
    denom: string;
    amount: string;
    sender: string;
    receiver: string;
    memo: string;
}
/**
 * FungibleTokenPacketData defines a struct for the packet payload
 * See FungibleTokenPacketData spec:
 * https://github.com/cosmos/ibc/tree/master/spec/app/ics-020-fungible-token-transfer#data-structures
 * @name FungibleTokenPacketData
 * @package ibc.applications.transfer.v2
 * @see proto type: ibc.applications.transfer.v2.FungibleTokenPacketData
 */
export declare const FungibleTokenPacketData: {
    typeUrl: "/ibc.applications.transfer.v2.FungibleTokenPacketData";
    aminoType: "cosmos-sdk/FungibleTokenPacketData";
    is(o: any): o is FungibleTokenPacketData;
    isSDK(o: any): o is FungibleTokenPacketDataSDKType;
    encode(message: FungibleTokenPacketData, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): FungibleTokenPacketData;
    fromJSON(object: any): FungibleTokenPacketData;
    toJSON(message: FungibleTokenPacketData): JsonSafe<FungibleTokenPacketData>;
    fromPartial(object: Partial<FungibleTokenPacketData>): FungibleTokenPacketData;
    fromProtoMsg(message: FungibleTokenPacketDataProtoMsg): FungibleTokenPacketData;
    toProto(message: FungibleTokenPacketData): Uint8Array;
    toProtoMsg(message: FungibleTokenPacketData): FungibleTokenPacketDataProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=packet.d.ts.map