import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { E } from '@endo/far';
import '@agoric/vats/src/core/types.js';
import { runModuleBehaviors } from '@agoric/vats/src/core/utils.js';
import { makeCoreProposalBehavior } from '../../src/coreProposalBehavior.js';

test('coreProposalBehavior', async t => {
  const manifestInstallRef = 'manifestInstallRef';
  const getManifestCall = ['getManifestForTest', 'arg1', 'arg2'];
  const behavior = makeCoreProposalBehavior({
    E,
    manifestInstallRef,
    getManifestCall,
    log: t.log,
  });
  const result = await behavior({
    consume: { board: { getValue: id => `boardValue:${id}` } },
    aParams: 'aparms',
    bParams: 'bparms',
    cParams: 'cparms',
    evaluateInstallation: inst => {
      t.is(inst, 'boardValue:manifestInstallRef');
      return {
        fromInstallation: inst,
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
        foo: { resolve: x => t.is(x.fromInstallation, 'boardValue:xxx') },
      },
    },
    modules: {
      utils: { runModuleBehaviors },
    },
  });
  t.deepEqual(result, ['b', 'a', 'c']);
});
