#!/usr/bin/env node
/*
 Auto-generate a solution tsconfig with project references and update
 per-package tsconfig.build.json files with their dependency references.

 - Discovers packages under `packages/*` and `packages/wallet/api` that have
   a `tsconfig.build.json` file (treating those as TypeScript build projects).
 - Builds a topological order using local workspace deps from package.json.
 - Writes `tsconfig.refs.json` at repo root with references in topo order.
 - Updates each package's tsconfig.build.json with references to its local deps.

 Run with: node scripts/update-ts-references.mjs
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

/**
 * Parse JSON with comments and trailing commas (JSONC format used by tsconfig).
 * @param {string} text
 * @returns {object}
 */
const parseJSONC = text => {
  // Remove single-line comments
  let cleaned = text.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(cleaned);
};

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
      // Optional opt-out per package
      const tsb = await readJSON(tsBuild).catch(() => ({}));
      if (tsb && (tsb.xSkipInSolution || tsb.excludeFromSolution)) {
        continue;
      }
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
  await fs.writeFile(outPath, `${JSON.stringify(solution, null, 2)  }\n`);
  return outPath;
};

/**
 * Update a package's tsconfig.build.json with references to its local dependencies.
 * @param {object} project - The project to update
 * @param {Map<string, object>} projectsByName - Map of package name to project
 * @returns {Promise<boolean>} - Whether the file was updated
 */
const updatePackageReferences = async (project, projectsByName) => {
  const tsconfigPath = path.join(project.dir, 'tsconfig.build.json');
  const text = await fs.readFile(tsconfigPath, 'utf8');

  // Find local dependencies that have tsconfig.build.json
  const localDeps = [];
  for (const depName of Object.keys(project.deps || {})) {
    const depProject = projectsByName.get(depName);
    if (depProject) {
      // Calculate relative path from this package to the dependency
      const relPath = path.relative(project.dir, depProject.dir);
      localDeps.push({ path: path.join(relPath, 'tsconfig.build.json') });
    }
  }

  // Sort references for consistent output
  localDeps.sort((a, b) => a.path.localeCompare(b.path));

  // Parse existing config
  let config;
  try {
    config = parseJSONC(text);
  } catch (e) {
    console.warn(`  Warning: Could not parse ${tsconfigPath}: ${e.message}`);
    return false;
  }

  // Check if references need updating
  const existingRefs = JSON.stringify(config.references || []);
  const newRefs = JSON.stringify(localDeps);
  if (existingRefs === newRefs) {
    return false; // No change needed
  }

  // Update references
  if (localDeps.length > 0) {
    config.references = localDeps;
  } else {
    delete config.references;
  }

  // Write back with consistent formatting
  await fs.writeFile(tsconfigPath, JSON.stringify(config, null, 2) + '\n');
  return true;
};

async function main() {
  const projects = await getWorkspaceProjects();
  if (projects.length === 0) {
    console.error('No TypeScript build projects found.');
    process.exit(0);
  }

  // Create lookup map
  const projectsByName = new Map(projects.map(p => [p.name, p]));

  // Update each package's references
  let updatedCount = 0;
  for (const project of projects) {
    const updated = await updatePackageReferences(project, projectsByName);
    if (updated) {
      console.log(`  Updated ${path.relative(repoRoot, project.dir)}/tsconfig.build.json`);
      updatedCount++;
    }
  }
  if (updatedCount > 0) {
    console.log(`Updated references in ${updatedCount} package(s).`);
  } else {
    console.log('All package references are up to date.');
  }

  // Write solution tsconfig
  const ordered = topoSort(projects);
  const sol = await writeSolutionTsconfig(ordered);
  console.log(`Wrote ${path.relative(repoRoot, sol)} with ${ordered.length} references.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
