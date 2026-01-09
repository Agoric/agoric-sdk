#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * Run `yarn docs` and iteratively repair missing imports using normalize-imports.
 *
 * The script repeats until no new missing-import errors appear, then prints the
 * remaining docs output (if any).
 */
import { execa } from 'execa';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = resolve(__dirname, '..');

const MAX_PASSES = 20;
const CHUNK_SIZE = 50;

const ansiRegex = /\u001b\[[0-9;]*m/g;
const missingImportPatterns = [
  /^(?<file>.+?):\d+:\d+\s+-\s+error TS(2304|2552|2503|2307):\s+Cannot find (?:name|namespace|module)\b/,
  /^(?<file>.+?)\(\d+,\d+\):\s+error TS(2304|2552|2503|2307):\s+Cannot find (?:name|namespace|module)\b/,
];

const parseMissingImportFiles = (output: string) => {
  const files = new Set<string>();
  for (const line of output.split('\n')) {
    const cleanLine = line.replace(ansiRegex, '');
    for (const pattern of missingImportPatterns) {
      const match = cleanLine.match(pattern);
      const file = match?.groups?.file;
      if (file) {
        files.add(file);
        break;
      }
    }
  }
  return files;
};

const formatRemainingErrors = (output: string) => {
  const lines = output.replace(ansiRegex, '').replace(/\r/g, '').split('\n');
  const report: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith('[error]')) {
      if (!seen.has(line)) {
        report.push(line);
        seen.add(line);
      }
      continue;
    }
    const isTsError = /\berror TS\d+:\b/.test(line);
    const isFileError =
      /\bpackages\/.+\.(?:ts|tsx|js|jsx|mts|mjs|d\.ts)\b/.test(line) &&
      /\berror\b/.test(line);
    if (isTsError || isFileError) {
      const block = [line, lines[i + 1], lines[i + 2], lines[i + 3]]
        .filter(Boolean)
        .join('\n');
      if (!seen.has(block)) {
        report.push(block, '');
        seen.add(block);
      }
      i += 3;
    }
  }
  return report.join('\n').trim();
};

const runDocs = async () =>
  execa('yarn', ['docs'], {
    cwd: packageRoot,
    all: true,
    reject: false,
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      NO_COLOR: '1',
    },
  });

const runNormalizeImports = async (files: string[]) => {
  for (let i = 0; i < files.length; i += CHUNK_SIZE) {
    const chunk = files.slice(i, i + CHUNK_SIZE);
    await execa('node', ['scripts/normalize-imports.ts', ...chunk], {
      cwd: packageRoot,
      stdio: 'inherit',
    });
  }
};

const main = async () => {
  const seenFiles = new Set<string>();
  let lastResult:
    | (Awaited<ReturnType<typeof runDocs>> & { all?: string })
    | undefined;

  for (let pass = 1; pass <= MAX_PASSES; pass += 1) {
    console.log(`Running docs pass ${pass}...`);
    lastResult = await runDocs();
    const output = lastResult.all ?? '';
    const missingFiles = parseMissingImportFiles(output);
    if (missingFiles.size === 0) {
      break;
    }
    const newFiles = [...missingFiles].filter(file => !seenFiles.has(file));
    if (newFiles.length === 0) {
      break;
    }
    newFiles.forEach(file => seenFiles.add(file));
    console.log(`Normalizing imports in ${newFiles.length} files...`);
    await runNormalizeImports(newFiles);
  }

  if (!lastResult) {
    console.error('Docs did not run.');
    process.exitCode = 1;
    return;
  }

  const finalOutput = lastResult.all ?? '';
  if (lastResult.exitCode === 0) {
    console.log('Docs completed without errors.');
  } else if (finalOutput.trim()) {
    console.log('Remaining docs errors:');
    const report = formatRemainingErrors(finalOutput);
    if (report) {
      process.stdout.write(report);
    } else {
      const fallback = finalOutput.split('\n').slice(-200).join('\n');
      process.stdout.write(fallback);
    }
  } else {
    console.log('Docs failed with no output.');
  }

  process.exitCode = lastResult.exitCode ?? 1;
};

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
