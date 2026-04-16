#!/usr/bin/env node
import path from 'node:path';
import ts from 'typescript';

/**
 * Flags where `true` increases type strictness.
 */
export const STRICTNESS_FLAGS = [
  {
    name: 'strict',
    category: 'strict-family',
    note: 'Master switch for strict-mode flags',
  },
  { name: 'noImplicitAny', category: 'strict-family' },
  { name: 'strictNullChecks', category: 'strict-family' },
  { name: 'strictFunctionTypes', category: 'strict-family' },
  { name: 'strictBindCallApply', category: 'strict-family' },
  { name: 'strictPropertyInitialization', category: 'strict-family' },
  { name: 'noImplicitThis', category: 'strict-family' },
  { name: 'useUnknownInCatchVariables', category: 'strict-family' },
  { name: 'alwaysStrict', category: 'strict-family' },
  { name: 'noImplicitReturns', category: 'additional' },
  { name: 'noFallthroughCasesInSwitch', category: 'additional' },
  { name: 'noUncheckedIndexedAccess', category: 'additional' },
  { name: 'exactOptionalPropertyTypes', category: 'additional' },
  { name: 'noImplicitOverride', category: 'additional' },
  { name: 'noPropertyAccessFromIndexSignature', category: 'additional' },
  { name: 'noUnusedLocals', category: 'additional' },
  { name: 'noUnusedParameters', category: 'additional' },
];

/**
 * @param {string} configPath
 */
export const loadParsedConfig = (configPath = 'tsconfig.check.json') => {
  const absConfigPath = path.resolve(process.cwd(), configPath);
  const readResult = ts.readConfigFile(absConfigPath, ts.sys.readFile);
  if (readResult.error) {
    throw new Error(
      ts.flattenDiagnosticMessageText(readResult.error.messageText, '\n'),
    );
  }

  const parsed = ts.parseJsonConfigFileContent(
    readResult.config,
    ts.sys,
    path.dirname(absConfigPath),
    undefined,
    absConfigPath,
  );

  if (parsed.errors.length > 0) {
    const msg = parsed.errors
      .map(err => ts.flattenDiagnosticMessageText(err.messageText, '\n'))
      .join('\n');
    throw new Error(msg);
  }

  return { absConfigPath, parsed };
};

/**
 * @param {ts.CompilerOptions} options
 * @param {string} flagName
 */
export const isFlagEnabled = (options, flagName) => options[flagName] === true;

/**
 * @param {ts.CompilerOptions} options
 */
export const getOffFlags = options =>
  STRICTNESS_FLAGS.filter(({ name }) => !isFlagEnabled(options, name));

/**
 * @param {string} configPath
 * @param {string} flagName
 */
export const tscArgsForFlag = (configPath, flagName) => [
  'run',
  '-T',
  'tsc',
  '-p',
  configPath,
  '--pretty',
  'false',
  '--noEmit',
  `--${flagName}`,
  'true',
];
