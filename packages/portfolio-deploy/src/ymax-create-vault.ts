/** @file create vault via ymaxControl.creatorFacet */
import type { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import {
  TargetAllocationShape,
  type VaultConfig,
} from '@aglocal/portfolio-contract/src/type-guards.js';
import { makeTracer, mustMatch, type TypedPattern } from '@agoric/internal';
import { PORTFOLIO_CONTRACT_NAMES } from '@agoric/portfolio-api/src/portfolio-constants.js';
import { parseArgs } from 'node:util';
import type { RunTools } from './wallet-admin-types.ts';

const parseArgValues = (args: string[]) =>
  parseArgs({
    args,
    options: {
      contract: { type: 'string', default: 'ymax0' },
      allocation: { type: 'string' },
      fee: { type: 'string', default: '0.5bps' },
      cadence: { type: 'string', default: 'P1H' },
    },
  });

const trace = makeTracer('ymax-create-vault');

const parseTypedJSON = <T>(
  json: string,
  shape: TypedPattern<T>,
  reviver?: (k, v) => unknown,
  makeError?: (err) => unknown,
): T => {
  try {
    const result = harden(JSON.parse(json, reviver));
    mustMatch(result, shape);
    return result;
  } catch (err) {
    throw makeError ? makeError(err) : err;
  }
};

const parseVaultConfig = (
  values: ReturnType<typeof parseArgValues>['values'],
): VaultConfig => {
  const { fee, cadence, ...rest } = values;

  if (!rest.allocation) throw Error('--allocation missing');
  if (!fee) throw Error('--fee missing');
  if (!cadence) throw Error('--cadence missing');

  const allocation = parseTypedJSON(
    rest.allocation,
    TargetAllocationShape,
    (_k, v) => (typeof v === 'number' ? BigInt(v) : v),
    err => Error(`Invalid target allocation JSON: ${err.message}`),
  );

  return harden({ fee, cadence, allocation });
};

const createVault = async ({ scriptArgs, makeAccount }: RunTools) => {
  const { values } = parseArgValues(scriptArgs);
  const { contract } = values;

  if (!(PORTFOLIO_CONTRACT_NAMES as readonly string[]).includes(contract)) {
    throw Error(`contract? ${contract}`);
  }
  const traceC = trace.sub(contract);
  const accountKey = `${contract.toUpperCase()}_CTRL`;
  const ctrlAcct = await makeAccount(accountKey);
  traceC.sub('ymaxControl')(ctrlAcct.address);

  const vaultConfig = parseVaultConfig(values);
  trace('vaultConfig', vaultConfig);

  // ASSUME creatorFacet is already in the store.
  // const ymaxControl =
  //   ctrlAcct.store.get<ContractControl<typeof YMaxStart>>(WALLET_KEY);
  // await ctrlAcct.saveAs('creatorFacet').getCreatorFacet();

  type CreatorFacet = Awaited<ReturnType<typeof YMaxStart>>['creatorFacet'];
  const creatorFacet = ctrlAcct.store.get<CreatorFacet>('creatorFacet');
  const result = await creatorFacet.createVault(vaultConfig);
  console.log(JSON.stringify(result));
};

export default createVault;
