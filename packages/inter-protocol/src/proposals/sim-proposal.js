import { Stable } from '@agoric/vats/src/tokens.js';
import { fundAMM } from './demoIssuers.js';

// XXX from core-proposal.js

export const SIM_CHAIN_MANIFEST = harden({
  [fundAMM.name]: {
    consume: {
      centralSupplyBundle: true,
      mintHolderBundle: true,
      chainTimerService: 'timer',
      bldIssuerKit: true,
      feeMintAccess: true,
      loadVat: true,
      mints: 'mints',
      priceAuthorityVat: 'priceAuthority',
      priceAuthorityAdmin: 'priceAuthority',
      vaultFactoryKit: 'VaultFactory',
      zoe: true,
    },
    installation: {
      consume: { centralSupply: 'zoe' },
    },
    issuer: {
      consume: { [Stable.symbol]: 'zoe' },
    },
    brand: {
      consume: { [Stable.symbol]: 'zoe' },
    },
    instance: {
      consume: { amm: 'amm' },
    },
  },
});
