#! /usr/bin/env node
/* eslint-env node */
/**
 * @file prototype of a script to generate typeguards from a schema
 *
 *   TODO try making this robustly like
 *   https://github.com/StefanTerdell/json-schema-to-zod
 */
import fs from 'fs/promises';
import path from 'path';

import '@endo/init';

const schemaDir = path.join(process.cwd(), 'src', 'schemas');

const generatePatternFromSchema = schema => {
  if (schema.type === 'object' && schema.properties) {
    const properties = Object.entries(schema.properties).reduce(
      (acc, [key, value]) => {
        acc[key] = generatePatternFromSchema(value);
        return acc;
      },
      {},
    );
    return properties;
  } else if (schema.type === 'array') {
    if (schema.items && schema.items.type === 'array' && schema.items.items) {
      return `M.arrayOf(M.splitArray([M.string()], [M.arrayOf(M.any())]))`;
    }
    return `M.arrayOf(${generatePatternFromSchema(schema.items)})`;
  } else if (schema.type === 'string') {
    if (schema.const) {
      return `'${schema.const}'`;
    }
    return 'M.string()';
  } else if (schema.enum) {
    return `M.or(${schema.enum.map(v => `'${v}'`).join(', ')})`;
  } else if (schema.oneOf) {
    return `M.or(${schema.oneOf.map(generatePatternFromSchema).join(', ')})`;
  }
  return 'M.any()';
};

const generatePatternsFromSchemaFile = async filePath => {
  const content = await fs.readFile(filePath, 'utf-8');
  const schema = JSON.parse(content);

  const patterns = {};

  if (schema.oneOf) {
    const schemaName = path.basename(filePath, '.json');
    patterns[schemaName] = {
      pattern: `M.or(${schema.oneOf
        .map(subSchema => {
          const pattern = generatePatternFromSchema(subSchema);
          return JSON.stringify(pattern, null, 2);
        })
        .join(', ')})`,
      title: schema.title,
    };
  }

  return patterns;
};

const generateAllPatterns = async () => {
  const schemaFiles = await fs.readdir(schemaDir);
  const allPatterns = {};

  for (const file of schemaFiles) {
    if (file.endsWith('.json')) {
      const filePath = path.join(schemaDir, file);
      const patterns = await generatePatternsFromSchemaFile(filePath);
      Object.assign(allPatterns, patterns);
    }
  }

  return allPatterns;
};

const writePatternModule = async patterns => {
  const outputPath = path.join(process.cwd(), 'src', 'generatedPatterns.js');
  let content = `import { M } from '@endo/patterns';\n\n`;

  for (const [_name, { pattern, title }] of Object.entries(patterns)) {
    content += `export const ${title} = ${pattern};\n`;
  }

  await fs.writeFile(outputPath, content, 'utf-8');
  console.log(`Generated patterns written to ${outputPath}`);
};

const main = async () => {
  const patterns = await generateAllPatterns();
  await writePatternModule(patterns);
};

main().catch(console.error);
