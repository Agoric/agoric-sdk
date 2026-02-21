import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgAuthorizeCircuitBreaker, MsgAuthorizeCircuitBreakerResponse, MsgTripCircuitBreaker, MsgTripCircuitBreakerResponse, MsgResetCircuitBreaker, MsgResetCircuitBreakerResponse, } from '@agoric/cosmic-proto/codegen/cosmos/circuit/v1/tx.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.authorizeCircuitBreaker = this.authorizeCircuitBreaker.bind(this);
        this.tripCircuitBreaker = this.tripCircuitBreaker.bind(this);
        this.resetCircuitBreaker = this.resetCircuitBreaker.bind(this);
    }
    authorizeCircuitBreaker(request) {
        const data = MsgAuthorizeCircuitBreaker.encode(request).finish();
        const promise = this.rpc.request('cosmos.circuit.v1.Msg', 'AuthorizeCircuitBreaker', data);
        return promise.then(data => MsgAuthorizeCircuitBreakerResponse.decode(new BinaryReader(data)));
    }
    tripCircuitBreaker(request) {
        const data = MsgTripCircuitBreaker.encode(request).finish();
        const promise = this.rpc.request('cosmos.circuit.v1.Msg', 'TripCircuitBreaker', data);
        return promise.then(data => MsgTripCircuitBreakerResponse.decode(new BinaryReader(data)));
    }
    resetCircuitBreaker(request) {
        const data = MsgResetCircuitBreaker.encode(request).finish();
        const promise = this.rpc.request('cosmos.circuit.v1.Msg', 'ResetCircuitBreaker', data);
        return promise.then(data => MsgResetCircuitBreakerResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=tx.rpc.msg.js.map