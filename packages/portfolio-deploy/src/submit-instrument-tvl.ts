/** @file Submit an instrument TVL update through a saved oracle entry. */
import type { InstrumentOracle } from '@aglocal/portfolio-contract/src/instrument-oracle.exo.ts';
import { PoolPlaces, type PoolKey } from '@agoric/portfolio-api/src/places.js';
import { makeTracer } from '@agoric/internal';
import { parseArgs } from 'node:util';
import type { RunTools } from './wallet-admin-types.ts';

const Usage = `submit-instrument-tvl ymax1|ymax0 --pool-key <PoolKey> --tvl-usd <Nat> --as-of <Unix-seconds>`;
const INSTRUMENT_ORACLE_KEY = 'instrumentOracle';

type YmaxContractName = 'ymax0' | 'ymax1';

export type SubmitInstrumentTvlArgs = {
  contract: YmaxContractName;
  poolKey: PoolKey;
  tvlUsd: bigint;
  asOf: number;
};

const requireNatString = (value: string | undefined, name: string): string => {
  if (!value || !/^\d+$/.test(value)) {
    throw Error(`${name} must be a non-negative integer; ${Usage}`);
  }
  return value;
};

export const parseSubmitInstrumentTvlArgs = (
  scriptArgs: string[],
): SubmitInstrumentTvlArgs => {
  const { positionals, values } = parseArgs({
    args: scriptArgs,
    allowPositionals: true,
    options: {
      'pool-key': { type: 'string' },
      'tvl-usd': { type: 'string' },
      'as-of': { type: 'string' },
    },
  });
  const [contract, ...extra] = positionals;
  if ((contract !== 'ymax0' && contract !== 'ymax1') || extra.length > 0) {
    throw Error(Usage);
  }

  const poolKey = values['pool-key'];
  if (!poolKey || !Object.hasOwn(PoolPlaces, poolKey)) {
    throw Error(`unregistered instrument ${JSON.stringify(poolKey)}; ${Usage}`);
  }
  const tvlUsd = BigInt(requireNatString(values['tvl-usd'], '--tvl-usd'));
  const asOfText = requireNatString(values['as-of'], '--as-of');
  const asOf = Number(asOfText);
  if (!Number.isSafeInteger(asOf)) {
    throw Error(`--as-of must be a safe integer; ${Usage}`);
  }

  return {
    contract,
    poolKey: poolKey as PoolKey,
    tvlUsd,
    asOf,
  };
};

const trace = makeTracer('submit-instrument-tvl');

const submitInstrumentTvl = async ({ scriptArgs, makeAccount }: RunTools) => {
  const { contract, poolKey, tvlUsd, asOf } =
    parseSubmitInstrumentTvlArgs(scriptArgs);
  const prefix = contract.toUpperCase();
  const operator = await makeAccount(`${prefix}_INSTRUMENT_ORACLE`);
  const oracle = operator.store.get<InstrumentOracle>(INSTRUMENT_ORACLE_KEY);
  const result = await oracle.submitTvlUpdate(poolKey, tvlUsd, asOf);
  trace.sub(contract)('submitted', { poolKey, tvlUsd, asOf, result });
};

export default submitInstrumentTvl;
