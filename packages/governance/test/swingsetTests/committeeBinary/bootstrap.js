// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';

const makeVoterVat = async (log, vats, zoe) => {
  const voterCreator = E(vats.voter).build(zoe);
  log(`=> voter vat is set up`);
  return voterCreator;
};

async function committeeBinaryStart(
  zoe,
  voterCreator,
  timer,
  log,
  installations,
) {
  const registrarTerms = { committeeName: 'TheCommittee', committeeSize: 5 };
  const { creatorFacet: registrarFacet, instance: registrarInstance } = await E(
    zoe,
  ).startInstance(installations.committeeRegistrar, {}, registrarTerms);

  const ballotDetails = {
    question: 'Choose',
    positions: ['Eeny', 'Meeny'],
    quorumThreshold: 3n,
    tieOutcome: undefined,
    closureRule: {
      timer,
      deadline: 3n,
    },
  };
  const { instance: ballotInstance } = await E(registrarFacet).addQuestion(
    installations.binaryBallotCounter,
    ballotDetails,
  );

  const invitations = await E(registrarFacet).getVoterInvitations();
  const details2 = await E(zoe).getInvitationDetails(invitations[2]);

  log(
    `invitation details check: ${details2.instance === registrarInstance} ${
      details2.description
    }`,
  );

  const aliceP = E(voterCreator).createVoter('Alice', invitations[0], 'Eeny');
  E(voterCreator).createVoter('Bob', invitations[1], 'Meeny');
  E(voterCreator).createVoter('Carol', invitations[2], 'Eeny');
  E(voterCreator).createVoter('Dave', invitations[3], 'Eeny');
  await E(voterCreator).createVoter('Emma', invitations[4], 'Meeny');

  // At least one voter should verify that everything is on the up-and-up
  await E(aliceP).verifyBallot('Choose');

  E(timer).tick();
  E(timer).tick();
  await E(timer).tick();

  const publicFacet = E(zoe).getPublicFacet(ballotInstance);
  await E(publicFacet)
    .getOutcome()
    .then(outcome => log(`vote outcome: ${outcome}`))
    .catch(e => log(`vote failed ${e}`));
}

const makeBootstrap = (argv, cb, vatPowers) => async (vats, devices) => {
  const log = vatPowers.testLog;
  const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
    devices.vatAdmin,
  );
  const zoe = E(vats.zoe).buildZoe(vatAdminSvc);

  const [committeeRegistrar, binaryBallotCounter] = await Promise.all([
    E(zoe).install(cb.committeeRegistrar),
    E(zoe).install(cb.binaryBallotCounter),
  ]);
  const timer = buildManualTimer(log);

  const installations = { committeeRegistrar, binaryBallotCounter };

  const voterCreator = await makeVoterVat(log, vats, zoe);

  const [testName] = argv;
  switch (testName) {
    case 'committeeBinaryStart':
      committeeBinaryStart(zoe, voterCreator, timer, log, installations);
      break;
    default:
      log(`didn't find test: ${argv}`);
  }
};

export const buildRootObject = (vatPowers, vatParameters) => {
  const { argv, contractBundles: cb } = vatParameters;
  return Far('root', { bootstrap: makeBootstrap(argv, cb, vatPowers) });
};
