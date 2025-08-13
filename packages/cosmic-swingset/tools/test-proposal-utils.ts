import { execFileSync as nativeExecFileSync } from 'node:child_process';
import { readFile as nativeReadFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join as nativeJoin } from 'node:path';

import tmp from 'tmp';

import { makeTempDirFactory } from '@agoric/internal/src/tmpDir.js';
import { Fail } from '@endo/errors';

const tmpDir = makeTempDirFactory(tmp);

/**
 * Creates a function that can build and extract proposal data from package scripts.
 */
export const makeProposalExtractor = (
  {
    childProcess: { execFileSync },
    fs: { readFile },
    path: { join },
  }: {
    childProcess: Pick<typeof import('node:child_process'), 'execFileSync'>;
    fs: Pick<typeof import('node:fs/promises'), 'readFile'>;
    path: Pick<typeof import('node:path'), 'join'>;
  },
  resolveBase: string = import.meta.url,
) => {
  const importSpec = createRequire(resolveBase).resolve;

  const parseProposalParts = (agoricRunOutput: string) => {
    const evals = [
      ...agoricRunOutput.matchAll(
        /swingset-core-eval (?<permit>\S+) (?<script>\S+)/g,
      ),
    ].map(m => {
      if (!m.groups) throw Fail`Invalid proposal output ${m[0]}`;
      const { permit, script } = m.groups;
      return { permit, script };
    });
    evals.length ||
      Fail`No swingset-core-eval found in proposal output: ${agoricRunOutput}`;

    const bundles = [
      ...agoricRunOutput.matchAll(/swingset install-bundle @([^\n]+)/g),
    ].map(([, bundle]) => bundle);
    bundles.length ||
      Fail`No bundles found in proposal output: ${agoricRunOutput}`;

    return { evals, bundles };
  };

  const readJSONFile = <T>(filePath: string) =>
    readFile(filePath, 'utf8').then(file => harden(JSON.parse(file) as T));

  const buildAndExtract = async (
    builderPath: string,
    args: Array<string> = [],
  ) => {
    await null;

    const [builtDir, cleanup] = tmpDir('agoric-proposal');

    const readPkgFile = (fileName: string) =>
      readFile(join(builtDir, fileName), 'utf8');

    try {
      const scriptPath = importSpec(builderPath);

      console.info('running package script:', scriptPath);
      const agoricRunOutput = execFileSync(
        importSpec('agoric/src/entrypoint.js'),
        ['run', scriptPath, ...args],
        { cwd: builtDir },
      );
      const built = parseProposalParts(agoricRunOutput.toString());

      const evalsP = Promise.all(
        built.evals.map(({ permit, script }) =>
          Promise.all([permit, script].map(path => readPkgFile(path))).then(
            ([permits, code]) => ({ json_permits: permits, js_code: code }),
          ),
        ),
      );

      const bundlesP = Promise.all(
        built.bundles.map(path => readJSONFile<EndoZipBase64Bundle>(path)),
      );

      const [evals, bundles] = await Promise.all([evalsP, bundlesP]);
      return { evals, bundles };
    } finally {
      // Defer `cleanup` and ignore any exception; spurious test failures would
      // be worse than the minor inconvenience of manual temp dir removal.
      const cleanupP = Promise.resolve().then(cleanup);
      cleanupP.catch(err => {
        console.error(err);
        throw err; // unhandled rejection
      });
    }
  };
  return buildAndExtract;
};

export const buildProposal = makeProposalExtractor({
  childProcess: { execFileSync: nativeExecFileSync },
  fs: { readFile: nativeReadFile },
  path: { join: nativeJoin },
});
