#!/usr/bin/env node
// @ts-check

/* eslint-env node */
const { spawnSync } = require('child_process');
const fsp = require('fs/promises');
const path = require('path');
const assert = require('node:assert/strict');
const process = require('process');
const { getNestedProto } = require('@cosmology/proto-parser');
const { TelescopeBuilder } = require('@hyperweb/telescope');
const rimraf = require('rimraf').rimrafSync;
const { getBaseTelescopeOptions } = require('../tools/telescope-options.cjs');
const {
  applyTelescopeFixes,
  detectGnuSed,
  fixTypeImportForVerbatim,
} = require('../tools/telescope-cleanup.cjs');

const protoDirs = [path.join(__dirname, '/../proto')];
const outPath = path.join(__dirname, '../src/codegen');
rimraf(outPath);

/**
 * @type {import('@hyperweb/telescope').TelescopeInput}
 */
const input = {
  protoDirs,
  outPath,
  options: getBaseTelescopeOptions(),
};

const builder = new TelescopeBuilder(input);

const strcmp = (a, b) => {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
};

const hasOwn = (obj, prop) => Object.hasOwn(obj ?? {}, prop);

const objectFromSortedEntries = entries =>
  Object.fromEntries(entries.sort(([a], [b]) => strcmp(a, b)));

const typeUrlFromField = (proto, field) => {
  const scalarType = field.options?.['(cosmos_proto.scalar)'];
  if (scalarType) {
    return scalarType;
  }

  if (field.parsedType?.type !== 'Type') {
    return undefined;
  }

  const typeName =
    field.parsedType.originalName ?? field.parsedType.name ?? field.type;
  if (!typeName) {
    return undefined;
  }

  const [firstScope] = field.scope ?? [];
  const scope = Array.isArray(firstScope) ? firstScope[0] : firstScope;
  const importedPkg = field.importedName?.includes('.')
    ? field.importedName.split('.').slice(0, -1).join('.')
    : undefined;
  const pkg =
    typeof scope === 'string' && scope
      ? scope
      : (importedPkg ?? proto.proto.package);
  return `/${pkg}.${typeName}`;
};

const addRecordValue = (record, typeUrl, annotation, fieldName, value) => {
  record[typeUrl] ??= {};
  record[typeUrl][annotation] ??= {};
  record[typeUrl][annotation][fieldName] = value;
};

const sortedAnnotationRecord = record =>
  objectFromSortedEntries(
    Object.entries(record).map(([typeUrl, annotations]) => [
      typeUrl,
      objectFromSortedEntries(
        Object.entries(annotations).map(([annotation, fields]) => [
          annotation,
          objectFromSortedEntries(Object.entries(fields)),
        ]),
      ),
    ]),
  );

const typeUrlRecordFromProto = proto => {
  const nested = getNestedProto(proto.traversed) ?? {};
  const record = {};

  for (const [typeName, typeDef] of Object.entries(nested).sort(([a], [b]) =>
    strcmp(a, b),
  )) {
    if (typeDef.type !== 'Type') {
      continue;
    }

    const typeUrl = `/${proto.proto.package}.${
      typeDef.originalName ?? typeName
    }`;

    for (const [rawFieldName, field] of Object.entries(
      typeDef.fields ?? {},
    ).sort(([a], [b]) => strcmp(a, b))) {
      const options = field.options ?? {};
      const isRepeated = field.rule === 'repeated' || field.keyType;
      const hasNullable = hasOwn(options, '(gogoproto.nullable)');
      const hasEmbed = hasOwn(options, '(gogoproto.embed)');

      // The current codec transformation treats child messages as objects, not
      // arrays. Repeated gogoproto.nullable=false fields need separate handling.
      if (isRepeated || (!hasNullable && !hasEmbed)) {
        continue;
      }

      const fieldName = options['(telescope:name)'] ?? rawFieldName;
      const fieldTypeUrl = typeUrlFromField(proto, field);
      if (fieldTypeUrl) {
        addRecordValue(
          record,
          typeUrl,
          'typeUrlFromField',
          fieldName,
          fieldTypeUrl,
        );
      }

      if (hasNullable) {
        addRecordValue(
          record,
          typeUrl,
          'gogoproto.nullable',
          fieldName,
          Boolean(options['(gogoproto.nullable)']),
        );
      }

      if (hasEmbed) {
        addRecordValue(
          record,
          typeUrl,
          'gogoproto.embed',
          options['(telescope:orig)'] ?? rawFieldName,
          fieldName,
        );
      }

      if (hasOwn(options, '(amino.dont_omitempty)')) {
        addRecordValue(
          record,
          typeUrl,
          'amino.dont_omitempty',
          fieldName,
          Boolean(options['(amino.dont_omitempty)']),
        );
      }
    }
  }

  return sortedAnnotationRecord(record);
};

const importIdentifierFromTypeUrl = typeUrl =>
  `__annotationCodec${[...typeUrl]
    .map(char =>
      /[A-Za-z0-9_$]/.test(char) ? char : `_${char.charCodeAt(0).toString(16)}`,
    )
    .join('')}`;

const renderAnnotationExpression = (value, getCodecRef, path = []) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return `{${Object.entries(value)
      .map(
        ([key, child]) =>
          `${JSON.stringify(key)}: ${renderAnnotationExpression(child, getCodecRef, [...path, key])},`,
      )
      .join('')}}`;
  }

  if (path[0] === 'typeUrlFromField' && typeof value === 'string') {
    const codecRef = getCodecRef(value);
    if (codecRef) {
      return `() => ${codecRef}`;
    }
  }

  return JSON.stringify(value);
};

const toPosixPath = filePath => filePath.split(path.sep).join(path.posix.sep);

const importPathFrom = (fromFile, toFile) => {
  const importPath = toPosixPath(path.relative(path.dirname(fromFile), toFile));
  return importPath.startsWith('.') ? importPath : `./${importPath}`;
};

const addAnnotationImports = (contents, protoOutFile, childImports) => {
  const imports = [];
  if (!contents.includes('import type { FieldAnnotationsRecord }')) {
    imports.push(
      `import type { FieldAnnotationsRecord } from ${JSON.stringify(
        importPathFrom(
          protoOutFile,
          path.join(outPath, '..', 'type-url-annotations.js'),
        ),
      )};`,
    );
  }

  for (const { importFrom, importedName, localName } of [
    ...childImports.values(),
  ].sort(
    (a, b) =>
      strcmp(a.importFrom, b.importFrom) ||
      strcmp(a.importedName, b.importedName),
  )) {
    imports.push(
      `import { ${importedName} as ${localName} } from ${JSON.stringify(
        importFrom,
      )};`,
    );
  }
  if (!imports.length) {
    return contents;
  }

  const annotationImports = `${imports.join('\n')}\n`;

  if (contents.startsWith('//@ts-nocheck\n')) {
    return contents.replace(
      '//@ts-nocheck\n',
      `//@ts-nocheck\n${annotationImports}`,
    );
  }

  return `${annotationImports}${contents}`;
};

const addCodecAnnotations = (
  contents,
  exportName,
  annotationsRecord,
  getCodecRef,
) => {
  const exportNeedle = `export const ${exportName} = {\n`;
  const exportOffset = contents.indexOf(exportNeedle);
  assert.notEqual(exportOffset, -1, `missing codec export ${exportName}`);

  const typeUrlOffset = contents.indexOf('\n  typeUrl:', exportOffset);
  assert.notEqual(typeUrlOffset, -1, `missing typeUrl for ${exportName}`);
  const typeUrlLineEnd = contents.indexOf('\n', typeUrlOffset + 1);
  assert.notEqual(
    typeUrlLineEnd,
    -1,
    `missing typeUrl line end for ${exportName}`,
  );

  const annotationProperty = `  annotations: ${renderAnnotationExpression(
    annotationsRecord,
    getCodecRef,
  )} as const satisfies FieldAnnotationsRecord,\n`;
  return [
    contents.slice(0, typeUrlLineEnd + 1),
    annotationProperty,
    contents.slice(typeUrlLineEnd + 1),
  ].join('');
};

const addProtoAnnotations = async (
  protoOutFile,
  exports,
  typeUrlRecord,
  typeInfoFromTypeUrl,
) => {
  const annotationsEntries = Object.entries(typeUrlRecord);
  if (!annotationsEntries.length) {
    return;
  }

  const exportFromTypeUrl = new Map(exports);
  const childImports = new Map();
  const getCodecRef = typeUrl => {
    const typeInfo = typeInfoFromTypeUrl.get(typeUrl);
    if (!typeInfo) {
      return undefined;
    }
    if (path.resolve(typeInfo.outFile) === path.resolve(protoOutFile)) {
      return typeInfo.exportName;
    }

    const localName = importIdentifierFromTypeUrl(typeUrl);
    childImports.set(localName, {
      importFrom: importPathFrom(protoOutFile, typeInfo.importFile),
      importedName: typeInfo.exportName,
      localName,
    });
    return localName;
  };

  let contents = await fsp.readFile(protoOutFile, 'utf8');
  let didAddAnnotations = false;
  for (const [typeUrl, annotationsRecord] of annotationsEntries) {
    const exportName = exportFromTypeUrl.get(typeUrl);
    if (!exportName) {
      continue;
    }
    contents = addCodecAnnotations(
      contents,
      exportName,
      annotationsRecord,
      getCodecRef,
    );
    didAddAnnotations = true;
  }
  if (!didAddAnnotations) {
    return;
  }
  contents = addAnnotationImports(contents, protoOutFile, childImports);
  await fsp.writeFile(protoOutFile, contents);
};

const createTypeFromUrl = async () => {
  const { store } = builder;
  const fileExports = {};
  const protoExports = [];
  const typeInfoFromTypeUrl = new Map();

  for (const proto of store.getProtos()) {
    // console.log(proto);
    if (!proto.traversed) {
      continue;
    }
    const typeUrlPrefix = `/${proto.proto.package}.`;
    const parsedExports = proto.traversed?.parsedExports;
    if (!parsedExports) {
      continue;
    }
    const exports = Object.keys(parsedExports).sort(strcmp);
    if (!exports.length) {
      continue;
    }

    const importFrom = `./${proto.filename.replace(/\.proto$/, '.js')}`;
    const exportsForFile = exports.map(exp => [`${typeUrlPrefix}${exp}`, exp]);
    fileExports[importFrom] = exportsForFile;
    const protoOutFile = path.join(
      outPath,
      proto.filename.replace(/\.proto$/, '.ts'),
    );
    const protoImportFile = path.join(
      outPath,
      proto.filename.replace(/\.proto$/, '.js'),
    );
    protoExports.push({ proto, exportsForFile, protoOutFile });
    for (const [typeUrl, exportName] of exportsForFile) {
      typeInfoFromTypeUrl.set(typeUrl, {
        exportName,
        importFile: protoImportFile,
        outFile: protoOutFile,
      });
    }
  }

  for (const { proto, exportsForFile, protoOutFile } of protoExports) {
    const protoTypeUrlRecord = typeUrlRecordFromProto(proto);
    await addProtoAnnotations(
      protoOutFile,
      exportsForFile,
      protoTypeUrlRecord,
      typeInfoFromTypeUrl,
    );
  }

  const sortedEntries = Object.entries(fileExports).sort(([a], [b]) =>
    strcmp(a, b),
  );

  const props = [];
  const imports = {};
  for (const [importFrom, exports] of sortedEntries) {
    const imp = importFrom.replaceAll(/[\/\.]/g, str => {
      switch (str) {
        case '/':
          return '$';
        case '.':
          return '_';
        default:
          assert.fail(`unrecognized string ${str}`);
      }
    });
    imports[imp] = importFrom;
    for (const [typeUrl, exp] of exports) {
      props.push(`  ${JSON.stringify(typeUrl)}: ${imp}.${exp};`);
    }
  }

  // Render the output.
  const out = [];
  out.push(
    `\
// DO NOT EDIT; generated by ${path.relative(process.cwd(), __filename)}
    `,
  );
  for (const [imp, importFrom] of Object.entries(imports)) {
    out.push(`import type * as ${imp} from ${JSON.stringify(importFrom)};`);
  }
  out.push('', `export type TypeFromUrl = {`, ...props, `};`, '');
  return out.join('\n');
};

builder
  .build()
  .then(async () => {
    const typeFromUrlContents = await createTypeFromUrl();
    // CAVEAT: This file needs to be a `.ts` instead of `.d.ts` or else `tsc`
    // won't compile its types into the dist output.
    const typeFromUrlFile = path.join(outPath, 'typeFromUrl.ts');
    await fsp.writeFile(typeFromUrlFile, typeFromUrlContents);

    console.log('🔨 code generated by Telescope');

    // for all files under codegen/ replace "import { JsonSafe" with "import type { JsonSafe"
    const gnuSed = detectGnuSed();
    fixTypeImportForVerbatim('./src/codegen', gnuSed);
    console.log('🔧 type keyword added');

    const repoRoot = path.join(__dirname, '..', '..', '..');
    const srcFromRoot = path.relative(
      repoRoot,
      path.join(__dirname, '..', 'src'),
    );
    const codegenFromRoot = path.join(srcFromRoot, 'codegen');
    const prettierResult = spawnSync(
      'yarn',
      ['run', '-T', 'prettier', '--write', codegenFromRoot],
      {
        cwd: repoRoot,
        stdio: 'inherit',
      },
    );
    if (prettierResult.error) {
      throw prettierResult.error;
    }
    assert.equal(prettierResult.status, 0);
    console.log('💅 code formatted by Prettier');

    const cleanedFiles = await applyTelescopeFixes({
      outPath,
      includeSigningClientParamsCleanup: true,
    });
    if (cleanedFiles.length > 0) {
      const prettierHelpersResult = spawnSync(
        'yarn',
        [
          'run',
          '--top-level',
          'prettier',
          '--write',
          ...cleanedFiles.map(file =>
            path.relative(path.join(__dirname, '..'), file),
          ),
        ],
        {
          cwd: path.join(__dirname, '..'),
          stdio: 'inherit',
        },
      );
      assert.equal(prettierHelpersResult.status, 0);
    }
    console.log('🧹 cleaned generated helper compatibility imports');

    console.log('ℹ️ `yarn build && yarn test` to test it.');
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
