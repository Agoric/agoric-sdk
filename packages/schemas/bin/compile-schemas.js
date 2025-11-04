#!/usr/bin/env node
/* eslint-disable prefer-template, @jessie.js/safe-await-separator */
import '@endo/init/unsafe-fast.js';
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import process from 'node:process';
import { compileSchemasModule } from '../src/compile.js';

const usage = () => {
  console.error('Usage: agoric-schemas <schemas directory>');
};

const [inputDirArg] = process.argv.slice(2);
if (!inputDirArg) {
  usage();
  process.exitCode = 1;
  process.exit();
}

const inputDir = resolve(process.cwd(), inputDirArg);

const ensureSpecifier = (fromDir, toFile) => {
  let rel = relative(fromDir, toFile).replace(/\\/g, '/');
  if (!rel.startsWith('.')) {
    rel = `./${rel}`;
  }
  return rel;
};

const deriveOutputPaths = (codegenDir, schemaFile) => {
  const base = schemaFile.replace(/\.schemas\.[mc]?js$/, '');
  if (base === schemaFile) {
    throw new Error(`Unsupported schema filename: ${schemaFile}`);
  }
  const outputJs = join(codegenDir, `${base}.patterns.js`);
  const outputDts = join(codegenDir, `${base}.patterns.d.ts`);
  return { outputJs, outputDts };
};

try {
  const stats = await stat(inputDir);
  if (!stats.isDirectory()) {
    throw new Error(`Not a directory: ${inputDirArg}`);
  }

  const dirEntries = await readdir(inputDir, { withFileTypes: true });
  const schemaFiles = dirEntries
    .filter(
      entry =>
        entry.isFile() &&
        !entry.name.startsWith('.') &&
        /\.[mc]?js$/.test(entry.name),
    )
    .map(entry => entry.name)
    .sort();

  if (schemaFiles.length === 0) {
    throw new Error('No schema files (*.schemas.js) found in directory');
  }

  const codegenDir = join(inputDir, 'codegen');
  await mkdir(codegenDir, { recursive: true });

  for (const schemaFile of schemaFiles) {
    const schemaPath = join(inputDir, schemaFile);
    const { outputJs, outputDts } = deriveOutputPaths(codegenDir, schemaFile);

    const source = await readFile(schemaPath, 'utf8');
    const sourceSpecifier = ensureSpecifier(dirname(outputJs), schemaPath);
    const moduleComment = `Generated from ${sourceSpecifier} by @agoric/schemas`;
    try {
      const compiled = await compileSchemasModule(source, {
        sourceModuleSpecifier: sourceSpecifier,
        moduleComment,
        evaluateModuleSpecifier: pathToFileURL(schemaPath).href,
        virtualModuleFilename: schemaFile,
      });

      await writeFile(outputJs, compiled.js, 'utf8');
      await writeFile(outputDts, compiled.dts, 'utf8');
    } catch (err) {
      if (err instanceof Error && /No Zod schemas were exported/.test(err.message)) {
        continue;
      }
      throw err;
    }
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
