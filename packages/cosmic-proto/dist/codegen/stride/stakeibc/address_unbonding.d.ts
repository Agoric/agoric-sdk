import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * @name AddressUnbonding
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.AddressUnbonding
 */
export interface AddressUnbonding {
    address: string;
    receiver: string;
    unbondingEstimatedTime: string;
    amount: string;
    denom: string;
    claimIsPending: boolean;
    epochNumber: bigint;
}
export interface AddressUnbondingProtoMsg {
    typeUrl: '/stride.stakeibc.AddressUnbonding';
    value: Uint8Array;
}
/**
 * @name AddressUnbondingSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.AddressUnbonding
 */
export interface AddressUnbondingSDKType {
    address: string;
    receiver: string;
    unbonding_estimated_time: string;
    amount: string;
    denom: string;
    claim_is_pending: boolean;
    epoch_number: bigint;
}
/**
 * @name AddressUnbonding
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.AddressUnbonding
 */
export declare const AddressUnbonding: {
    typeUrl: "/stride.stakeibc.AddressUnbonding";
    is(o: any): o is AddressUnbonding;
    isSDK(o: any): o is AddressUnbondingSDKType;
    encode(message: AddressUnbonding, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): AddressUnbonding;
    fromJSON(object: any): AddressUnbonding;
    toJSON(message: AddressUnbonding): JsonSafe<AddressUnbonding>;
    fromPartial(object: Partial<AddressUnbonding>): AddressUnbonding;
    fromProtoMsg(message: AddressUnbondingProtoMsg): AddressUnbonding;
    toProto(message: AddressUnbonding): Uint8Array;
    toProtoMsg(message: AddressUnbonding): AddressUnbondingProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=address_unbonding.d.ts.map