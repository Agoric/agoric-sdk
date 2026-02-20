//@ts-nocheck
import { buildQuery } from '../../helper-func-types.js';
import {
  QueryParamsRequest,
  QueryParamsResponse,
  QueryEgressRequest,
  QueryEgressResponse,
  QueryMailboxRequest,
  QueryMailboxResponse,
} from './query.js';
/**
 * Params queries params of the swingset module.
 * @name getParams
 * @package agoric.swingset
 * @see proto service: agoric.swingset.Params
 */
export const getParams = buildQuery<QueryParamsRequest, QueryParamsResponse>({
  encode: QueryParamsRequest.encode,
  decode: QueryParamsResponse.decode,
  service: 'agoric.swingset.Query',
  method: 'Params',
});
/**
 * Egress queries a provisioned egress.
 * @name getEgress
 * @package agoric.swingset
 * @see proto service: agoric.swingset.Egress
 */
export const getEgress = buildQuery<QueryEgressRequest, QueryEgressResponse>({
  encode: QueryEgressRequest.encode,
  decode: QueryEgressResponse.decode,
  service: 'agoric.swingset.Query',
  method: 'Egress',
});
/**
 * Return the contents of a peer's outbound mailbox.
 * @name getMailbox
 * @package agoric.swingset
 * @see proto service: agoric.swingset.Mailbox
 */
export const getMailbox = buildQuery<QueryMailboxRequest, QueryMailboxResponse>(
  {
    encode: QueryMailboxRequest.encode,
    decode: QueryMailboxResponse.decode,
    service: 'agoric.swingset.Query',
    method: 'Mailbox',
  },
);
