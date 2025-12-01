#!/usr/bin/env -S node --import ts-blank-space/register

/**
 * Linter to verify that the state machine definition in ymax-visualizer.html
 * matches the canonical definition in ymax-machine.yaml
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const YAML_PATH = path.join(__dirname, '../docs/ymax-machine.yaml');
const HTML_PATH = path.join(__dirname, '../docs/ymax-visualizer.html');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  log(colors.red, `❌ ERROR: ${message}`);
}

function warn(message) {
  log(colors.yellow, `⚠️  WARNING: ${message}`);
}

function success(message) {
  log(colors.green, `✓ ${message}`);
}

function info(message) {
  log(colors.blue, message);
}

// Parse YAML state machine
function parseYamlStateMachine() {
  try {
    const yamlContent = fs.readFileSync(YAML_PATH, 'utf8');
    const doc = yaml.load(yamlContent);
    return doc;
  } catch (err) {
    error(`Failed to parse YAML file: ${err.message}`);
    process.exit(1);
  }
}

// Extract state machine definition from HTML
function extractHtmlStateMachine() {
  try {
    const htmlContent = fs.readFileSync(HTML_PATH, 'utf8');

    // Find the stateMachine definition in the script
    const stateMachineMatch = htmlContent.match(
      /const stateMachine = ({[\s\S]*?});[\s\n]*\/\/ Layout configuration/,
    );

    if (!stateMachineMatch) {
      error('Could not find stateMachine definition in HTML file');
      process.exit(1);
    }

    // Find the stateGroups definition
    const stateGroupsMatch = htmlContent.match(
      /const stateGroups = (\[[\s\S]*?\]);[\s\n]*\/\/ Parse state vector/,
    );

    // Use eval to parse the objects (in Node.js context, this is safe for our controlled input)
    const stateMachineCode = stateMachineMatch[1];
    const stateMachine = eval(`(${stateMachineCode})`);

    if (stateGroupsMatch) {
      const stateGroupsCode = stateGroupsMatch[1];
      stateMachine.stateGroups = eval(`(${stateGroupsCode})`);
    }

    return stateMachine;
  } catch (err) {
    error(`Failed to extract state machine from HTML: ${err.message}`);
    process.exit(1);
  }
}

// Normalize state data for comparison
function normalizeYamlState(yamlState, stateName) {
  return {
    name: stateName,
    description: yamlState.description || '',
    transitions: Object.entries(yamlState.on || {}).map(([event, trans]) => ({
      event,
      target: trans.target,
      description: trans.description || '',
    })),
    meta: yamlState.meta || {},
    row: yamlState.meta?.row || null,
    final: yamlState.type === 'final',
    nested: !!yamlState.states,
    substates: yamlState.states || null,
  };
}

function normalizeHtmlState(
  htmlState,
  stateName,
  htmlStateMachine,
  parentRow = null,
) {
  // Find row from stateGroups definition in HTML
  let row = null;
  if (htmlStateMachine.stateGroups) {
    for (const group of htmlStateMachine.stateGroups) {
      if (group.states.includes(stateName)) {
        row = group.name;
        break;
      }
    }
  }

  // If no row found and parent row provided (for nested states), use parent's row
  if (!row && parentRow) {
    row = parentRow;
  }

  return {
    name: stateName,
    description: htmlState.description || '',
    transitions: Object.entries(htmlState.transitions || {}).map(
      ([event, trans]) => ({
        event,
        target: trans.target,
        description: trans.description || '',
      }),
    ),
    meta: htmlState.meta || {},
    row: row,
    final: htmlState.final || false,
    nested: htmlState.nested || false,
    substates: htmlState.substates || null,
  };
}

// Compare two state definitions
function compareStates(yamlState, htmlState, statePath) {
  let issues = [];

  // Check description
  if (yamlState.description !== htmlState.description) {
    issues.push({
      type: 'description',
      path: statePath,
      yaml: yamlState.description,
      html: htmlState.description,
    });
  }

  // Check transitions
  const yamlTransitions = new Map(yamlState.transitions.map(t => [t.event, t]));
  const htmlTransitions = new Map(htmlState.transitions.map(t => [t.event, t]));

  // Check for missing or extra transitions
  for (const [event, trans] of yamlTransitions) {
    if (!htmlTransitions.has(event)) {
      issues.push({
        type: 'missing_transition',
        path: statePath,
        event,
        target: trans.target,
      });
    } else {
      const htmlTrans = htmlTransitions.get(event);
      if (trans.target !== htmlTrans.target) {
        issues.push({
          type: 'transition_target_mismatch',
          path: statePath,
          event,
          yamlTarget: trans.target,
          htmlTarget: htmlTrans.target,
        });
      }
      if (trans.description !== htmlTrans.description) {
        issues.push({
          type: 'transition_description_mismatch',
          path: statePath,
          event,
          yaml: trans.description,
          html: htmlTrans.description,
        });
      }
    }
  }

  for (const event of htmlTransitions.keys()) {
    if (!yamlTransitions.has(event)) {
      issues.push({
        type: 'extra_transition',
        path: statePath,
        event,
      });
    }
  }

  // Check final state flag
  if (yamlState.final !== htmlState.final) {
    issues.push({
      type: 'final_flag_mismatch',
      path: statePath,
      yaml: yamlState.final,
      html: htmlState.final,
    });
  }

  // Check nested state flag
  if (yamlState.nested !== htmlState.nested) {
    issues.push({
      type: 'nested_flag_mismatch',
      path: statePath,
      yaml: yamlState.nested,
      html: htmlState.nested,
    });
  }

  // Check row metadata
  if (yamlState.row !== htmlState.row) {
    issues.push({
      type: 'row_mismatch',
      path: statePath,
      yaml: yamlState.row,
      html: htmlState.row,
    });
  }

  return issues;
}

// Main validation function
function validateStateMachines() {
  info(`${colors.bold}Ymax State Machine Diagram Linter${colors.reset}`);
  info('='.repeat(50));
  info('');

  const yamlDoc = parseYamlStateMachine();
  const htmlStateMachine = extractHtmlStateMachine();

  let totalIssues = 0;

  // Check initial state
  if (yamlDoc.initial !== htmlStateMachine.initial) {
    error(
      `Initial state mismatch: YAML="${yamlDoc.initial}" vs HTML="${htmlStateMachine.initial}"`,
    );
    totalIssues++;
  } else {
    success(`Initial state matches: ${yamlDoc.initial}`);
  }

  // Check all states exist
  const yamlStates = new Set(Object.keys(yamlDoc.states));
  const htmlStates = new Set(Object.keys(htmlStateMachine.states));

  // Check for states in YAML but not in HTML (excluding flow_registered which is added in HTML)
  for (const stateName of yamlStates) {
    if (!htmlStates.has(stateName)) {
      error(`State "${stateName}" exists in YAML but not in HTML`);
      totalIssues++;
    }
  }

  // Check for states in HTML but not in YAML (allow flow_registered as it's an intermediate state)
  const allowedExtraStates = new Set(['flow_registered']);
  for (const stateName of htmlStates) {
    if (!yamlStates.has(stateName) && !allowedExtraStates.has(stateName)) {
      warn(`State "${stateName}" exists in HTML but not in YAML`);
    }
  }

  // Compare each state
  for (const stateName of yamlStates) {
    if (!htmlStates.has(stateName)) continue;

    const yamlState = normalizeYamlState(yamlDoc.states[stateName], stateName);
    const htmlState = normalizeHtmlState(
      htmlStateMachine.states[stateName],
      stateName,
      htmlStateMachine,
    );

    const issues = compareStates(yamlState, htmlState, stateName);

    if (issues.length > 0) {
      error(`\nState "${stateName}" has ${issues.length} issue(s):`);
      issues.forEach(issue => {
        switch (issue.type) {
          case 'description':
            console.log(`  - Description mismatch`);
            console.log(`    YAML: "${issue.yaml}"`);
            console.log(`    HTML: "${issue.html}"`);
            break;
          case 'missing_transition':
            console.log(
              `  - Missing transition: ${issue.event} -> ${issue.target}`,
            );
            break;
          case 'extra_transition':
            console.log(`  - Extra transition in HTML: ${issue.event}`);
            break;
          case 'transition_target_mismatch':
            console.log(
              `  - Transition ${issue.event} target mismatch: YAML="${issue.yamlTarget}" vs HTML="${issue.htmlTarget}"`,
            );
            break;
          case 'transition_description_mismatch':
            console.log(`  - Transition ${issue.event} description mismatch`);
            console.log(`    YAML: "${issue.yaml}"`);
            console.log(`    HTML: "${issue.html}"`);
            break;
          case 'final_flag_mismatch':
            console.log(
              `  - Final flag mismatch: YAML=${issue.yaml} vs HTML=${issue.html}`,
            );
            break;
          case 'nested_flag_mismatch':
            console.log(
              `  - Nested flag mismatch: YAML=${issue.yaml} vs HTML=${issue.html}`,
            );
            break;
          case 'row_mismatch':
            console.log(
              `  - Row metadata mismatch: YAML="${issue.yaml}" vs HTML="${issue.html}"`,
            );
            break;
        }
      });
      totalIssues += issues.length;
    } else {
      success(`State "${stateName}" matches`);
    }

    // Check nested states if present
    if (yamlState.substates && htmlState.substates) {
      for (const substateName of Object.keys(yamlState.substates)) {
        if (!htmlState.substates[substateName]) {
          error(
            `Substate "${stateName}.${substateName}" exists in YAML but not in HTML`,
          );
          totalIssues++;
          continue;
        }

        const yamlSubstate = normalizeYamlState(
          yamlState.substates[substateName],
          substateName,
        );
        const htmlSubstate = normalizeHtmlState(
          htmlState.substates[substateName],
          substateName,
          htmlStateMachine,
          htmlState.row,
        );

        const substateIssues = compareStates(
          yamlSubstate,
          htmlSubstate,
          `${stateName}.${substateName}`,
        );

        if (substateIssues.length > 0) {
          error(
            `\nSubstate "${stateName}.${substateName}" has ${substateIssues.length} issue(s):`,
          );
          substateIssues.forEach(issue => {
            console.log(`  - ${issue.type}: ${JSON.stringify(issue)}`);
          });
          totalIssues += substateIssues.length;
        } else {
          success(`Substate "${stateName}.${substateName}" matches`);
        }
      }
    }
  }

  // Summary
  info('');
  info('='.repeat(50));
  if (totalIssues === 0) {
    success(
      `${colors.bold}✓ All checks passed! The HTML state machine matches the YAML definition.${colors.reset}`,
    );
    process.exit(0);
  } else {
    error(
      `${colors.bold}Found ${totalIssues} issue(s). Please fix them.${colors.reset}`,
    );
    process.exit(1);
  }
}

// Run the linter
validateStateMachines();
