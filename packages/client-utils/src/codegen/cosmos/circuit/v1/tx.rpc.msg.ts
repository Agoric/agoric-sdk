//@ts-nocheck
import { type Rpc } from '../../../helpers.js';
import { BinaryReader } from '../../../binary.js';
import {
  MsgAuthorizeCircuitBreaker,
  MsgAuthorizeCircuitBreakerResponse,
  MsgTripCircuitBreaker,
  MsgTripCircuitBreakerResponse,
  MsgResetCircuitBreaker,
  MsgResetCircuitBreakerResponse,
} from './tx.js';
/** Msg defines the circuit Msg service. */
export interface Msg {
  /**
   * AuthorizeCircuitBreaker allows a super-admin to grant (or revoke) another
   * account's circuit breaker permissions.
   */
  authorizeCircuitBreaker(
    request: MsgAuthorizeCircuitBreaker,
  ): Promise<MsgAuthorizeCircuitBreakerResponse>;
  /** TripCircuitBreaker pauses processing of Msg's in the state machine. */
  tripCircuitBreaker(
    request: MsgTripCircuitBreaker,
  ): Promise<MsgTripCircuitBreakerResponse>;
  /**
   * ResetCircuitBreaker resumes processing of Msg's in the state machine that
   * have been been paused using TripCircuitBreaker.
   */
  resetCircuitBreaker(
    request: MsgResetCircuitBreaker,
  ): Promise<MsgResetCircuitBreakerResponse>;
}
export class MsgClientImpl implements Msg {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
    this.rpc = rpc;
    this.authorizeCircuitBreaker = this.authorizeCircuitBreaker.bind(this);
    this.tripCircuitBreaker = this.tripCircuitBreaker.bind(this);
    this.resetCircuitBreaker = this.resetCircuitBreaker.bind(this);
  }
  authorizeCircuitBreaker(
    request: MsgAuthorizeCircuitBreaker,
  ): Promise<MsgAuthorizeCircuitBreakerResponse> {
    const data = MsgAuthorizeCircuitBreaker.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.circuit.v1.Msg',
      'AuthorizeCircuitBreaker',
      data,
    );
    return promise.then(data =>
      MsgAuthorizeCircuitBreakerResponse.decode(new BinaryReader(data)),
    );
  }
  tripCircuitBreaker(
    request: MsgTripCircuitBreaker,
  ): Promise<MsgTripCircuitBreakerResponse> {
    const data = MsgTripCircuitBreaker.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.circuit.v1.Msg',
      'TripCircuitBreaker',
      data,
    );
    return promise.then(data =>
      MsgTripCircuitBreakerResponse.decode(new BinaryReader(data)),
    );
  }
  resetCircuitBreaker(
    request: MsgResetCircuitBreaker,
  ): Promise<MsgResetCircuitBreakerResponse> {
    const data = MsgResetCircuitBreaker.encode(request).finish();
    const promise = this.rpc.request(
      'cosmos.circuit.v1.Msg',
      'ResetCircuitBreaker',
      data,
    );
    return promise.then(data =>
      MsgResetCircuitBreakerResponse.decode(new BinaryReader(data)),
    );
  }
}
