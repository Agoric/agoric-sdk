import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TransitionTarget {
  target: string;
  description?: string;
}

export interface StateNode {
  description: string;
  type?: string;
  initial?: string;
  states?: Record<string, StateNode>;
  on?: Record<string, TransitionTarget | TransitionTarget[]>;
  onDone?: TransitionTarget;
  onError?: TransitionTarget;
  after?: Record<string, TransitionTarget>;
  entry?: string[];
  exit?: string[];
  tags?: string[];
  meta?: {
    wayMachines?: string[];
    [key: string]: unknown;
  };
}

export interface MachineDefinition {
  description: string;
  category?: string;
  initial: string;
  states: Record<string, StateNode>;
}

export interface YmaxSpec {
  version?: string;
  machines: Record<string, MachineDefinition>;
}

export const DEFAULT_YMAX_MACHINE_PATH = path.resolve(
  __dirname,
  '../src/model/ymax-machine.yaml',
);

export const DEFAULT_YMAX_SCHEMA_PATH = path.resolve(
  __dirname,
  '../src/model/ymax-machine.schema.json',
);

export const parseYmaxSpec = (yamlContent: string): YmaxSpec =>
  yaml.load(yamlContent) as YmaxSpec;

export const loadYmaxSpecSync = (
  yamlPath: string = DEFAULT_YMAX_MACHINE_PATH,
): YmaxSpec => {
  const yamlContent = fs.readFileSync(yamlPath, 'utf8');
  return parseYmaxSpec(yamlContent);
};

export const loadYmaxSpec = async (
  yamlPath: string = DEFAULT_YMAX_MACHINE_PATH,
): Promise<YmaxSpec> => {
  const yamlContent = await fsp.readFile(yamlPath, 'utf8');
  return parseYmaxSpec(yamlContent);
};

export const loadYmaxSchema = async (schemaPath = DEFAULT_YMAX_SCHEMA_PATH) =>
  JSON.parse(await fsp.readFile(schemaPath, 'utf8'));
