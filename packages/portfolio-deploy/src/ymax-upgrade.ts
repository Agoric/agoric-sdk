/** @file upgrade ymax using ymaxControl */
import type { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import type { ContractControl } from '@agoric/deploy-script-support/src/control/contract-control.contract.js';
import { makeTracer } from '@agoric/internal';
import {
  CONTROL_ADDRESSES,
  PORTFOLIO_CONTRACT_NAMES,
  YMAX_CONTROL_WALLET_KEY as WALLET_KEY,
} from '@agoric/portfolio-api/src/portfolio-constants.js';
import { parseArgs } from 'node:util';
import type { RunTools } from './wallet-admin-types.ts';

const parseToolArgs = (args: string[]) =>
  parseArgs({
    args,
    options: {
      contract: { type: 'string', default: 'ymax0' },
      bundle: { type: 'string' },
      overrides: { type: 'string' },
    },
  });
const trace = makeTracer('ymax-upgrade');

const netOfConfig = (c: { chainName: string }) =>
  c.chainName === 'agoric-3' ? 'main' : 'devnet';

const checkContract = (
  contract: string,
  address: string,
  net: 'main' | 'devnet',
) => {
  const traceC = trace.sub(contract);
  traceC.sub(WALLET_KEY)(address);

  if (!(PORTFOLIO_CONTRACT_NAMES as readonly string[]).includes(contract))
    throw Error(`contract? ${contract}`);
  if (address !== CONTROL_ADDRESSES[contract][net])
    throw Error(`wrong MNEMONIC for ${contract} on ${net}`);
};

const upgradeYmax = async ({ scriptArgs, makeAccount, cwd }: RunTools) => {
  const {
    contract,
    bundle: bundleId,
    overrides,
  } = parseToolArgs(scriptArgs).values;
  if (!bundleId) throw Error('--bundle missing');

  const privateArgsOverrides = await (overrides
    ? cwd.readOnly().join(overrides).readJSON()
    : {});

  // XXX use different env var per account?
  const account = await makeAccount(`MNEMONIC`);
  const net = netOfConfig(account.networkConfig);
  checkContract(contract, account.address, net);

  const ymaxControl =
    account.store.get<ContractControl<typeof YMaxStart>>(WALLET_KEY);

  await ymaxControl.upgrade({ bundleId, privateArgsOverrides });
};

export default upgradeYmax;
