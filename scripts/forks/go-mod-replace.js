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
    stdio: stdio ?? 'inherit',
  })`go ${args}`;
  return result;
};

const goStdout = async (args, options = {}) => {
  const { stdio, ...restOpts } = options;
  const result = await go(args, {
    stdio: stdio ?? ['inherit', 'pipe', 'inherit'],
    ...restOpts,
  });
  const stdout =
    `${typeof result === 'string' ? result : result.stdout}`.trim();
  return stdout;
};

const shouldSkipDir = name => name === 'node_modules' || name.startsWith('.');

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
    } else if (entry.isFile() && entry.name === 'go.mod') {
      results.push(entryPath);
    }
  }

  return results;
};

const main = async () => {
  const {
    values: { help, 'dry-run': dryRun },
    positionals: otherRoots,
  } = parseArgs({
    options: {
      help: { type: 'boolean', short: 'h' },
      'dry-run': { type: 'boolean', short: 'n' },
    },
    allowPositionals: true,
  });

  if (help) {
    console.log(`\
Usage: go-mod-replace [option]... [otherRoots]...
If \`./go.work\` exists, then run \`go work sync\`, and
\`go mod download\` to update \`./go.work.sum\`.

If \`./go.work\` does not exist, then treat \`./go.mod\` as
the source of truth for replace directives, and add those
replace directives to all go.mod files in subdirectories,
then \`go mod tidy\` them all.

Flags:
  -h, --help       Show this help and exit
  -n, --dry-run    Print go commands without executing them`);
    return;
  }
  const rootDir = processCwd();

  // findGoMods returns either all the `use` entries in a go.work file, or
  const targetGoModFiles = await findGoMods(rootDir);
  if (targetGoModFiles.length === 0) {
    console.log('No go.mod files found in', rootDir);
    return;
  }

  const goWorkPath = path.join(rootDir, 'go.work');
  const workMode = await exists(goWorkPath);

  // If we're in work mode, we need to be careful not to add replace directives
  // that point to directories already used by go.work, as that would cause go
  // work sync to fail.
  const goWorkUsedDirs = new Set(
    workMode ? targetGoModFiles.map(file => path.dirname(file)) : [],
  );

  const sourceGoModFiles = [...targetGoModFiles];
  for (const otherRoot of otherRoots) {
    const otherGoModFiles = await findGoMods(otherRoot);
    sourceGoModFiles.push(...otherGoModFiles);
  }

  const replaces = new Map();
  for (const goModPath of sourceGoModFiles) {
    const moduleDir = path.dirname(goModPath);
    const pkgs = await goStdout(['list', '-m', '-f', '{{.Path}} {{.Dir}}'], {
      cwd: moduleDir,
    });

    for (const line of pkgs.split('\n')) {
      const match = line.match(/(\S+)\s+(.*)/);
      if (!match) {
        console.warn(`Unexpected go list output in ${moduleDir}: ${line}`);
        continue;
      }
      replaces.set(match[1], match[2]);
    }
  }

  console.log('replace (');
  for (const [pkg, dir] of replaces) {
    console.log(`  ${pkg} => ${dir}`);
  }
  console.log(')');

  for (const goModPath of workMode ? [goWorkPath] : targetGoModFiles) {
    const from = path.dirname(goModPath);
    console.log(`Updating replace directives in ${from}`);

    for (const [pkg, dir] of replaces) {
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
      await goStdout(args, {
        cwd: from,
        stdio: 'inherit',
        dryRun,
      });
    }
  }

  if (workMode) {
    await goStdout(['work', 'sync'], {
      cwd: rootDir,
      stdio: ['inherit', 'inherit', 'inherit'],
      dryRun,
    });
  }

  for (const goModPath of targetGoModFiles) {
    const from = path.dirname(goModPath);
    console.log(`Tidying ${from}`);

    await goStdout(['mod', 'tidy'], {
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
