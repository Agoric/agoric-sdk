// @ts-check

import {
  makeParamManagerBuilder,
  CONTRACT_ELECTORATE,
  makeGovernedNat,
  makeGovernedInvitation,
} from '@agoric/governance';

export const POOL_FEE_KEY = 'PoolFee';
export const PROTOCOL_FEE_KEY = 'ProtocolFee';

const DEFAULT_POOL_FEE_BP = 24n;
const DEFAULT_PROTOCOL_FEE_BP = 6n;

/**
 * @param {ERef<ZoeService>} zoe
 * @param {bigint} poolFeeBP
 * @param {bigint} protocolFeeBP
 * @param {Invitation} poserInvitation - invitation for the question poser
 */
const makeAmmParamManager = async (
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

const makeAmmTerms = (
  timer,
  poserInvitationAmount,
  protocolFeeBP = DEFAULT_PROTOCOL_FEE_BP,
  poolFeeBP = DEFAULT_POOL_FEE_BP,
) => ({
  timer,
  poolFeeBP,
  protocolFeeBP,
  main: makeAmmParams(poserInvitationAmount, protocolFeeBP, poolFeeBP),
});

harden(makeAmmParamManager);
harden(makeAmmTerms);
harden(makeAmmParams);

export { makeAmmParamManager, makeAmmTerms, makeAmmParams };
