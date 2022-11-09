import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';

export const POOL_FEE_KEY = 'PoolFee';
export const PROTOCOL_FEE_KEY = 'ProtocolFee';
export const MIN_INITIAL_POOL_LIQUIDITY_KEY = 'MinInitialPoolLiquidity';

const DEFAULT_POOL_FEE_BP = 24n;
const DEFAULT_PROTOCOL_FEE_BP = 6n;

/**
 * @param {Invitation} electorateInvitation - invitation for the question poser
 * @param {bigint} protocolFeeBP
 * @param {bigint} poolFeeBP
 * @param {Amount<'nat'>} minInitialLiquidity
 */
const makeAmmParams = (
  electorateInvitation,
  protocolFeeBP,
  poolFeeBP,
  minInitialLiquidity,
) => {
  return harden({
    [POOL_FEE_KEY]: { type: ParamTypes.NAT, value: poolFeeBP },
    [PROTOCOL_FEE_KEY]: { type: ParamTypes.NAT, value: protocolFeeBP },
    [MIN_INITIAL_POOL_LIQUIDITY_KEY]: {
      type: ParamTypes.AMOUNT,
      value: minInitialLiquidity,
    },
    [CONTRACT_ELECTORATE]: {
      type: ParamTypes.INVITATION,
      value: electorateInvitation,
    },
  });
};

/** @typedef {import('@agoric/governance/src/contractGovernance/typedParamManager').ParamTypesMapFromRecord<ReturnType<typeof makeAmmParams>>} AmmParams */

const makeAmmTerms = (
  timer,
  poserInvitationAmount,
  minInitialLiquidity,
  protocolFeeBP = DEFAULT_PROTOCOL_FEE_BP,
  poolFeeBP = DEFAULT_POOL_FEE_BP,
) => ({
  timer,
  poolFeeBP,
  protocolFeeBP,
  governedParams: makeAmmParams(
    poserInvitationAmount,
    protocolFeeBP,
    poolFeeBP,
    minInitialLiquidity,
  ),
});

harden(makeAmmTerms);
harden(makeAmmParams);

export { makeAmmTerms, makeAmmParams };
