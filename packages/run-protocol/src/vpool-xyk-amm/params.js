// @ts-check

import {
  CONTRACT_ELECTORATE,
  makeParamManager,
  ParamTypes,
} from '@agoric/governance';
import { makeStoredPublisherKit } from '@agoric/notifier';

export const POOL_FEE_KEY = 'PoolFee';
export const PROTOCOL_FEE_KEY = 'ProtocolFee';
export const MIN_INITIAL_POOL_LIQUIDITY_KEY = 'MinInitialPoolLiquidity';

const DEFAULT_POOL_FEE_BP = 24n;
const DEFAULT_PROTOCOL_FEE_BP = 6n;

/**
 * @param {ERef<ZoeService>} zoe
 * @param {bigint} poolFeeBP
 * @param {bigint} protocolFeeBP
 * @param {Amount} minInitialLiquidity
 * @param {Invitation} poserInvitation - invitation for the question poser
 */
const makeAmmParamManager = async (
  zoe,
  poolFeeBP,
  protocolFeeBP,
  minInitialLiquidity,
  poserInvitation,
) => {
  return makeParamManager(
    // TODO https://github.com/Agoric/agoric-sdk/issues/5386
    makeStoredPublisherKit(),
    {
      [POOL_FEE_KEY]: [ParamTypes.NAT, poolFeeBP],
      [PROTOCOL_FEE_KEY]: [ParamTypes.NAT, protocolFeeBP],
      [MIN_INITIAL_POOL_LIQUIDITY_KEY]: [
        ParamTypes.AMOUNT,
        minInitialLiquidity,
      ],
      [CONTRACT_ELECTORATE]: [ParamTypes.INVITATION, poserInvitation],
    },
    zoe,
  );
};

const makeAmmParams = (
  electorateInvitationAmount,
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
      value: electorateInvitationAmount,
    },
  });
};

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

harden(makeAmmParamManager);
harden(makeAmmTerms);
harden(makeAmmParams);

export { makeAmmParamManager, makeAmmTerms, makeAmmParams };
