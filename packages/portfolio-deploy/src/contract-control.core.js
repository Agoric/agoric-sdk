/** @file core eval to deliver control of a contract to a smartWallet */

import { makeTracer } from '@agoric/internal/src/debug.js';
import { E } from '@endo/eventual-send';
import { makeHeapZone } from '@agoric/zone';
// import { objectMap } from '@endo/patterns';
// import { passStyleOf } from '@endo/pass-style';
import { prepareContractControl } from './contract-control.js';

/**
 * @import {ContractStartFunction} from '@agoric/zoe/src/zoeService/utils';
 * @import {ChainStoragePresent} from './chain-info.core.js'
 * @import {PostalServiceBoot} from './postal-service.core.js';
 * @import {AttenuatedDepositPowers} from './attenuated-deposit.core.js';
 * @import {ContractControlOpts, ContractControl} from './contract-control.js';
 */

const trace = makeTracer('CCtrlCore');

/**
 * @template {ContractStartFunction} SF
 * @typedef {Omit<ContractControlOpts<SF>, 'storageNode'> & {controlAddress: string}} ContractControlDeliverOpts
 */

/**
 * @template {ContractStartFunction} SF
 * @typedef {(opts: ContractControlDeliverOpts<SF>) => Promise<{delivered: Promise<void>, contractControl: ContractControl<SF>}>} DeliverContractControl
 */

/**
 * @template {ContractStartFunction} [SF=ContractStartFunction]
 * @typedef {PromiseSpaceOf<{ deliverContractControl: DeliverContractControl<SF>}>} ContractControlPowers
 */

/**
 * @param {BootstrapPowers &
 *  ChainStoragePresent &
 *  PostalServiceBoot &
 *  ContractControlPowers &
 *  AttenuatedDepositPowers
 * } permitted
 */
export const produceDeliverContractControl = async permitted => {
  permitted.produce.deliverContractControl.reset();
  await null;

  const { consume } = permitted;

  const { chainStorage, getDepositFacet, zoe } = consume;

  const postalSvcPub = E.when(
    permitted.instance.consume.postalService,
    instance => E(zoe).getPublicFacet(instance),
  );

  // Use a heap zone to avoid entanglement with old liveslots
  const zone = makeHeapZone();
  const makeContractControl = prepareContractControl(zone, {
    agoricNamesAdmin: await consume.agoricNamesAdmin,
    board: await consume.board,
    startUpgradable: await consume.startUpgradable,
    zoe: await zoe,
  });

  /** @type {DeliverContractControl<ContractStartFunction>} */
  const deliverContractControl = async ({
    name: contractName,
    controlAddress,
    ...opts
  }) => {
    await null;

    trace(
      'creating contract control for',
      contractName,
      'and delivering to',
      controlAddress,
    );

    const contractControl = makeContractControl({
      name: contractName,
      storageNode: await E(chainStorage).makeChildNode(contractName),
      ...opts,
    });

    trace('reserving', controlAddress);
    await E(getDepositFacet)(controlAddress);

    trace(
      `delivering ${contractName} control`,
      controlAddress,
      contractControl,
    );
    // don't block on the recipient's offer
    const delivered = E.when(
      E(postalSvcPub).deliverPrize(
        controlAddress,
        contractControl,
        'ymaxControl',
      ),
      () => trace(`${contractName} control received`),
    );

    return harden({ delivered, contractControl });
  };
  harden(deliverContractControl);

  permitted.produce.deliverContractControl.resolve(deliverContractControl);
};

export const getManifestForDeliverContractControl = () => ({
  manifest: {
    [produceDeliverContractControl.name]: {
      consume: {
        agoricNamesAdmin: true,
        board: true,
        chainStorage: true,
        getDepositFacet: true,
        startUpgradable: true,
        zoe: true,
      },
      produce: {
        deliverContractControl: true,
      },
      instance: {
        consume: { postalService: true },
        // provide: true,
      },
      installation: {
        // provide: true,
      },
    },
  },
});
