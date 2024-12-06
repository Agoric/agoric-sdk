import type { ERef } from '@endo/far';

import type { Denom, DenomAmount, ChainAddress } from '@agoric/orchestration';

export type ChainName = string;
export type AcctAddrValue = string;

/**
 * @see {ChainAddress}, which actually names an account on a chain.
 * Like a widely-held deposit-facet.
 */
export type MockChainAcctAddr = {
  chainId: ChainName;
  value: AcctAddrValue; // acctAddrValue
};

/**
 * @see {OrchestrationAccount}
 */
export type MockOrchAccount = {
  getAddress(): MockChainAcctAddr;
  getBalances(): ERef<DenomAmount[]>;
  getBalance(denom: Denom): ERef<DenomAmount>;
  transfer(destAddr: MockChainAcctAddr, denomAmount: DenomAmount): ERef<void>;
};

/**
 * @see {ChainInfo}, which is in the intersection of the existing
 * `ChainInfo` possibilities.
 */
export type MockChainInfo = {
  chainId: ChainName;
};

/**
 * @see {DenomInfo}
 */
export type MockDenomInfo = {
  // Omitting "brand" from DenomInfo in order to get clearer layering
  // brand: Brand;
  // eslint-disable-next-line no-use-before-define
  chain: MockChain;
};

/**
 * @see {Chain}
 */
export type MockChain = {
  getChainInfo(): ERef<MockChainInfo>;
  makeAccount(): ERef<MockOrchAccount>;
};

/**
 * @see {Orchestrator}
 */
export type MockOrchestrator = {
  getChain(chainName: ChainName): ERef<MockChain>;
  getDenomInfo(denom: Denom): MockDenomInfo;
  // Omitting "asAmount" from Orchestrator in order to get clearer layering
  // asAmount(denomAmount: DenomAmount): Amount;
};
