#!/usr/bin/env node

import { stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { cwd as processCwd } from 'node:process';
import { parseArgs } from 'node:util';
import { $ } from 'execa';

const exists = async file => {
  await null;
  try {
    await stat(file);
    return true;
  } catch (e) {
    if (e.code === 'ENOENT') {
      return false;
    }
    throw e;
  }
};

const go = async (args, options = {}) => {
  const { stdio, cwd, dryRun } = options;
  const workingDir = cwd ?? processCwd();
  console.warn(`$ go ${args.join(' ')} (cwd: ${workingDir})`);
  if (dryRun) {
    return '';
  }
  const result = await $({
    cwd: workingDir,
    stdio: stdio ?? ['inherit', 'pipe', 'inherit'],
  })`go ${args}`;
  return `${result.stdout ?? ''}`.trim();
};

const shouldSkipDir = name => name === 'node_modules' || name === '.git';

const findGoMods = async rootDir => {
  const entries = await readdir(rootDir, {
    withFileTypes: true,
  });
  const results = [];

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      results.push(...(await findGoMods(entryPath)));
      continue;
    }
    if (entry.isFile() && entry.name === 'go.mod') {
      results.push(entryPath);
    }
  }

  return results;
};

const parseOptions = () => {
  const { values, positionals } = parseArgs({
    options: {
      help: { type: 'boolean', short: 'h' },
      'dry-run': { type: 'boolean', short: 'n' },
    },
    allowPositionals: true,
  });
  const dryRun = values['dry-run'] ?? false;
  const otherRoots = positionals;
  return { help: values.help ?? false, dryRun, otherRoots };
};

const main = async () => {
  const { help, dryRun, otherRoots } = parseOptions();
  if (help) {
    console.log(`\
Usage: go-mod-replace [option]... [otherRoots]...
Flags:
  -h, --help       Show this help and exit
  -n, --dry-run    Print go commands without executing them`);
    return;
  }
  const rootDir = processCwd();
  const targetGoModFiles = await findGoMods(rootDir);
  if (targetGoModFiles.length === 0) {
    console.log('No go.mod files found in', rootDir);
    return;
  }

  const goWorkPath = path.join(rootDir, 'go.work');
  const workMode = await exists(goWorkPath);
  const goWorkUsedDirs = new Set(
    workMode ? targetGoModFiles.map(file => path.dirname(file)) : [],
  );

  const sourceGoModFiles = [...targetGoModFiles];
  for (const otherRoot of otherRoots) {
    const otherGoModFiles = await findGoMods(otherRoot);
    sourceGoModFiles.push(...otherGoModFiles);
  }

  const replaces = {};
  for (const goModPath of sourceGoModFiles) {
    const moduleDir = path.dirname(goModPath);
    const pkgs = await go(['list', '-m', '-f', '{{.Path}} {{.Dir}}'], {
      cwd: moduleDir,
    });

    for (const line of pkgs.split('\n')) {
      const match = line.match(/(\S+)\s+(.*)/);
      if (!match) {
        console.warn(`Unexpected go list output: ${line}`);
        continue;
      }
      replaces[match[1]] = match[2];
    }
  }

  console.log('replace (');
  for (const [pkg, dir] of Object.entries(replaces)) {
    console.log(`  ${pkg} => ${dir}`);
  }
  console.log(')');

  for (const goModPath of workMode ? [goWorkPath] : targetGoModFiles) {
    const from = path.dirname(goModPath);
    console.log(`Updating replace directives in ${from}`);

    for (const [pkg, dir] of Object.entries(replaces)) {
      const relDir = path.relative(from, dir);
      if (!relDir) continue; // skip self-replace
      const pkgDir = relDir.startsWith('.') ? relDir : `./${relDir}`;
      // console.log(`Solving ${from}, ${dir} = ${relDir} = ${pkgDir}`);

      const modOrWork = workMode ? 'work' : 'mod';
      if (goWorkUsedDirs.has(path.resolve(pkgDir))) {
        console.warn(
          `Skipping ${pkgDir} from ${goModPath} because it's used by go.work`,
        );
        continue;
      }

      const args = [modOrWork, 'edit', '-replace', `${pkg}=${pkgDir}`];
      await go(args, {
        cwd: from,
        stdio: ['inherit', 'inherit', 'inherit'],
        dryRun,
      });
    }
  }

  if (workMode) {
    await go(['work', 'sync'], {
      cwd: rootDir,
      stdio: ['inherit', 'inherit', 'inherit'],
      dryRun,
    });
  }

  for (const goModPath of targetGoModFiles) {
    const from = path.dirname(goModPath);
    console.log(`Tidying ${from}`);

    await go(['mod', 'tidy'], {
      cwd: from,
      stdio: ['inherit', 'inherit', 'inherit'],
      dryRun,
    });
  }
};

main().catch(err => {
  console.error(err);
  process.exit(process.exitCode || 1);
});
