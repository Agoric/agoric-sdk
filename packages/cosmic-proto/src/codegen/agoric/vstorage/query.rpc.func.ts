//@ts-nocheck
import { buildQuery } from '../../helper-func-types.js';
import {
  QueryDataRequest,
  QueryDataResponse,
  QueryCapDataRequest,
  QueryCapDataResponse,
  QueryChildrenRequest,
  QueryChildrenResponse,
} from './query.js';
/**
 * Return the raw string value of an arbitrary vstorage datum.
 * @name getData
 * @package agoric.vstorage
 * @see proto service: agoric.vstorage.Data
 */
export const getData = buildQuery<QueryDataRequest, QueryDataResponse>({
  encode: QueryDataRequest.encode,
  decode: QueryDataResponse.decode,
  service: 'agoric.vstorage.Query',
  method: 'Data',
  deps: [QueryDataRequest, QueryDataResponse],
});
/**
 * Return a formatted representation of a vstorage datum that must be
 * a valid StreamCell with CapData values, or standalone CapData.
 * @name getCapData
 * @package agoric.vstorage
 * @see proto service: agoric.vstorage.CapData
 */
export const getCapData = buildQuery<QueryCapDataRequest, QueryCapDataResponse>(
  {
    encode: QueryCapDataRequest.encode,
    decode: QueryCapDataResponse.decode,
    service: 'agoric.vstorage.Query',
    method: 'CapData',
    deps: [QueryCapDataRequest, QueryCapDataResponse],
  },
);
/**
 * Return the children of a given vstorage path.
 * @name getChildren
 * @package agoric.vstorage
 * @see proto service: agoric.vstorage.Children
 */
export const getChildren = buildQuery<
  QueryChildrenRequest,
  QueryChildrenResponse
>({
  encode: QueryChildrenRequest.encode,
  decode: QueryChildrenResponse.decode,
  service: 'agoric.vstorage.Query',
  method: 'Children',
  deps: [QueryChildrenRequest, QueryChildrenResponse],
});
