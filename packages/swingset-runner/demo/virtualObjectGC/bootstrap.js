import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject() {
  let bob;
  let me;
  let exportedThing;
  let exportedThingRecognizer;
  let exerciseWeakKeys;

  function maybeRecognize(thing) {
    if (exerciseWeakKeys) {
      exportedThingRecognizer = new WeakSet();
      exportedThingRecognizer.add(thing);
    }
  }

  function maybeDontRecognizeAnything() {
    if (exerciseWeakKeys) {
      exportedThingRecognizer = null;
    }
  }

  return Far('root', {
    async bootstrap(vats) {
      me = vats.bootstrap;
      bob = vats.bob;
      // exerciseWeakKeys = true;
      // E(me).continueTest('test1');
      // E(me).continueTest('test2');
      // E(me).continueTest('test3');
      // E(me).continueTest('test4');
      // E(me).continueTest('test5');
      // E(me).continueTest('test6');
      exerciseWeakKeys = false;
      // E(me).continueTest('test1');
      // E(me).continueTest('test2');
      // E(me).continueTest('test3');
      // E(me).continueTest('test4');
      // E(me).continueTest('test5');
      E(me).continueTest('test6');
    },
    async continueTest(testTag) {
      switch (testTag) {
        case 'test1': {
          // test 1:
          // - create a locally referenced VO  lerv -> Lerv
          // - forget about it                 Lerv -> lerv
          E(bob).makeAndHold();
          E(bob).dropHeld();
          E(bob).assess();
          // E(me).continueTest('test2');
          break;
        }
        case 'test2': {
          // test 2:
          // - create a locally referenced VO  lerv -> Lerv
          // - store virtually                 Lerv -> LerV
          // - forget about it                 LerV -> lerV
          // - read from virtual storage       lerV -> LerV
          // - export it                       LerV -> LERV
          // - forget about it                 LERV -> lERV
          // - read from virtual storage       lERV -> LERV
          // - forget about it                 LERV -> lERV
          // - reintroduce via delivery        lERV -> LERV
          // - forget abut it                  LERV -> lERV
          // - drop export                     lERV -> leRV
          // - read from virtual storage       leRV -> LeRV
          // - forget about it                 LeRV -> leRV
          // - read from virtual storage       leRV -> LeRV
          // - retire export                   LeRV -> LerV
          E(bob).makeAndHold();
          E(bob).storeHeld();
          E(bob).dropHeld();
          E(bob).fetchAndHold();
          exportedThing = await E(bob).exportHeld();
          maybeRecognize(exportedThing);
          E(bob).dropHeld();
          E(bob).fetchAndHold();
          E(bob).dropHeld();
          E(bob).importAndHold(exportedThing);
          E(bob).dropHeld();
          exportedThing = null;
          E(bob).tellMeToContinueTest(me, 'test2a');
          break;
        }
        case 'test2a': {
          E(bob).fetchAndHold();
          E(bob).dropHeld();
          E(bob).fetchAndHold();
          maybeDontRecognizeAnything();
          E(bob).tellMeToContinueTest(me, 'test2b');
          break;
        }
        case 'test2b': {
          E(bob).assess();
          // E(me).continueTest('test3');
          break;
        }
        case 'test3': {
          // - create a locally referenced VO  lerv -> Lerv
          // - store virtually                 Lerv -> LerV
          // - export it                       LerV -> LERV
          // - drop export                     LERV -> LeRV
          // - drop held                       LeRV -> leRV
          // - retire export                   leRV -> lerV
          E(bob).makeAndHold();
          E(bob).storeHeld();
          exportedThing = await E(bob).exportHeld();
          maybeRecognize(exportedThing);
          E(bob).dropHeld();
          exportedThing = null;
          E(bob).tellMeToContinueTest(me, 'test3a');
          break;
        }
        case 'test3a': {
          maybeDontRecognizeAnything();
          E(bob).tellMeToContinueTest(me, 'test3b');
          break;
        }
        case 'test3b': {
          E(bob).assess();
          // E(me).continueTest('test4');
          break;
        }
        case 'test4': {
          // - create a locally referenced VO  lerv -> Lerv
          // - export it                       Lerv -> LERv
          // - drop export                     LERv -> LeRv
          // - drop it                         LeRv -> leRv
          // - retire export                   leRv -> lerv
          E(bob).makeAndHold();
          exportedThing = await E(bob).exportHeld();
          maybeRecognize(exportedThing);
          E(bob).tellMeToContinueTest(me, 'test4a');
          break;
        }
        case 'test4a': {
          exportedThing = null;
          E(bob).tellMeToContinueTest(me, 'test4b');
          break;
        }
        case 'test4b': {
          E(bob).dropHeld();
          maybeDontRecognizeAnything();
          E(bob).tellMeToContinueTest(me, 'test4c');
          break;
        }
        case 'test4c': {
          E(bob).assess();
          // E(me).continueTest('test5');
          break;
        }
        case 'test5': {
          // - create a locally referenced VO  lerv -> Lerv
          // - export it                       Lerv -> LERv
          // - drop export                     LERv -> LeRv
          // - retire export                   LeRv -> lerv
          // - drop it                         LeRv -> leRv
          E(bob).makeAndHold();
          exportedThing = await E(bob).exportHeld();
          maybeRecognize(exportedThing);
          E(bob).tellMeToContinueTest(me, 'test5a');
          break;
        }
        case 'test5a': {
          exportedThing = null;
          E(bob).tellMeToContinueTest(me, 'test5b');
          break;
        }
        case 'test5b': {
          maybeDontRecognizeAnything();
          E(bob).tellMeToContinueTest(me, 'test5c');
          break;
        }
        case 'test5c': {
          E(bob).dropHeld();
          E(bob).assess();
          // E(me).continueTest('test6');
          break;
        }
        case 'test6': {
          // - create a locally referenced VO  lerv -> Lerv
          // - export it                       Lerv -> LERv
          // - drop export                     LERv -> LeRv
          // - store virtually                 LeRv -> LeRV
          // - drop it                         LeRV -> leRV
          // - retire export                   leRV -> lerV
          E(bob).makeAndHold();
          exportedThing = await E(bob).exportHeld();
          maybeRecognize(exportedThing);
          E(bob).tellMeToContinueTest(me, 'test6a');
          break;
        }
        case 'test6a': {
          exportedThing = null;
          E(bob).tellMeToContinueTest(me, 'test6b');
          break;
        }
        case 'test6b': {
          E(bob).storeHeld();
          E(bob).dropHeld();
          maybeDontRecognizeAnything();
          E(bob).tellMeToContinueTest(me, 'test6c');
          break;
        }
        case 'test6c': {
          E(bob).assess();
          break;
        }
        default:
          break;
      }
    },
  });
}
