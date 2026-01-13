import type { GraphQLClient, RequestOptions } from 'graphql-request';
import * as Operations from './graphql.ts';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];



export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    /**
     * Get the balances for an arbitrary number of accounts.
     *
     * Each account is identified by a blockchain (for EVM chains, a
     * '0x<upaddedLowercaseHexDigits>'' representation of their EIP-155 CHAIN_ID [cf.
     * https://chainlist.org/ ]), address, and token (for EVM chains, a
     * '0x<hexDigits>' representation of its contract address, visible on e.g.
     * https://coinmarketcap.com/ ).
     *
     * Note that the output 'balance' is a decimal string representing a floating-point
     * token balance (e.g., each unit of which is 1e6 micro-units).
     */
    getBalances(variables: Operations.GetBalancesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<Operations.GetBalancesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<Operations.GetBalancesQuery>({ document: Operations.GetBalancesDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'getBalances', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;