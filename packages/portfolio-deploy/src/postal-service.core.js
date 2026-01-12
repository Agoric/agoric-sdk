import { E } from '@endo/eventual-send';
import { passStyleOf } from '@endo/pass-style';
import { objectMap } from '@endo/patterns';
import { makeTracer } from '@agoric/internal/src/debug.js';

const contractName = 'postalService';

const trace = makeTracer('CCtrlCore');

/**
 * @import {start as StartFn} from './postal-service.contract.js';
 * @import {Installation} from '@agoric/zoe';
 * @import {Instance} from '@agoric/zoe';
 */
/**
 * @typedef {{
 *   installation: PromiseSpaceOf<{ postalService: Installation<StartFn>}>;
 *   instance: PromiseSpaceOf<{ postalService: Instance<StartFn>}>;
 * }} PostalServiceBoot
 */

/** @param {BootstrapPowers & PostalServiceBoot} permitted */
export const deployPostalService = async permitted => {
  permitted.instance.produce.postalService.reset();
  const { startUpgradable, namesByAddress } = permitted.consume;
  const { postalService: installationP } = permitted.installation.consume;
  trace('await: installation.postalService');
  const installation = await installationP;
  trace('await: namesByAddress');
  const privateArgs = harden({
    namesByAddress: await namesByAddress,
  });
  trace('await: startUpgradable(...)');
  const kit = await E(startUpgradable)({
    label: contractName,
    installation,
    privateArgs,
  });
  trace('kit', objectMap(kit, passStyleOf));
  permitted.instance.produce.postalService.resolve(kit.instance);
};

export const getManifestForPostalService = (
  { restoreRef },
  { installKeys },
) => ({
  manifest: {
    [deployPostalService.name]: {
      consume: { startUpgradable: true, namesByAddress: true },
      installation: { consume: { postalService: true } },
      instance: { produce: { postalService: true } },
    },
  },
  installations: { postalService: restoreRef(installKeys.postalService) },
});
