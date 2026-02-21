import { Params, type ParamsSDKType } from './params.js';
import { UserRedemptionRecord, type UserRedemptionRecordSDKType, EpochUnbondingRecord, type EpochUnbondingRecordSDKType, DepositRecord, type DepositRecordSDKType, LSMTokenDeposit, type LSMTokenDepositSDKType } from './records.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * GenesisState defines the records module's genesis state.
 * @name GenesisState
 * @package stride.records
 * @see proto type: stride.records.GenesisState
 */
export interface GenesisState {
    params: Params;
    portId: string;
    userRedemptionRecordList: UserRedemptionRecord[];
    userRedemptionRecordCount: bigint;
    epochUnbondingRecordList: EpochUnbondingRecord[];
    depositRecordList: DepositRecord[];
    depositRecordCount: bigint;
    lsmTokenDepositList: LSMTokenDeposit[];
}
export interface GenesisStateProtoMsg {
    typeUrl: '/stride.records.GenesisState';
    value: Uint8Array;
}
/**
 * GenesisState defines the records module's genesis state.
 * @name GenesisStateSDKType
 * @package stride.records
 * @see proto type: stride.records.GenesisState
 */
export interface GenesisStateSDKType {
    params: ParamsSDKType;
    port_id: string;
    user_redemption_record_list: UserRedemptionRecordSDKType[];
    user_redemption_record_count: bigint;
    epoch_unbonding_record_list: EpochUnbondingRecordSDKType[];
    deposit_record_list: DepositRecordSDKType[];
    deposit_record_count: bigint;
    lsm_token_deposit_list: LSMTokenDepositSDKType[];
}
/**
 * GenesisState defines the records module's genesis state.
 * @name GenesisState
 * @package stride.records
 * @see proto type: stride.records.GenesisState
 */
export declare const GenesisState: {
    typeUrl: "/stride.records.GenesisState";
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