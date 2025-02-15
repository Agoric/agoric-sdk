// @ts-nocheck
/* eslint-disable no-undef */
const nullUpgradePP = async powers => {
  const {
    consume: {
      provisionPoolStartResult: provisionPoolStartResultP,
      instancePrivateArgs: instancePrivateArgsP,
      economicCommitteeCreatorFacet,
    },
  } = powers;

  const { adminFacet, instance } = await provisionPoolStartResultP;
  const instancePrivateArgs = await instancePrivateArgsP;

  const privateArgs = instancePrivateArgs.get(instance);
  const [poolBank, poserInvitation] = await Promise.all([
    privateArgs.poolBank,
    E(economicCommitteeCreatorFacet).getPoserInvitation(),
  ]);

  await E(adminFacet).restartContract({
    ...privateArgs,
    poolBank,
    initialPoserInvitation: poserInvitation,
  });
  console.log('Done');
};

nullUpgradePP;
