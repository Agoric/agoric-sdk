// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { promises as fsPromises } from 'fs';
import path from 'path';

import { fit, M } from '@agoric/store';
import { ParametersShape as BootParametersShape } from '../src/core/boot-psm.js';

const pathname = new URL(import.meta.url).pathname;
const dirname = path.dirname(pathname);
const asset = (...ps) =>
  fsPromises.readFile(path.join(dirname, ...ps), 'utf-8');

/**
 * NOTE: this pattern suffices for PSM bootstrap,
 * but does not cover the whole SwingSet config syntax.
 *
 * {@link packages/SwingSet/docs/configuration.md}
 * TODO: move this to swingset?
 *
 * @see SwingSetConfig
 * in packages/SwingSet/src/types-external.js
 */
const shape = (() => {
  const ManagerType = M.or('xs-worker', 'local'); // TODO: others

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

  const SwingSetConfig = M.and(
    M.partial({ defaultManagerType: ManagerType }),
    M.partial({ includeDevDependencies: M.boolean() }),
    M.partial({ defaultReapInterval: M.number() }), // not in swingset decl
    M.partial({ snapshotInterval: M.number() }),
    M.partial({ vats: SwingSetConfigDescriptor }),
    M.partial({ bootstrap: M.string() }),
    M.partial({ bundles: SwingSetConfigDescriptor }),
  );

  return { ManagerType, SwingSetConfig };
})();

test('PSM config file is valid', async t => {
  const txt = await asset('..', 'decentral-psm-config.json');
  const config = harden(JSON.parse(txt));
  t.notThrows(() => fit(config, shape.SwingSetConfig));
  t.notThrows(() => fit(config.vats.bootstrap.parameters, BootParametersShape));
});
