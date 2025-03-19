import type { BaseChainInfo } from './orchestration-api.ts';

/**
 * Info for an Ethereum-based chain.
 */
export interface EIP155ChainInfo extends BaseChainInfo {
  namespace: 'eip155';
  /** namespace + reference required for non-cosmos chains. eip155 chain references are always natural numbers */
  chainId: `eip155:${number}`;
}
