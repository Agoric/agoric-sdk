/* global startPSM */
// @ts-nocheck

/**
 * @typedef {{
 *   denom: string;
 *   keyword?: string;
 *   proposedName?: string;
 *   decimalPlaces?: number;
 * }} AnchorOptions
 */

/** @type {AnchorOptions} */
const DAI = {
  keyword: 'DAI',
  decimalPlaces: 18,
  denom: 'ibc/toydai',
  proposedName: 'Maker DAI',
};

const config = {
  options: { anchorOptions: DAI },
  WantMintedFeeBP: 1n,
  GiveMintedFeeBP: 3n,
  MINT_LIMIT: 0n,
};

/** @param {unknown} permittedPowers see gov-add-psm-permit.json */
const govAddPsm = async permittedPowers => {
  console.log('starting PSM:', DAI);
  const {
    consume: { feeMintAccess: _, ...restC },
    ...restP
  } = permittedPowers;
  const noMinting = { consume: restC, ...restP };
  await Promise.all([
    startPSM.makeAnchorAsset(noMinting, {
      options: { anchorOptions: DAI },
    }),
    startPSM.startPSM(permittedPowers, config),
  ]);
  console.log('started PSM:', config);
};

// "export" from script
govAddPsm;
