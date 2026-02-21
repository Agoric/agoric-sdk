#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * Normalize imports in TypeScript/JavaScript files
 *
 * This script processes TypeScript and JavaScript files to:
 * - Fix inline type imports and add missing imports
 * - Organize and normalize import statements
 * - Apply prettier formatting
 * - Run ESLint auto-fix
 *
 * Usage: node scripts/normalize-imports.ts "<glob>" [...more globs]
 *
 * Example: node scripts/normalize-imports.ts "src/**\/*.ts" "lib/**\/*.js"
 */
/* eslint-disable @jessie.js/safe-await-separator */
/* eslint-disable no-underscore-dangle */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { execa } from 'execa';
import { Project } from 'ts-morph';
import prettier from 'prettier';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = resolve(__dirname, '..');

const toPosix = filePath => filePath.replaceAll('\\', '/');

const userPatterns = process.argv.slice(2);
if (userPatterns.length === 0) {
  console.error('Usage: node scripts/organize-imports.js "<glob>" [...more]');
  process.exit(1);
}
const globPatterns = userPatterns.map(pattern => resolve(packageRoot, pattern));

const tsConfigPath = resolve(packageRoot, 'tsconfig.json');

const readTsConfig = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
if (readTsConfig.error) {
  throw new Error(
    `Failed to read tsconfig at ${tsConfigPath}: ${readTsConfig.error.messageText}`,
  );
}
const parsedTsConfig = ts.parseJsonConfigFileContent(
  readTsConfig.config,
  ts.sys,
  packageRoot,
);
const compilerOptions = {
  ...parsedTsConfig.options,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
};
const scriptFileNames = new Set(parsedTsConfig.fileNames.map(toPosix));
let projectVersion = 0;
const languageServiceHost = {
  ...ts.createCompilerHost(compilerOptions),
  getCompilationSettings: () => compilerOptions,
  getScriptFileNames: () => Array.from(scriptFileNames),
  getProjectVersion: () => `${projectVersion}`,
  getScriptVersion: () => '0',
  getScriptSnapshot: fileName => {
    if (!ts.sys.fileExists(fileName)) {
      return undefined;
    }
    return ts.ScriptSnapshot.fromString(ts.sys.readFile(fileName)!);
  },
  getCurrentDirectory: () => packageRoot,
};
const languageService = ts.createLanguageService(
  // @ts-expect-error writeFile type mismatch
  languageServiceHost,
  ts.createDocumentRegistry(),
);

const project = new Project({
  tsConfigFilePath: tsConfigPath,
  // @ts-expect-error ts-morph types not yet updated for TypeScript 6
  compilerOptions,
  // skipAddingFilesFromTsConfig: true,
});
const lintTargets = new Set<string>();

const ensureFileInService = absPath => {
  const normalizedPath = toPosix(absPath);
  if (!scriptFileNames.has(normalizedPath)) {
    scriptFileNames.add(normalizedPath);
    projectVersion += 1;
  }
  return normalizedPath;
};

const typeImportPreferences = {
  importModuleSpecifierPreference: 'shortest',
  includePackageJsonAutoImports: 'on',
  preferTypeOnlyAutoImports: true,
  allowRenameOfImportPath: true,
  displayPartsForJSDoc: true,
  autoImportFileExcludePatterns: ['**/node_modules/**', '**/dist/**'],
} as ts.UserPreferences;

const applyInlineTypeImportFixes = sourceFile => {
  const absPath = sourceFile.getFilePath();
  const normalizedPath = ensureFileInService(absPath);
  const program = languageService.getProgram();
  if (!program?.getSourceFile(normalizedPath)) {
    return 0;
  }
  const diagnostics = [
    ...languageService.getSemanticDiagnostics(normalizedPath),
    ...languageService.getSuggestionDiagnostics(normalizedPath),
  ];
  const pendingChanges = [] as Array<{
    start: number;
    length: number;
    newText: string;
  }>;
  const seen = new Set();
  for (const diagnostic of diagnostics) {
    if (diagnostic.start === undefined) {
      continue;
    }
    if (diagnostic.code !== 2304) {
      continue;
    }
    const start = diagnostic.start;
    const length = diagnostic.length ?? 0;
    let fixes;
    try {
      fixes = languageService.getCodeFixesAtPosition(
        normalizedPath,
        start,
        start + length,
        [diagnostic.code],
        {},
        typeImportPreferences,
      );
    } catch (err) {
      console.warn(
        `Skipping code fixes for ${normalizedPath} at ${start}: ${err.message}`,
      );
      continue;
    }
    const importFix = fixes.find(
      fix =>
        fix.fixName === 'import' &&
        fix.changes.some(change =>
          change.textChanges.some(textChange =>
            textChange.newText.includes('import('),
          ),
        ),
    );
    if (!importFix) {
      continue;
    }
    for (const change of importFix.changes) {
      const changePath = toPosix(change.fileName);
      if (changePath !== normalizedPath) {
        continue;
      }
      for (const textChange of change.textChanges) {
        const key = `${textChange.span.start}:${textChange.span.length}:${textChange.newText}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        pendingChanges.push({
          start: textChange.span.start,
          length: textChange.span.length,
          newText: textChange.newText,
        });
      }
    }
  }
  if (pendingChanges.length === 0) {
    return 0;
  }
  pendingChanges.sort((a, b) => b.start - a.start);
  let updatedText = sourceFile.getFullText();
  for (const change of pendingChanges) {
    updatedText =
      updatedText.slice(0, change.start) +
      change.newText +
      updatedText.slice(change.start + change.length);
  }
  sourceFile.replaceWithText(updatedText);
  return pendingChanges.length;
};

const sourceFiles = project.addSourceFilesAtPaths(globPatterns).filter(file => {
  const ext = file.getFilePath().split('.').pop()?.toLowerCase();
  return ['ts', 'tsx', 'js', 'jsx', 'mts', 'mjs'].includes(ext || '');
});

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

const runEslintAutofix = async (filePath: string) => {
  try {
    await execa('yarn', ['eslint', '--fix', filePath], {
      cwd: packageRoot,
      stdio: 'inherit',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`ESLint --fix failed for ${filePath}: ${message}`);
  }
};

for (const sourceFile of sourceFiles) {
  const filePath = sourceFile.getFilePath();
  console.log(`Processing ${filePath}`);
  const originalText = sourceFile.getFullText();
  applyInlineTypeImportFixes(sourceFile);
  sourceFile.fixMissingImports({}, typeImportPreferences); // the Add all missing imports action in VSCode
  const textAfterFixes = sourceFile.getFullText();
  const changedByFixes = originalText !== textAfterFixes;
  if (changedByFixes) {
    try {
      const prettierOptions = await resolvePrettierOptions(filePath);
      const formatted = await prettier.format(textAfterFixes, prettierOptions);
      if (formatted !== textAfterFixes) {
        sourceFile.replaceWithText(formatted);
      }
    } catch (err) {
      console.warn(`Prettier failed for ${filePath}:`, err);
    }
  }
  if (sourceFile.getFullText() !== originalText) {
    lintTargets.add(filePath);
  }
}

await project.save();

for (const filePath of lintTargets) {
  await runEslintAutofix(filePath);
}

console.log(
  `Organize imports finished processing ${sourceFiles.length} files.`,
);
