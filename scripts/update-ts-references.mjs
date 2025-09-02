#!/usr/bin/env node
/*
 Auto-generate a solution tsconfig with project references and (optionally)
 ensure per-package build configs are discoverable by tsc --build.

 - Discovers packages under `packages/*` and `packages/wallet/api` that have
   a `tsconfig.build.json` file (treating those as TypeScript build projects).
 - Builds a topological order using local workspace deps from package.json.
 - Writes `tsconfig.refs.json` at repo root with references in topo order.

 This avoids editing package-level configs and still enables incremental
 project builds via `tsc --build tsconfig.refs.json`.
*/

import { promises as fs } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const WORKSPACE_GLOBS = [
  'packages',
  path.join('packages', 'wallet', 'api'),
];

const isFile = async p => {
  try {
    const st = await fs.stat(p);
    return st.isFile();
  } catch {
    return false;
  }
};

const isDir = async p => {
  try {
    const st = await fs.stat(p);
    return st.isDirectory();
  } catch {
    return false;
  }
};

const readJSON = async p => JSON.parse(await fs.readFile(p, 'utf8'));

const listDirs = async root => {
  try {
    const items = await fs.readdir(root, { withFileTypes: true });
    return items.filter(d => d.isDirectory()).map(d => path.join(root, d.name));
  } catch {
    return [];
  }
};

const getWorkspaceProjects = async () => {
  const candidates = [];
  for (const base of WORKSPACE_GLOBS) {
    const basePath = path.join(repoRoot, base);
    if (await isDir(basePath)) {
      candidates.push(...(await listDirs(basePath)));
    }
  }

  const projects = [];
  for (const dir of candidates) {
    const pkgJson = path.join(dir, 'package.json');
    const tsBuild = path.join(dir, 'tsconfig.build.json');
    if (await isFile(pkgJson) && await isFile(tsBuild)) {
      const pkg = await readJSON(pkgJson);
      projects.push({
        name: pkg.name,
        dir,
        rel: path.relative(repoRoot, dir) || '.',
        deps: {
          ...pkg.dependencies,
          ...pkg.devDependencies,
          ...pkg.peerDependencies,
        },
      });
    }
  }
  return projects;
};

const topoSort = projects => {
  // map name -> project
  const byName = new Map(projects.map(p => [p.name, p]));
  // adjacency: p -> local deps
  const adj = new Map();
  for (const p of projects) {
    const localDeps = [];
    const deps = p.deps || {};
    for (const d of Object.keys(deps)) {
      if (byName.has(d)) localDeps.push(d);
    }
    adj.set(p.name, localDeps);
  }

  const visited = new Set();
  const temp = new Set();
  const order = [];

  const visit = name => {
    if (visited.has(name)) return;
    if (temp.has(name)) {
      // cycle detected; break tie deterministically
      return;
    }
    temp.add(name);
    const deps = adj.get(name) || [];
    for (const d of deps) visit(d);
    temp.delete(name);
    visited.add(name);
    order.push(name);
  };

  for (const p of projects) visit(p.name);
  // return projects in dependency-first order
  const by = n => projects.find(p => p.name === n);
  return order.map(by).filter(Boolean);
};

const writeSolutionTsconfig = async orderedProjects => {
  const refs = orderedProjects.map(p => ({ path: path.join(p.rel, 'tsconfig.build.json') }));
  const solution = {
    files: [],
    references: refs,
  };
  const outPath = path.join(repoRoot, 'tsconfig.refs.json');
  await fs.writeFile(outPath, JSON.stringify(solution, null, 2) + '\n');
  return outPath;
};

async function main() {
  const projects = await getWorkspaceProjects();
  if (projects.length === 0) {
    console.error('No TypeScript build projects found.');
    process.exit(0);
  }
  const ordered = topoSort(projects);
  const sol = await writeSolutionTsconfig(ordered);
  console.log(`Wrote ${path.relative(repoRoot, sol)} with ${ordered.length} references.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
