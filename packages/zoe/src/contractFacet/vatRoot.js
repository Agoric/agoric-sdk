// @ts-check

// This is the Zoe contract facet. Each time we make a new instance of a
// contract we will start by creating a new vat and running this code in it. In
// order to install this code in a vat, Zoe needs to import a bundle containing
// this code. We will eventually have an automated process, but for now, every
// time this file is edited, the bundle must be manually rebuilt with
// `yarn build-zcfBundle`.

import { Far } from '@agoric/marshal';

import '../../exported';
import '../internal-types';

import { makeZCFZygote } from './zcfZygote';

export function buildRootObject(powers, _params, testJigSetter = undefined) {
  // Currently, there is only one function called by the Zoe Service.
  // However, when there is kernel support for zygote vats
  // (essentially freezing and then creating copies of vats),
  // `makeZCFZygote` and `makeZCFContractZygote` should also be exposed.
  const executeContract = (
    bundle,
    zoeService,
    invitationIssuer,
    zoeInstanceAdmin,
    instanceRecordFromZoe,
    issuerStorageFromZoe,
  ) => {
    const zcfZygote = makeZCFZygote(
      powers,
      zoeService,
      invitationIssuer,
      testJigSetter,
    );
    zcfZygote.evaluateContract(bundle);
    return zcfZygote.startContract(
      zoeInstanceAdmin,
      instanceRecordFromZoe,
      issuerStorageFromZoe,
    );
  };

  return Far('executeContract', { executeContract });
}

harden(buildRootObject);
