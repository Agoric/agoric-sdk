import { makeTracer } from '@agoric/internal/src/debug.js';
import { E } from '@endo/eventual-send';
import { passStyleOf } from '@endo/pass-style';
import { objectMap } from '@endo/patterns';

const contractName = 'postalService';

const trace = makeTracer('CCtrlCore');

/**
 * @import {Installation} from '@agoric/zoe';
 * @import {Instance} from '@agoric/zoe';
 * @import {PromiseSpaceOf} from '@agoric/vats/src/core/types.js';
 * @import {BootstrapPowers} from '@agoric/vats/src/core/types.js';
 * @import {start} from '@aglocal/portfolio-deploy/src/control/postal-service.contract.js';
 */
/**
 * @typedef {typeof start} PostalServiceStartFn
 *
 * @typedef {{
 *   installation: PromiseSpaceOf<{ postalService: Installation<PostalServiceStartFn>}>;
 *   instance: PromiseSpaceOf<{ postalService: Instance<PostalServiceStartFn>}>;
 * }} PostalServiceBoot
 */

/** @param {BootstrapPowers & PostalServiceBoot} permitted */
export const deployPostalService = async permitted => {
  permitted.instance.produce.postalService.reset();
  const { agoricNamesAdmin, startUpgradable, namesByAddress } =
    permitted.consume;
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
  const instanceAdmin = E(agoricNamesAdmin).lookupAdmin('instance');
  await E(instanceAdmin).update(contractName, kit.instance);
  permitted.instance.produce.postalService.resolve(kit.instance);
};

export const getManifestForPostalService = (
  { restoreRef },
  { installKeys },
) => ({
  manifest: {
    [deployPostalService.name]: {
      consume: {
        agoricNamesAdmin: true,
        startUpgradable: true,
        namesByAddress: true,
      },
      installation: { consume: { postalService: true } },
      instance: { produce: { postalService: true } },
    },
  },
  installations: { postalService: restoreRef(installKeys.postalService) },
});
