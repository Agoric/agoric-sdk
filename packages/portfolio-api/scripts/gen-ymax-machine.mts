#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * Generate src/model/generated/ymax-machine.js from the YAML spec.
 * Validates against the JSON schema before writing. Use --check to verify
 * the generated file is current without writing changes.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv, { type ErrorObject } from 'ajv';
import prettier from 'prettier';
import {
  DEFAULT_YMAX_MACHINE_PATH,
  DEFAULT_YMAX_SCHEMA_PATH,
  loadYmaxSchema,
  loadYmaxSpec,
  type YmaxSpec,
} from './ymax-spec.mts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.resolve(
  __dirname,
  '../src/model/generated/ymax-machine.js',
);
const args = process.argv.slice(2);
const checkMode = args.includes('--check');

const ajv = new Ajv({ allErrors: true, strict: false });

const formatAjvErrors = (errors: ErrorObject[] | null | undefined) =>
  errors?.map(err => `${err.instancePath || '/'} ${err.message}`).join('; ');

const validateSpec = async (spec: YmaxSpec) => {
  const schema = await loadYmaxSchema(DEFAULT_YMAX_SCHEMA_PATH);
  const validate = ajv.compile(schema);
  const valid = validate(spec);
  if (!valid) {
    throw new Error(
      `YAML failed schema validation: ${formatAjvErrors(validate.errors)}`,
    );
  }
};

const renderModule = (spec: YmaxSpec) => {
  const sourceRel = path.relative(
    path.dirname(OUTPUT_PATH),
    DEFAULT_YMAX_MACHINE_PATH,
  );
  return `// @ts-check
/**
 * GENERATED FILE - DO NOT EDIT.
 * Source: ${sourceRel || './ymax-machine.yaml'}
 * To regenerate: yarn run -T tsx scripts/gen-ymax-machine.mts
 */

/**
 * @typedef {object} TransitionTarget
 * @property {string} target
 * @property {string} [description]
 */

/**
 * @typedef {object} StateNode
 * @property {string} description
 * @property {string} [type]
 * @property {string} [initial]
 * @property {Record<string, StateNode>} [states]
 * @property {Record<string, TransitionTarget | TransitionTarget[]>} [on]
 * @property {TransitionTarget} [onDone]
 * @property {TransitionTarget} [onError]
 * @property {Record<string, TransitionTarget>} [after]
 * @property {string[]} [entry]
 * @property {string[]} [exit]
 * @property {string[]} [tags]
 * @property {{ wayMachines?: string[] } & Record<string, unknown>} [meta]
 */

/**
 * @typedef {object} MachineDefinition
 * @property {string} description
 * @property {string} [category]
 * @property {string} initial
 * @property {Record<string, StateNode>} states
 */

/**
 * @typedef {object} YmaxSpec
 * @property {string} [version]
 * @property {Record<string, MachineDefinition>} machines
 */

/** @type {YmaxSpec} */
export const ymaxMachine = ${JSON.stringify(spec, null, 2)};

export default ymaxMachine;
`;
};

const formatWithPrettier = async (content: string) => {
  const config = await prettier.resolveConfig(OUTPUT_PATH);
  return prettier.format(content, { ...(config ?? {}), filepath: OUTPUT_PATH });
};

const ensureGenerated = async (content: string) => {
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  let existing: string | undefined;
  try {
    existing = await fs.readFile(OUTPUT_PATH, 'utf8');
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err;
  }

  if (checkMode) {
    if (existing !== content) {
      console.error(
        `Error: ${path.relative(process.cwd(), OUTPUT_PATH)} is out of date. Run 'yarn run -T tsx scripts/gen-ymax-machine.mts' to regenerate.`,
      );
      process.exitCode = 1;
    } else {
      console.log('✓ src/model/generated/ymax-machine.js is up to date');
    }
    return;
  }

  if (existing === content) {
    console.log('✓ src/model/generated/ymax-machine.js already up to date');
    return;
  }

  await fs.writeFile(OUTPUT_PATH, content, 'utf8');
  console.log(`✓ Wrote ${path.relative(process.cwd(), OUTPUT_PATH)}`);
};

const main = async () => {
  const spec = await loadYmaxSpec(DEFAULT_YMAX_MACHINE_PATH);
  await validateSpec(spec);
  const moduleBody = renderModule(spec);
  const formattedModule = await formatWithPrettier(moduleBody);
  await ensureGenerated(formattedModule);
};

main().catch(err => {
  console.error('Error:', err.message);
  process.exitCode = 1;
});
