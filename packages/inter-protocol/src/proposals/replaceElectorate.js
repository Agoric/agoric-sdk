/**
 * @file A proposal to replace the EC committee and charter.
 *
 *   This script manages configuration updates, distributes invitations, and
 *   establishes committees using specified voter addresses and related
 *   parameters.
 *
 *   See `@agoric/builders/scripts/inter-protocol/replace-electorate-core.js` for
 *   the proposal builder.
 */

// @ts-check
import { E } from '@endo/eventual-send';
import {
  assertPathSegment,
  makeStorageNodeChild,
} from '@agoric/internal/src/lib-chainStorage.js';
import { reserveThenDeposit } from './utils.js';

/** @import {EconomyBootstrapPowers} from './econ-behaviors.js' */
/** @import {CommitteeElectorateCreatorFacet} from '@agoric/governance/src/committee.js'; */

const trace = (...args) => console.log('GovReplaceCommiteeAndCharter', ...args);

const traced = (label, x) => {
  trace(label, x);
  return x;
};

const { values } = Object;

/** @type {<X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

/** @type {(name: string) => string} */
const sanitizePathSegment = name => {
  const candidate = name.replace(/[ ,]/g, '_');
  assertPathSegment(candidate);
  return candidate;
};

/**
 * Handles the configuration updates for high-priority senders list by adding or
 * removing addresses.
 *
 * @param {EconomyBootstrapPowers} powers - The bootstrap powers required for
 *   economic operations.
 * @param {{
 *   options: {
 *     highPrioritySendersConfig: {
 *       addressesToAdd: string[];
 *       addressesToRemove: string[];
 *     };
 *   };
 * }} config
 *   - The configuration object containing lists of addresses to add or remove.
 */
const handlehighPrioritySendersList = async (
  { consume: { highPrioritySendersManager: highPrioritySendersManagerP } },
  { options: { highPrioritySendersConfig } },
) => {
  const HIGH_PRIORITY_SENDERS_NAMESPACE = 'economicCommittee';
  const highPrioritySendersManager = await highPrioritySendersManagerP;

  if (!highPrioritySendersManager) {
    throw assert.error(`highPrioritySendersManager is not defined`);
  }

  const { addressesToAdd, addressesToRemove } = highPrioritySendersConfig;

  await Promise.all(
    addressesToAdd.map(addr =>
      E(highPrioritySendersManager).add(
        HIGH_PRIORITY_SENDERS_NAMESPACE,
        traced('High Priority Senders: adding', addr),
      ),
    ),
  );

  await Promise.all(
    addressesToRemove.map(addr =>
      E(highPrioritySendersManager).remove(
        HIGH_PRIORITY_SENDERS_NAMESPACE,
        traced('High Priority Senders: removing', addr),
      ),
    ),
  );
};

/**
 * Invites Economic Committee (EC) members by distributing voting invitations to
 * the specified addresses.
 *
 * @param {EconomyBootstrapPowers} powers - The bootstrap powers required for
 *   economic operations, including `namesByAddressAdmin` used for managing
 *   names.
 * @param {{
 *   options: {
 *     voterAddresses: Record<string, string>;
 *     economicCommitteeCreatorFacet: CommitteeElectorateCreatorFacet;
 *   };
 * }} config
 *   - The configuration object containing voter addresses and the economic
 *       committee facet to create voter invitations.
 *
 * @returns {Promise<void>} A promise that resolves once the invitations have
 *   been distributed.
 */
const inviteECMembers = async (
  { consume: { namesByAddressAdmin } },
  { options: { voterAddresses = {}, economicCommitteeCreatorFacet } },
) => {
  trace('Create invitations for new committee');

  const invitations = await E(
    economicCommitteeCreatorFacet,
  ).getVoterInvitations();
  assert.equal(invitations.length, values(voterAddresses).length);

  trace('Distribute invitations');
  /** @param {[string, Promise<Invitation>][]} addrInvitations */
  const distributeInvitations = async addrInvitations => {
    await Promise.all(
      addrInvitations.map(async ([addr, invitationP]) => {
        const [voterInvitation] = await Promise.all([invitationP]);
        trace('Sending voting invitations to', addr);
        await reserveThenDeposit(
          `econ committee member ${addr}`,
          namesByAddressAdmin,
          addr,
          [voterInvitation],
        );
      }),
    );
  };

  await distributeInvitations(zip(values(voterAddresses), invitations));
};

/**
 * Starts a new Economic Committee (EC) by creating an instance with the
 * provided committee specifications.
 *
 * @param {EconomyBootstrapPowers} powers - The resources and capabilities
 *   required to start the committee.
 * @param {{
 *   options: {
 *     committeeName: string;
 *     committeeSize: number;
 *   };
 * }} config
 *   - Configuration object containing the name and size of the committee.
 *
 * @returns {Promise<CommitteeElectorateCreatorFacet>} A promise that resolves
 *   to the creator facet of the newly created EC instance.
 */
const startNewEconomicCommittee = async (
  {
    consume: { board, chainStorage, startUpgradable },
    produce: { economicCommitteeKit, economicCommitteeCreatorFacet },
    installation: {
      consume: { committee },
    },
    instance: {
      produce: { economicCommittee },
    },
  },
  { options: { committeeName, committeeSize } },
) => {
  const COMMITTEES_ROOT = 'committees';

  trace('startNewEconomicCommittee');

  trace(`committeeName ${committeeName}`);
  trace(`committeeSize ${committeeSize}`);

  const committeesNode = await makeStorageNodeChild(
    chainStorage,
    COMMITTEES_ROOT,
  );
  const storageNode = await E(committeesNode).makeChildNode(
    sanitizePathSegment(committeeName),
  );

  const marshaller = await E(board).getPublishingMarshaller();

  trace('Starting new EC Committee Instance');

  const privateArgs = {
    storageNode,
    marshaller,
  };

  const terms = {
    committeeName,
    committeeSize,
  };

  const startResult = await E(startUpgradable)({
    label: 'economicCommittee',
    installation: committee,
    privateArgs,
    terms,
  });

  const { instance, creatorFacet } = startResult;

  trace('Started new EC Committee Instance Successfully');

  economicCommitteeKit.reset();
  economicCommitteeKit.resolve(
    harden({ ...startResult, label: 'economicCommittee' }),
  );

  economicCommittee.reset();
  economicCommittee.resolve(instance);

  economicCommitteeCreatorFacet.reset();
  economicCommitteeCreatorFacet.resolve(creatorFacet);

  return creatorFacet;
};

/**
 * Replaces the electorate for governance contracts by creating a new Economic
 * Committee and updating contracts with the new electorate's creator facet.
 *
 * @param {EconomyBootstrapPowers} permittedPowers - The resources and
 *   capabilities needed for operations, including access to governance
 *   contracts and the PSM kit.
 * @param {{
 *   options: {
 *     committeeName: string;
 *     voterAddresses: Record<string, string>;
 *     highPrioritySendersConfig: {
 *       addressesToAdd: string[];
 *       addressesToRemove: string[];
 *     };
 *   };
 * }} config
 *   - Configuration object containing the committee details and governance options.
 *
 * @returns {Promise<void>} A promise that resolves when the electorate has been
 *   replaced.
 */
export const replaceAllElectorates = async (permittedPowers, config) => {
  const { committeeName, voterAddresses, highPrioritySendersConfig } =
    config.options;

  const economicCommitteeCreatorFacet = await startNewEconomicCommittee(
    permittedPowers,
    {
      options: {
        committeeName,
        committeeSize: values(voterAddresses).length,
      },
    },
  );

  const governedContractKitsMap =
    await permittedPowers.consume.governedContractKits;
  const psmKitMap = await permittedPowers.consume.psmKit;

  const governanceDetails = [
    ...[...governedContractKitsMap.values()].map(governedContractKit => ({
      creatorFacet: governedContractKit.governorCreatorFacet,
      label: governedContractKit.label,
    })),
    ...[...psmKitMap.values()].map(psmKit => ({
      creatorFacet: psmKit.psmGovernorCreatorFacet,
      label: psmKit.label,
    })),
  ];

  await Promise.all(
    governanceDetails.map(async ({ creatorFacet, label }) => {
      trace(`Getting PoserInvitation for ${label}...`);
      const newElectoratePoser = await E(
        economicCommitteeCreatorFacet,
      ).getPoserInvitation();
      trace(`Successfully received newElectoratePoser for ${label}`);

      trace(`Replacing electorate for ${label}`);
      await E(creatorFacet).replaceElectorate(newElectoratePoser);
      trace(`Successfully replaced electorate for ${label}`);
    }),
  );

  await inviteECMembers(permittedPowers, {
    options: {
      voterAddresses,
      economicCommitteeCreatorFacet,
    },
  });

  await handlehighPrioritySendersList(permittedPowers, {
    options: {
      highPrioritySendersConfig,
    },
  });

  trace('Installed New Economic Committee');
};

harden(replaceAllElectorates);

export const getManifestForReplaceAllElectorates = async (
  { economicCommitteeRef: _economicCommitteeRef },
  options,
) => ({
  manifest: {
    [replaceAllElectorates.name]: {
      consume: {
        psmKit: true,
        governedContractKits: true,
        chainStorage: true,
        highPrioritySendersManager: true,
        namesByAddressAdmin: true,
        // Rest of these are designed to be widely shared
        board: true,
        startUpgradable: true,
      },
      produce: {
        economicCommitteeKit: true,
        economicCommitteeCreatorFacet: 'economicCommittee',
      },
      installation: {
        consume: { committee: 'zoe' },
      },
      instance: {
        produce: { economicCommittee: 'economicCommittee' },
      },
    },
  },
  options: { ...options },
});
