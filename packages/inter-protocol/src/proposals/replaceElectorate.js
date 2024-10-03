// @ts-check
import { E } from '@endo/eventual-send';
import { Fail } from '@endo/errors';
import {
  assertPathSegment,
  makeStorageNodeChild,
} from '@agoric/internal/src/lib-chainStorage.js';
import { reserveThenDeposit } from './utils.js';

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

const handlehighPrioritySendersList = async (
  { consume: { highPrioritySendersManager: highPrioritySendersManagerP } },
  { options: { highPrioritySendersConfig } },
) => {
  const HIGH_PRIORITY_SENDERS_NAMESPACE = 'economicCommittee';
  const highPrioritySendersManager = await highPrioritySendersManagerP;

  highPrioritySendersManager || Fail`highPrioritySendersManager is not defined`;

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

const startNewEconomicCommittee = async (
  {
    consume: { board, chainStorage, zoe },
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

  const startResult = await E(zoe).startInstance(
    committee,
    {},
    { committeeName, committeeSize },
    privateArgs,
    'economicCommittee',
  );
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

export const replaceElectorate = async (permittedPowers, config) => {
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

harden(replaceElectorate);

export const getManifestForReplaceElectorate = async (
  { economicCommitteeRef: _economicCommitteeRef },
  options,
) => ({
  manifest: {
    [replaceElectorate.name]: {
      consume: {
        psmKit: true,
        governedContractKits: true,
        chainStorage: true,
        diagnostics: true,
        highPrioritySendersManager: true,
        namesByAddressAdmin: true,
        // Rest of these are designed to be widely shared
        board: true,
        zoe: true,
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
