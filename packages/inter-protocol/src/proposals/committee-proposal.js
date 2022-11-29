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
  { consume: { namesByAddressAdmin, economicCommitteeCreatorFacet } },
  { options: { voterAddresses } },
) => {
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
        await reserveThenDeposit(
          `econ committee member ${addr}`,
          namesByAddressAdmin,
          addr,
          [invitationP],
        );
      }),
    );
  };

  await distributeInvitations(zip(values(voterAddresses), invitations));
};

harden(inviteCommitteeMembers);

/**
 * @param {import('./econ-behaviors').EconomyBootstrapPowers} powers
 */
export const startEconCharter = async ({
  consume: { zoe, agoricNames },
  produce: { econCharterStartResult },
  installation: {
    consume: { binaryVoteCounter: counterP },
  },
}) => {
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
  econCharterStartResult.resolve(startResult);
};
harden(startEconCharter);

/**
 * @param {import('./econ-behaviors').EconomyBootstrapPowers} powers
 */
export const addGovernorsToEconCharter = async ({
  consume: {
    reserveGovernorCreatorFacet,
    ammGovernorCreatorFacet,
    vaultFactoryGovernorCreator,
    econCharterStartResult,
  },
  instance: {
    consume: { amm, reserve, VaultFactory },
  },
}) => {
  const { creatorFacet } = E.get(econCharterStartResult);

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
};

harden(addGovernorsToEconCharter);

/**
 * @param {import('./econ-behaviors').EconomyBootstrapPowers} powers
 * @param {{ options: { voterAddresses: Record<string, string> }}} param1
 */
export const inviteToEconCharter = async (
  { consume: { namesByAddressAdmin, econCharterStartResult } },
  { options: { voterAddresses } },
) => {
  const { creatorFacet } = E.get(econCharterStartResult);

  await Promise.all(
    values(voterAddresses).map(async addr =>
      reserveThenDeposit(
        `econ charter member ${addr}`,
        namesByAddressAdmin,
        addr,
        [E(creatorFacet).makeCharterMemberInvitation()],
      ),
    ),
  );
};

harden(inviteToEconCharter);

export const getManifestForInviteCommittee = async (
  { restoreRef },
  { voterAddresses, econCommitteeCharterRef },
) => {
  const t = true;
  return {
    manifest: {
      [inviteCommitteeMembers.name]: {
        consume: { namesByAddressAdmin: t, economicCommitteeCreatorFacet: t },
      },
      [startEconCharter.name]: {
        consume: { zoe: t, agoricNames: t },
        produce: { econCharterStartResult: t },
        installation: {
          consume: { binaryVoteCounter: t },
        },
      },
      [addGovernorsToEconCharter.name]: {
        consume: {
          reserveGovernorCreatorFacet: t,
          ammGovernorCreatorFacet: t,
          vaultFactoryGovernorCreator: t,
          econCharterStartResult: t,
        },
        instance: {
          consume: { amm: t, reserve: t, VaultFactory: t },
        },
      },
      [inviteToEconCharter.name]: {
        consume: { namesByAddressAdmin: t, econCharterStartResult: t },
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
