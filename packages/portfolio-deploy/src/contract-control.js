/**
 * @file contract-control: install, upgrade, terminate, reset chain-storage,
 * for a contract in a branch of agoricNames / chain-storage.
 */

import { makeTracer } from '@agoric/internal/src/debug.js';
import { Fail, q } from '@endo/errors';
import { E, passStyleOf } from '@endo/far';
import { M, objectMap } from '@endo/patterns';

const trace = makeTracer('CCtrl');

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {ContractStartFunction, StartResult} from '@agoric/zoe/src/zoeService/utils';
 * @import {Instance, IssuerKeywordRecord} from '@agoric/zoe';
 * @import {Remote} from '@agoric/internal';
 * @import {StorageNode} from '@agoric/internal/src/lib-chainStorage';
 * @import {Board, NameHubKit} from '@agoric/vats';
 * @import {UpgradeKit} from './get-upgrade-kit.core.js';
 */

/**
 * @typedef {<SF extends ContractStartFunction>(instance: Instance<SF>, privateArgs: Parameters<SF>[1]) => void} UpdatePrivateArgs
 */

const IssuerShape = M.remotable('Issuer');
const InstallationShape = M.remotable('Installation');
const PublicParts = harden({
  label: M.string(),
  instance: M.remotable('Instance'),
  publicFacet: M.remotable('publicFacet'),
});
const BundleIdShape = M.string();
const VatUpgradeResultsShape = M.splitRecord({ incarnationNumber: M.number() });
const IssuersShape = M.recordOf(M.string(), IssuerShape);
const PrivateArgsOverridesShape = M.record();

const iface = M.interface('ContractControl', {
  install: M.callWhen(M.string()).returns({
    boardId: M.string(),
    installation: InstallationShape,
  }),
  start: M.callWhen(
    M.splitRecord(
      { installation: InstallationShape },
      {
        issuers: IssuersShape,
        privateArgsOverrides: PrivateArgsOverridesShape,
      },
      {}, // Refuse unsupported options
    ),
  ).returns(PublicParts),
  installAndStart: M.callWhen(
    M.splitRecord(
      { bundleId: BundleIdShape },
      {
        issuers: IssuersShape,
        privateArgsOverrides: PrivateArgsOverridesShape,
      },
      {}, // Refuse unsupported options
    ),
  ).returns(PublicParts),
  getPublicFacet: M.call().returns(M.remotable('publicFacet')),
  getCreatorFacet: M.call().returns(M.remotable('creatorFacet')),
  upgrade: M.callWhen(
    M.or(
      BundleIdShape, // Backward compat with old signature
      M.splitRecord(
        { bundleId: BundleIdShape },
        {
          privateArgsOverrides: PrivateArgsOverridesShape,
        },
        {}, // Refuse unsupported options
      ),
    ),
  ).returns(VatUpgradeResultsShape),
  terminate: M.callWhen()
    .optional(
      M.splitRecord(
        {},
        { message: M.string(), target: M.string(), revoke: M.boolean() },
        {}, // Refuse unsupported options
      ),
    )
    .returns(),
  pruneChainStorage: M.callWhen(
    M.recordOf(M.string(), M.arrayOf(M.string())),
  ).returns(M.number()),
  revoke: M.call().returns(),
});

/**
 * @param {Zone} zone
 * @param {{
 *   agoricNamesAdmin: ERef<NameHubKit['nameAdmin']>,
 *   board: ERef<Board>,
 *   zoe: ERef<ZoeService>,
 *   startUpgradable: ERef<StartUpgradable>,
 *   updatePrivateArgs: ERef<UpdatePrivateArgs>
 * }} svcs
 */
export const prepareContractControl = (zone, svcs) => {
  /** @template {ContractStartFunction} SF */
  const makeMaker = () =>
    zone.exoClass(
      'ContractControl',
      iface,
      /**
       * Install by bundleId and publish to (the board and) agoricNames,
       * replacing anything that was there before.
       *
       * Former installations can be reached from the board.
       *
       * @param {ContractControlOpts} initial
       */
      initial => ({
        initialPrivateArgs:
          initial.initialPrivateArgs || initial.kit?.privateArgs,
        kit: undefined,
        ...initial,
        revoked: false,
      }),
      {
        /** @param {string} bundleId */
        async install(bundleId) {
          const { name, revoked } = this.state;
          trace(name, 'install', bundleId);
          !revoked || Fail`revoked`;
          const { zoe, board, agoricNamesAdmin } = svcs;
          const installation = await E(zoe).installBundleID(bundleId);
          const installationAdmin =
            E(agoricNamesAdmin).lookupAdmin('installation');
          await E(installationAdmin).update(name, installation);
          const boardId = await E(board).getId(installation);
          trace(name, 'installed', { bundleId, installation, boardId });
          return { boardId, installation };
        },

        /**
         * Start the contract; publish the instance to (the board and) agoricNames.
         *
         * @throws if already running
         * @param {object} opts
         * @param {Installation<SF>} opts.installation
         * @param {IssuerKeywordRecord} [opts.issuers]
         * @param {Partial<Parameters<SF>[1]>} [opts.privateArgsOverrides]
         */
        async start({ installation, issuers, privateArgsOverrides }) {
          const { name, storageNode, revoked, initialPrivateArgs } = this.state;
          !revoked || Fail`revoked`;
          !this.state.kit || Fail`${name} already started`;
          const { startUpgradable, board } = svcs;
          const installationId = await E(board).getId(installation);
          trace(name, 'startUpgradable', { installation, installationId });
          const privateArgs = harden({
            ...initialPrivateArgs,
            storageNode,
            ...privateArgsOverrides,
          });
          const kit = await E(startUpgradable)({
            label: name,
            installation,
            issuerKeywordRecord: issuers,
            //   terms: customTerms,
            privateArgs,
          });
          /** @type {UpgradeKit<SF>} */
          const fullKit = harden({ ...kit, privateArgs });
          trace(name, 'started', objectMap(fullKit, passStyleOf));
          this.state.kit = fullKit;

          const { agoricNamesAdmin } = svcs;
          const instanceAdmin = E(agoricNamesAdmin).lookupAdmin('instance');
          await E(instanceAdmin).update(name, kit.instance);
          const boardId = await E(board).getId(kit.instance);
          trace(name, 'published', { boardId, installationId });

          return harden({
            label: name,
            instance: kit.instance,
            publicFacet: kit.publicFacet,
          });
        },

        /**
         * @param {object} opts
         * @param {string} opts.bundleId
         * @param {IssuerKeywordRecord} [opts.issuers]
         * @param {Partial<Parameters<SF>[1]>} [opts.privateArgsOverrides]
         */
        async installAndStart({ bundleId, issuers, privateArgsOverrides }) {
          trace(this.state.name, 'installAndStart');
          !this.state.revoked || Fail`revoked`;
          const { self } = this;
          const { installation } = await self.install(bundleId);
          return self.start({
            installation,
            issuers,
            privateArgsOverrides,
          });
        },

        /** @returns {StartResult<SF>['publicFacet']} */
        getPublicFacet() {
          const { name, revoked, kit } = this.state;
          trace(name, 'getPublicFacet');
          !revoked || Fail`revoked`;
          if (!kit) throw Fail`${q(name)}: no StartedInstanceKit`;
          return kit.publicFacet;
        },

        /** @returns {StartResult<SF>['creatorFacet']} */
        getCreatorFacet() {
          const { name, revoked, kit } = this.state;
          trace(name, 'getCreatorFacet');
          !revoked || Fail`revoked`;
          if (!kit) throw Fail`${q(name)}: no StartedInstanceKit`;
          return kit.creatorFacet;
        },

        /** @param {string | {bundleId: string; privateArgsOverrides?: Partial<Parameters<SF>[1]>; }} opts */
        async upgrade(opts) {
          if (typeof opts === 'string') opts = { bundleId: opts };
          const { bundleId, privateArgsOverrides = {} } = opts;

          const { updatePrivateArgs } = svcs;

          const { name, revoked, kit, initialPrivateArgs } = this.state;
          trace(name, 'upgrade', bundleId);
          !revoked || Fail`revoked`;
          if (!kit) throw Fail`${q(name)}: no StartedInstanceKit`;
          const { privateArgs: previousPrivateArgs } = kit;
          const privateArgs = {
            ...initialPrivateArgs,
            ...previousPrivateArgs,
            ...privateArgsOverrides,
          };
          const result = await E(kit.adminFacet).upgradeContract(
            bundleId,
            privateArgs,
          );
          const newKit = harden({ ...kit, privateArgs });
          trace(name, 'upgrade result', result);
          this.state.kit = newKit;
          await E(updatePrivateArgs)(kit.instance, privateArgs);
          return result;
        },

        /**
         * @param {object} opts
         * @param {string} [opts.target] boardId to confirm is current
         * @param {string} [opts.message] for termination error
         * @param {boolean} [opts.revoke] neuter this object
         */
        async terminate(opts = {}) {
          const { name, kit, revoked } = this.state;
          trace(name, 'terminate', kit?.adminFacet, opts);
          !revoked || Fail`revoked`;
          const { target, message = 'terminated', revoke } = opts;
          if (!kit) {
            if (revoke) {
              trace(name, 'revoked');
              this.state.revoked = true;
              return;
            }
            throw Fail`${q(name)}: no StartedInstanceKit`;
          }

          await null;
          if (target) {
            const current = await E(svcs.board).getId(kit.instance);
            assert.equal(current, target);
          }

          try {
            await E(kit.adminFacet).terminateContract(harden(Error(message)));
          } catch (err) {
            console.error('terminateContract failed; forgetting kit', err);
          }
          this.state.kit = undefined;
          if (revoke) {
            trace(name, 'revoked');
            this.state.revoked = true;
          }
          const { agoricNamesAdmin } = svcs;
          const instanceAdmin = E(agoricNamesAdmin).lookupAdmin('instance');
          await E(instanceAdmin).delete(name);
        },

        /** @param {Record<string, string[]>} parentToChildren */
        async pruneChainStorage(parentToChildren) {
          const { name, storageNode, revoked } = this.state;
          trace(
            name,
            'pruneChainStorage',
            Object.keys(parentToChildren).length,
          );
          !revoked || Fail`revoked`;

          /** @param {string[]} path */
          const makePathNode = path => {
            /** @type {Promise<Remote<StorageNode>>} */
            let node = Promise.resolve(storageNode);
            for (const segment of path) {
              node = E(node).makeChildNode(segment);
            }
            return node;
          };

          const prefix = await E(storageNode).getPath();
          for (const parent of Object.keys(parentToChildren)) {
            parent.startsWith(prefix) ||
              Fail`${parent} must start with ${prefix}`;
          }

          let qty = 0;
          for (const [parent, children] of Object.entries(parentToChildren)) {
            trace(name, 'pruning', parent, children);
            const suffix = parent.slice(prefix.length + '.'.length);
            const segments = suffix ? suffix.split('.') : [];
            const parentNode = makePathNode(segments);
            // on failure, trace rather than aborting the whole job
            await Promise.allSettled(
              children.map(async k => {
                await null;
                try {
                  await E(
                    E(parentNode).makeChildNode(k, { sequence: false }),
                  ).setValue('');
                  qty += 1;
                } catch (err) {
                  trace('rejected:', parent, k, err);
                }
              }),
            );
          }
          trace('done');
          return qty;
        },

        revoke() {
          const { name, kit, revoked } = this.state;
          trace(name, 'revoke', kit?.adminFacet);
          !revoked || Fail`revoked`;

          trace(name, 'revoked');
          this.state.revoked = true;
        },
      },
    );

  /**
   * @template {ContractStartFunction} [SF=ContractStartFunction]
   * @typedef {ReturnType<ReturnType<typeof makeMaker<SF>>>} ContractControl
   */

  /** @type {<SF extends ContractStartFunction>(initial: ContractControlOpts<SF>) => ContractControl<SF>} */
  const makeContractControl = makeMaker();

  return makeContractControl;
};

/**
 * @template {ContractStartFunction} [SF=ContractStartFunction]
 * @typedef {object} ContractControlOpts
 * @property {string} name contractName
 * @property {Remote<StorageNode>} storageNode
 * @property {StartedInstanceKit<SF> & { privateArgs?: Parameters<SF>[1] }} [kit]
 * @property {Partial<Parameters<SF>[1]>} [initialPrivateArgs]
 */

/** @typedef {ReturnType<typeof prepareContractControl>} MakeContractControl */

// Hack to allow extracting the generic result of MakeContractControl
// See https://github.com/microsoft/TypeScript/issues/62524
// eslint-disable-next-line
const maker = /** @type {MakeContractControl} */ (
  /** @type {unknown} */ (undefined)
);

/** @template {ContractStartFunction} [SF=ContractStartFunction] @typedef {ReturnType<typeof maker<SF>>} ContractControl */
