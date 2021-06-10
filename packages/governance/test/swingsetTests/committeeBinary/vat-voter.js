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
          const positionP = E(ballotTemplate).getPositions();
          const qNameP = E(ballotTemplate).getQuestion();
          const methodP = E(ballotTemplate).getMethod();
          const [position, method, qName] = await Promise.all([
            positionP,
            methodP,
            qNameP,
          ]);
          log(`Verify ballot from instance: ${qName}, ${position}, ${method}`);
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
