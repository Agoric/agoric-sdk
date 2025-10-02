/* eslint-disable no-underscore-dangle */
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { MZ_META_KEY } from './mz.js';

const isZodType = value => value instanceof z.ZodType;

const VALID_IDENTIFIER = /^[A-Za-z_$][0-9A-Za-z_$]*$/;

const indent = (text, spaces = 2) =>
  text
    .split('\n')
    .map(line => (line ? `${' '.repeat(spaces)}${line}` : line))
    .join('\n');

const formatKey = key =>
  VALID_IDENTIFIER.test(key) ? key : JSON.stringify(key);

const formatPlainArray = arr => {
  if (arr.length === 0) {
    return '[]';
  }
  const items = arr.map(item => formatLiteral(item));
  if (items.some(item => item.includes('\n'))) {
    return `[\n${indent(items.join(',\n'))}\n]`;
  }
  return `[${items.join(', ')}]`;
};

const formatPlainObject = obj => {
  const entries = Object.entries(obj);
  if (entries.length === 0) {
    return '{}';
  }
  const lines = entries.map(
    ([key, value]) => `${formatKey(key)}: ${formatLiteral(value)}`,
  );
  return `{\n${indent(lines.join(',\n'))}\n}`;
};

const formatLiteral = value => {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Non-finite numbers are not supported in literals');
    }
    if (Object.is(value, -0)) {
      return '-0';
    }
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'bigint') {
    return `${value}n`;
  }
  if (value === undefined) {
    return 'undefined';
  }
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return formatPlainArray(value);
  }
  if (typeof value === 'object') {
    return formatPlainObject(value);
  }
  throw new Error(`Unsupported literal value: ${String(value)}`);
};

const getTypeName = schema => {
  if (!schema || typeof schema !== 'object') {
    return undefined;
  }
  const def = schema._def || schema.def;
  return def?.typeName ?? def?.type;
};

const unwrapSchema = (schema, { dropOptional = false } = {}) => {
  /** @type {Array<{ kind: string, value?: unknown }>} */
  const wrappers = [];
  let current = schema;
  let optional = false;
  for (;;) {
    const typeName = getTypeName(current);
    if (typeName === 'optional') {
      optional = true;
      if (!dropOptional) {
        wrappers.push({ kind: 'optional' });
      }
      current = current._def.innerType;
      continue;
    }
    if (typeName === 'nullable') {
      wrappers.push({ kind: 'nullable' });
      current = current._def.innerType;
      continue;
    }
    if (typeName === 'default') {
      optional = true;
      current = current._def.innerType;
      continue;
    }
    if (typeName === 'branded') {
      current = current._def.type;
      continue;
    }
    if (typeName === 'pipeline') {
      throw new Error('Zod pipelines are not supported');
    }
    if (typeName === 'effects') {
      throw new Error('Zod effects are not supported');
    }
    break;
  }
  return { schema: current, wrappers, optional };
};

const applyWrappers = (wrappers, code) => {
  let result = code;
  for (let i = wrappers.length - 1; i >= 0; i -= 1) {
    const wrapper = wrappers[i];
    if (wrapper.kind === 'optional') {
      result = `M.or(M.undefined(), ${result})`;
    } else if (wrapper.kind === 'nullable') {
      result = `M.or(M.null(), ${result})`;
    } else {
      throw new Error(`Unsupported wrapper kind: ${wrapper.kind}`);
    }
  }
  return result;
};

const renderCopyRecord = entries => {
  if (entries.length === 0) {
    return '{}';
  }
  const chunks = entries.map(({ key, code, description }) => {
    const parts = [];
    if (description) {
      parts.push(jsDocComment(description));
    }
    parts.push(`${formatKey(key)}: ${code}`);
    return parts.join('\n');
  });
  return `{\n${indent(chunks.join(',\n'))}\n}`;
};

const renderCopyArray = elements => {
  if (elements.length === 0) {
    return '[]';
  }
  const multiline = elements.some(el => el.includes('\n'));
  if (multiline) {
    return `[\n${indent(elements.join(',\n'))}\n]`;
  }
  return `[${elements.join(', ')}]`;
};

const getMzMeta = schema => {
  if (!schema || typeof schema !== 'object') {
    return undefined;
  }
  const metadata =
    typeof schema.meta === 'function' ? schema.meta() : schema._def.metadata;
  return metadata && metadata[MZ_META_KEY];
};

const TEMP_ROOT = join(process.cwd(), '.agoric-schemas-tmp');

const writeTempModuleAndImport = async (source, filenameBase) => {
  await mkdir(TEMP_ROOT, { recursive: true });
  const dir = await mkdtemp(join(TEMP_ROOT, 'module-'));
  const filename = join(dir, filenameBase);
  await writeFile(filename, source, 'utf8');
  try {
    const url = pathToFileURL(filename).href;
    return await import(`${url}?${Date.now()}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

const loadSchemaNamespace = async (
  source,
  evaluateModuleSpecifier,
  virtualModuleFilename,
) => {
  if (evaluateModuleSpecifier) {
    let spec = evaluateModuleSpecifier;
    try {
      const url = new URL(spec);
      url.searchParams.set('__ts', `${Date.now()}`);
      spec = url.href;
    } catch (_err) {
      const joiner = spec.includes('?') ? '&' : '?';
      spec = `${spec}${joiner}${Date.now()}`;
    }
    return import(spec);
  }
  const filename = basename(virtualModuleFilename || 'module.mjs');
  const normalized =
    filename.endsWith('.js') || filename.endsWith('.mjs')
      ? filename
      : `${filename}.mjs`;
  return writeTempModuleAndImport(source, normalized);
};

const buildEntry = (key, code, description) => ({ key, code, description });

const emitObjectMatcher = schema => {
  const rawShape = schema._def.shape;
  const shape = typeof rawShape === 'function' ? rawShape() : rawShape;
  const entries = Object.entries(shape);
  const requiredEntries = [];
  const optionalEntries = [];
  for (const [key, propertySchema] of entries) {
    const {
      schema: inner,
      wrappers,
      optional,
    } = unwrapSchema(propertySchema, {
      dropOptional: true,
    });
    const pattern = applyWrappers(wrappers, emitMatcher(inner));
    const description = propertySchema.description || undefined;
    const entry = buildEntry(key, pattern, description);
    const target = optional ? optionalEntries : requiredEntries;
    target.push(entry);
  }
  const catchall = schema._def.catchall;
  const hasRest = catchall && getTypeName(catchall) !== 'never';

  const requiredArg = renderCopyRecord(requiredEntries);
  const optionalArg = renderCopyRecord(optionalEntries);
  const restArg = hasRest ? emitMatcher(catchall) : '{}';

  const args = [
    requiredArg,
    optionalEntries.length > 0 || hasRest ? optionalArg : '{}',
    restArg,
  ];

  return `M.splitRecord(${args.join(', ')})`;
};

const emitTupleMatcher = schema => {
  const requiredItems = [];
  const optionalItems = [];

  for (const itemSchema of schema._def.items) {
    const {
      schema: inner,
      wrappers,
      optional,
    } = unwrapSchema(itemSchema, {
      dropOptional: true,
    });
    const matcher = applyWrappers(wrappers, emitMatcher(inner));
    if (optional) {
      optionalItems.push(matcher);
    } else {
      if (optionalItems.length > 0) {
        throw new Error('Tuple optional items must follow required items');
      }
      requiredItems.push(matcher);
    }
  }

  const args = [];
  args.push(renderCopyArray(requiredItems));
  if (optionalItems.length > 0) {
    args.push(renderCopyArray(optionalItems));
  } else if (schema._def.rest) {
    args.push('[]');
  }
  if (schema._def.rest) {
    args.push(emitMatcher(schema._def.rest));
  }

  return `M.splitArray(${args.join(', ')})`;
};

const emitUnionMatcher = schema => {
  const options = schema._def.options.map(option => emitMatcher(option));
  return `M.or(${options.join(', ')})`;
};

const emitEnumMatcher = schema => {
  const raw = schema._def.values ?? schema._def.entries;
  const values = Array.isArray(raw) ? raw : Object.values(raw ?? {});
  const formatted = values.map(value => formatLiteral(value));
  return `M.or(${formatted.join(', ')})`;
};

const emitRecordMatcher = schema => {
  const keyPattern = emitMatcher(schema._def.keyType);
  const valuePattern = emitMatcher(schema._def.valueType);
  return `M.recordOf(${keyPattern}, ${valuePattern})`;
};

const emitMatcherBase = schema => {
  const meta = getMzMeta(schema);
  if (meta) {
    switch (meta.kind) {
      case 'remotable':
        return meta.label
          ? `M.remotable(${formatLiteral(meta.label)})`
          : 'M.remotable()';
      case 'nat':
        if (meta.limits === undefined) {
          return 'M.nat()';
        }
        return `M.nat(${formatLiteral(meta.limits)})`;
      case 'gte':
        return `M.gte(${formatLiteral(meta.bound)})`;
      case 'raw':
        return meta.expression;
      default:
        throw new Error(`Unknown Mz metadata kind: ${meta.kind}`);
    }
  }

  const typeName = getTypeName(schema);
  switch (typeName) {
    case 'string':
      return 'M.string()';
    case 'number':
      return 'M.number()';
    case 'boolean':
      return 'M.boolean()';
    case 'bigint':
      return 'M.bigint()';
    case 'any':
    case 'unknown':
      return 'M.any()';
    case 'null':
      return 'M.null()';
    case 'undefined':
      return 'M.undefined()';
    case 'literal': {
      const value = schema._def.value ?? schema._def.values?.[0];
      return formatLiteral(value);
    }
    case 'object':
      return emitObjectMatcher(schema);
    case 'array':
      return `M.arrayOf(${emitMatcher(schema._def.element)})`;
    case 'tuple':
      return emitTupleMatcher(schema);
    case 'union':
      return emitUnionMatcher(schema);
    case 'enum':
      return emitEnumMatcher(schema);
    case 'record':
      return emitRecordMatcher(schema);
    default:
      throw new Error(`Unsupported Zod type: ${typeName}`);
  }
};

const emitMatcher = schema => {
  const { schema: base, wrappers } = unwrapSchema(schema);
  const code = emitMatcherBase(base);
  return applyWrappers(wrappers, code);
};

const jsDocComment = description => {
  if (!description) {
    return '';
  }
  const lines = description.split(/\r?\n/);
  const body = lines.map(line => ` * ${line}`).join('\n');
  return `/**\n${body}\n */`;
};

const deriveExportName = schemaName =>
  schemaName.endsWith('Schema')
    ? schemaName.slice(0, -6)
    : `${schemaName}Pattern`;

export const compileSchemasModule = async (source, options = {}) => {
  const {
    sourceModuleSpecifier = './source.js',
    moduleComment = 'Generated by @agoric/schemas',
    evaluateModuleSpecifier = undefined,
    virtualModuleFilename = 'source.schemas.mjs',
  } = options;

  const namespace = await loadSchemaNamespace(
    source,
    evaluateModuleSpecifier,
    virtualModuleFilename,
  );

  const schemaEntries = Object.entries(namespace).filter(([, value]) =>
    isZodType(value),
  );
  if (schemaEntries.length === 0) {
    throw new Error('No Zod schemas were exported from the provided source');
  }

  schemaEntries.sort(([a], [b]) => a.localeCompare(b));

  const exports = schemaEntries.map(([schemaName, schema]) => {
    const exportName = deriveExportName(schemaName);
    const description = schema.description || undefined;
    const patternExpression = emitMatcher(schema);
    const lines = [];
    if (description) {
      lines.push(jsDocComment(description));
    }
    lines.push(`export const ${exportName} = ${patternExpression};`);
    lines.push(`harden(${exportName});`);
    return { schemaName, exportName, description, js: lines.join('\n') };
  });

  const jsParts = [
    `// ${moduleComment}`,
    "import { M } from '@endo/patterns';",
    '',
  ];
  for (const entry of exports) {
    jsParts.push(entry.js);
    jsParts.push('');
  }
  const jsSource = `${jsParts.join('\n').trim()}\n`;

  const dtsParts = [
    `// ${moduleComment}`,
    "import type { Pattern } from '@endo/patterns';",
    "import type { z } from 'zod';",
    `import type * as source from '${sourceModuleSpecifier}';`,
    '',
  ];
  for (const entry of exports) {
    if (entry.description) {
      dtsParts.push(jsDocComment(entry.description));
    }
    dtsParts.push(
      `export type ${entry.exportName} = z.infer<typeof source.${entry.schemaName}>;`,
    );
    dtsParts.push(
      `export declare const ${entry.exportName}: TypedPattern<${entry.exportName}>;`,
    );
    dtsParts.push('');
  }
  const dtsSource = `${dtsParts.join('\n').trim()}\n`;

  return harden({ js: jsSource, dts: dtsSource, exports });
};

export default compileSchemasModule;
