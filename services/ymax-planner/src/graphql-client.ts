import { GraphQLClient } from 'graphql-request';
import type {
  RequestDocument,
  RequestOptions,
  Variables,
} from 'graphql-request';

import { Fail, q } from '@endo/errors';

import { objectMap } from '@agoric/internal';

import type { RequestLimits } from './config.ts';
import type { SimplePowers } from './main.ts';

const makeNotImplemented = (key: PropertyKey) => {
  const notImplemented = (..._args) => Fail`Not implemented: ${q(key)}`;
  return notImplemented;
};

const makeNotImplementedMethods = <T extends Record<PropertyKey, unknown>>(
  template: T,
): { [K in keyof T]: any } =>
  objectMap(template, (_, key) => makeNotImplemented(key));

/** https://github.com/graffle-js/graffle/blob/8ef08421e8d08f5c9302edfef9a5a221bdcf7d18/src/legacy/functions/request.ts#L56 */
const parseRequestArgs = <V extends Variables = Variables>(
  documentOrOptions: RequestDocument | RequestOptions<V>,
  variables?: V,
  requestHeaders?: HeadersInit,
): RequestOptions<V> => {
  return (documentOrOptions as RequestOptions<V>).document
    ? (documentOrOptions as RequestOptions<V>)
    : ({
        document: documentOrOptions as RequestDocument,
        variables,
        requestHeaders,
        signal: undefined,
      } as unknown as RequestOptions<V>);
};

/**
 * Construct a GraphQL client backed by one or more endpoints that implements
 * retry logic by round-robin failover.
 * Note that the resulting multi-client currently supports only the `request`
 * method.
 */
export const makeGraphqlMultiClient = (
  endpoints: string[],
  {
    delay,
    fetch,
    makeAbortController,
  }: Pick<SimplePowers, 'delay' | 'fetch' | 'makeAbortController'>,
  {
    headers: sharedHeaders,
    requestLimits = {},
  }: { headers?: HeadersInit; requestLimits?: Partial<RequestLimits> } = {},
): GraphQLClient => {
  endpoints.length > 0 || Fail`At least one endpoint is required`;
  const {
    timeout,
    maxRetries = 0,
    backoffBase = 300,
    maxBackoff = 1200,
  } = requestLimits;

  const clients = endpoints.map(url => {
    const client = new GraphQLClient(url, { fetch });
    if (sharedHeaders) client.setHeaders(sharedHeaders);
    return client;
  });

  let clientIdx = 0;
  const request: GraphQLClient['request'] = async (
    docOrOptions,
    ...variablesAndHeaders
  ) => {
    const [variables, headers] = variablesAndHeaders;
    const requestOptions = parseRequestArgs(docOrOptions, variables, headers);
    const sharedSignals = [requestOptions.signal].filter(
      (x => x) as (x: unknown) => x is AbortSignal,
    );
    const errors = [] as unknown[];
    await null;
    for (let i = 0; i <= maxRetries; i += 1) {
      const aborted = sharedSignals.find(signal => signal.aborted);
      if (aborted) {
        errors.push(aborted.reason);
        break;
      }

      // Per-endpoint exponential backoff with jitter.
      const failureCount = Math.floor(i / clients.length);
      if (failureCount) {
        const delayBase = 2 ** (failureCount - 1) * backoffBase;
        await delay(Math.min(Math.random() * delayBase, maxBackoff));
      }

      const client = clients[clientIdx];
      const { signal } = makeAbortController(timeout, sharedSignals);
      try {
        return await client.request({ ...requestOptions, signal });
      } catch (cause) {
        errors.push(Error(`Request to ${endpoints[i]} failed`, { cause }));
      }
      clientIdx = (clientIdx + 1) % clients.length;
    }
    throw AggregateError(errors);
  };
  const notImplemented = makeNotImplementedMethods({
    batchRequests: true,
    rawRequest: true,
    setEndpoint: true,
    setHeader: true,
    setHeaders: true,
  } as const);
  const multiClient: Omit<GraphQLClient, 'url' | 'requestConfig'> = {
    request,
    ...notImplemented,
  };
  Object.defineProperties(multiClient, {
    url: {
      get: makeNotImplemented('get url'),
      set: makeNotImplemented('set url'),
    },
    requestConfig: {
      get: makeNotImplemented('get requestConfig'),
      set: makeNotImplemented('set requestConfig'),
    },
  });
  return harden(multiClient as GraphQLClient);
};
harden(makeGraphqlMultiClient);
