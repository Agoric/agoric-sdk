/**
 * @import {EconomyBootstrapPowers} from './econ-behaviors'
 */

/* global E */
const trace = (...args) => console.log('VF Electorate', ...args);

/**
 * Replace the vaultFactory's electorate with the current one.
 *
 * @param {EconomyBootstrapPowers} powers
 */
const updateVaultFactoryElectorate = async ({
  consume: {
    economicCommitteeCreatorFacet: electorateCreatorFacet,
    vaultFactoryKit,
  },
}) => {
  trace('update vaultFactory electorate');

  const poserInvitation = await E(electorateCreatorFacet).getPoserInvitation();

  const creatorFacet = await E.get(vaultFactoryKit).governorCreatorFacet;
  await E(creatorFacet).replaceElectorate(poserInvitation);
  trace('done');
};
harden(updateVaultFactoryElectorate);

updateVaultFactoryElectorate; // completion value a la "export"
