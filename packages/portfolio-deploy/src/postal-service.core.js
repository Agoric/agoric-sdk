import { E } from '@endo/eventual-send';
import { passStyleOf } from '@endo/pass-style';
import { objectMap } from '@endo/patterns';

const contractName = 'postalService';

/**
 * @import {start as StartFn} from './postal-service.contract.js';
 */
/**
 * @typedef {{
 *   installation: PromiseSpaceOf<{ postalService: Installation<StartFn>}>;
 *   instance: PromiseSpaceOf<{ postalService: Instance<StartFn>}>;
 * }} PostalServiceBoot
 */

/** @param {BootstrapPowers & PostalServiceBoot} permitted */
export const deployPostalService = async permitted => {
  const { startUpgradable, namesByAddress } = permitted.consume;
  const { postalService: installationP } = permitted.installation.consume;
  console.log('await: installation.postalService');
  const installation = await installationP;
  console.log('await: namesByAddress');
  const privateArgs = harden({
    namesByAddress: await namesByAddress,
  });
  console.log('await: startUpgradable(...)');
  const kit = await E(startUpgradable)({
    label: contractName,
    installation,
    privateArgs,
  });
  console.log(objectMap(kit, passStyleOf));
  permitted.instance.produce.postalService.resolve(kit.instance);
};

export const permit = {
  [deployPostalService.name]: {
    consume: { startUpgradable: true, namesByAddress: true },
    installation: { consume: { postalService: true } },
    instance: { produce: { postalService: true } },
  },
};
