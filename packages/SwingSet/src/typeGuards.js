// @jessie-check
import { M } from '@agoric/store';

export const ManagerType = M.or(
  'xsnap',
  'xs-worker',
  'node-subprocess',
  'local',
);

const Bundle = M.splitRecord({ moduleType: M.string() });

const SwingsetConfigOptions = harden({
  creationOptions: M.splitRecord({}, { critical: M.boolean() }),
  parameters: M.recordOf(M.string(), M.any()),
});

const SwingSetConfigProperties = M.or(
  M.splitRecord({ sourceSpec: M.string() }, SwingsetConfigOptions),
  M.splitRecord({ bundleSpec: M.string() }, SwingsetConfigOptions),
  M.splitRecord({ bundle: Bundle }, SwingsetConfigOptions),
);
const SwingSetConfigDescriptor = M.recordOf(
  M.string(),
  SwingSetConfigProperties,
);

/**
 * NOTE: this pattern suffices for PSM bootstrap,
 * but does not cover the whole SwingSet config syntax.
 *
 * {@link ./docs/configuration.md}
 * TODO: move this to swingset?
 *
 * @see SwingSetConfig
 * in ./types-external.js
 */
export const SwingSetConfig = M.and(
  M.splitRecord({}, { defaultManagerType: ManagerType }),
  M.splitRecord({}, { includeDevDependencies: M.boolean() }),
  M.splitRecord({}, { defaultReapInterval: M.number() }), // not in type decl
  M.splitRecord({}, { snapshotInterval: M.number() }),
  M.splitRecord({}, { vats: SwingSetConfigDescriptor }),
  M.splitRecord({}, { bootstrap: M.string() }),
  M.splitRecord({}, { bundles: SwingSetConfigDescriptor }),
);
