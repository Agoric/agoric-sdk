// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { makeCorkboard } from '../../../more/sharing/corkboard';
import { makeSharingService } from '../../../more/sharing/sharing';

function build(E, log) {
  function testCorkboardStorage() {
    log('starting testCorkboardStorage');
    const bb = makeCorkboard('whiteboard');
    if (bb.getName() !== 'whiteboard') {
      log(`bboard name should be 'whiteboard', not ${bb.getName()}`);
    }
  }

  function testSharingStorage() {
    log('starting testSharingStorage');
    const h = makeSharingService();
    if (h.grabBoard('missing') !== undefined) {
      log('empty services should have no entries');
    }
    const entry = h.createBoard('rendezvous');
    if (entry === undefined) {
      log('should be able to create new new corkboard');
    }
    if (h.validate(entry) !== entry) {
      log('expected new corkboard to validate');
    }
    const cork = h.grabBoard('rendezvous');
    if (cork === undefined) {
      log('should be able to grabBoard new corkboard');
    }
    if (cork.getName() !== 'rendezvous') {
      log('new board name should match');
    }

    if (h.validate(cork) !== cork) {
      log('expected corkboard to validate');
    }

    const fakeBoard = harden({
      lookup(propertyName) {
        return `${propertyName}: value`;
      },
      addEntry(_) {
        return 1;
      },
      getName() {
        return 'rendezvous';
      },
    });
    try {
      h.validate(fakeBoard);
    } catch (error) {
      log('expected validate to throw');
    }
  }

  function testTwoVatSharing(aliceMaker, bobMaker, sharingService) {
    const aliceP = E(aliceMaker).make(sharingService);
    const bobP = E(bobMaker).make(sharingService);
    log('starting testSharingStorage');
    E(aliceP)
      .shareSomething('schelling')
      .then(count => {
        if (count !== 1) {
          log(`expecting count of 1, got ${count}`);
        }
        E(bobP)
          .findSomething('schelling')
          .then(actual => {
            if (actual === 42) {
              log(`expecting coordination on 42.`);
            } else {
              log(`expecting coordination on 42, got ${actual}`);
            }
          });
      });
  }

  const obj0 = {
    async bootstrap(argv, vats) {
      switch (argv[0]) {
        case 'corkboard': {
          return testCorkboardStorage();
        }
        case 'sharing': {
          return testSharingStorage();
        }
        case 'twoVatSharing': {
          const sharingService = await E(vats.sharing).makeSharingService();
          const aliceMaker = await E(vats.alice).makeAliceMaker(sharingService);
          const bobMaker = await E(vats.bob).makeBobMaker(sharingService);
          return testTwoVatSharing(aliceMaker, bobMaker, sharingService);
        }
        default: {
          throw new Error(`unrecognized argument value ${argv[0]}`);
        }
      }
    },
  };
  return harden(obj0);
}
harden(build);

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  log(`=> setup called`);
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, log),
    helpers.vatID,
  );
}
export default harden(setup);
