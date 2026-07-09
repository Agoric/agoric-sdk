// @jessie-check

import { Fail } from '@endo/errors';
import { E } from '@endo/far';
import { Far } from '@endo/marshal';

/**
 * @import {ZCF, ZoeService} from '@agoric/zoe';
 * @import {Baggage} from '@agoric/vat-data';
 * @import {BundleCap} from '@agoric/swingset-vat';
 * @import {Issuer} from '@agoric/ertp';
 * @import {StartZcf} from '../internal-types.js';
 */

/**
 * Shared implementation for production and test contract-vat roots.
 *
 * @param {(powers: any, zoeService: ZoeService, invitationIssuer: Issuer<'set'>,
 *   testJigSetter: ({ zcf }: { zcf: ZCF }) => void,
 *   contractBundleCap: BundleCap, baggage: Baggage) => Promise<any>} makeZCFZygote
 */
export const makeBuildRootObject = makeZCFZygote => {
  /**
   * @param {any} powers
   * @param {{
   *   contractBundleCap: BundleCap,
   *   zoeService: ZoeService,
   *   invitationIssuer: Issuer<'set'>,
   *   privateArgs?: any,
   * }} vatParameters
   * @param {Baggage} baggage
   */
  const buildRootObject = async (powers, vatParameters, baggage) => {
    const { testJigSetter } = powers;
    const { contractBundleCap } = vatParameters;
    contractBundleCap ||
      Fail`expected vatParameters.contractBundleCap ${vatParameters}`;
    let { zoeService, invitationIssuer } = vatParameters;
    const firstTime = !baggage.has('DidStart');
    if (firstTime) {
      baggage.init('DidStart', 'DidStart');
      baggage.init('zoeService', zoeService);
      baggage.init('invitationIssuer', invitationIssuer);
    } else {
      !zoeService || Fail`On restart zoeService must not be in vatParameters`;
      zoeService = baggage.get('zoeService');

      !invitationIssuer ||
        Fail`On restart invitationIssuer must not be in vatParameters`;
      invitationIssuer = baggage.get('invitationIssuer');
    }

    const zcfZygote = await makeZCFZygote(
      powers,
      zoeService,
      invitationIssuer,
      testJigSetter,
      contractBundleCap,
      baggage,
    );

    if (!firstTime) {
      return E.when(
        E(zcfZygote).restartContract(vatParameters.privateArgs),
        () => Far('upgraded contractRunner', {}),
      );
    }

    return Far('contractRunner', {
      /** @type {StartZcf} */
      startZcf: (
        zoeInstanceAdmin,
        instanceRecordFromZoe,
        issuerStorageFromZoe,
        privateArgs = undefined,
      ) => {
        return E(zcfZygote).startContract(
          zoeInstanceAdmin,
          instanceRecordFromZoe,
          issuerStorageFromZoe,
          privateArgs,
        );
      },
    });
  };

  return harden(buildRootObject);
};
harden(makeBuildRootObject);
