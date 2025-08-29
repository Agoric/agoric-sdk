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
 * @import {IssuerKeywordRecord} from '@agoric/zoe';
 * @import {Remote} from '@agoric/internal';
 * @import {Board, NameHubKit} from '@agoric/vats';
 * @import {CopyRecord} from '@endo/pass-style';
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

const iface = M.interface('ContractControl', {
  install: M.callWhen(M.string()).returns({
    boardId: M.string(),
    installation: InstallationShape,
  }),
  start: M.callWhen(
    M.splitRecord(
      { installation: InstallationShape },
      {
        issuers: M.recordOf(M.string(), IssuerShape),
        dataPrivateArgs: M.record(),
      },
    ),
  ).returns(PublicParts),
  installAndStart: M.callWhen(
    M.splitRecord(
      { bundleId: BundleIdShape },
      {
        issuers: M.recordOf(M.string(), IssuerShape),
        dataPrivateArgs: M.record(),
      },
    ),
  ).returns(PublicParts),
  getPublicFacet: M.call().returns(M.remotable('publicFacet')),
  getCreatorFacet: M.call().returns(M.remotable('creatorFacet')),
  upgrade: M.callWhen(BundleIdShape).returns(VatUpgradeResultsShape),
  terminate: M.callWhen()
    .optional(
      M.splitRecord(
        {},
        { message: M.string(), target: M.string(), revoke: M.boolean() },
      ),
    )
    .returns(),
  pruneChainStorage: M.callWhen(
    M.recordOf(M.string(), M.arrayOf(M.string())),
  ).returns(M.number()),
});

/**
 * @template {ContractStartFunction} SF
 * @typedef {StartedInstanceKit<SF> & {
 *   label: string;
 *   privateArgs: Parameters<SF>[1];
 * }} UpgradeKit
 */

/**
 * @param {Zone} zone
 * @param {{
 *   agoricNamesAdmin: ERef<NameHubKit['nameAdmin']>,
 *   board: ERef<Board>,
 *   zoe: ERef<ZoeService>,
 *   startUpgradable: ERef<StartUpgradable>,
 * }} svcs
 */
export const prepareContractControl = (zone, svcs) => {
  return zone.exoClass(
    'ContractControl',
    iface,
    /**
     * Install by bundleId and publish to (the board and) agoricNames,
     * replacing anything that was there before.
     *
     * Former installations can be reached from the board.
     *
     * @template {ContractStartFunction} SF
     * @param {{
     *   name: string;
     *   storageNode: Remote<StorageNode>;
     *   kit?: (StartedInstanceKit<SF> & { privateArgs: Parameters<SF>[1] });
     *   initialPrivateArgs?: Parameters<SF>[1],
     * }} initial
     */
    initial => ({
      initialPrivateArgs:
        initial.initialPrivateArgs || initial.kit?.privateArgs,
      revoked: false,
      kit: undefined,
      ...initial,
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
       * @template {ContractStartFunction} SF
       * @param {object} opts
       * @param {Installation<SF>} opts.installation
       * @param {IssuerKeywordRecord} [opts.issuers]
       * @param {CopyRecord} [opts.privateArgsOverrides]
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
       * @param {CopyRecord} [opts.privateArgsOverrides]
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

      /** @template {ContractStartFunction} SF @returns {StartResult<SF>['publicFacet']} */
      getPublicFacet() {
        const { name, revoked, kit } = this.state;
        trace(name, 'getPublicFacet');
        !revoked || Fail`revoked`;
        if (!kit) throw Fail`${q(name)}: no StartedInstanceKit`;
        return kit.publicFacet;
      },

      /** @template {ContractStartFunction} SF @returns {StartResult<SF>['creatorFacet']} */
      getCreatorFacet() {
        const { name, revoked, kit } = this.state;
        trace(name, 'getCreatorFacet');
        !revoked || Fail`revoked`;
        if (!kit) throw Fail`${q(name)}: no StartedInstanceKit`;
        return kit.creatorFacet;
      },

      /** @param {string} bundleId */
      async upgrade(bundleId) {
        const { name, revoked, kit } = this.state;
        trace(name, 'upgrade', bundleId);
        !revoked || Fail`revoked`;
        if (!kit) throw Fail`${q(name)}: no StartedInstanceKit`;
        const { privateArgs } = kit;
        const result = await E(kit.adminFacet).upgradeContract(
          bundleId,
          privateArgs,
        );
        trace(name, 'upgrade result', result);
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
        trace(name, 'pruneChainStorage', Object.keys(parentToChildren).length);
        !revoked || Fail`revoked`;

        /** @param {string[]} path */
        const makePathNode = path => {
          /** @type {Promise<StorageNode>} */
          // @ts-expect-error Remote/E integration incomplete
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
    },
  );
};

/** @template SF @typedef {ReturnType<ReturnType<typeof prepareContractControl>>} ContractControl<SF> */
