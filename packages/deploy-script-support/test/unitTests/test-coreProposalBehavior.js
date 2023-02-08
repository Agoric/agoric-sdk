import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { E } from '@endo/far';
import '@agoric/vats/src/core/types.js';
import {
  makeAgoricNamesAccess,
  runModuleBehaviors,
} from '@agoric/vats/src/core/utils.js';
import { makeCoreProposalBehavior } from '../../src/coreProposalBehavior.js';

// TODO: we need to rewrite writeCoreProposal.js to produce BundleIDs,
// although this test doesn't exercise that.

test('coreProposalBehavior', async t => {
  const manifestInstallRef = { bundleName: 'manifestInstallRef' };
  /** @type {[string, ...unknown[]]} */
  const getManifestCall = ['getManifestForTest', 'arg1', 'arg2'];
  const behavior = makeCoreProposalBehavior({
    E,
    manifestInstallRef,
    getManifestCall,
    log: t.log,
  });
  const { agoricNamesAdmin } = makeAgoricNamesAccess(t.log);
  const bundleID = 'the-bundleID';
  const bundleCap = {};
  const vatAdminSvc = {
    getNamedBundleID: bundleName => {
      t.is(bundleName, manifestInstallRef.bundleName);
      return bundleID;
    },
    getNamedBundleCap: bundleName => {
      t.is(bundleName, manifestInstallRef.bundleName);
      return bundleCap;
    },
  };
  const fromInstallation = {};
  const result = await behavior({
    consume: {
      vatAdminSvc,
      zoe: {
        installBundleID: id => {
          t.is(id, bundleID);
          return `installation:${id}`;
        },
      },
      agoricNamesAdmin,
    },
    aParams: 'aparms',
    bParams: 'bparms',
    cParams: 'cparms',
    evaluateBundleCap: bcap => {
      t.is(bcap, bundleCap);
      return {
        fromInstallation,
        getManifestForTest: (powers, ...args) => {
          t.deepEqual(args, ['arg1', 'arg2']);
          return {
            manifest: {
              behaviorB: {
                bParams: true,
              },
              behaviorA: {
                aParams: true,
              },
              behaviorAB: {
                aParams: true,
                bParams: true,
              },
            },
            options: {
              optionsFoo: 'foo',
              optionsBar: 'bar',
            },
          };
        },
        behaviorA: (
          powers,
          { options: { optionsFoo, optionsBar, ...rest } },
        ) => {
          const { aParams } = powers;
          t.is(aParams, 'aparms');
          t.throws(() => powers.bParams, {
            message: /"bParams" not permitted/,
          });
          t.is(optionsFoo, 'foo');
          t.is(optionsBar, 'bar');
          t.deepEqual(rest, {});
          return 'a';
        },
        behaviorB: async powers => {
          const { bParams } = powers;
          t.is(bParams, 'bparms');
          t.throws(() => powers.aParams, {
            message: /"aParams" not permitted/,
          });
          return 'b';
        },
        behaviorAB: async (powers, config) => {
          const { aParams, bParams } = powers;
          t.is(aParams, 'aparms');
          t.is(bParams, 'bparms');
          t.throws(() => powers.cParams, {
            message: /"cParams" not permitted/,
          });
          t.deepEqual(config, {
            options: { optionsFoo: 'foo', optionsBar: 'bar' },
          });
          return 'c';
        },
      };
    },
    installation: {
      produce: {
        foo: { resolve: x => t.is(x.fromInstallation, fromInstallation) },
      },
    },
    modules: {
      utils: { runModuleBehaviors },
    },
  });
  t.deepEqual(result, ['b', 'a', 'c']);
});
