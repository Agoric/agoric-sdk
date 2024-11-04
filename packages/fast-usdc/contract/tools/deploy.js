/** @file run a builder and deploy it onto the Agoric chain in local Starship cluster */

/** @import {E2ETools} from './e2e-tools'; */

/**
 * @param {E2ETools} tools
 * @param {(path: string) => Promise<any>} readJSON
 * @param {(file: string, args: string[]) => Promise<{stdout: string}>} npx
 */
export const makeDeployBuilder = (tools, readJSON, npx) =>
  /** @param {string} builder */
  async function deployBuilder(builder) {
    console.log(`building plan: ${builder}`);
    // build the plan
    const { stdout } = await npx('agoric', ['run', builder]);
    const match = stdout.match(/ (?<name>[-\w]+)-permit.json/);
    if (!(match && match.groups)) {
      throw new Error('no permit found');
    }
    const plan = await readJSON(`./${match.groups.name}-plan.json`);
    console.log(plan);

    console.log('copying files to container');

    const [code, permit] = tools.copyFiles([
      `./${plan.script}`,
      `./${plan.permit}`,
    ]);

    const bFiles = tools.copyFiles(plan.bundles.map(b => b.fileName));

    console.log('installing bundles');
    await tools.installBundles(bFiles, console.log);

    console.log('executing proposal');
    await tools.runCoreEval({
      name: plan.name,
      description: `${plan.name} proposal`,
      code,
      permit,
    });
  };

/**
 * @param {E2ETools} tools
 * @param {(path: string) => Promise<any>} readJSON
 * @param {(file: string, args: string[]) => Promise<{stdout: string}>} npx
 */
export const makeDeployBuilderE2E = (tools, readJSON, npx) =>
  async function deployBuilder(builder) {
    console.log(`building plan: ${builder}`);
    // build the plan
    const { stdout } = await npx('agoric', ['run', builder]);
    const match = stdout.match(/ (?<name>[-\w]+)-permit.json/);
    if (!(match && match.groups)) {
      throw new Error('no permit found');
    }
    const plan = await readJSON(`./${match.groups.name}-plan.json`);
    console.log(plan);

    console.log('copying files to container');
    const [cScript, cPermit] = tools.copyFiles([plan.script, plan.permit]);
    const [cBundles] = tools.copyFiles(plan.bundles.map(b => b.fileName));

    console.log('installing bundles');
    await tools.installBundles(cBundles, console.log);

    console.log('executing proposal');
    await tools.runCoreEval({
      name: plan.name,
      description: `${plan.name} proposal`,
      code: cScript, // awkward: plan file says script; .proto says code
      permit: cPermit,
    });
  };
