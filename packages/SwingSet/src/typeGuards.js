// @jessie-check
import { M } from '@agoric/store';

export const ManagerType = M.or('xs-worker', 'local'); // TODO: others

const Bundle = M.split({ moduleType: M.string() }, M.partial({}));

const p1 = M.and(
  M.partial({ creationOptions: M.partial({ critial: M.boolean() }) }),
  M.partial({ parameters: M.recordOf(M.string(), M.any()) }),
);
const SwingSetConfigProperties = M.or(
  M.split({ sourceSpec: M.string() }, p1),
  M.split({ bundleSpec: M.string() }, p1),
  M.split({ bundle: Bundle }, p1),
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
  M.partial({ defaultManagerType: ManagerType }),
  M.partial({ includeDevDependencies: M.boolean() }),
  M.partial({ defaultReapInterval: M.number() }), // not in type decl
  M.partial({ snapshotInterval: M.number() }),
  M.partial({ vats: SwingSetConfigDescriptor }),
  M.partial({ bootstrap: M.string() }),
  M.partial({ bundles: SwingSetConfigDescriptor }),
);
