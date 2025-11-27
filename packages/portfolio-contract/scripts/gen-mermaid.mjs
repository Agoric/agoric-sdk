#!/usr/bin/env node
// Generate a Mermaid state diagram from ymax-machine.yaml
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultSpecPath = path.resolve(here, '../ymax-machine.yaml');

const specPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : defaultSpecPath;

const readYaml = async file => {
  const text = await fs.readFile(file, 'utf8');
  return yaml.load(text);
};

const sanitizeText = str =>
  String(str)
    .replace(/[{}]/g, match => (match === '{' ? '(' : ')'))
    .replace(/;/g, ',')
    .replace(/"/g, "'")
    .replace(/\n/g, '\\n');

const labelFor = (name, description) => {
  if (!description) return name;
  const body = sanitizeText(description).replace(/\\n/g, '<br/>');
  return `"${sanitizeText(name)}<br/>${body}"`;
};

const listifyTransitions = target => {
  if (Array.isArray(target)) return target;
  return [target];
};

const renderTransitions = (lines, stateName, node, indent) => {
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

const renderStates = (lines, states, indent = '', isRoot = false, initial) => {
  if (isRoot && initial) {
    lines.push(`${indent}[*] --> ${initial}`);
  }

  for (const [name, node] of Object.entries(states)) {
    const hasChildren = node.states && Object.keys(node.states).length > 0;
    const type = node.type || (hasChildren ? 'compound' : 'atomic');
    const indent2 = `${indent}  `;

    if (hasChildren) {
      const display = labelFor(name, node.description);
      lines.push(`${indent}state ${display} as ${name} {`);
      if (node.initial) {
        lines.push(`${indent2}[*] --> ${node.initial}`);
      }
      renderStates(lines, node.states, indent2, false, node.initial);
      lines.push(`${indent}}`);
      renderTransitions(lines, name, node, indent);
    } else {
      const display = labelFor(name, node.description);
      lines.push(`${indent}state ${display} as ${name}`);
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
  process.stdout.write(`${lines.join('\n')}\n`);
};

main().catch(err => {
  console.error('Failed to generate Mermaid diagram:', err);
  process.exitCode = 1;
});
