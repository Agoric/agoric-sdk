/* eslint-env node */
// @ts-check

import childProcessAmbient from 'node:child_process';
import fsRaw from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';
import { makeCmdRunner, makeFileRWResolve } from '@agoric/pola-io';

import makeScratchPad from '@agoric/internal/src/scratch.js';

import { makeScriptLoader } from './scripts.js';

/** @import {promises as FsPromises} from 'node:fs' */
/** @import {EndoZipBase64Bundle} from '@agoric/swingset-vat' */
/** @import {CoreEvalSDKType} from '@agoric/cosmic-proto/swingset/swingset.js' */
/** @import {CoreEvalMaterialRecord} from '@agoric/deploy-script-support/src/writeCoreEvalParts.js' */
/** @import {CmdRunner} from '@agoric/pola-io' */
/** @import {FileRd} from '@agoric/pola-io' */
/** @import {FileRW} from '@agoric/pola-io' */

const consoleThis = console;

/**
 * @typedef {'prefer-in-process' | 'in-process-only' | 'shell-only'} ProposalBuildMode
 */

/**
 * @typedef {{
 *   evals: CoreEvalSDKType[];
 *   bundles: EndoZipBase64Bundle[];
 *   dependencies: string[];
 *   resolvedBuilderPath: string;
 *   modeUsed: 'in-process' | 'shell';
 * }} ProposalBuildResult
 */

/**
 * @param {string} moduleSpecifier
 * @param {string[]} paths
 */
const resolveModuleSpecifier = (moduleSpecifier, paths) => {
  const req = createRequire(import.meta.url);
  try {
    return req.resolve(moduleSpecifier, { paths });
  } catch (_err) {
    if (path.isAbsolute(moduleSpecifier)) {
      return path.normalize(moduleSpecifier);
    }
    return path.resolve(paths[0] || process.cwd(), moduleSpecifier);
  }
};

/**
 * @param {string} agoricRunOutput
 */
const parseProposalParts = agoricRunOutput => {
  const evals = [
    ...agoricRunOutput.matchAll(
      /swingset-core-eval (?<permit>\S+) (?<script>\S+)/g,
    ),
  ].map(m => {
    if (!m.groups) {
      throw Error(`Invalid proposal output ${m[0]}`);
    }
    const { permit, script } = m.groups;
    return { permit, script };
  });

  if (!evals.length) {
    throw Error(
      `No swingset-core-eval found in proposal output: ${agoricRunOutput}`,
    );
  }

  const bundles = [
    ...agoricRunOutput.matchAll(/swingset install-bundle @([^\n]+)/g),
  ].map(([, bundle]) => bundle);
  if (!bundles.length) {
    throw Error(`No bundles found in proposal output: ${agoricRunOutput}`);
  }

  return { evals, bundles };
};

/**
 * @param {CoreEvalMaterialRecord[]} records
 * @param {string} resolvedBuilderPath
 * @param {string} cwd
 */
const materializeFromRecords = (records, resolvedBuilderPath, cwd) => {
  if (!records.length) {
    return undefined;
  }
  const dependencySet = new Set([resolvedBuilderPath]);
  /** @type {CoreEvalSDKType[]} */
  const evals = [];
  /** @type {EndoZipBase64Bundle[]} */
  const bundles = [];

  for (const record of records) {
    evals.push(record.eval);
    for (const bundleInfo of record.bundles) {
      bundles.push(bundleInfo.bundle);
      const resolvedEntrypoint = resolveModuleSpecifier(bundleInfo.entrypoint, [
        path.dirname(resolvedBuilderPath),
        cwd,
      ]);
      dependencySet.add(resolvedEntrypoint);
    }
  }

  return harden({
    evals,
    bundles,
    dependencies: [...dependencySet].sort(),
  });
};

/**
 * @param {FileRd} cwd
 * @param {string} resolvedBuilderPath
 */
const readProposalMaterialsFromPlans = async (cwd, resolvedBuilderPath) => {
  const entries = await cwd.readdir();
  const planFiles = entries
    .map(entry => entry.basename())
    .filter(f => f.endsWith('-plan.json'))
    .sort();

  // TODO: Replace this with metadata capture during writeCoreEval execution.
  if (!planFiles.length) {
    throw Error(`No core-eval plan files found in ${cwd}`);
  }

  const dependencySet = new Set([resolvedBuilderPath]);

  /** @type {CoreEvalSDKType[]} */
  const evals = [];
  /** @type {EndoZipBase64Bundle[]} */
  const bundles = [];

  const readTextFile = fileName => cwd.join(fileName).readText();

  for (const planFile of planFiles) {
    /**
     * @type {{
     *   permit: string;
     *   script: string;
     *   bundles: Array<{ entrypoint: string; fileName: string }>;
     * }}
     */
    const plan = harden(await cwd.join(planFile).readJSON());

    const [jsonPermits, jsCode] = await Promise.all([
      readTextFile(plan.permit),
      readTextFile(plan.script),
    ]);
    evals.push({ json_permits: jsonPermits, js_code: jsCode });

    for (const bundleInfo of plan.bundles) {
      bundles.push(await cwd.join(bundleInfo.fileName).readJSON());

      const resolvedEntrypoint = resolveModuleSpecifier(bundleInfo.entrypoint, [
        path.dirname(resolvedBuilderPath),
        String(cwd),
      ]);
      dependencySet.add(resolvedEntrypoint);
    }
  }

  return harden({
    evals,
    bundles,
    dependencies: [...dependencySet].sort(),
  });
};

/**
 * @param {FileRW} cwd
 */
const makeScopedWriteFile = cwd => async (filePath, data, options) => {
  const there = cwd.join(String(filePath));
  await cwd.join(path.dirname(String(there))).mkdir({ recursive: true });
  return there.write(data, options);
};

/**
 * @param {{
 *   cwd: FileRW;
 *   resolvedBuilderPath: string;
 *   args: string[];
 *   now: () => number;
 *   cacheDir: string;
 *   console: Console;
 * }} param0
 */
const runInProcess = async ({
  cwd,
  resolvedBuilderPath,
  args,
  now,
  cacheDir,
  console,
}) => {
  const writeFile = makeScopedWriteFile(cwd);

  /** @type {CoreEvalMaterialRecord[]} */
  const coreEvalRecords = [];
  const endowments = {
    cacheDir,
    now,
    onWriteCoreEval: record => {
      coreEvalRecords.push(record);
    },
    scriptArgs: args,
    writeFile,
  };

  const runScript = makeScriptLoader(
    [resolvedBuilderPath],
    {
      progname: 'agoric',
      rawArgs: ['run', resolvedBuilderPath, ...args],
      endowments,
    },
    { fs: { writeFile }, console },
  );

  const homeP = Promise.resolve({ scratch: Promise.resolve(makeScratchPad()) });
  await runScript({ home: homeP });

  const materialized = materializeFromRecords(
    coreEvalRecords,
    resolvedBuilderPath,
    String(cwd),
  );
  if (materialized) {
    return materialized;
  }

  return readProposalMaterialsFromPlans(cwd.readOnly(), resolvedBuilderPath);
};

/**
 * @param {{
 *   cwd: FileRW;
 *   resolvedBuilderPath: string;
 *   args: string[];
 *   agoricRunner: CmdRunner;
 * }} param0
 */
const runWithShell = async ({
  cwd,
  resolvedBuilderPath,
  args,
  agoricRunner,
}) => {
  const { stdout } = await agoricRunner.exec(
    ['run', resolvedBuilderPath, ...args],
    { cwd: String(cwd) },
  );

  const built = parseProposalParts(String(stdout || ''));

  const evals = await Promise.all(
    built.evals.map(async ({ permit, script }) => {
      const [permits, code] = await Promise.all(
        [permit, script].map(filePath =>
          cwd.join(filePath).readOnly().readText(),
        ),
      );
      return { json_permits: permits, js_code: code };
    }),
  );

  const bundles = await Promise.all(
    built.bundles.map(filePath => cwd.join(filePath).readOnly().readJSON()),
  );

  return harden({
    evals,
    bundles,
    dependencies: [resolvedBuilderPath],
  });
};

/**
 * @param {{
 *   builderPath: string;
 *   args?: string[];
 *   cwd?: FileRW;
 *   cwdPath?: string;
 *   mode?: ProposalBuildMode;
 *   cacheDir?: string;
 *   now?: () => number;
 *   console?: Console;
 *   childProcess?: Pick<typeof import('node:child_process'), 'execFile'>;
 *   agoricRunner?: CmdRunner;
 * }} opts
 * @returns {Promise<ProposalBuildResult>}
 */
export const buildCoreEvalProposal = async ({
  builderPath,
  args = [],
  cwd,
  cwdPath = process.cwd(),
  mode = 'prefer-in-process',
  cacheDir = path.join(os.homedir(), '.agoric', 'cache'),
  now = Date.now,
  console = consoleThis,
  childProcess = childProcessAmbient,
  agoricRunner = makeCmdRunner(
    createRequire(import.meta.url).resolve('agoric/src/entrypoint.js'),
    {
      execFile: promisify(childProcess.execFile),
      defaultEnv: process.env,
    },
  ),
}) => {
  if (!builderPath) {
    throw Error('builderPath is required');
  }
  await null;

  const cwdCap =
    cwd ||
    makeFileRWResolve(path.resolve(cwdPath), {
      fs: fsRaw,
      fsp: fsRaw.promises,
      path,
    });
  const cwdAbs = String(cwdCap);
  const resolvedBuilderPath = resolveModuleSpecifier(builderPath, [cwdAbs]);

  const inProcess = async () =>
    runInProcess({
      cwd: cwdCap,
      resolvedBuilderPath,
      args,
      now,
      cacheDir,
      console,
    }).then(result => ({
      ...result,
      modeUsed: /** @type {const} */ ('in-process'),
    }));

  const shell = async () =>
    runWithShell({
      cwd: cwdCap,
      resolvedBuilderPath,
      args,
      agoricRunner,
    }).then(result => ({
      ...result,
      modeUsed: /** @type {const} */ ('shell'),
    }));

  switch (mode) {
    case 'in-process-only': {
      const result = await inProcess();
      return harden({ ...result, resolvedBuilderPath });
    }
    case 'shell-only': {
      const result = await shell();
      return harden({ ...result, resolvedBuilderPath });
    }
    case 'prefer-in-process': {
      try {
        const result = await inProcess();
        return harden({ ...result, resolvedBuilderPath });
      } catch (err) {
        console.warn(
          `in-process proposal build failed, falling back to shell for ${resolvedBuilderPath}`,
          err,
        );
        const result = await shell();
        return harden({ ...result, resolvedBuilderPath });
      }
    }
    default:
      throw Error(`Invalid proposal build mode: ${mode}`);
  }
};
