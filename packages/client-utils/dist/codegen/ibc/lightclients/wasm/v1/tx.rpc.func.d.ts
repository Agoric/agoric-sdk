import { MsgStoreCode, MsgRemoveChecksum, MsgMigrateContract } from '@agoric/cosmic-proto/codegen/ibc/lightclients/wasm/v1/tx.js';
/**
 * StoreCode defines a rpc handler method for MsgStoreCode.
 * @name storeCode
 * @package ibc.lightclients.wasm.v1
 * @see proto service: ibc.lightclients.wasm.v1.StoreCode
 */
export declare const storeCode: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgStoreCode | MsgStoreCode[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * RemoveChecksum defines a rpc handler method for MsgRemoveChecksum.
 * @name removeChecksum
 * @package ibc.lightclients.wasm.v1
 * @see proto service: ibc.lightclients.wasm.v1.RemoveChecksum
 */
export declare const removeChecksum: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgRemoveChecksum | MsgRemoveChecksum[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * MigrateContract defines a rpc handler method for MsgMigrateContract.
 * @name migrateContract
 * @package ibc.lightclients.wasm.v1
 * @see proto service: ibc.lightclients.wasm.v1.MigrateContract
 */
export declare const migrateContract: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgMigrateContract | MsgMigrateContract[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map