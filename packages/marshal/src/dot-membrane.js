/* eslint-disable no-use-before-define */
// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import { assert, details as X } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { Far, makeMarshal } from './marshal';
import { getInterfaceOf, passStyleOf } from './passStyleOf';

const { entries, fromEntries } = Object;

const makeConverter = (mirrorConverter = undefined) => {
  const mineToYours = new WeakMap();
  const convertMineToYours = (mine, _optIface = undefined) => {
    if (mineToYours.has(mine)) {
      return mineToYours.get(mine);
    }
    let yours;
    const passStyle = passStyleOf(mine);
    switch (passStyle) {
      case 'promise': {
        let yourResolve;
        let yourReject;
        yours = new Promise((res, rej) => {
          yourResolve = res;
          yourReject = rej;
        });
        E.when(
          mine,
          myFulfillment => {
            yourResolve(pass(myFulfillment));
          },
          myReason => {
            yourReject(pass(myReason));
          },
        ).catch(metaReason => {
          // This can happen if myFulfillment or myReason is not passable.
          // TODO verify that metaReason must be your-side-safe
          yourReject(metaReason);
        });
        break;
      }
      case 'remotable': {
        const myMethodToYours = myMethod => (...yourArgs) => {
          const myArgs = passBack(yourArgs);
          let myResult;
          try {
            myResult = myMethod(...myArgs);
          } catch (myReason) {
            throw pass(myReason);
          }
          return pass(myResult);
        };
        const myMethods = entries(mine);
        const yourMethods = myMethods.map(([name, myMethod]) => [
          name,
          myMethodToYours(myMethod),
        ]);
        const iface = pass(getInterfaceOf(mine)) || 'unlabeled remotable';
        yours = Far(iface, fromEntries(yourMethods));
        break;
      }
      default: {
        assert.fail(X`unrecognized passStyle ${passStyle}`);
      }
    }
    mineToYours.set(mine, yours);
    yoursToMine.set(yours, mine);
    return yours;
  };
  // We need to pass this while convertYoursToMine is still in termporal
  // dead zone, so we wrap it in convertSlotToVal.
  const convertSlotToVal = (slot, optIface = undefined) =>
    convertYoursToMine(slot, optIface);
  const { serialize: mySerialize, unserialize: myUnserialize } = makeMarshal(
    convertMineToYours,
    convertSlotToVal,
  );
  const pass = mine => {
    const myCapData = mySerialize(mine);
    const yours = yourUnserialize(myCapData);
    return yours;
  };
  const converter = harden({
    mineToYours,
    convertMineToYours,
    myUnserialize,
    pass,
    wrap: target => passBack(target),
  });
  if (mirrorConverter === undefined) {
    mirrorConverter = makeConverter(converter);
  }
  const {
    mineToYours: yoursToMine,
    convertMineToYours: convertYoursToMine,
    myUnserialize: yourUnserialize,
    pass: passBack,
  } = mirrorConverter;
  return converter;
};

const makeDotMembrane = target => {
  const converter = makeConverter();
  return converter.wrap(target);
};
harden(makeDotMembrane);
export { makeDotMembrane };
