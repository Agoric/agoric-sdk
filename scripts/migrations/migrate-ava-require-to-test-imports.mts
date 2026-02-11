#!/usr/bin/env -S node --import ts-blank-space/register
/* eslint-disable @jessie.js/safe-await-separator */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const repoRoot = process.cwd();
const isDryRun = process.argv.includes('--dry-run');
const skipMarker = 'prepare-test-env';

const rgFiles = (cwd: string, glob: string): string[] => {
  try {
    return execFileSync('rg', ['--files', '-g', glob], {
      cwd,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean);
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      error.status === 1
    ) {
      return [];
    }
    throw error;
  }
};

const packageJsonPaths = rgFiles(repoRoot, 'packages/**/package.json').sort();

const toArray = <T,>(value: T | T[]): T[] =>
  Array.isArray(value) ? value : [value];

const readJson = async (filePath: string): Promise<any> =>
  JSON.parse(await fs.readFile(filePath, 'utf8'));

const writeJson = async (filePath: string, obj: object): Promise<void> => {
  const contents = `${JSON.stringify(obj, null, 2)}\n`;
  await fs.writeFile(filePath, contents);
};

const quoteForImport = (specifier: string): string => JSON.stringify(specifier);

const isSupportedTestModule = (filePath: string): boolean =>
  /\.(?:[cm]?[jt]s|[jt]sx)$/u.test(filePath);

const hasModuleLoaded = (source: string, moduleName: string): boolean => {
  const escaped = moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const importPattern = new RegExp(
    String.raw`^\s*import\s+['"]${escaped}['"];?\s*$`,
    'm',
  );
  const requirePattern = new RegExp(
    String.raw`^\s*require\(\s*['"]${escaped}['"]\s*\);?\s*$`,
    'm',
  );
  return importPattern.test(source) || requirePattern.test(source);
};

const findLeadingCommentSectionEnd = (source: string): number => {
  let offset = 0;

  while (offset < source.length) {
    const rest = source.slice(offset);

    const blankLines = rest.match(/^(?:[ \t]*\r?\n)+/u);
    if (blankLines) {
      offset += blankLines[0].length;
      continue;
    }

    const lineComment = rest.match(/^[ \t]*\/\/[^\n]*(?:\r?\n|$)/u);
    if (lineComment) {
      offset += lineComment[0].length;
      continue;
    }

    const blockComment = rest.match(/^[ \t]*\/\*[\s\S]*?\*\//u);
    if (blockComment) {
      offset += blockComment[0].length;
      continue;
    }

    break;
  }

  return offset;
};

const addImportsToTestFile = async (
  testFilePath: string,
  modules: string[],
): Promise<boolean> => {
  const source = await fs.readFile(testFilePath, 'utf8');
  if (source.includes(skipMarker)) {
    return false;
  }
  const missingModules = modules.filter(
    moduleName => !hasModuleLoaded(source, moduleName),
  );

  if (missingModules.length === 0) {
    return false;
  }

  const isCjs = /\.cjs$/u.test(testFilePath);
  const importLines = missingModules.map(moduleName =>
    isCjs
      ? `require(${quoteForImport(moduleName)})`
      : `import ${quoteForImport(moduleName)}`,
  );

  const shebangMatch = source.match(/^#!.*\n/u);
  const shebang = shebangMatch?.[0] || '';
  const body = shebang ? source.slice(shebang.length) : source;
  const leadingCommentEnd = findLeadingCommentSectionEnd(body);
  const leading = body.slice(0, leadingCommentEnd);
  const trailing = body.slice(leadingCommentEnd);
  const separator = leading.length > 0 && !leading.endsWith('\n') ? '\n' : '';
  const next = `${shebang}${leading}${separator}${importLines.join('\n')}\n\n${trailing}`;

  if (!isDryRun) {
    await fs.writeFile(testFilePath, next);
  }

  return true;
};

let updatedPackages = 0;
let updatedTests = 0;

for (const packageJsonRelPath of packageJsonPaths) {
  const packageJsonPath = path.join(repoRoot, packageJsonRelPath);
  const packageDir = path.dirname(packageJsonPath);

  const packageJson = await readJson(packageJsonPath);
  const avaConfig = packageJson.ava;

  if (!avaConfig || !avaConfig.require) {
    continue;
  }

  const requires = toArray(avaConfig.require).filter(Boolean);
  const fileGlobs = toArray(avaConfig.files || 'test/**/*.test.*').filter(
    Boolean,
  );

  const testFiles = new Set<string>();
  for (const fileGlob of fileGlobs) {
    const matched = rgFiles(packageDir, fileGlob).map(rel =>
      path.join(packageDir, rel),
    );

    for (const matchedFile of matched) {
      if (isSupportedTestModule(matchedFile)) {
        testFiles.add(matchedFile);
      }
    }
  }

  for (const testFile of testFiles) {
    const didUpdate = await addImportsToTestFile(testFile, requires);
    if (didUpdate) {
      updatedTests += 1;
      console.log(`updated test: ${path.relative(repoRoot, testFile)}`);
    }
  }

  delete packageJson.ava.require;
  if (!isDryRun) {
    await writeJson(packageJsonPath, packageJson);
  }
  updatedPackages += 1;
  console.log(`updated package: ${packageJsonRelPath}`);
}

// run `yarn format` to clean up any formatting issues
if (!isDryRun) {
  execFileSync('yarn', ['format'], { stdio: 'inherit' });
}

console.log(
  `${isDryRun ? 'dry run: ' : ''}updated ${updatedPackages} package.json files and ${updatedTests} test files.`,
);
