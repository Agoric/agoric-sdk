import { readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const testRoots = [
  join(root, 'test'),
  join(root, 'packages'),
  join(root, 'services'),
  join(root, 'a3p-integration', 'proposals'),
];

const sideEffectImport = /^\s*import\s+['"][^'"]+['"]\s*;?/m;

const isTestFile = name =>
  (name.includes('.test.') || name.includes('.test-noendo.')) &&
  !name.endsWith('.d.ts') &&
  !name.endsWith('.map');

const walk = async dir => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.isFile() && isTestFile(entry.name)) {
      files.push(full);
    }
  }
  return files;
};

const updateSnapshotReport = async (snapshotPath, oldName, newName) => {
  if (!snapshotPath.endsWith('.md')) {
    return;
  }
  const content = await readFile(snapshotPath, 'utf8');
  const updated = content.replaceAll(oldName, newName);
  if (updated !== content) {
    await writeFile(snapshotPath, updated, 'utf8');
  }
};

const renameSnapshots = async (testDir, oldName, newName) => {
  const snapshotDir = join(testDir, 'snapshots');
  try {
    const snapshotStat = await stat(snapshotDir);
    if (!snapshotStat.isDirectory()) {
      return;
    }
  } catch {
    return;
  }

  const entries = await readdir(snapshotDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.startsWith(oldName)) continue;
    const oldPath = join(snapshotDir, entry.name);
    const newPath = join(snapshotDir, entry.name.replace(oldName, newName));
    await rename(oldPath, newPath);
    await updateSnapshotReport(newPath, oldName, newName);
  }
};

const normalizeOne = async filePath => {
  const content = await readFile(filePath, 'utf8');
  const needsNoEndo = sideEffectImport.test(content);
  const dir = dirname(filePath);
  const name = basename(filePath);
  const desired = needsNoEndo
    ? name.replace('.test.', '.test-noendo.')
    : name.replace('.test-noendo.', '.test.');

  if (name === desired) {
    return false;
  }

  const newPath = join(dir, desired);
  await rename(filePath, newPath);
  await renameSnapshots(dir, name, desired);
  return { oldPath: filePath, newPath };
};

const main = async () => {
  const testFiles = [];
  for (const rootDir of testRoots) {
    try {
      const rootStat = await stat(rootDir);
      if (!rootStat.isDirectory()) continue;
    } catch {
      continue;
    }
    testFiles.push(...(await walk(rootDir)));
  }

  const changes = [];
  for (const filePath of testFiles) {
    const result = await normalizeOne(filePath);
    if (result) changes.push(result);
  }

  if (changes.length === 0) {
    console.log('No test filenames needed updates.');
    return;
  }

  for (const { oldPath, newPath } of changes) {
    console.log(`${relative(root, oldPath)} -> ${relative(root, newPath)}`);
  }
};

await main();
