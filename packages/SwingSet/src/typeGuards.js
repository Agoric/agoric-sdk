// @jessie-check
import { M } from '@agoric/store';

export const ManagerType = M.or(
  'xsnap',
  'xs-worker',
  'node-subprocess',
  'local',
);

const Bundle = M.splitRecord({ moduleType: M.string() });

const VatConfigOptions = harden({
  creationOptions: M.splitRecord({}, { critical: M.boolean() }),
  parameters: M.recordOf(M.string(), M.any()),
});

const makeSwingSetConfigProperties = (required = {}, optional = {}, rest) =>
  M.or(
    M.splitRecord({ sourceSpec: M.string(), ...required }, optional, rest),
    M.splitRecord({ bundleSpec: M.string(), ...required }, optional, rest),
    M.splitRecord({ bundle: Bundle, ...required }, optional, rest),
  );
const makeSwingSetConfigDescriptor = (required, optional, rest) =>
  M.recordOf(
    M.string(),
    makeSwingSetConfigProperties(required, optional, rest),
  );

/**
 * NOTE: this pattern suffices for PSM bootstrap,
 * but does not cover the whole SwingSet config syntax.
 *
 * {@link ./docs/configuration.md}
 *
 * @see SwingSetConfig
 * in ./types-external.js
 */
export const SwingSetConfig = M.splitRecord(
  { vats: makeSwingSetConfigDescriptor(undefined, VatConfigOptions) },
  {
    defaultManagerType: ManagerType,
    includeDevDependencies: M.boolean(),
    defaultReapInterval: M.number(),
    snapshotInterval: M.number(),
    bootstrap: M.string(),
    bundles: makeSwingSetConfigDescriptor(undefined, undefined, {}),
  },
);
