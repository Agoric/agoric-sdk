// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

const build = async (log, zoe) => {
  return Far('voter', {
    createVoter: async (name, voteFacet) => {
      return Far(`Voter ${name}`, {
        voteBallot: (qName, ballot) => {
          log(`Voter ${name} cast a ballot for ${ballot.chosen}`);
          return E(voteFacet).castBallot(ballot);
        },
        verifyBallot: async counterInstance => {
          const publicFacet = E(zoe).getPublicFacet(counterInstance);
          const ballotTemplate = E(publicFacet).getBallotTemplate();
          const details = await E(ballotTemplate).getDetails();
          log(
            `Verify ballot from instance: ${details.question}, ${details.positions}, ${details.method}`,
          );
        },
      });
    },
  });
};

export function buildRootObject(vatPowers) {
  return Far('root', {
    build: (...args) => build(vatPowers.testLog, ...args),
  });
}
