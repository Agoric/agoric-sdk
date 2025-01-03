import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';

const trace = makeTracer('ReplaceFeeDistributer', true);

/**
 * Replace the vaultFactory's electorate with the current one.
 *
 * @param {import('./econ-behaviors').EconomyBootstrapPowers} powers
 */
export const updateVaultFactoryElectorate = async ({
  consume: {
    economicCommitteeCreatorFacet: electorateCreatorFacet,
    vaultFactoryKit,
  },
}) => {
  trace('update vaultFactory electorate');

  const poserInvitation = await E(electorateCreatorFacet).getPoserInvitation();

  const creatorFacet = await E.get(vaultFactoryKit).governorCreatorFacet;
  await E(creatorFacet).replaceElectorate(poserInvitation);
};
harden(updateVaultFactoryElectorate);

export const getManifestForUpdateVaultFactoryElectorate = async () => ({
  manifest: {
    [updateVaultFactoryElectorate.name]: {
      consume: {
        economicCommitteeCreatorFacet: true,
        vaultFactoryKit: true,
      },
    },
  },
});
