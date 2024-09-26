/* global E */
// @ts-check
/// <reference types="@agoric/vats/src/core/core-eval-env"/>
/// <reference types="@agoric/vats/src/core/types-ambient"/>
const { Fail } = assert;

const runConfig = {
  committeeName: 'Economic Committee',
  economicCommitteeAddresses: {
    gov1: 'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
    // gov2: 'agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang',
    // gov3: 'agoric1w8wktaur4zf8qmmtn3n7x3r0jhsjkjntcm3u6h',
    // gov4: 'agoric1p2aqakv3ulz4qfy2nut86j9gx0dx0yw09h96md',
  },
  economicCommitteeAddressesToRemove: {
    gov1: 'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
    gov2: 'agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang',
    gov3: 'agoric1w8wktaur4zf8qmmtn3n7x3r0jhsjkjntcm3u6h',
    // gov4: 'agoric1p2aqakv3ulz4qfy2nut86j9gx0dx0yw09h96md',
  },
};

const trace = (...args) => console.log('GovReplaceCommiteeAndCharter', ...args);

const { values } = Object;

/** @type {<X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

/**
 * @import {NameAdmin} from '@agoric/vats';
 */

/**
 * @param {NameAdmin} nameAdmin
 * @param {string[][]} paths
 */
const reserveThenGetNamePaths = async (nameAdmin, paths) => {
  /**
   * @param {NameAdmin} nextAdmin
   * @param {string[]} path
   */
  const nextPath = async (nextAdmin, path) => {
    const [nextName, ...rest] = path;
    assert.typeof(nextName, 'string');

    // Ensure we wait for the next name until it exists.
    await E(nextAdmin).reserve(nextName);

    if (rest.length === 0) {
      // Now return the readonly lookup of the name.
      const nameHub = E(nextAdmin).readonly();
      return E(nameHub).lookup(nextName);
    }

    // Wait until the next admin is resolved.
    const restAdmin = await E(nextAdmin).lookupAdmin(nextName);
    return nextPath(restAdmin, rest);
  };

  return Promise.all(
    paths.map(async path => {
      Array.isArray(path) || Fail`path ${path} is not an array`;
      return nextPath(nameAdmin, path);
    }),
  );
};

const DEPOSIT_FACET = 'depositFacet';

const reserveThenDeposit = async (
  debugName,
  namesByAddressAdmin,
  addr,
  payments,
) => {
  console.info('waiting for', debugName);
  const [depositFacet] = await reserveThenGetNamePaths(namesByAddressAdmin, [
    [addr, DEPOSIT_FACET],
  ]);
  console.info('depositing to', debugName);
  await Promise.all(payments.map(payment => E(depositFacet).receive(payment)));
  console.info('confirmed deposit for', debugName);
};

const handlehighPrioritySendersList = async ({
  consume: { highPrioritySendersManager: highPrioritySendersManagerP },
}) => {
  const EC_HIGH_PRIORITY_SENDERS_NAMESPACE = 'economicCommittee';

  const highPrioritySendersManager = await highPrioritySendersManagerP;

  const voterAddressesToAdd = Object.values(
    runConfig.economicCommitteeAddresses,
  );
  const voterAddressesToRemove = Object.values(
    runConfig.economicCommitteeAddressesToRemove,
  );

  // Create Sets from the arrays for efficient lookup
  const addSet = new Set(voterAddressesToAdd);
  const removeSet = new Set(voterAddressesToRemove);

  // Filter out common elements from both sets
  const uniqueAddAddresses = voterAddressesToAdd.filter(
    address => !removeSet.has(address),
  );
  const uniqueRemoveAddresses = voterAddressesToRemove.filter(
    address => !addSet.has(address),
  );

  if (highPrioritySendersManager) {
    // Add the addresses
    for (const address of uniqueAddAddresses) {
      await E(highPrioritySendersManager).add(
        EC_HIGH_PRIORITY_SENDERS_NAMESPACE,
        address,
      );
    }
    // Remove the addresses
    for (const address of uniqueRemoveAddresses) {
      await E(highPrioritySendersManager).remove(
        EC_HIGH_PRIORITY_SENDERS_NAMESPACE,
        address,
      );
    }
  }
};

const inviteECMembers = async (
  { consume: { namesByAddressAdmin, economicCommitteeCreatorFacet } },
  { options: { voterAddresses = {} } },
) => {
  // Get generated invitations
  const invitations = await E(
    economicCommitteeCreatorFacet,
  ).getVoterInvitations();
  assert.equal(invitations.length, values(voterAddresses).length);

  // Distribute invitations
  /** @param {[string, Promise<Invitation>][]} addrInvitations */
  const distributeInvitations = async addrInvitations => {
    await Promise.all(
      addrInvitations.map(async ([addr, invitationP]) => {
        const [voterInvitation] = await Promise.all([invitationP]);
        trace('sending voting invitations to', addr);
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

const inviteToEconCharter = async (
  { consume: { namesByAddressAdmin, econCharterKit } },
  { options: { voterAddresses } },
) => {
  const { creatorFacet } = E.get(econCharterKit);

  void Promise.all(
    values(voterAddresses).map(async addr => {
      const debugName = `econ charter member ${addr}`;
      reserveThenDeposit(debugName, namesByAddressAdmin, addr, [
        E(creatorFacet).makeCharterMemberInvitation(),
      ]).catch(err => console.error(`failed deposit to ${debugName}`, err));
    }),
  );
};

/**
 * @param {ERef<StorageNode>} storageNodeRef
 * @param {string} childName
 * @returns {Promise<StorageNode>}
 */
async function makeStorageNodeChild(storageNodeRef, childName) {
  return E(storageNodeRef).makeChildNode(childName);
}

const pathSegmentPattern = /^[a-zA-Z0-9_-]{1,100}$/;

/** @type {(name: string) => void} */
const assertPathSegment = name => {
  pathSegmentPattern.test(name) ||
    Fail`Path segment names must consist of 1 to 100 characters limited to ASCII alphanumerics, underscores, and/or dashes: ${name}`;
};

/** @type {(name: string) => string} */
const sanitizePathSegment = name => {
  const candidate = name.replace(/[ ,]/g, '_');
  assertPathSegment(candidate);
  return candidate;
};

const startNewEconomicCommittee = async ({
  consume: { board, chainStorage, zoe },
  produce: { economicCommitteeCreatorFacet },
  installation: {
    consume: { committee },
  },
  instance: {
    produce: { economicCommittee },
  },
}) => {
  const COMMITTEES_ROOT = 'committees';
  trace('startNewEconomicCommittee');
  const { committeeName } = runConfig;
  const committeeSize = Object.values(
    runConfig.economicCommitteeAddresses,
  ).length;

  const committeesNode = await makeStorageNodeChild(
    chainStorage,
    COMMITTEES_ROOT,
  );
  const storageNode = await E(committeesNode).makeChildNode(
    sanitizePathSegment(committeeName),
  );

  const marshaller = await E(board).getPublishingMarshaller();

  trace('Starting new EC Committee Instance');
  const { instance, creatorFacet } = await E(zoe).startInstance(
    committee,
    {},
    { committeeName, committeeSize },
    {
      storageNode,
      marshaller,
    },
    'economicCommittee',
  );
  trace('Started new EC Committee Instance Successfully');

  economicCommittee.reset();
  economicCommittee.resolve(instance);

  economicCommitteeCreatorFacet.reset();
  economicCommitteeCreatorFacet.resolve(creatorFacet);
};

const startNewEconCharter = async ({
  consume: { zoe },
  produce: { econCharterKit },
  installation: {
    consume: { binaryVoteCounter: counterP, econCommitteeCharter: installP },
  },
  instance: {
    produce: { econCommitteeCharter },
  },
}) => {
  const [charterInstall, counterInstall] = await Promise.all([
    installP,
    counterP,
  ]);
  const terms = await harden({
    binaryVoteCounterInstallation: counterInstall,
  });

  trace('Starting new EC Charter Instance');
  const startResult = E(zoe).startInstance(
    charterInstall,
    undefined,
    terms,
    undefined,
    'econCommitteeCharter',
  );
  trace('Started new EC Charter Instance Successfully');

  econCommitteeCharter.reset();
  econCommitteeCharter.resolve(E.get(startResult).instance);

  econCharterKit.reset();
  econCharterKit.resolve(startResult);
};

const addGovernorsToEconCharter = async ({
  consume: {
    reserveKit,
    vaultFactoryKit,
    econCharterKit,
    auctioneerKit,
    psmKit,
  },
  instance: {
    consume: { reserve, VaultFactory, auctioneer },
  },
}) => {
  const { creatorFacet } = E.get(econCharterKit);

  const psmKitMap = await psmKit;

  for (const { psm, psmGovernorCreatorFacet, label } of psmKitMap.values()) {
    E(creatorFacet).addInstance(psm, psmGovernorCreatorFacet, label);
  }

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

const shutdown = async ({
  consume: { economicCommitteeCreatorFacet, econCharterKit },
}) => {
  trace('Shutting down old EC Committee');
  await E(economicCommitteeCreatorFacet).shutdown();
  trace('EC Committee shutdown successful');

  trace('Shutting down old EC Charter');
  const { creatorFacet } = E.get(econCharterKit);
  await E(creatorFacet).shutdown();
  trace('EC Charter shutdown successful');
};

const replaceCommitteeAndCharter = async permittedPowers => {
  await shutdown(permittedPowers);
  await startNewEconomicCommittee(permittedPowers);
  await startNewEconCharter(permittedPowers);
  await addGovernorsToEconCharter(permittedPowers);
  await handlehighPrioritySendersList(permittedPowers);

  const psmKitMap = await permittedPowers.consume.psmKit;

  const economicCommitteeCreatorFacet =
    await permittedPowers.consume.economicCommitteeCreatorFacet;
  const creatorFacets = [
    E.get(permittedPowers.consume.reserveKit).governorCreatorFacet,
    E.get(permittedPowers.consume.auctioneerKit).governorCreatorFacet,
    E.get(permittedPowers.consume.vaultFactoryKit).governorCreatorFacet,
    ...[...psmKitMap.values()].map(psmKit => psmKit.psmGovernorCreatorFacet),
  ];

  await Promise.all(
    creatorFacets.map(async creatorFacet => {
      const newElectoratePoser = await E(
        economicCommitteeCreatorFacet,
      ).getPoserInvitation();
      await E(creatorFacet).replaceElectorate(newElectoratePoser);
    }),
  );

  await inviteECMembers(permittedPowers, {
    options: {
      voterAddresses: runConfig.economicCommitteeAddresses,
    },
  });

  await inviteToEconCharter(permittedPowers, {
    options: { voterAddresses: runConfig.economicCommitteeAddresses },
  });

  trace('Installed New Economic Committee');
};

export const getManifestForReplaceCommitteeAndCharter = async ({
  economicCommitteeRef: _economicCommitteeRef,
  economicCharterRef: _economicCharterRef,
}) => ({
  manifest: {
    [replaceCommitteeAndCharter.name]: {
      consume: {
        board: true,
        chainStorage: true,
        econCharterKit: true,
        economicCommitteeCreatorFacet: true,
        highPrioritySendersManager: true,
        instancePrivateArgs: true,
        namesByAddressAdmin: true,
        priceAuthority: true,
        priceAuthorityAdmin: true,
        reserveKit: true,
        vaultFactoryKit: true,
        auctioneerKit: true,
        psmKit: true,
        zoe: true,
      },
      produce: {
        economicCommittee: true,
        economicCommitteeCreatorFacet: true,
        econCharterKit: true,
        econCommitteeCharter: true,
      },
      installation: {
        consume: {
          committee: true,
          econCommitteeCharter: true,
          binaryVoteCounter: true,
        },
      },
      instance: {
        consume: {
          reserve: true,
          VaultFactory: true,
          auctioneer: true,
        },
        produce: {
          economicCommittee: true,
          econCommitteeCharter: true,
        },
      },
    },
  },
});
