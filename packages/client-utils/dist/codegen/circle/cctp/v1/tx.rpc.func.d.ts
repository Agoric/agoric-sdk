import { MsgDepositForBurn, MsgDepositForBurnWithCaller } from '@agoric/cosmic-proto/codegen/circle/cctp/v1/tx.js';
/**
 * @name depositForBurn
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.DepositForBurn
 */
export declare const depositForBurn: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgDepositForBurn | MsgDepositForBurn[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * @name depositForBurnWithCaller
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.DepositForBurnWithCaller
 */
export declare const depositForBurnWithCaller: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgDepositForBurnWithCaller | MsgDepositForBurnWithCaller[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map