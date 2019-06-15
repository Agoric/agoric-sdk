// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { makeCorkboard } from '../../more/handoff/corkboard';
import { makeHandoffService } from '../../more/handoff/handoff';

function build(E, log) {
  function testCorkboardStorage() {
    log('starting testCorkboardStorage');
    const bb = makeCorkboard('whiteboard');
    if (bb.getName() !== 'whiteboard') {
      log(`bboard name should be 'whiteboard', not ${bb.getName()}`);
    }
  }

  function testHandoffStorage(handoff) {
    log('starting testHandoffStorage');
    const h = makeHandoffService(handoff);
    if (h.grab('missing') !== undefined) {
      log('empty services should have no entries');
    }
    const entry = h.createEntry('rendezvous');
    if (entry === undefined) {
      log('should be able to create new new corkboard');
    }
    if (h.validate(entry) !== entry) {
      log('expected new corkboard to validate');
    }
    const cork = h.grab('rendezvous');
    if (cork === undefined) {
      log('should be able to grab new corkboard');
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

  function testTwoVatHandoff(aliceMaker, bobMaker, handoffService) {
    const aliceP = E(aliceMaker).make(handoffService);
    const bobP = E(bobMaker).make(handoffService);
    log('starting testHandoffStorage');
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
        case 'handoff': {
          return testHandoffStorage(vats.handoff);
        }
        case 'twoVatHandoff': {
          const handoffService = await E(vats.handoff).makeHandoffService();
          const aliceMaker = await E(vats.alice).makeAliceMaker(handoffService);
          const bobMaker = await E(vats.bob).makeBobMaker(handoffService);
          return testTwoVatHandoff(aliceMaker, bobMaker, handoffService);
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
