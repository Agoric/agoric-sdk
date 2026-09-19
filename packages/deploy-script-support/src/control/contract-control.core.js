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
 * @typedef {string} ControlAddress
 * @typedef {string} ContractName
 * @typedef {(match?: { contractName?: ContractName, controlAddress?: ControlAddress }) => void} RevokeContractControl
 */

/**
 * @typedef {PromiseSpaceOf<{
 *   deliverContractControl: DeliverContractControl;
 *   _contractRevokerMapForAddress: Map<ControlAddress, Map<ContractName, Set<{ revoke(): void }>>>;
 *   _controlAddressesForContractName: Map<ContractName, Set<ControlAddress>>;
 *   revokeContractControl: RevokeContractControl;
 * }>} ContractControlPowers
 */

/**
 * @param {ContractControlPowers} permitted
 */
export const produceRevokeContractControl = async permitted => {
  // eslint-disable-next-line no-underscore-dangle
  permitted.produce._contractRevokerMapForAddress.resolve(new Map());
  // eslint-disable-next-line no-underscore-dangle
  permitted.produce._controlAddressesForContractName.resolve(new Map());

  const revokeContractControl = async match => {
    const {
      consume: {
        _contractRevokerMapForAddress,
        _controlAddressesForContractName,
      },
    } = permitted;
    const revokerMapForAddress = await _contractRevokerMapForAddress;
    const addressesForContract = await _controlAddressesForContractName;

    const contractName = match?.contractName;
    const controlAddress = match?.controlAddress;
    if (contractName !== undefined && controlAddress !== undefined) {
      typeof contractName === 'string' || Fail`contractName must be a string`;
      typeof controlAddress === 'string' ||
        Fail`controlAddress must be a string`;
    }

    /** @type {[ControlAddress, ContractName][]} */
    const matched = [];
    if (contractName !== undefined) {
      const addresses = addressesForContract.get(contractName);
      for (const address of addresses?.keys() ?? []) {
        if (controlAddress !== undefined && address !== controlAddress) {
          continue;
        }
        if (revokerMapForAddress.get(address)?.has(contractName)) {
          matched.push([address, contractName]);
        }
      }
    } else if (controlAddress !== undefined) {
      const revokersForAddress = revokerMapForAddress.get(controlAddress);
      for (const name of revokersForAddress?.keys() ?? []) {
        matched.push([controlAddress, name]);
      }
    } else {
      for (const [address, revokersForAddress] of revokerMapForAddress) {
        for (const name of revokersForAddress.keys()) {
          matched.push([address, name]);
        }
      }
    }

    for (const [address, name] of matched) {
      const revokersForAddress = revokerMapForAddress.get(address);
      const revokers = revokersForAddress?.get(name);
      for (const revoker of revokers?.keys() ?? []) {
        revokers?.delete(revoker);
        await E(revoker)
          .revoke()
          .catch(() => {});
      }

      if (!revokers?.size) {
        revokersForAddress?.delete(name);
        const addresses = addressesForContract.get(name);
        addresses?.delete(address);
        if (!addresses?.size) {
          addressesForContract.delete(name);
        }
      }
      if (!revokersForAddress?.size) {
        revokerMapForAddress.delete(address);
      }
    }
  };
  harden(revokeContractControl);
  permitted.produce.revokeContractControl.reset();
  permitted.produce.revokeContractControl.resolve(revokeContractControl);
};

/**
 * @param {BootstrapPowers &
 *  ChainStoragePresent &
 *  PostalServiceBoot &
 *  ContractControlPowers &
 *  AttenuatedDepositPowers
 * } permitted
 */
export const produceDeliverContractControl = async permitted => {
  // eslint-disable-next-line no-underscore-dangle
  permitted.produce._contractRevokerMapForAddress.resolve(new Map());
  // eslint-disable-next-line no-underscore-dangle
  permitted.produce._controlAddressesForContractName.resolve(new Map());
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

    {
      const {
        consume: {
          _contractRevokerMapForAddress,
          _controlAddressesForContractName,
        },
      } = permitted;
      const revokerMapForAddress = await _contractRevokerMapForAddress;
      const addressesForContract = await _controlAddressesForContractName;

      let revokersForAddress = revokerMapForAddress.get(controlAddress);
      if (!revokersForAddress) {
        revokersForAddress = new Map();
        revokerMapForAddress.set(controlAddress, revokersForAddress);
      }
      let revokers = revokersForAddress.get(contractName);
      if (!revokers) {
        revokers = new Set();
        revokersForAddress.set(contractName, revokers);
      }

      // Save the "revoker" for later. Scare quotes, because the contractControl
      // has no revoker facet, so we need to store the full-powered object.
      revokers.add(contractControl);

      let addresses = addressesForContract.get(contractName);
      if (!addresses) {
        addresses = new Set();
        addressesForContract.set(contractName, addresses);
      }
      addresses.add(controlAddress);
    }

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
    [produceRevokeContractControl.name]: {
      consume: {
        _contractRevokerMapForAddress: true,
        _controlAddressesForContractName: true,
      },
      produce: {
        _contractRevokerMapForAddress: true,
        _controlAddressesForContractName: true,
        revokeContractControl: true,
      },
    },
    [produceDeliverContractControl.name]: {
      consume: {
        _contractRevokerMapForAddress: true,
        _controlAddressesForContractName: true,
        agoricNamesAdmin: true,
        board: true,
        chainStorage: true,
        getDepositFacet: true,
        instancePrivateArgs: true,
        startUpgradable: true,
        zoe: true,
      },
      produce: {
        _contractRevokerMapForAddress: true,
        _controlAddressesForContractName: true,
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
