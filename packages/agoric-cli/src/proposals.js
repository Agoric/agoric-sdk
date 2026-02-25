/* eslint-env node */
// @ts-check

import childProcessAmbient from 'node:child_process';
import fsRaw from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

import makeScratchPad from '@agoric/internal/src/scratch.js';

import { makeScriptLoader } from './scripts.js';

/** @import {promises as FsPromises} from 'node:fs' */
/** @import {EndoZipBase64Bundle} from '@agoric/swingset-vat' */
/** @import {CoreEvalSDKType} from '@agoric/cosmic-proto/swingset/swingset.js' */
/** @import {CoreEvalMaterialRecord} from '@agoric/deploy-script-support/src/writeCoreEvalParts.js' */

const consoleThis = console;
const require = createRequire(import.meta.url);

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
  try {
    // Use Node's CJS resolver semantics for parity with agoric script loading.
    // This can differ from strict ESM resolution behavior.
    return require.resolve(moduleSpecifier, { paths });
  } catch (_err) {
    if (path.isAbsolute(moduleSpecifier)) {
      return path.normalize(moduleSpecifier);
    }
    return path.resolve(paths[0] || process.cwd(), moduleSpecifier);
  }
};

/**
 * @param {FsPromises} fs
 * @param {string} filePath
 */
const readJSONFile = async (fs, filePath) => {
  await null;
  const data = await fs.readFile(filePath, 'utf8');
  return harden(JSON.parse(data));
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
 * Resolve a file path relative to a working directory.
 *
 * @param {string | number} filePath
 * @param {string} cwd
 */
const resolveFromCwd = (filePath, cwd) => path.resolve(cwd, String(filePath));

/**
 * @param {FsPromises} fs
 * @param {string} cwd
 * @param {string | number} filePath
 */
const readTextFromCwd = (fs, cwd, filePath) =>
  fs.readFile(resolveFromCwd(filePath, cwd), 'utf8');

/**
 * @param {FsPromises} fs
 * @param {string} cwd
 * @param {string | number} filePath
 */
const readJSONFromCwd = (fs, cwd, filePath) =>
  readJSONFile(fs, resolveFromCwd(filePath, cwd));

/**
 * Materialize in-memory proposal output from writeCoreEval callback records.
 *
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
 * @param {FsPromises} fs
 * @param {string} outputDir
 * @param {string} resolvedBuilderPath
 */
const readProposalMaterialsFromPlans = async (
  fs,
  outputDir,
  resolvedBuilderPath,
) => {
  const files = await fs.readdir(outputDir);
  const planFiles = files.filter(f => f.endsWith('-plan.json')).sort();

  // TODO: Replace this with metadata capture during writeCoreEval execution.
  if (!planFiles.length) {
    throw Error(`No core-eval plan files found in ${outputDir}`);
  }

  const dependencySet = new Set([resolvedBuilderPath]);

  /** @type {CoreEvalSDKType[]} */
  const evals = [];
  /** @type {EndoZipBase64Bundle[]} */
  const bundles = [];

  for (const planFile of planFiles) {
    /**
     * @type {{
     *   permit: string;
     *   script: string;
     *   bundles: Array<{ entrypoint: string; fileName: string }>;
     * }}
     */
    const plan = await readJSONFile(fs, path.join(outputDir, planFile));

    const [jsonPermits, jsCode] = await Promise.all([
      readTextFromCwd(fs, outputDir, plan.permit),
      readTextFromCwd(fs, outputDir, plan.script),
    ]);
    evals.push({ json_permits: jsonPermits, js_code: jsCode });

    for (const bundleInfo of plan.bundles) {
      bundles.push(await readJSONFromCwd(fs, outputDir, bundleInfo.fileName));

      const resolvedEntrypoint = resolveModuleSpecifier(bundleInfo.entrypoint, [
        path.dirname(resolvedBuilderPath),
        outputDir,
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
 * @param {{ fs: FsPromises; cwd: string; }} param0
 */
const makeScopedWriteFile = ({ fs, cwd }) => {
  /** @type {typeof fs.writeFile} */
  return async (filePath, data, options) => {
    const abs = resolveFromCwd(String(filePath), cwd);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    return fs.writeFile(abs, data, options);
  };
};

/**
 * @param {{
 *   fs: FsPromises;
 *   cwd: string;
 *   resolvedBuilderPath: string;
 *   args: string[];
 *   now: () => number;
 *   cacheDir: string;
 *   console: Console;
 * }} param0
 */
const runInProcess = async ({
  fs,
  cwd,
  resolvedBuilderPath,
  args,
  now,
  cacheDir,
  console,
}) => {
  /** @type {CoreEvalMaterialRecord[]} */
  const coreEvalRecords = [];
  const endowments = {
    cacheDir,
    now,
    onWriteCoreEval: record => {
      coreEvalRecords.push(record);
    },
    scriptArgs: args,
    writeFile: makeScopedWriteFile({ fs, cwd }),
  };

  const runScript = makeScriptLoader(
    [resolvedBuilderPath],
    {
      progname: 'agoric',
      rawArgs: ['run', resolvedBuilderPath, ...args],
      endowments,
    },
    { fs, console },
  );

  const homeP = Promise.resolve({ scratch: Promise.resolve(makeScratchPad()) });
  await runScript({ home: homeP });

  const materialized = materializeFromRecords(
    coreEvalRecords,
    resolvedBuilderPath,
    cwd,
  );
  if (materialized) {
    return materialized;
  }

  return readProposalMaterialsFromPlans(fs, cwd, resolvedBuilderPath);
};

/**
 * @param {{
 *   fs: FsPromises;
 *   cwd: string;
 *   resolvedBuilderPath: string;
 *   args: string[];
 *   childProcess: Pick<typeof import('node:child_process'), 'execFileSync'>;
 * }} param0
 */
const runWithShell = async ({
  fs,
  cwd,
  resolvedBuilderPath,
  args,
  childProcess,
}) => {
  const agoricEntrypoint = require.resolve('agoric/src/entrypoint.js');
  const agoricRunOutput = childProcess.execFileSync(
    agoricEntrypoint,
    ['run', resolvedBuilderPath, ...args],
    { cwd },
  );

  const built = parseProposalParts(agoricRunOutput.toString());

  const evals = await Promise.all(
    built.evals.map(async ({ permit, script }) => {
      const [permits, code] = await Promise.all(
        [permit, script].map(filePath => readTextFromCwd(fs, cwd, filePath)),
      );
      return { json_permits: permits, js_code: code };
    }),
  );

  const bundles = await Promise.all(
    built.bundles.map(async filePath =>
      readJSONFromCwd(fs, cwd, filePath),
    ),
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
 *   cwd?: string;
 *   mode?: ProposalBuildMode;
 *   cacheDir?: string;
 *   fs?: FsPromises;
 *   now?: () => number;
 *   console?: Console;
 *   childProcess?: Pick<typeof import('node:child_process'), 'execFileSync'>;
 * }} opts
 * @returns {Promise<ProposalBuildResult>}
 */
export const buildCoreEvalProposal = async ({
  builderPath,
  args = [],
  cwd = process.cwd(),
  mode = 'prefer-in-process',
  cacheDir = path.join(os.homedir(), '.agoric', 'cache'),
  fs = fsRaw.promises,
  now = Date.now,
  console = consoleThis,
  childProcess = childProcessAmbient,
}) => {
  if (!builderPath) {
    throw Error('builderPath is required');
  }
  await null;

  const resolvedBuilderPath = resolveModuleSpecifier(builderPath, [cwd]);

  const inProcess = async () =>
    runInProcess({
      fs,
      cwd,
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
      fs,
      cwd,
      resolvedBuilderPath,
      args,
      childProcess,
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
