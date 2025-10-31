/* eslint-env node */

import fs from 'node:fs';
import pathlib from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import type { CodegenConfig } from '@graphql-codegen/cli';

const getOwn = <O, K extends PropertyKey>(
  obj: O,
  key: K,
): K extends keyof O ? O[K] : undefined =>
  // @ts-expect-error TS doesn't let `hasOwn(obj, key)` support `obj[key]`.
  Object.hasOwn(obj, key) ? obj[key] : undefined;

// Read environment variables .env files in this and/or parent directories, but
// allow actual environment variables to override them.
const envCopy = { ...process.env };
const dotEnvVars = {} as { [key: string]: string };
const dotEnvBaseName = process.env.DOTENV || '.env';
const dotEnvPaths = [] as string[];
for (
  let dirname = '.', seenDirs = new Set();
  !seenDirs.has(dirname);
  dirname = pathlib.resolve(dirname, '..')
) {
  seenDirs.add(dirname);
  const dotEnvPath: string = pathlib.join(dirname, dotEnvBaseName);
  try {
    const fileStats = fs.statSync(dotEnvPath);
    if (fileStats && !fileStats.isDirectory()) dotEnvPaths.push(dotEnvPath);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-empty
  } catch (_err) {}
  const packageJsonPath = pathlib.join(dirname, 'package.json');
  if (fs.statSync(packageJsonPath, { throwIfNoEntry: false })) break;
}
dotenv.config({ path: dotEnvPaths, processEnv: dotEnvVars });
const env = { ...dotEnvVars, ...envCopy };

// Read GraphQL API endpoints from environment variable GRAPHQL_ENDPOINTS.
const endpointsByApi = (jsonText => {
  const type = typeof jsonText;
  if (type !== 'string') throw Error('GRAPHQL_ENDPOINTS is required');
  try {
    return JSON.parse(jsonText as string);
  } catch (cause) {
    throw Error('GRAPHQL_ENDPOINTS must be valid JSON', { cause });
  }
})(env.GRAPHQL_ENDPOINTS);

const graphqlDir = pathlib.dirname(fileURLToPath(import.meta.url));

/**
 * Construct graphql-codegen configuration to be exported from a codegen.ts file
 * that is a direct child of a subdirectory under this file's containing
 * graphql directory.
 */
export const makeCodegenConfigForFileUrl = (codegenConfigFileUrl: string) => {
  const apiDir = pathlib.dirname(fileURLToPath(codegenConfigFileUrl));
  if (pathlib.dirname(apiDir) !== graphqlDir) {
    throw Error(
      `codegen.ts parent directory ${apiDir} must be a child of ${graphqlDir}`,
    );
  }
  const apiName = pathlib.basename(apiDir);
  const endpoints = getOwn(endpointsByApi, apiName);
  if (!endpoints) throw Error(`no endpoints for API ${apiName}`);
  const config: CodegenConfig = {
    schema: endpoints,
    documents: './request-documents/*.graphql',
    generates: {
      'api.graphql': {
        plugins: ['schema-ast'],
      },
      '__generated/': {
        preset: 'client',
        config: {
          documentMode: 'string',
          // Our Spectrum endpoints reject operation descriptions.
          optimizeDocumentNode: true,
          useTypeImports: true,
        },
      },
      '__generated/sdk.ts': {
        plugins: ['typescript-graphql-request'],
        config: {
          documentMode: 'external',
          importDocumentNodeExternallyFrom: './graphql.ts',
          // `Operations` seems to be hard-coded in @graphql-codegen/visitor-plugin-common
          // https://github.com/dotansimha/graphql-code-generator/blob/76a71d9105059176e1265cc4eee78b334fd57d53/packages/plugins/other/visitor-plugin-common/src/client-side-base-visitor.ts#L635-L654
          importOperationTypesFrom: 'Operations',
          useTypeImports: true,
        },
      },
    },
  };
  return config;
};
