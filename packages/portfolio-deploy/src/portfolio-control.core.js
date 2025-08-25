/** @file core eval to give control of YMax contract to a smartWallet */

import { makeTracer } from '@agoric/internal/src/debug.js';
import { E } from '@endo/eventual-send';
import { makeHeapZone } from '@agoric/zone';
import { prepareContractControl } from './contract-control.js';
import { orchPermit } from './orch.start.js';
import {
  deployPostalService,
  permit as postalServicePermit,
} from './postal-service.core.js';

export { deployPostalService };

/**
 * @import {ChainStoragePresent} from './chain-info.core.js'
 * @import {PortfolioBootPowers} from './portfolio-start.type.ts';
 * @import {PostalServiceBoot} from './postal-service.core.js';
 * @import {AttenuatedDepositPowers} from './attenuated-deposit.core.js';
 */

const contractName = 'ymax0';

const trace = makeTracer('PCtrl');

/**
 * @param {BootstrapPowers &
 *  ChainStoragePresent &
 *  PortfolioBootPowers &
 *  PostalServiceBoot &
 *  AttenuatedDepositPowers
 * } permitted
 * @param {{ options: { ymaxControlAddress: string }}} config
 */
export const delegatePortfolioContract = async (permitted, config) => {
  const { ymaxControlAddress } = config?.options || {};
  assert(ymaxControlAddress);

  await null;
  const { consume } = permitted;

  // Use a heap zone to avoid entanglement with old liveslots
  const ymaxZone = makeHeapZone();
  const makeContractControl = prepareContractControl(ymaxZone, {
    agoricNamesAdmin: await consume.agoricNamesAdmin,
    board: await consume.board,
    startUpgradable: await consume.startUpgradable,
    zoe: await consume.zoe,
  });
  const ymax0Kit = await consume.ymax0Kit;
  // XXX ideally, pass in an id to check in config
  trace(
    'ymax0Kit.instance boardId',
    await E(consume.board).getId(ymax0Kit.instance),
  );

  const ymaxControl = makeContractControl({
    name: contractName,
    storageNode: await E(consume.chainStorage).makeChildNode(contractName),
    kit: ymax0Kit,
  });

  const { getDepositFacet } = consume;
  trace('reserving', ymaxControlAddress);
  await E(getDepositFacet)(ymaxControlAddress);

  const postalSvcPub = await E.when(
    permitted.instance.consume.postalService,
    instance => E(consume.zoe).getPublicFacet(instance),
  );
  trace('delivering ymax control', ymaxControlAddress, ymaxControl);
  // don't block the coreEval on the recipient's offer
  void E.when(
    E(postalSvcPub).deliverPrize(
      ymaxControlAddress,
      ymaxControl,
      'ymaxControl',
    ),
    () => trace('ymax control received'),
  );
};

export const getManifestForPortfolioControl = (
  { restoreRef },
  { installKeys, options },
) => ({
  manifest: {
    ...postalServicePermit,
    [delegatePortfolioContract.name]: {
      consume: {
        ...orchPermit,
        agoricNamesAdmin: true,
        getDepositFacet: true,
        ymax0Kit: true,
      },
      instance: { consume: { postalService: true } },
    },
  },
  installations: { postalService: restoreRef(installKeys.postalService) },
  options,
});
