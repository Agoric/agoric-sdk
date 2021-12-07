// @ts-check

import { makeParamManagerBuilder } from '@agoric/governance';
import { CONTRACT_ELECTORATE } from '@agoric/governance/src/paramGovernance/governParam.js';
import {
  makeGovernedNat,
  makeGovernedInvitation,
} from '@agoric/governance/src/paramGovernance/paramMakers.js';

export const POOL_FEE_KEY = 'PoolFee';
export const PROTOCOL_FEE_KEY = 'ProtocolFee';

// TODO(cth)   did the type get declared?

/** @type {(poolFeeBP: bigint, protocolFeeBP: bigint) => ParamManagerFull} */
const makeParamManager = async (
  zoe,
  poolFeeBP,
  protocolFeeBP,
  poserInvitation,
) => {
  const builder = makeParamManagerBuilder(zoe)
    .addNat(POOL_FEE_KEY, poolFeeBP)
    .addNat(PROTOCOL_FEE_KEY, protocolFeeBP);

  await builder.addInvitation(CONTRACT_ELECTORATE, poserInvitation);
  return builder.build();
};

const makeAmmParams = (
  electorateInvitationAmount,
  protocolFeeBP,
  poolFeeBP,
) => {
  return harden({
    [POOL_FEE_KEY]: makeGovernedNat(poolFeeBP),
    [PROTOCOL_FEE_KEY]: makeGovernedNat(protocolFeeBP),
    [CONTRACT_ELECTORATE]: makeGovernedInvitation(electorateInvitationAmount),
  });
};

harden(makeAmmParams);
harden(makeParamManager);

export { makeAmmParams, makeParamManager };
