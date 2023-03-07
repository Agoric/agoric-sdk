// @ts-check
import { E, Far } from '@endo/far';

import * as simBehaviors from '@agoric/inter-protocol/src/proposals/sim-behaviors.js';
import { makePassableEncoding } from '@agoric/swingset-vat/tools/passableEncoding.js';
import {
  makeAgoricNamesAccess,
  makePromiseSpace,
  runModuleBehaviors,
} from './utils.js';
import {
  CLIENT_BOOTSTRAP_MANIFEST,
  CHAIN_BOOTSTRAP_MANIFEST,
  SIM_CHAIN_BOOTSTRAP_MANIFEST,
} from './manifest.js';

import * as behaviors from './behaviors.js';
import * as clientBehaviors from './client-behaviors.js';
import * as utils from './utils.js';

const { Fail, quote: q } = assert;

// Choose a manifest based on runtime configured argv.ROLE.
const roleToManifest = harden({
  chain: CHAIN_BOOTSTRAP_MANIFEST,
  'sim-chain': SIM_CHAIN_BOOTSTRAP_MANIFEST,
  client: CLIENT_BOOTSTRAP_MANIFEST,
});
const roleToBehaviors = harden({
  'sim-chain': { ...behaviors, ...simBehaviors },
  // copy to avoid trying to harden a module namespace
  client: { ...clientBehaviors },
});

/**
 * Build root object of the bootstrap vat.
 *
 * @param {{
 *   D: DProxy,
 *   logger: (msg) => void,
 * }} vatPowers
 * @param {{
 *   argv: { ROLE: string },
 *   bootstrapManifest?: Record<string, Record<string, unknown>>,
 *   coreProposalCode?: string,
 * }} vatParameters
 */
const buildRootObject = (vatPowers, vatParameters) => {
  const log = vatPowers.logger || console.info;
  const { produce, consume } = makePromiseSpace(log);
  const { agoricNames, agoricNamesAdmin, spaces } = makeAgoricNamesAccess(log);
  produce.agoricNames.resolve(agoricNames);
  produce.agoricNamesAdmin.resolve(agoricNamesAdmin);

  const {
    // XXX not for production ?!
    argv: { ROLE = 'chain' },
    bootstrapManifest,
  } = vatParameters;
  // ROLE || Fail`boot requires ROLE in argv`;
  console.debug(`${ROLE} bootstrap starting`);

  const bootManifest = bootstrapManifest || roleToManifest[ROLE];
  const bootBehaviors = roleToBehaviors[ROLE] || behaviors;
  bootManifest || Fail`no configured bootstrapManifest for role ${ROLE}`;
  bootBehaviors || Fail`no configured bootstrapBehaviors for role ${ROLE}`;

  /**
   * Bootstrap vats and devices.
   *
   * @param {SwingsetVats} vats
   * @param {SoloDevices | ChainDevices} devices
   */
  const rawBootstrap = async (vats, devices) => {
    // Complete SwingSet wiring.
    const { D } = vatPowers;
    if (devices.mailbox) {
      D(devices.mailbox).registerInboundHandler(vats.vattp);
      // eslint-disable-next-line @jessie.js/no-nested-await -- XXX
      await E(vats.vattp).registerMailboxDevice(devices.mailbox);
    } else {
      console.warn('No mailbox device. Not registering with vattp');
    }

    const runBehaviors = manifest => {
      return runModuleBehaviors({
        // eslint-disable-next-line no-use-before-define
        allPowers,
        behaviors: bootBehaviors,
        manifest,
        makeConfig: (name, permit) => {
          log(`bootstrap: ${name}(${q(permit)}`);
          return vatParameters[name];
        },
      });
    };

    // TODO: Aspires to be BootstrapPowers, but it's too specific.
    const allPowers = harden({
      vatPowers,
      vatParameters,
      vats,
      devices,
      produce,
      consume,
      ...spaces,
      runBehaviors,
      // These module namespaces might be useful for core eval governance.
      modules: {
        clientBehaviors: { ...clientBehaviors },
        simBehaviors: { ...simBehaviors },
        behaviors: { ...behaviors },
        utils: { ...utils },
      },
    });

    await runBehaviors(bootManifest);

    const { coreProposalCode } = vatParameters;
    if (!coreProposalCode) {
      return;
    }

    // Start the governance from the core proposals.
    const coreEvalMessage = {
      type: 'CORE_EVAL',
      evals: [
        {
          json_permits: 'true',
          js_code: coreProposalCode,
        },
      ],
    };
    /** @type {any} */
    const { coreEvalBridgeHandler } = consume;
    await E(coreEvalBridgeHandler).fromBridge(coreEvalMessage);
  };

  // For testing supports
  const vatData = new Map();
  const { encodePassable, decodePassable } = makePassableEncoding();

  return Far('bootstrap', {
    bootstrap: (vats, devices) => {
      for (const [name, root] of Object.entries(vats)) {
        if (name !== 'vatAdmin') {
          vatData.set(name, { root });
        }
      }
      rawBootstrap(vats, devices).catch(e => {
        console.error('BOOTSTRAP FAILED:', e);
        throw e;
      });
    },
    consumeItem: name => {
      assert.typeof(name, 'string');
      return consume[name];
    },
    produceItem: (name, resolution) => {
      assert.typeof(name, 'string');
      produce[name].resolve(resolution);
    },
    resetItem: name => {
      assert.typeof(name, 'string');
      produce[name].reset();
    },

    // #region testing supports
    messageVat: async ({ name, methodName, args = [] }) => {
      const vat = vatData.get(name) || Fail`unknown vat name: ${q(name)}`;
      const { root } = vat;
      const decodedArgs = args.map(decodePassable);
      const result = await E(root)[methodName](...decodedArgs);
      return encodePassable(result);
    },
    messageVatObject: async ({ presence, methodName, args = [] }) => {
      const object = decodePassable(presence);
      const decodedArgs = args.map(decodePassable);
      const result = await E(object)[methodName](...decodedArgs);
      return encodePassable(result);
    },
    awaitVatObject: async ({ presence, path = [] }) => {
      let value = await decodePassable(presence);
      for (const key of path) {
        // eslint-disable-next-line no-await-in-loop
        value = await value[key];
      }
      return encodePassable(value);
    },
    // #endregion
  });
};

harden({ buildRootObject });
export { buildRootObject };
