// @ts-check

import { makeGovernedNat } from '@agoric/governance/src/paramMakers.js';

export const POOL_FEE_KEY = 'PoolFee';
export const PROTOCOL_FEE_KEY = 'ProtocolFee';

export const makeInitialValues = (poolFeeBP, protocolFeeBP) => {
  return harden([
    makeGovernedNat(POOL_FEE_KEY, poolFeeBP),
    makeGovernedNat(PROTOCOL_FEE_KEY, protocolFeeBP),
  ]);
};
