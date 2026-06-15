/** @file shared helpers for ymax wallet-admin modules */
import type { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.js';
import type { ContractControl } from '@agoric/deploy-script-support/src/control/contract-control.contract.js';
import { makeTracer } from '@agoric/internal';
import {
  CONTROL_ADDRESSES,
  PORTFOLIO_CONTRACT_NAMES,
  YMAX_CONTROL_WALLET_KEY as WALLET_KEY,
} from '@agoric/portfolio-api/src/portfolio-constants.js';
import type { RunTools } from './wallet-admin-types.ts';

export { WALLET_KEY };

const trace = makeTracer('ymax-admin');

export const netOfConfig = (c: { chainName: string }) =>
  c.chainName === 'agoric-3' ? 'main' : 'devnet';

/** @deprecated Creator facets are now always stored under `creatorFacet`. */
export const getCreatorFacetKey = (_contract: string): string => 'creatorFacet';

export const checkContract = (
  contract: string,
  address: string,
  net: 'main' | 'devnet',
) => {
  const traceC = trace.sub(contract);
  traceC.sub(WALLET_KEY)(address);

  if (!(PORTFOLIO_CONTRACT_NAMES as readonly string[]).includes(contract)) {
    throw Error(`contract? ${contract}`);
  }
  if (address !== CONTROL_ADDRESSES[contract][net]) {
    throw Error(`wrong MNEMONIC for ${contract} on ${net}`);
  }
};

export const getYmaxControlKit = async (
  makeAccount: RunTools['makeAccount'],
  contract: string,
) => {
  const account = await makeAccount('MNEMONIC');
  const net = netOfConfig(account.networkConfig);
  checkContract(contract, account.address, net);
  const ymaxControl =
    account.store.get<ContractControl<typeof YMaxStart>>(WALLET_KEY);
  return { account, net, ymaxControl };
};
