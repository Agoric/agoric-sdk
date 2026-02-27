/* eslint-disable */
import * as types from './graphql.js';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
  '"""\n  Get the balances for an arbitrary number of deployed pool positions.\n  \n  Each position is identified by a blockchain (for EVM chains, a\n  \'0x<upaddedLowercaseHexDigits>\' representation of their EIP-155 CHAIN_ID [cf.\n  https://chainlist.org/ ]), protocol, pool within that protocol (corresponding\n  with e.g. an associated token, cf.\n  https://spectrumnodes.gitbook.io/docs/developer-guides/apis/pools-api/supported-pools\n  ), and address.\n  \n  Note that the output \'balance\' is an object, from which you probably want the\n  "USDC" property (a floating-point number, each unit of which is 1e6 uudc).\n"""\nquery getBalances($positions: [ProtocolPoolUserBalanceInput!]!) {\n  balances: getProtocolPoolUserBalance(input: $positions) {\n    chain\n    protocol\n    pool\n    balance\n    error\n  }\n}': typeof types.GetBalancesDocument;
};
const documents: Documents = {
  '"""\n  Get the balances for an arbitrary number of deployed pool positions.\n  \n  Each position is identified by a blockchain (for EVM chains, a\n  \'0x<upaddedLowercaseHexDigits>\' representation of their EIP-155 CHAIN_ID [cf.\n  https://chainlist.org/ ]), protocol, pool within that protocol (corresponding\n  with e.g. an associated token, cf.\n  https://spectrumnodes.gitbook.io/docs/developer-guides/apis/pools-api/supported-pools\n  ), and address.\n  \n  Note that the output \'balance\' is an object, from which you probably want the\n  "USDC" property (a floating-point number, each unit of which is 1e6 uudc).\n"""\nquery getBalances($positions: [ProtocolPoolUserBalanceInput!]!) {\n  balances: getProtocolPoolUserBalance(input: $positions) {\n    chain\n    protocol\n    pool\n    balance\n    error\n  }\n}':
    types.GetBalancesDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: '"""\n  Get the balances for an arbitrary number of deployed pool positions.\n  \n  Each position is identified by a blockchain (for EVM chains, a\n  \'0x<upaddedLowercaseHexDigits>\' representation of their EIP-155 CHAIN_ID [cf.\n  https://chainlist.org/ ]), protocol, pool within that protocol (corresponding\n  with e.g. an associated token, cf.\n  https://spectrumnodes.gitbook.io/docs/developer-guides/apis/pools-api/supported-pools\n  ), and address.\n  \n  Note that the output \'balance\' is an object, from which you probably want the\n  "USDC" property (a floating-point number, each unit of which is 1e6 uudc).\n"""\nquery getBalances($positions: [ProtocolPoolUserBalanceInput!]!) {\n  balances: getProtocolPoolUserBalance(input: $positions) {\n    chain\n    protocol\n    pool\n    balance\n    error\n  }\n}',
): typeof import('./graphql.js').GetBalancesDocument;

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
