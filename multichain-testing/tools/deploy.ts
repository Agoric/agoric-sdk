/** @file run a builder and deploy it onto the Agoric chain in local Starship cluster */
import { createRequire } from 'module';
import type { AgdTools } from './agd-tools.js';
import type { CoreEvalPlan } from '@agoric/deploy-script-support/src/writeCoreEvalParts.js';
import { makeTracer, toCLIOptions } from '@agoric/internal';

const nodeRequire = createRequire(import.meta.url);

const trace = makeTracer('Depl');

export const makeDeployBuilder = (
  tools: AgdTools,
  readJSON: typeof import('fs-extra').readJSON,
  execa: typeof import('execa').execa,
) =>
  async function deployBuilder(
    builder: string,
    builderOpts?: Record<string, string | string[]>,
  ) {
    trace(`building plan: ${builder}`);
    const args = ['run', builder];
    if (builderOpts) {
      args.push(...toCLIOptions(builderOpts));
    }
    const npx = (file: string, args: string[]) =>
      execa('npx', ['--no-install', file, ...args]);
    const { stdout } = await npx('agoric', args);
    const match = stdout.match(/ (?<name>[-\w]+)-permit.json/);
    if (!(match && match.groups)) {
      throw Error('no permit found');
    }
    const plan = await readJSON(`./${match.groups.name}-plan.json`);
    trace(plan);

    trace('copying files to container');
    tools.copyFiles([
      nodeRequire.resolve(`../${plan.script}`),
      nodeRequire.resolve(`../${plan.permit}`),
      ...plan.bundles.map((b: CoreEvalPlan['bundles'][0]) => b.fileName),
    ]);

    trace('installing bundles');
    await tools.installBundles(
      plan.bundles.map(
        (b: CoreEvalPlan['bundles'][0]) => `/tmp/contracts/${b.bundleID}.json`,
      ),
      trace,
    );

    trace('executing proposal');
    await tools.runCoreEval({
      name: plan.name,
      description: `${plan.name} proposal`,
    });

    trace('done');
  };
