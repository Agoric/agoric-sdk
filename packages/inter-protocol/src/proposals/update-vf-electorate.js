const trace = (...args) => console.log('ReplaceFeeDistributer', ...args);

/**
 * Replace the vaultFactory's electorate with the current one.
 *
 * @param {import('./econ-behaviors').EconomyBootstrapPowers} powers
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
  trace('donee');
};
harden(updateVaultFactoryElectorate);

updateVaultFactoryElectorate; // completion value a la "export"
