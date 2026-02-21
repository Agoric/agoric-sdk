import { MsgAuthorizeCircuitBreaker, MsgTripCircuitBreaker, MsgResetCircuitBreaker } from '@agoric/cosmic-proto/codegen/cosmos/circuit/v1/tx.js';
/**
 * AuthorizeCircuitBreaker allows a super-admin to grant (or revoke) another
 * account's circuit breaker permissions.
 * @name authorizeCircuitBreaker
 * @package cosmos.circuit.v1
 * @see proto service: cosmos.circuit.v1.AuthorizeCircuitBreaker
 */
export declare const authorizeCircuitBreaker: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgAuthorizeCircuitBreaker | MsgAuthorizeCircuitBreaker[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * TripCircuitBreaker pauses processing of Msg's in the state machine.
 * @name tripCircuitBreaker
 * @package cosmos.circuit.v1
 * @see proto service: cosmos.circuit.v1.TripCircuitBreaker
 */
export declare const tripCircuitBreaker: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgTripCircuitBreaker | MsgTripCircuitBreaker[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * ResetCircuitBreaker resumes processing of Msg's in the state machine that
 * have been been paused using TripCircuitBreaker.
 * @name resetCircuitBreaker
 * @package cosmos.circuit.v1
 * @see proto service: cosmos.circuit.v1.ResetCircuitBreaker
 */
export declare const resetCircuitBreaker: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgResetCircuitBreaker | MsgResetCircuitBreaker[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=tx.rpc.func.d.ts.map