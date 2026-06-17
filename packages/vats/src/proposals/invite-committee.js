import { deeplyFulfilledObject } from '@agoric/internal';
import { E } from '@endo/far';
import { reserveThenDeposit } from './reserve-then-deposit.js';

/**
 * @import {Installation, Instance, Invitation} from '@agoric/zoe';
 * @import {StartedInstanceKit} from '@agoric/zoe/src/zoeService/utils.js';
 * @import {CommitteeElectorateCreatorFacet} from '@agoric/governance/src/committee.js';
 * @import {start as CharterStart} from '@agoric/governance/src/econCommitteeCharter.js';
 * @import {BootstrapPowers, Producer} from '../core/types.js';
 */

/**
 * Relocated from `@agoric/inter-protocol` (refs #12719). Invites the economic
 * committee members and stands up the (generic) charter through which they pose
 * governance questions. The only governed contract that remains is provisionPool
 * (in this package), so addGovernorsToEconCharter registers it instead of the
 * former Inter Protocol contracts.
 *
 * @typedef {StartedInstanceKit<typeof CharterStart>} EconCharterStartResult
 */

/**
 * @typedef {BootstrapPowers & {
 *   consume: {
 *     economicCommitteeCreatorFacet: Promise<CommitteeElectorateCreatorFacet>;
 *     econCharterKit: Promise<EconCharterStartResult>;
 *   };
 *   produce: { econCharterKit: Producer<EconCharterStartResult> };
 * }} EconCommitteePowers
 */

const { values } = Object;

/** @type {<X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

const EC_HIGH_PRIORITY_SENDERS_NAMESPACE = 'economicCommittee';

/**
 * @param {EconCommitteePowers} powers
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

/** @param {EconCommitteePowers} powers */
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
  const [charterInstall0, counterInstall] = await Promise.all([
    installP,
    counterP,
  ]);
  // vats types the econCommitteeCharter installation generically (by name);
  // narrow it to the governance charter contract.
  const charterInstall = /** @type {Installation<typeof CharterStart>} */ (
    charterInstall0
  );
  const terms = await deeplyFulfilledObject(
    harden({
      binaryVoteCounterInstallation: counterInstall,
    }),
  );

  /** @type {Promise<EconCharterStartResult>} */
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
 * Introduce the (only remaining) governed contract, provisionPool, to the
 * charter so the committee can vote on its parameters.
 *
 * @param {EconCommitteePowers} powers
 */
export const addGovernorsToEconCharter = async ({
  consume: { econCharterKit, provisionPoolStartResult },
}) => {
  const { creatorFacet } = E.get(econCharterKit);

  const ppKit = await provisionPoolStartResult;
  await E(creatorFacet).addInstance(
    ppKit.instance,
    ppKit.governorCreatorFacet,
    'provisionPool',
  );
};

harden(addGovernorsToEconCharter);

/**
 * @param {EconCommitteePowers} powers
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
          econCharterKit: t,
          provisionPoolStartResult: t,
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
