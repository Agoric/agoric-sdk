#!/usr/bin/env node

import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { cwd as processCwd } from 'node:process';
import { parseArgs } from 'node:util';
import { $ } from 'execa';

const go = async (args, options = {}) => {
  const { stdio, cwd } = options;
  const workingDir = cwd ?? processCwd();
  console.warn(`$ go ${args.join(' ')} (cwd: ${workingDir})`);
  const result = await $({
    cwd: workingDir,
    stdio: stdio ?? ['inherit', 'pipe', 'inherit'],
  })`go ${args}`;
  return `${result.stdout ?? ''}`.trim();
};

const shouldSkipDir = name => name === 'node_modules' || name === '.git';

const findGoMods = async (rootDir, relativeDir = '') => {
  const entries = await readdir(path.join(rootDir, relativeDir), {
    withFileTypes: true,
  });
  const results = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      results.push(
        ...(await findGoMods(rootDir, path.join(relativeDir, entry.name))),
      );
      continue;
    }
    if (entry.isFile() && entry.name === 'go.mod') {
      results.push(path.join(relativeDir, entry.name));
    }
  }

  return results;
};

const normalizePath = p => p.replace(/\\/g, '/');

const buildTopdir = (rootDir, moduleDir) => {
  const rel = path.relative(moduleDir, rootDir);
  if (!rel) return '.';
  return normalizePath(rel);
};

const parseOptions = () => {
  const { values } = parseArgs({
    options: {
      help: { type: 'boolean', short: 'h' },
      'dry-run': { type: 'boolean', short: 'n' },
    },
    allowPositionals: false,
  });
  const dryRun = values['dry-run'] ?? false;
  return { help: values.help ?? false, dryRun };
};

const main = async () => {
  const { help, dryRun } = parseOptions();
  if (help) {
    console.log(`\
Usage: go-mod-replace [option]...
Flags:
  -h, --help       Show this help and exit
  -n, --dry-run    Print go commands without executing them`);
    return;
  }
  const rootDir = processCwd();
  const goModFiles = await findGoMods(rootDir);
  if (goModFiles.length === 0) {
    console.log('No go.mod files found.');
    return;
  }

  const replaces = [];
  for (const goModPath of goModFiles) {
    const moduleDir = path.dirname(path.join(rootDir, goModPath));
    const pkg = await go(['list', '-m'], {
      cwd: moduleDir,
    });
    const moduleDirRel = normalizePath(path.dirname(goModPath));
    const moduleRel = moduleDirRel === '.' ? '' : moduleDirRel;
    replaces.push({ pkg, dir: moduleRel || '.' });
  }

  console.log('replace (');
  for (const { pkg, dir } of replaces) {
    console.log(`  ${pkg} => ./${dir}`);
  }
  console.log(')');

  for (const goModPath of goModFiles) {
    const moduleDir = path.dirname(path.join(rootDir, goModPath));
    const from = path.dirname(goModPath);
    console.log(`Updating replace directives in ${from}`);

    for (const { pkg, dir } of replaces) {
      const relDir = path.relative(from, dir);
      // console.log(`Solving ${from}, ${dir} = ${relDir}`);
      if (!relDir) {
        continue;
      }
      const args = ['mod', 'edit', '-replace', `${pkg}=${relDir || '.'}`];
      await go(args, {
        cwd: moduleDir,
        stdio: ['inherit', 'inherit', 'inherit'],
        dryRun,
      });
    }

    await go(['mod', 'tidy'], {
      cwd: moduleDir,
      stdio: ['inherit', 'inherit', 'inherit'],
      dryRun,
    });
  }
};

main().catch(err => {
  console.error(err);
  process.exit(process.exitCode || 1);
});
