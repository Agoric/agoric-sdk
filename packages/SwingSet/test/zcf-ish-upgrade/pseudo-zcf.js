// @ts-nocheck
/* global globalThis, VatData */
/* eslint-disable no-unused-vars */

import { Far } from '@endo/far';
import { importBundle } from '@endo/import-bundle';
import { defineDurableKind } from '@agoric/vat-data';
import {
  provideHandle,
  provideBaggageSubset as provideBaggageSubTree,
} from './util.js';

export const buildRootObject = async (vatPowers, vatParameters, baggage) => {
  const didStart = baggage.has('didStart'); // false for v1, true for v2

  const zcfHandle1 = provideHandle(baggage, 'zcfHandle1', 'zcfIface1');
  const zcfHandle2 = provideHandle(baggage, 'zcfHandle2', 'zcfIface2');
  const makeZcfThing1 = defineDurableKind(zcfHandle1, undefined, {}); // makeZcfSeat
  const makeZcfThing2 = defineDurableKind(zcfHandle2, undefined, {});

  const installationBaggage = provideBaggageSubTree(baggage, 'installation');
  // evaluate the contract (either the first version, or an upgrade)
  const { D } = vatPowers;
  const { contractBundleCap } = vatParameters;
  const contractBundle = D(contractBundleCap).getBundle();
  const endowments = {
    console,
    // See https://github.com/Agoric/agoric-sdk/issues/9515
    assert: globalThis.assert,
    VatData,
  };
  const contractNS = await importBundle(contractBundle, { endowments });
  const { setupInstallation, setup: _ } = contractNS;
  if (!setupInstallation) {
    // fall back to old non-upgradable scheme
    throw Error('unimplemented');
    // return zcfRoot;
  }

  // allow the contract (any version) to set up its installation Kinds
  const setupInstance = await setupInstallation(installationBaggage);

  // For the version-1 installation, we stop doing work here: we
  // define more function and objects, but none will be invoked in
  // this heap. Instead, they will be invoked in a zygote/clone of
  // this heap.

  let makeInstanceKit;

  const provideZcfThings = (mybaggage, perInstanceZoeStuff) => {
    return harden({ zcfThing1: 1, zcfThing2: 2 });
  };

  const doSetupInstance = async perInstanceZoeStuff => {
    // maybe do some defineDurableKinds here
    const { zcfThing1, zcfThing2 } = provideZcfThings(
      baggage,
      perInstanceZoeStuff,
    );
    // const zcfThing1 = makeZcfThing1(perInstanceZoeStuff);
    // const zcfThing2 = makeZcfThing2(perInstanceZoeStuff);
    makeInstanceKit = await setupInstance(zcfThing1, zcfThing2);
  };

  const start = async perInstanceZoeStuff => {
    // the version-1 *instance* will see this zcRoot.start() get
    // invoked (in a clone of the original vat) exactly once per
    // instance
    baggage.init('didStart', true);
    baggage.init('perInstanceZoeStuff', perInstanceZoeStuff);
    // now that our clone is differentiated, we can do
    // instance-specific setup
    await doSetupInstance(perInstanceZoeStuff);
    // and we can invoke makeInstanceKit() for the first and only time
    const { publicFacet, privateFacet } = makeInstanceKit();
    return harden({ publicFacet, privateFacet });
  };

  // For version-2 or later, we know we've already been started, so
  // allow the contract to set up its instance Kinds
  if (didStart) {
    const perInstanceZoeStuff = baggage.get('perInstanceZoeStuff');
    await doSetupInstance(perInstanceZoeStuff);
    // however we do not call makeInstanceKit() again
  }

  const zcfRoot = Far('zcfRoot', { start });
  return zcfRoot;
};
