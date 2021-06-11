// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';

const makeVats = async (log, vats, zoe, installations) => {
  // Setup Voters
  const voterCreator = E(vats.voter).build(zoe);

  const { creatorFacet, instance: registrarInstance } = await E(
    zoe,
  ).startInstance(installations.committeeRegistrar);

  const result = { voterCreator, creatorFacet, registrarInstance };

  log(`=> voter and registrar vats are set up`);
  return harden(result);
};

const getVoter = (zoe, voterCreator, invitation, name) => {
  return E(zoe)
    .offer(invitation)
    .then(seat => {
      const facet = E(seat).getOfferResult();
      return E(voterCreator).createVoter(name, facet);
    });
};

async function committeeBinaryStart(
  zoe,
  committeeCreatorFacet,
  voterCreator,
  timer,
  log,
  installations,
  registrarInstance,
) {
  const registrar = E(committeeCreatorFacet).createRegistrar('aCommittee', 5);

  const details = {
    clock: timer,
    deadline: 3n,
    question: 'Choose',
    positions: ['Eeny', 'Meeny'],
  };
  const { instance } = await E(registrar).addQuestion(
    installations.binaryBallotCounter,
    details,
  );

  const invitations = await E(registrar).getVoterInvitations();

  const details2 = await E(zoe).getInvitationDetails(invitations[2]);

  log(
    `invitaiton details check: ${details2.instance === registrarInstance} ${
      details2.description
    }}`,
  );

  const aliceP = getVoter(zoe, voterCreator, invitations[0], 'Alice');
  const bobP = getVoter(zoe, voterCreator, invitations[1], 'Bob');
  const carolP = getVoter(zoe, voterCreator, invitations[2], 'Carol');
  const daveP = getVoter(zoe, voterCreator, invitations[3], 'Dave');
  const emmaP = getVoter(zoe, voterCreator, invitations[4], 'Emma');

  const publicFacet = E(zoe).getPublicFacet(instance);
  const ballotTemplate = E(publicFacet).getBallotTemplate();
  const [ballot0, ballot1] = await Promise.all([
    E(ballotTemplate).choose(details.positions[0]),
    E(ballotTemplate).choose(details.positions[1]),
  ]);

  E(aliceP).voteBallot('Choose', ballot0);
  E(bobP).voteBallot('Choose', ballot1);
  E(carolP).voteBallot('Choose', ballot0);
  E(daveP).voteBallot('Choose', ballot0);
  await E(emmaP).voteBallot('Choose', ballot1);
  await E(aliceP).verifyBallot(instance);

  E(timer).tick();
  E(timer).tick();
  await E(timer).tick();

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

  const { voterCreator, creatorFacet, registrarInstance } = await makeVats(
    log,
    vats,
    zoe,
    installations,
  );

  const [testName] = argv;
  switch (testName) {
    case 'committeeBinaryStart':
      committeeBinaryStart(
        zoe,
        creatorFacet,
        voterCreator,
        timer,
        log,
        installations,
        registrarInstance,
      );
      break;
    default:
      log(`didn't find test: ${argv}`);
  }
};

export const buildRootObject = (vatPowers, vatParameters) => {
  const { argv, contractBundles: cb } = vatParameters;
  return Far('root', { bootstrap: makeBootstrap(argv, cb, vatPowers) });
};
