/* global makeKind makeVirtualScalarWeakMap */
import { Far } from '@endo/marshal';

const stuff = makeVirtualScalarWeakMap();

let initialSelf;

function makeThingInstance(state) {
  function init(name) {
    state.name = name;
    // eslint-disable-next-line no-use-before-define
    initialSelf = self;
  }
  const self = Far('thing', {
    getName() {
      return state.name;
    },
    rename(newName) {
      state.name = newName;
    },
    getSelf() {
      return self;
    },
  });
  return { init, self };
}

const thingMaker = makeKind(makeThingInstance);

function makeZotInstance(state) {
  function init(name, forceOverflow) {
    state.name = name;
    // enough instances to push me out of the cache
    for (let i = 0; i < 5; i += 1) {
      stuff.init(thingMaker(`${name}-subthing${i}`, 29));
    }
    if (forceOverflow) {
      // eslint-disable-next-line no-use-before-define
      zotMaker('recur', true);
    }
  }
  const self = Far('zot', {
    getName() {
      return state.name;
    },
    rename(newName) {
      state.name = newName;
    },
  });
  return { init, self };
}

const zotMaker = makeKind(makeZotInstance);

export function buildRootObject(vatPowers) {
  const { testLog } = vatPowers;
  let heldThing;

  return Far('root', {
    bootstrap() {
      return 'bootstrap done';
    },
    makeThing(name, hold) {
      const thing = thingMaker(name);
      if (hold) {
        heldThing = thing;
      }
      return thing;
    },
    readThing(what) {
      return what.getName();
    },
    readHeldThing() {
      if (heldThing) {
        return heldThing.getName();
      } else {
        throw Error('no held thing');
      }
    },
    writeThing(what, newName) {
      what.rename(newName);
    },
    writeHeldThing(newName) {
      if (heldThing) {
        heldThing.rename(newName);
      } else {
        throw Error('no held thing');
      }
    },
    holdThing(what) {
      heldThing = what;
    },
    forgetHeldThing() {
      heldThing = null;
    },

    testA(name, mode) {
      // mode 1: make thing, return thing
      // mode 2: make thing, return initial self
      const thing = thingMaker(name);
      switch (mode) {
        case 1:
          return thing;
        case 2:
          return initialSelf;
        default:
          return `this can't happen`;
      }
    },
    testB(name, mode) {
      // mode 3: make thing, rename thing, return thing
      // mode 4: make thing, rename initial self, return thing
      // mode 5: make thing, rename thing, return initial self
      // mode 6: make thing, rename initial self, return initial self
      const thing = thingMaker(name);
      testLog(`test${mode} thing.name before rename "${thing.getName()}"`);
      // prettier-ignore
      testLog(`test${mode} initialSelf.name before rename "${initialSelf.getName()}"`);
      switch (mode) {
        case 3:
        case 5:
          thing.rename(`${name} modified`);
          break;
        case 4:
        case 6:
          initialSelf.rename(`${name} modified`);
          break;
        default:
          break;
      }
      testLog(`test${mode} thing.name after rename "${thing.getName()}"`);
      // prettier-ignore
      testLog(`test${mode} initialSelf.name after rename "${initialSelf.getName()}"`);
      switch (mode) {
        case 3:
        case 4:
          return thing;
        case 5:
        case 6:
          return initialSelf;
        default:
          return `this can't happen`;
      }
    },
    testC(name, mode) {
      // mode 7: make thing, use thing as key in weakstore, lookup value keyed to thing in weakstore
      // mode 8: make thing, use initial self as key in weakstore, lookup value keyed to thing in weakstore
      // mode 9: make thing, use thing as key in weakstore, lookup value keyed to initial self in weakstore
      // mode 10: make thing, use initial self as key in weakstore, lookup value keyed to initial self in weakstore
      const thing = thingMaker(name);
      switch (mode) {
        case 7:
        case 9:
          stuff.init(thing, 47);
          break;
        case 8:
        case 10:
          stuff.init(initialSelf, 47);
          break;
        default:
          break;
      }
      let result;
      switch (mode) {
        case 7:
        case 8:
          result = stuff.get(thing);
          break;
        case 9:
        case 10:
          result = stuff.get(initialSelf);
          break;
        default:
          break;
      }
      testLog(`test${mode} result is "${result}"`);
      return result;
    },
    testD(name, mode) {
      // mode 11: make thing, store thing as value in weakstore, lookup value and return name of value
      // mode 12: make thing, store initial self as value in weakstore, lookup value and return name of value
      const thing = thingMaker(name);
      const keyish = harden({ x: mode });
      switch (mode) {
        case 11:
          stuff.init(keyish, thing);
          break;
        case 12:
          stuff.init(keyish, initialSelf);
          break;
        default:
          break;
      }
      const result = stuff.get(keyish).getName();
      testLog(`test${mode} result is "${result}"`);
      return result;
    },
    testE(name, mode) {
      // mode 13: make thing, rename thing, store thing as value in weakstore, lookup and return name of value
      // mode 14: make thing, rename thing, store initial self as value in weakstore, lookup and return name of value
      // mode 15: make thing, rename initial self, store thing as value in weakstore, lookup and return name of value
      // mode 16: make thing, rename initial self, store initial self as value in weakstore, lookup and return name of value
      // mode 17: make thing, store thing as value in weakstore, rename thing, lookup and return name of value
      // mode 18: make thing, store initial self as value in weakstore, rename thing, lookup and return name of value
      // mode 19: make thing, store thing as value in weakstore, rename initial self, lookup and return name of value
      // mode 20: make thing, store initial self as value in weakstore, rename initial self, lookup and return name of value

      const thing = thingMaker(name);
      switch (mode) {
        case 13:
        case 14:
          thing.rename(`${name} modified`);
          break;
        case 15:
        case 16:
          initialSelf.rename(`${name} modified`);
          break;
        default:
          break;
      }
      const keyish = harden({ x: mode });
      switch (mode) {
        case 13:
        case 15:
        case 17:
        case 19:
          stuff.init(keyish, thing);
          break;
        case 14:
        case 16:
        case 18:
        case 20:
          stuff.init(keyish, initialSelf);
          break;
        default:
          break;
      }
      switch (mode) {
        case 17:
        case 18:
          thing.rename(`${name} modified`);
          break;
        case 19:
        case 20:
          initialSelf.rename(`${name} modified`);
          break;
        default:
          break;
      }
      const result = stuff.get(keyish).getName();
      testLog(`test${mode} result is "${result}"`);
      return result;
    },
    testCacheOverflow(name, forceOverflow) {
      try {
        return zotMaker(name, forceOverflow);
      } catch (e) {
        testLog(`testCacheOverflow catches ${e}`);
        return 'overflow';
      }
    },
  });
}
