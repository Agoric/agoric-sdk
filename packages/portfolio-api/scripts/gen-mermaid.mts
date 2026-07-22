#!/usr/bin/env -S node --import ts-blank-space/register
// Generate Mermaid state diagrams from the generated Ymax machine model.
// Outputs separate .mmd files for each machine in the spec.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
import {
  ymaxMachine,
  type MachineDefinition,
  type StateNode,
  type TransitionTarget,
  type YmaxSpec,
} from '../src/model/generated/ymax-machine.js';

const outputDir = '../docs';

const thisFile = fileURLToPath(import.meta.url);
const here = path.dirname(thisFile);
const outputPath = path.resolve(here, outputDir);

const args = process.argv.slice(2);
const checkMode = args.includes('--check');

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

const listifyTransitions = (target: unknown): TransitionTarget[] => {
  if (Array.isArray(target)) return target;
  return [target as TransitionTarget];
};

const renderTransitions = (
  lines: string[],
  stateName: string,
  node: StateNode,
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
  states: Record<string, StateNode>,
  indent = '',
  isRoot = false,
  initial?: string,
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
      renderStates(lines, node.states!, indent2, false, node.initial);
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

const generateMermaidForMachine = (machine: MachineDefinition): string => {
  const lines = ['stateDiagram-v2'];
  renderStates(lines, machine.states, '', true, machine.initial);
  return `${lines.join('\n')}\n`;
};

const main = async () => {
  const spec: YmaxSpec = ymaxMachine;

  if (!spec?.machines) {
    throw new Error('Spec must have "machines" property');
  }

  const machineNames = Object.keys(spec.machines);
  console.log(
    `Found ${machineNames.length} machines: ${machineNames.join(', ')}`,
  );

  let hasErrors = false;

  for (const [machineName, machine] of Object.entries(spec.machines)) {
    if (!machine.states || !machine.initial) {
      console.error(
        `Machine "${machineName}" must have "states" and "initial"`,
      );
      hasErrors = true;
      continue;
    }

    const generatedContent = generateMermaidForMachine(machine);
    const machineOutputPath = path.resolve(
      outputPath,
      `ymax-machine-${machineName}.mmd`,
    );

    if (checkMode) {
      try {
        const existingContent = await fs.readFile(machineOutputPath, 'utf8');
        if (existingContent !== generatedContent) {
          console.error(
            `Error: ${machineOutputPath} is out of date. Run '${path.relative(process.cwd(), thisFile)}' to update.`,
          );
          hasErrors = true;
        } else {
          console.log(`✓ ${machineName} is up to date`);
        }
      } catch (err) {
        console.error(
          `Error: ${machineOutputPath} does not exist. Run '${path.relative(process.cwd(), thisFile)}' to create it.`,
        );
        hasErrors = true;
      }
    } else {
      await fs.writeFile(machineOutputPath, generatedContent, 'utf8');
      console.log(`Generated ${machineOutputPath}`);
    }
  }

  // Also generate a combined index file listing all machines
  if (!checkMode) {
    const indexContent = generateIndexFile(spec);
    const indexPath = path.resolve(outputPath, 'ymax-machine.mmd');
    await fs.writeFile(indexPath, indexContent, 'utf8');
    console.log(`Generated ${indexPath} (main flow)`);
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
};

const generateIndexFile = (spec: YmaxSpec): string => {
  // Generate the main flow machine as the default .mmd file
  const mainMachine = spec.machines['YmaxFlow'];
  if (!mainMachine) {
    throw new Error('Main machine "YmaxFlow" not found');
  }
  return generateMermaidForMachine(mainMachine);
};

main().catch(err => {
  console.error('Failed to generate Mermaid diagrams:', err);
  process.exitCode = 1;
});
