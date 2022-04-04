// @ts-check
/* global globalThis */

const { entries } = Object;

/** @type {typeof import('@endo/far').E} */
const E = globalThis.E;

const config = {
  boardId: {
    committee: 'board00917',
    contractGovernor: 'board05815',
  },
};

/**
 * @param {EconomyBootstrapPowers} powers
 * @param {{ committeeName: string, committeeSize: number }} electorateTerms
 */
const startEconomicCommittee = async (
  {
    consume: { board, zoe },
    produce: { economicCommitteeCreatorFacet },
    installation,
    instance: {
      produce: { economicCommittee },
    },
  },
  electorateTerms = {
    committeeName: 'Initial Economic Committee',
    committeeSize: 1,
  },
) => {
  const installations = {
    contractGovernor: await E(board).getValue(config.boardId.contractGovernor),
    committee: await E(board).getValue(config.boardId.committee),
  };

  const { creatorFacet, instance } = await E(zoe).startInstance(
    installations.committee,
    {},
    electorateTerms,
  );

  economicCommitteeCreatorFacet.resolve(creatorFacet);
  economicCommittee.resolve(instance);
  entries(installations).forEach(([key, inst]) =>
    installation.produce[key].resolve(inst),
  );
};
harden(startEconomicCommittee);

// script completion value "export"
startEconomicCommittee;
