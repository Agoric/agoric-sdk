/** @file start a repl with ymax wallet-admin bindings */
import type { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import type { ContractControl } from '@agoric/deploy-script-support/src/control/contract-control.contract.js';
import { once } from 'node:events';
import repl from 'node:repl';
import type { RunTools } from './wallet-admin-types.ts';
import { WALLET_KEY } from './ymax-admin-helpers.ts';

const startYmaxRepl = async ({
  E,
  harden,
  makeAccount,
  walletKit,
}: RunTools) => {
  const account = await makeAccount('MNEMONIC');
  const ymaxControl =
    account.store.get<ContractControl<typeof YMaxStart>>(WALLET_KEY);

  const tools = {
    E,
    harden,
    networkConfig: account.networkConfig,
    walletKit,
    signing: account,
    walletStore: account.store,
    [WALLET_KEY]: ymaxControl,
  };
  console.error('bindings:', Object.keys(tools).join(', '));
  console.log(account.address);

  const session = repl.start({ prompt: 'ymax> ', useGlobal: true });
  Object.assign(session.context, tools);
  await once(session, 'exit');
};

export default startYmaxRepl;
