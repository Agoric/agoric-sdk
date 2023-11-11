import { makeTracer } from '@agoric/internal';
import {
  assertPathSegment,
  makeStorageNodeChild,
} from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';

const trace = makeTracer('RunEconCommittee', true);

/** @type {(name: string) => string} */
const sanitizePathSegment = name => {
  const candidate = name.replace(/[ ,]/g, '_');
  assertPathSegment(candidate);
  return candidate;
};

/**
 * @typedef {object} EconCommitteeOptions
 * @property {string} [committeeName]
 * @property {number} [committeeSize]
 */

/**
 * @param {import('./econ-behaviors.js').EconomyBootstrapPowers} powers
 * @param {object} config
 * @param {object} [config.options]
 * @param {EconCommitteeOptions} [config.options.econCommitteeOptions]
 */
export const startEconomicCommittee = async (
  {
    consume: { board, chainStorage, diagnostics, zoe },
    produce: { economicCommitteeKit, economicCommitteeCreatorFacet },
    installation: {
      consume: { committee },
    },
    instance: {
      produce: { economicCommittee },
    },
  },
  { options: { econCommitteeOptions = {} } = {} },
) => {
  const COMMITTEES_ROOT = 'committees';
  trace('startEconomicCommittee');
  const {
    // NB: the electorate (and size) of the committee may change, but the name must not
    committeeName = 'Economic Committee',
    committeeSize = 3,
    ...rest
  } = econCommitteeOptions;

  const committeesNode = await makeStorageNodeChild(
    chainStorage,
    COMMITTEES_ROOT,
  );
  const storageNode = await E(committeesNode).makeChildNode(
    sanitizePathSegment(committeeName),
  );

  // NB: committee must only publish what it intended to be public
  const marshaller = await E(board).getPublishingMarshaller();

  const privateArgs = {
    storageNode,
    marshaller,
  };
  const startResult = await E(zoe).startInstance(
    committee,
    {},
    { committeeName, committeeSize, ...rest },
    privateArgs,
    'economicCommittee',
  );
  const { creatorFacet, instance } = startResult;

  economicCommitteeKit.resolve(
    // XXX should startInstance return its label?
    harden({ ...startResult, label: 'economicCommittee' }),
  );

  await E(diagnostics).savePrivateArgs(startResult.instance, privateArgs);

  economicCommitteeCreatorFacet.resolve(creatorFacet);
  economicCommittee.resolve(instance);
};
harden(startEconomicCommittee);

export const ECON_COMMITTEE_MANIFEST = harden({
  [startEconomicCommittee.name]: {
    consume: {
      board: true,
      chainStorage: true,
      diagnostics: true,
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
});
