import { E } from '@endo/far';
import { makeTracer } from '@agoric/internal/src/index.js';

const trace = makeTracer('upgrade Vaults proposal');

export const upgradeReserve = async (powers, options) => {
  trace('Initiate Reserve contract upgrade');

  const {
    consume: {
      reserveKit,
      economicCommitteeCreatorFacet,
      feeMintAccess: feeMintAccessP,
      instancePrivateArgs: instancePrivateArgsP,
    },
  } = powers;

  const {
    options: { contractRef },
  } = options;

  const { adminFacet, instance } = await reserveKit;
  
  const instancePrivateArgs = await instancePrivateArgsP;
  const privateArgs = instancePrivateArgs.get(instance);

  const feeMintAccess = await feeMintAccessP;

  const initialPoserInvitation = await E(
    economicCommitteeCreatorFacet,
  ).getPoserInvitation();

  const newPrivateArgs = harden({
    ...privateArgs,
    feeMintAccess,
    initialPoserInvitation,
  });

  await E(adminFacet).upgradeContract(contractRef.bundleID, newPrivateArgs);

  trace('Reserve contract upgraded!');
};

export const getManifestForReserveUpgrade = (
  { restoreRef },
  { contractRef },
) => ({
  manifest: {
    [upgradeReserve.name]: {
      consume: {
        reserveKit: true,
        instancePrivateArgs: true,
        feeMintAccess: true,
        economicCommitteeCreatorFacet: true,
      },
    },
  },
  installations: { reserve: restoreRef(contractRef) },
  options: { contractRef },
});
