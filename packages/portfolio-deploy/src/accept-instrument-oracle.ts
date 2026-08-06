/** @file Accept and save an instrument-oracle invitation in the operator wallet. */
import { makeTracer } from '@agoric/internal';
import { Fail } from '@endo/errors';
import type { Details } from 'ses';
import type { RunTools } from './wallet-admin-types.ts';

const Usage = `accept-instrument-oracle ymax1 | ymax0`;
const INSTRUMENT_ORACLE_KEY = 'instrumentOracle';
type YmaxContractName = 'ymax0' | 'ymax1';

function assertYmaxContractName(
  specimen: unknown,
  details?: Details,
): asserts specimen is YmaxContractName {
  assert(specimen === 'ymax0' || specimen === 'ymax1', details);
}

const trace = makeTracer('accept-instrument-oracle');

const acceptInstrumentOracle = async ({
  scriptArgs,
  makeAccount,
  walletKit,
}: RunTools) => {
  const [contract] = scriptArgs;
  assertYmaxContractName(contract, Usage);

  const prefix = contract.toUpperCase();
  const oracle = await makeAccount(`${prefix}_INSTRUMENT_ORACLE`);
  const instance =
    walletKit.agoricNames.instance[contract] ||
    Fail`missing ${contract} instance in agoricNames`;
  await oracle.store.saveOfferResult(
    { instance, description: INSTRUMENT_ORACLE_KEY },
    INSTRUMENT_ORACLE_KEY,
  );
  trace.sub(contract)('instrument oracle invitation accepted', oracle.address);
};

export default acceptInstrumentOracle;
