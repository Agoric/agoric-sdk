import { deeplyFulfilledObject } from '@agoric/internal';
import { E } from '@endo/far';
import { reserveThenDeposit } from './utils.js';

const { values } = Object;

/** @type { <X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

/**
 * @param {import('./econ-behaviors').EconomyBootstrapPowers} powers
 * @param {{ options: { voterAddresses: Record<string, string> }}} param1
 */
export const inviteCommitteeMembers = async (
  {
    consume: {
      zoe,
      agoricNames,
      namesByAddressAdmin,
      economicCommitteeCreatorFacet,
      reserveGovernorCreatorFacet,
      ammGovernorCreatorFacet,
      vaultFactoryGovernorCreator,
    },
    produce: { econCharterStartResult },
    installation: {
      consume: { binaryVoteCounter: counterP },
    },
    instance: {
      consume: { amm, reserve, VaultFactory },
    },
  },
  { options: { voterAddresses } },
) => {
  // FIXME: why doesn't this use the promise space?
  /** @type {[Installation, Installation]} */
  const [charterInstall, counterInstall] = await Promise.all([
    E(agoricNames).lookup('installation', 'econCommitteeCharter'),
    counterP,
  ]);
  const terms = await deeplyFulfilledObject(
    harden({
      binaryVoteCounterInstallation: counterInstall,
    }),
  );
  /** @type {Promise<import('./econ-behaviors').EconCharterStartResult>} */
  const startResult = E(zoe).startInstance(charterInstall, undefined, terms);
  const { creatorFacet } = E.get(startResult);
  econCharterStartResult.resolve(startResult);

  // Introduce charter to governed creator facets.
  await Promise.all(
    [
      { instanceP: amm, facetP: ammGovernorCreatorFacet },
      { instanceP: reserve, facetP: reserveGovernorCreatorFacet },
      {
        instanceP: VaultFactory,
        facetP: vaultFactoryGovernorCreator,
      },
    ].map(async ({ instanceP, facetP }) => {
      const [instance, govFacet] = await Promise.all([instanceP, facetP]);

      return E(creatorFacet).addInstance(instance, govFacet);
    }),
  );

  const invitations = await E(
    economicCommitteeCreatorFacet,
  ).getVoterInvitations();
  assert.equal(invitations.length, values(voterAddresses).length);

  /**
   * @param {[string, Promise<Invitation>][]} addrInvitations
   */
  const distributeInvitations = async addrInvitations => {
    await Promise.all(
      addrInvitations.map(async ([addr, invitationP]) => {
        const [voterInvitation, nullInvitation] = await Promise.all([
          invitationP,
          E(creatorFacet).makeCharterMemberInvitation(),
        ]);
        await reserveThenDeposit(
          `econ committee member ${addr}`,
          namesByAddressAdmin,
          addr,
          [voterInvitation, nullInvitation],
        );
      }),
    );
  };

  await distributeInvitations(zip(values(voterAddresses), invitations));
};

harden(inviteCommitteeMembers);

export const getManifestForInviteCommittee = async (
  { restoreRef },
  { voterAddresses, econCommitteeCharterRef },
) => {
  const t = true;
  return {
    manifest: {
      [inviteCommitteeMembers.name]: {
        produce: { econCharterStartResult: t },
        consume: {
          zoe: t,
          agoricNames: t,
          namesByAddressAdmin: t,
          economicCommitteeCreatorFacet: t,
          reserveGovernorCreatorFacet: t,
          ammGovernorCreatorFacet: t,
          vaultFactoryGovernorCreator: t,
        },
        installation: {
          consume: { binaryVoteCounter: t },
        },
        instance: {
          consume: { amm: t, reserve: t, VaultFactory: t },
        },
      },
    },
    installations: {
      econCommitteeCharter: restoreRef(econCommitteeCharterRef),
    },
    options: {
      voterAddresses,
    },
  };
};
