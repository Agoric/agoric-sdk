// @ts-check

// This is the Zoe contract facet. Each time we make a new instance of a
// contract we will start by creating a new vat and running this code in it. In
// order to install this code in a vat, Zoe needs to import a bundle containing
// this code. We will eventually have an automated process, but for now, every
// time this file is edited, the bundle must be manually rebuilt with
// `yarn build-zcfBundle`.

import { Far } from '@endo/marshal';
import { E } from '@endo/far';

import '../../exported.js';
import '../internal-types.js';

import { makeZCFZygote } from './zcfZygote.js';

const { details: X } = assert;

/**
 * @param {VatPowers & { testJigSetter: TestJigSetter }} powers
 * @param {{contractBundleCap: BundleCap, zoeService: ZoeService, invitationIssuer: Issuer, privateArgs: any}} vatParameters
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
// * @returns {{ executeContract: ExecuteContract}}
export async function buildRootObject(powers, vatParameters, baggage) {
  // Currently, there is only one function, `executeContract` called
  // by the Zoe Service. However, when there is kernel support for
  // zygote vats (essentially freezing and then creating copies of
  // vats), `makeZCFZygote`, `zcfZygote.evaluateContract` and
  // `zcfZygote.startContract` should exposed separately.
  const { testJigSetter } = powers;
  const { contractBundleCap } = vatParameters;
  assert(
    contractBundleCap,
    X`expected vatParameters.contractBundleCap ${vatParameters}`,
  );
  let { zoeService, invitationIssuer } = vatParameters;
  const firstTime = !baggage.has('DidStart');
  if (firstTime) {
    baggage.init('DidStart', true);
    baggage.init('zoeService', zoeService);
    baggage.init('invitationIssuer', invitationIssuer);
  } else {
    assert(!zoeService);
    zoeService = baggage.get('zoeService');

    assert(!invitationIssuer);
    invitationIssuer = baggage.get('invitationIssuer');
  }

  // make zcfZygote with contract-general state and kinds initialized
  const zcfZygote = await makeZCFZygote(
    powers,
    zoeService,
    invitationIssuer,
    testJigSetter,
    contractBundleCap,
    baggage,
  );

  // snapshot zygote here //////////////////

  if (!firstTime) {
    return E.when(E(zcfZygote).restartContract(vatParameters.privateArgs), () =>
      Far('upgraded contractRunner', {}),
    );
  }

  return Far('contractRunner', {
    // initialize instance-specific state of the contract
    startZcf: (
      zoeInstanceAdmin,
      instanceRecordFromZoe,
      issuerStorageFromZoe,
      privateArgs = undefined,
    ) => {
      assert(firstTime);

      /** @type {ZCFZygote} */
      return E(zcfZygote).startContract(
        zoeInstanceAdmin,
        instanceRecordFromZoe,
        issuerStorageFromZoe,
        privateArgs,
      );
    },
  });
}

harden(buildRootObject);
