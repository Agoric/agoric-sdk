// Copyright (C) 2019 Agoric, under Apache License 2.0

import { Fail } from '@endo/errors';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject(vatPowers, vatParameters) {
  const log = vatPowers.testLog;

  async function trivialContractTest(spawner, trivialBundle) {
    log('starting trivialContractTest');
    const installationP = E(spawner).install(trivialBundle);
    const trivial = await E(installationP).spawn('terms are provided');
    const terms = await E(trivial).getTerms();
    log(`terms are: ${terms}`);
    const eight = await E(trivial).bar(7);
    log(`eight is: ${eight}`);
    log(`++ DONE`);
  }

  async function exhaustedContractTest(spawner, trivialBundle) {
    log('starting exhaustedContractTest');
    const installationP = E(spawner).install(trivialBundle);

    await E(installationP)
      .spawn('loop immediately')
      .then(
        () => log(`wrong: loop1 spawned without error`),
        err => log(`loop1 failed: ${err}`),
      );

    const loop2 = await E(installationP).spawn();
    log('loop2: spawned without error');
    // This will kill the vat.
    E(loop2).loopForever();
    // We sense the vat being terminated by trying to send a second message.
    await E(loop2)
      .areYouOk()
      .then(
        () => log(`wrong: loop2 still responding`),
        err => log(`loop2 dead: ${err}`),
      );
  }

  async function farFailureContractTest(spawner, trivialBundle) {
    log('starting farFailureContractTest');
    const installationP = E(spawner).install(trivialBundle);
    const trivial = await E(installationP).spawn('terms are provided');
    await E(trivial)
      .getTerms(harden({ failureArg() {} }))
      .then(
        () => log(`wrong: far failure arg resolves`),
        err => log(`send non-Far: ${err}`),
      );
    await E(trivial)
      .failureToFar()
      .then(
        () => log(`wrong: far failure return resolves`),
        err => log(`far failure: ${err}`),
      );
    log(`++ DONE`);
  }

  return Far('root', {
    async bootstrap(vats, devices) {
      const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
        devices.vatAdmin,
      );
      const spawner = await E(vats.spawner).buildSpawner(vatAdminSvc);
      const [mode, trivialBundle] = vatParameters.argv;
      switch (mode) {
        case 'trivial': {
          return trivialContractTest(spawner, trivialBundle);
        }
        case 'exhaust': {
          return exhaustedContractTest(spawner, trivialBundle);
        }
        case 'farFailure': {
          return farFailureContractTest(spawner, trivialBundle);
        }
        default: {
          throw Fail`unrecognized argument value ${mode}`;
        }
      }
    },
  });
}
