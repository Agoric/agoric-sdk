//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { QueryParamsRequest, QueryParamsResponse, QueryEgressRequest, QueryEgressResponse, QueryMailboxRequest, QueryMailboxResponse, } from '@agoric/cosmic-proto/codegen/agoric/swingset/query.js';
/**
 * Params queries params of the swingset module.
 * @name getParams
 * @package agoric.swingset
 * @see proto service: agoric.swingset.Params
 */
export const getParams = buildQuery({
    encode: QueryParamsRequest.encode,
    decode: QueryParamsResponse.decode,
    service: 'agoric.swingset.Query',
    method: 'Params',
    deps: [QueryParamsRequest, QueryParamsResponse],
});
/**
 * Egress queries a provisioned egress.
 * @name getEgress
 * @package agoric.swingset
 * @see proto service: agoric.swingset.Egress
 */
export const getEgress = buildQuery({
    encode: QueryEgressRequest.encode,
    decode: QueryEgressResponse.decode,
    service: 'agoric.swingset.Query',
    method: 'Egress',
    deps: [QueryEgressRequest, QueryEgressResponse],
});
/**
 * Return the contents of a peer's outbound mailbox.
 * @name getMailbox
 * @package agoric.swingset
 * @see proto service: agoric.swingset.Mailbox
 */
export const getMailbox = buildQuery({
    encode: QueryMailboxRequest.encode,
    decode: QueryMailboxResponse.decode,
    service: 'agoric.swingset.Query',
    method: 'Mailbox',
    deps: [QueryMailboxRequest, QueryMailboxResponse],
});
//# sourceMappingURL=query.rpc.func.js.map