import { deeplyFulfilledObject } from '@agoric/internal';
import { E } from '@endo/far';
import { reserveThenDeposit } from './utils.js';

const { values } = Object;

/** @type {<X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

const EC_HIGH_PRIORITY_SENDERS_NAMESPACE = 'economicCommittee';

/**
 * @param {import('./econ-behaviors.js').EconomyBootstrapPowers} powers
 * @param {{ options: { voterAddresses: Record<string, string> } }} param1
 */
export const inviteCommitteeMembers = async (
  {
    consume: { namesByAddressAdmin, economicCommitteeCreatorFacet, ...consume },
  },
  { options: { voterAddresses } },
) => {
  const invitations = await E(
    economicCommitteeCreatorFacet,
  ).getVoterInvitations();
  assert.equal(invitations.length, values(voterAddresses).length);

  const highPrioritySendersManager = await consume.highPrioritySendersManager;

  /** @param {[string, Promise<Invitation>][]} addrInvitations */
  const distributeInvitations = async addrInvitations => {
    await Promise.all(
      addrInvitations.map(async ([addr, invitationP]) => {
        const debugName = `econ committee member ${addr}`;
        await reserveThenDeposit(debugName, namesByAddressAdmin, addr, [
          invitationP,
        ]).catch(err => console.error(`failed deposit to ${debugName}`, err));
        if (highPrioritySendersManager) {
          await E(highPrioritySendersManager).add(
            EC_HIGH_PRIORITY_SENDERS_NAMESPACE,
            addr,
          );
        }
      }),
    );
  };

  // This doesn't resolve until the committee members create their smart wallets.
  // Don't block bootstrap on it.
  void distributeInvitations(zip(values(voterAddresses), invitations));
};

harden(inviteCommitteeMembers);

/** @param {import('./econ-behaviors.js').EconomyBootstrapPowers} powers */
export const startEconCharter = async ({
  consume: { zoe },
  produce: { econCharterKit },
  installation: {
    consume: { binaryVoteCounter: counterP, econCommitteeCharter: installP },
  },
  instance: {
    produce: { econCommitteeCharter: instanceP },
  },
}) => {
  const [charterInstall, counterInstall] = await Promise.all([
    installP,
    counterP,
  ]);
  const terms = await deeplyFulfilledObject(
    harden({
      binaryVoteCounterInstallation: counterInstall,
    }),
  );

  /** @type {Promise<import('./econ-behaviors.js').EconCharterStartResult>} */
  const startResult = E(zoe).startInstance(
    charterInstall,
    undefined,
    terms,
    undefined,
    'econCommitteeCharter',
  );
  instanceP.resolve(E.get(startResult).instance);
  econCharterKit.resolve(startResult);
};
harden(startEconCharter);

/**
 * Introduce charter to governed creator facets.
 *
 * @param {import('./econ-behaviors.js').EconomyBootstrapPowers} powers
 */
export const addGovernorsToEconCharter = async ({
  consume: { reserveKit, vaultFactoryKit, econCharterKit, auctioneerKit },
  instance: {
    consume: { reserve, VaultFactory, auctioneer },
  },
}) => {
  const { creatorFacet } = E.get(econCharterKit);

  await Promise.all(
    [
      {
        label: 'reserve',
        instanceP: reserve,
        facetP: E.get(reserveKit).governorCreatorFacet,
      },
      {
        label: 'VaultFactory',
        instanceP: VaultFactory,
        facetP: E.get(vaultFactoryKit).governorCreatorFacet,
      },
      {
        label: 'auctioneer',
        instanceP: auctioneer,
        facetP: E.get(auctioneerKit).governorCreatorFacet,
      },
    ].map(async ({ label, instanceP, facetP }) => {
      const [instance, govFacet] = await Promise.all([instanceP, facetP]);

      return E(creatorFacet).addInstance(instance, govFacet, label);
    }),
  );
};

harden(addGovernorsToEconCharter);

/**
 * @param {import('./econ-behaviors.js').EconomyBootstrapPowers} powers
 * @param {{ options: { voterAddresses: Record<string, string> } }} param1
 */
export const inviteToEconCharter = async (
  { consume: { namesByAddressAdmin, econCharterKit } },
  { options: { voterAddresses } },
) => {
  const { creatorFacet } = E.get(econCharterKit);

  // This doesn't resolve until the committee members create their smart wallets.
  // Don't block bootstrap on it.
  void Promise.all(
    values(voterAddresses).map(async addr => {
      const debugName = `econ charter member ${addr}`;
      reserveThenDeposit(debugName, namesByAddressAdmin, addr, [
        E(creatorFacet).makeCharterMemberInvitation(),
      ]).catch(err => console.error(`failed deposit to ${debugName}`, err));
    }),
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
        consume: {
          namesByAddressAdmin: t,
          economicCommitteeCreatorFacet: t,
          highPrioritySendersManager: t,
        },
      },
      [startEconCharter.name]: {
        consume: { zoe: t },
        produce: { econCharterKit: t },
        installation: {
          consume: { binaryVoteCounter: t, econCommitteeCharter: t },
        },
        instance: {
          produce: { econCommitteeCharter: t },
        },
      },
      [addGovernorsToEconCharter.name]: {
        consume: {
          auctioneerKit: t,
          econCharterKit: t,
          zoe: t,
          agoricNames: t,
          namesByAddressAdmin: t,
          economicCommitteeCreatorFacet: t,
          reserveKit: t,
          vaultFactoryKit: t,
        },
        installation: {
          consume: { binaryVoteCounter: t },
        },
        instance: {
          consume: { auctioneer: t, reserve: t, VaultFactory: t },
        },
      },
      [inviteToEconCharter.name]: {
        consume: { namesByAddressAdmin: t, econCharterKit: t },
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
