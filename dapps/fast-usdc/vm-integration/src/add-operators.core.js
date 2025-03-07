import { makeTracer } from '@agoric/internal';
import { inviteOracles } from './utils/core-eval.js';

/**
 * @import {ManifestBundleRef} from '@agoric/deploy-script-support/src/externalTypes.js'
 * @import {BootstrapManifest} from '@agoric/vats/src/core/lib-boot.js'
 * @import {LegibleCapData} from './utils/config-marshal.js'
 * @import {FastUSDCConfig} from '@agoric/fast-usdc-contract';
 * @import {FastUSDCCorePowers, FastUSDCKit} from './start-fast-usdc.core.js';
 */

const trace = makeTracer('FUSD-AddOperators', true);

/**
 * @throws if oracle smart wallets are not yet provisioned
 *
 * @param {BootstrapPowers & FastUSDCCorePowers } powers
 * @param {{ options: LegibleCapData<FastUSDCConfig> }} config
 */
export const addOperators = async (
  { consume: { namesByAddress, fastUsdcKit } },
  config,
) => {
  trace(addOperators.name);

  const kit = await fastUsdcKit;

  const { creatorFacet } = kit;

  trace(config);

  // @ts-expect-error XXX LegibleCapData typedef
  const { oracles } = config.options.structure;

  await inviteOracles({ creatorFacet, namesByAddress }, oracles);
};
harden(addOperators);

/**
 * @param {{
 *   restoreRef: (b: ERef<ManifestBundleRef>) => Promise<Installation>;
 * }} utils
 * @param {{
 *   options: LegibleCapData<FastUSDCConfig>;
 * }} param1
 */
export const getManifestForAddOperators = ({ restoreRef: _ }, { options }) => {
  return {
    /** @type {BootstrapManifest} */
    manifest: {
      [addOperators.name]: {
        consume: {
          fastUsdcKit: true,

          // widely shared: name services
          agoricNames: true,
          namesByAddress: true,
        },
      },
    },
    options,
  };
};
