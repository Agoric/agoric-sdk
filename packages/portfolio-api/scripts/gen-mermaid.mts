#!/usr/bin/env -S node --import ts-blank-space/register
// Generate a Mermaid state diagram from ymax-machine.yaml
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import type { PathLike } from 'fs';
import assert from 'node:assert';

const input = '../docs/ymax-machine.yaml';
const output = '../docs/ymax-machine.mmd';

const thisFile = fileURLToPath(import.meta.url);
const here = path.dirname(thisFile);
const defaultSpecPath = path.resolve(here, input);
const outputPath = path.resolve(here, output);

const args = process.argv.slice(2);
const checkMode = args.includes('--check');
const specPath = args.find(arg => !arg.startsWith('--'))
  ? path.resolve(process.cwd(), args.find(arg => !arg.startsWith('--'))!)
  : defaultSpecPath;

const readYaml = async (file: PathLike | fs.FileHandle) => {
  const text = await fs.readFile(file, 'utf8');
  return yaml.load(text) as any;
};

const sanitizeText = (str: unknown) =>
  String(str)
    .replace(/[{}]/g, match => (match === '{' ? '(' : ')'))
    .replace(/;/g, ',')
    .replace(/"/g, "'")
    .replace(/\n/g, '\\n');

const addNote = (
  lines: string[],
  indent: string,
  stateName: string,
  description?: string,
) => {
  if (!description) return;
  const body = sanitizeText(description).replace(/\\n/g, '<br/>');
  lines.push(`${indent}note right of ${stateName}`);
  lines.push(`${indent}  ${body}`);
  lines.push(`${indent}end note`);
};

const listifyTransitions = (target: unknown) => {
  if (Array.isArray(target)) return target;
  return [target];
};

const renderTransitions = (
  lines: string[],
  stateName: string,
  node: any,
  indent: string,
) => {
  if (node.on) {
    for (const [event, targets] of Object.entries(node.on)) {
      for (const t of listifyTransitions(targets)) {
        const label = sanitizeText(t.description ?? event);
        lines.push(`${indent}${stateName} --> ${t.target}: ${label}`);
      }
    }
  }
  if (node.after) {
    for (const [delay, t] of Object.entries(node.after)) {
      for (const target of listifyTransitions(t)) {
        const label = sanitizeText(target.description ?? `after ${delay}`);
        lines.push(`${indent}${stateName} --> ${target.target}: ${label}`);
      }
    }
  }
};

const renderStates = (
  lines: string[],
  states: { [s: string]: any } | ArrayLike<any>,
  indent = '',
  isRoot = false,
  initial: any,
) => {
  if (isRoot && initial) {
    lines.push(`${indent}[*] --> ${initial}`);
  }

  for (const [name, node] of Object.entries(states)) {
    const hasChildren = node.states && Object.keys(node.states).length > 0;
    const type = node.type || (hasChildren ? 'compound' : 'atomic');
    const indent2 = `${indent}  `;

    if (hasChildren) {
      assert.equal(
        name,
        sanitizeText(name),
        `State name "${name}" has invalid characters`,
      );
      lines.push(`${indent}state ${name} {`);
      if (node.initial) {
        lines.push(`${indent2}[*] --> ${node.initial}`);
      }
      renderStates(lines, node.states, indent2, false, node.initial);
      lines.push(`${indent}}`);
      addNote(lines, indent, name, node.description);
      renderTransitions(lines, name, node, indent);
    } else {
      assert.equal(
        name,
        sanitizeText(name),
        `State name "${name}" has invalid characters`,
      );
      lines.push(`${indent}state ${name}`);
      addNote(lines, indent, name, node.description);
      if (type === 'final') {
        lines.push(`${indent}${name} --> [*]`);
      }
      renderTransitions(lines, name, node, indent);
    }
  }
};

const main = async () => {
  const spec = await readYaml(specPath);
  if (!spec?.states || !spec.initial) {
    throw new Error('Spec must have "states" and "initial"');
  }
  const lines = ['stateDiagram-v2'];
  renderStates(lines, spec.states, '', true, spec.initial);
  const generatedContent = `${lines.join('\n')}\n`;

  if (checkMode) {
    try {
      const existingContent = await fs.readFile(outputPath, 'utf8');
      if (existingContent !== generatedContent) {
        console.error(
          `Error: ${outputPath} is out of date. Run '${path.relative(process.cwd(), thisFile)}' to update.`,
        );
        process.exitCode = 1;
      }
    } catch (err) {
      console.error(
        `Error: ${outputPath} does not exist. Run '${path.relative(process.cwd(), thisFile)}' to create it.`,
      );
      process.exitCode = 1;
    }
  } else {
    await fs.writeFile(outputPath, generatedContent, 'utf8');
    console.log(`Generated ${outputPath}`);
  }
};

main().catch(err => {
  console.error('Failed to generate Mermaid diagram:', err);
  process.exitCode = 1;
});
