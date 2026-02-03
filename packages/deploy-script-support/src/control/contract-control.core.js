/** @file core eval to deliver control of a contract to a smartWallet */

import { makeTracer } from '@agoric/internal/src/debug.js';
import { makeHeapZone } from '@agoric/zone';
import { Fail } from '@endo/errors';
import { E } from '@endo/eventual-send';
import { YMAX_CONTROL_WALLET_KEY } from '@agoric/portfolio-api/src/portfolio-constants.js';
import { prepareContractControl } from './contract-control.contract.js';

/**
 * @import {ContractStartFunction} from '@agoric/zoe/src/zoeService/utils.js';
 * @import {ChainStoragePresent} from './chain-info.core.js'
 * @import {PostalServiceBoot} from './postal-service.core.js';
 * @import {AttenuatedDepositPowers} from './attenuated-deposit.core.js';
 * @import {ContractControlOpts, ContractControl, UpdatePrivateArgs} from './contract-control.contract.js';
 * @import {PromiseSpaceOf} from '@agoric/vats/src/core/types.js';
 * @import {BootstrapPowers} from '@agoric/vats/src/core/types.js';
 */

/**
 * @template {ContractStartFunction} SF
 * @typedef {Omit<ContractControlOpts<SF>, 'storageNode'> & {controlAddress: string}} ContractControlDeliverOpts
 */

/**
 * @typedef {<SF extends ContractStartFunction>(opts: ContractControlDeliverOpts<SF>) => Promise<{delivered: Promise<void>, contractControl: ContractControl<SF>}>} DeliverContractControl
 */

/**
 * @typedef {PromiseSpaceOf<{ deliverContractControl: DeliverContractControl}>} ContractControlPowers
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

  const instancePrivateArgs = await consume.instancePrivateArgs;

  const postalSvcPub = E.when(
    permitted.instance.consume.postalService,
    instance => E(zoe).getPublicFacet(instance),
  );

  /** @type {UpdatePrivateArgs} */
  const updatePrivateArgs = (instance, privateArgs) => {
    if (!instancePrivateArgs.has(instance)) {
      Fail`instance doesn't have privateArgs`;
    }
    instancePrivateArgs.set(instance, privateArgs);
  };

  // Use a heap zone to avoid entanglement with old liveslots
  const zone = makeHeapZone();
  const makeContractControl = prepareContractControl(zone, {
    agoricNamesAdmin: await consume.agoricNamesAdmin,
    board: await consume.board,
    startUpgradable: await consume.startUpgradable,
    updatePrivateArgs,
    zoe: await zoe,
  });

  /** @type {DeliverContractControl} */
  const deliverContractControl = async ({
    name: contractName,
    controlAddress,
    ...opts
  }) => {
    await null;

    const trace = makeTracer(`CCtrlCore-${contractName}`);

    trace('creating contract control and delivering to', controlAddress);

    const contractControl = makeContractControl({
      name: contractName,
      storageNode: await E(chainStorage).makeChildNode(contractName),
      ...opts,
    });

    trace('reserving', controlAddress);
    // This can block if the wallet is not provisioned
    await E(getDepositFacet)(controlAddress);

    trace(`delivering control`, controlAddress, contractControl);
    // don't block on the recipient's offer
    const delivered = E.when(
      E(postalSvcPub).deliverPrize(
        controlAddress,
        contractControl,
        YMAX_CONTROL_WALLET_KEY,
      ),
      () => trace('control received'),
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
        instancePrivateArgs: true,
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
