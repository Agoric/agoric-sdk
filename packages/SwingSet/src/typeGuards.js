// @jessie-check
import { M } from '@agoric/store';

// XXX re Foo vs FooShape: export const shapes = { Foo } is somewhat ideal.
// the Foo names here should probably not be exported

export const ManagerType = M.or('xsnap', 'xs-worker', 'local');
const BundleFormat = M.or('getExport', 'nestedEvaluate', 'endoZipBase64');

const Bundle = M.splitRecord({ moduleType: M.string() });

/**
 * @param {Record<string, Pattern>} record
 */
const partial = record =>
  M.and(
    ...Object.entries(record).map(([prop, patt]) =>
      M.splitRecord({}, { [prop]: patt }),
    ),
  );

const SwingsetConfigOptions = harden({
  creationOptions: M.splitRecord({}, { critial: M.boolean() }),
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

const ConfigProposal = M.or(
  M.string(), // specifier
  M.splitRecord(
    { module: M.string(), entrypoint: M.string() },
    { args: M.array() },
  ),
);

/**
 * NOTE: this pattern suffices for PSM bootstrap,
 * but does not cover the whole SwingSet config syntax.
 *
 * {@link ./docs/configuration.md}
 * TODO: move this to swingset?
 *
 * @see SwingSetConfig
 * in {@link ./types-external.js}
 */
const KernelOptions = partial({
  defaultManagerType: ManagerType,
  defaultReapInterval: M.number(),
  relaxDurabilityRules: M.boolean(),
  snapshotInitial: M.number(),
  snapshotInterval: M.number(),
  pinBootstrapRoot: M.boolean(),
  includeDevDependencies: M.boolean(),
  vats: SwingSetConfigDescriptor,
  bootstrap: M.string(),
  bundles: SwingSetConfigDescriptor,
});

const SwingsetOptions = M.splitRecord(
  {
    vats: SwingSetConfigDescriptor,
  },
  {
    bootstrap: M.string(),
    coreProposals: M.arrayOf(ConfigProposal),
    exportStorageSubtrees: M.arrayOf(M.string()),
    includeDevDependencies: M.boolean(),
    bundleCachePath: M.string(),
    bundles: SwingSetConfigDescriptor,
    bundleFormat: BundleFormat,
  },
);

export const SwingSetConfig = M.and(KernelOptions, SwingsetOptions);
