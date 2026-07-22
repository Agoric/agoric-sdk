import type { GraphQLClient, RequestOptions } from 'graphql-request';
import * as Operations from './graphql.ts';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];



export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    /**
     * Get the balances for an arbitrary number of deployed pool positions.
     *
     * Each position is identified by a blockchain (for EVM chains, a
     * '0x<upaddedLowercaseHexDigits>' representation of their EIP-155 CHAIN_ID [cf.
     * https://chainlist.org/ ]), protocol, pool within that protocol (corresponding
     * with e.g. an associated token, cf.
     * https://spectrumnodes.gitbook.io/docs/developer-guides/apis/pools-api/supported-pools
     * ), and address.
     *
     * Note that the output 'balance' is an object, from which you probably want the
     * "USDC" property (a floating-point number, each unit of which is 1e6 uudc).
     */
    getBalances(variables: Operations.GetBalancesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<Operations.GetBalancesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<Operations.GetBalancesQuery>({ document: Operations.GetBalancesDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'getBalances', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;