/** @file run a builder and deploy it onto the Agoric chain in local Starship cluster */
import { flags, makeCmdRunner, makeFileRd } from '@agoric/pola-io';
import { execa } from 'execa';
import {
  installBundles,
  runBuilder,
  submitCoreEval,
  txFlags,
  waitForBlock,
} from '@agoric/deploy-script-support/src/permissioned-deployment.js';
import fsp from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';

const { fromEntries } = Object;
/** @import {E2ETools} from './e2e-tools'; */

/**
 * @param {E2ETools} tools
 * @param {(path: string) => Promise<any>} readJSON
 * @param {(file: string, args: string[]) => Promise<{stdout: string}>} npx
 */
export const makeDeployBuilder = (tools, readJSON, npx) =>
  /** @param {string} builder
   * @param {string[]} [builderArgs] - Optional array of arguments passed to the builder.
   */
  async function deployBuilder(builder, builderArgs = ['']) {
    console.log(`building plan: ${builder}`);
    // build the plan
    // XXX ugh. what a pain.
    const pkg = path.join(url.fileURLToPath(import.meta.url), '../../');
    // process.chdir(pkg);

    const opts = fromEntries(builderArgs.map(b => b.split('=', 2)));
    const pkgRd = makeFileRd(pkg, { fsp, path });
    const agoric = makeCmdRunner('npx', { execFile: execa }).subCommand(
      'agoric',
    );
    const plan = await runBuilder(agoric, pkgRd.join(builder), opts, {
      cwd: pkgRd,
    });

    console.log(plan.name);

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
