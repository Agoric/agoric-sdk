#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Project } from 'ts-morph';
import prettier from 'prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = resolve(__dirname, '..');

const userPatterns = process.argv.slice(2);
const defaultPattern = 'src/**/*.js';
const globPatterns = (userPatterns.length ? userPatterns : [defaultPattern]).map(pattern =>
  resolve(packageRoot, pattern),
);

const project = new Project({
  compilerOptions: {
    allowJs: true,
    allowSyntheticDefaultImports: true,
  },
  skipAddingFilesFromTsConfig: true,
});

const sourceFiles = project.addSourceFilesAtPaths(globPatterns);

if (sourceFiles.length === 0) {
  console.log(`No files matched pattern(s): ${globPatterns.join(', ')}`);
  process.exit(0);
}

const prettierConfigCache = new Map();

const resolvePrettierOptions = async filePath => {
  if (!prettierConfigCache.has(filePath)) {
    const resolved =
      (await prettier.resolveConfig(filePath, {
        editorconfig: true,
      })) ?? {};
    prettierConfigCache.set(filePath, resolved);
  }
  return {
    ...prettierConfigCache.get(filePath),
    filepath: filePath,
  };
};

let organizedCount = 0;
let formattedCount = 0;

for (const sourceFile of sourceFiles) {
  const before = sourceFile.getFullText();
  sourceFile.organizeImports();
  const after = sourceFile.getFullText();
  if (before !== after) {
    organizedCount += 1;
    try {
      const prettierOptions = await resolvePrettierOptions(sourceFile.getFilePath());
      const formatted = await prettier.format(after, prettierOptions);
      if (formatted !== after) {
        sourceFile.replaceWithText(formatted);
        formattedCount += 1;
      }
    } catch (err) {
      console.warn(`Prettier failed for ${sourceFile.getFilePath()}:`, err);
    }
  }
}

await project.save();

console.log(
  `Organize imports finished: ${organizedCount} file(s) updated, ${formattedCount} formatted, out of ${sourceFiles.length} scanned.`,
);
