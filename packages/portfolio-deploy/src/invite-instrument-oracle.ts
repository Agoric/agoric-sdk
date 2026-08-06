/** @file Deliver and redeem the singleton YMax instrument-oracle invitation. */
import type { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import { makeTracer } from '@agoric/internal';
import type { Bech32Address } from '@agoric/orchestration';
import type { StartedInstanceKit as ZStarted } from '@agoric/zoe/src/zoeService/utils.js';
import type { Details } from 'ses';
import type { RunTools } from './wallet-admin-types.ts';

const Usage = `invite-instrument-oracle ymax1 | ymax0`;
const INSTRUMENT_ORACLE_KEY = 'instrumentOracle';

type CFMethods = ZStarted<typeof YMaxStart>['creatorFacet'];
type YmaxContractName = 'ymax0' | 'ymax1';

function assertYmaxContractName(
  specimen: unknown,
  details?: Details,
): asserts specimen is YmaxContractName {
  assert(specimen === 'ymax0' || specimen === 'ymax1', details);
}

const trace = makeTracer('invite-instrument-oracle');

const inviteInstrumentOracle = async ({
  scriptArgs,
  makeAccount,
  walletKit,
}: RunTools) => {
  await null;
  const [contract] = scriptArgs;
  assertYmaxContractName(contract, Usage);

  const traceC = trace.sub(contract);
  const prefix = contract.toUpperCase();
  const { postalService, ...instances } = walletKit.agoricNames.instance;
  const controller = await makeAccount(`${prefix}_CTRL`);
  const oracle = await makeAccount(`${prefix}_INSTRUMENT_ORACLE`);
  const creatorFacet = controller.store.get<CFMethods>('creatorFacet');

  traceC('deliver instrument oracle invitation to', oracle.address);
  await creatorFacet.deliverInstrumentOracleInvitation(
    oracle.address as Bech32Address,
    postalService,
  );

  const instance = instances[contract];
  await oracle.store.saveOfferResult(
    { instance, description: INSTRUMENT_ORACLE_KEY },
    INSTRUMENT_ORACLE_KEY,
  );
  traceC('instrument oracle invitation redeemed');
};

export default inviteInstrumentOracle;
