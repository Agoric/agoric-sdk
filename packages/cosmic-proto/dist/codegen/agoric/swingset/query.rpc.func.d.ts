import { QueryParamsRequest, QueryParamsResponse, QueryEgressRequest, QueryEgressResponse, QueryMailboxRequest, QueryMailboxResponse } from './query.js';
/**
 * Params queries params of the swingset module.
 * @name getParams
 * @package agoric.swingset
 * @see proto service: agoric.swingset.Params
 */
export declare const getParams: (client: import("../../helper-func-types.js").EndpointOrRpc, request: QueryParamsRequest) => Promise<QueryParamsResponse>;
/**
 * Egress queries a provisioned egress.
 * @name getEgress
 * @package agoric.swingset
 * @see proto service: agoric.swingset.Egress
 */
export declare const getEgress: (client: import("../../helper-func-types.js").EndpointOrRpc, request: QueryEgressRequest) => Promise<QueryEgressResponse>;
/**
 * Return the contents of a peer's outbound mailbox.
 * @name getMailbox
 * @package agoric.swingset
 * @see proto service: agoric.swingset.Mailbox
 */
export declare const getMailbox: (client: import("../../helper-func-types.js").EndpointOrRpc, request: QueryMailboxRequest) => Promise<QueryMailboxResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map