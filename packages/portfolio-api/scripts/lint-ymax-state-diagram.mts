#!/usr/bin/env -S node --import ts-blank-space/register

/**
 * Linter to verify that the state machine definitions are valid.
 * - Validates YAML against schema
 * - Checks that all transitions target existing states
 * - Verifies wayMachines references exist
 */

import {
  ymaxMachine,
  type StateNode,
  type YmaxSpec,
} from '../src/model/generated/ymax-machine.js';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function log(color: string, message: string) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message: string) {
  log(colors.red, `❌ ERROR: ${message}`);
}

function warn(message: string) {
  log(colors.yellow, `⚠️  WARNING: ${message}`);
}

function success(message: string) {
  log(colors.green, `✓ ${message}`);
}

function info(message: string) {
  log(colors.blue, message);
}

// Get all state names in a machine (including nested states)
function getAllStateNames(
  states: Record<string, StateNode>,
  prefix = '',
): Set<string> {
  const names = new Set<string>();
  for (const [name, state] of Object.entries(states)) {
    names.add(name);
    if (state.states) {
      const nested = getAllStateNames(state.states, `${prefix}${name}.`);
      nested.forEach(n => names.add(n));
    }
  }
  return names;
}

// Validate transitions in a machine
function validateTransitions(
  machineName: string,
  states: Record<string, StateNode>,
  allStateNames: Set<string>,
  path: string[] = [],
): string[] {
  const issues: string[] = [];

  for (const [stateName, state] of Object.entries(states)) {
    const currentPath = [...path, stateName].join('.');

    if (state.on) {
      for (const [event, targets] of Object.entries(state.on)) {
        const targetList = Array.isArray(targets) ? targets : [targets];
        for (const t of targetList) {
          if (!allStateNames.has(t.target)) {
            issues.push(
              `[${machineName}] State "${currentPath}" has transition to unknown state "${t.target}" on event "${event}"`,
            );
          }
        }
      }
    }

    // Check nested states
    if (state.states) {
      // Verify initial state exists
      if (state.initial && !state.states[state.initial]) {
        issues.push(
          `[${machineName}] State "${currentPath}" has initial state "${state.initial}" that doesn't exist in nested states`,
        );
      }
      const nestedIssues = validateTransitions(
        machineName,
        state.states,
        allStateNames,
        [...path, stateName],
      );
      issues.push(...nestedIssues);
    }
  }

  return issues;
}

// Validate wayMachines references
function validateWayMachines(
  machineName: string,
  states: Record<string, StateNode>,
  allMachineNames: Set<string>,
  path: string[] = [],
): string[] {
  const issues: string[] = [];

  for (const [stateName, state] of Object.entries(states)) {
    const currentPath = [...path, stateName].join('.');

    if (state.meta?.wayMachines) {
      for (const wayMachine of state.meta.wayMachines) {
        if (!allMachineNames.has(wayMachine)) {
          issues.push(
            `[${machineName}] State "${currentPath}" references unknown wayMachine "${wayMachine}"`,
          );
        }
      }
    }

    if (state.states) {
      const nestedIssues = validateWayMachines(
        machineName,
        state.states,
        allMachineNames,
        [...path, stateName],
      );
      issues.push(...nestedIssues);
    }
  }

  return issues;
}

// Validate required fields
function validateRequiredFields(spec: YmaxSpec): string[] {
  const issues: string[] = [];

  if (!spec.machines) {
    issues.push('Spec must have "machines" property');
    return issues;
  }

  for (const [machineName, machine] of Object.entries(spec.machines)) {
    if (!machine.initial) {
      issues.push(`[${machineName}] Machine missing "initial" property`);
    }
    if (!machine.states) {
      issues.push(`[${machineName}] Machine missing "states" property`);
    }
    if (!machine.description) {
      issues.push(`[${machineName}] Machine missing "description" property`);
    }

    // Verify initial state exists
    if (machine.initial && machine.states && !machine.states[machine.initial]) {
      issues.push(
        `[${machineName}] Initial state "${machine.initial}" does not exist in states`,
      );
    }

    // Check that all states have descriptions
    if (machine.states) {
      validateStateDescriptions(machineName, machine.states, issues);
    }
  }

  return issues;
}

function validateStateDescriptions(
  machineName: string,
  states: Record<string, StateNode>,
  issues: string[],
  path: string[] = [],
) {
  for (const [stateName, state] of Object.entries(states)) {
    const currentPath = [...path, stateName].join('.');
    if (!state.description) {
      issues.push(
        `[${machineName}] State "${currentPath}" missing description`,
      );
    }
    if (state.states) {
      validateStateDescriptions(machineName, state.states, issues, [
        ...path,
        stateName,
      ]);
    }
  }
}

// Main validation function
function validateStateMachines() {
  info(`${colors.bold}Ymax State Machine Diagram Linter${colors.reset}`);
  info('='.repeat(50));
  info('');

  const spec: YmaxSpec = ymaxMachine;
  if (!spec?.machines) {
    throw new Error('Spec must have "machines" property');
  }

  let totalIssues = 0;

  // Validate required fields
  const requiredIssues = validateRequiredFields(spec);
  if (requiredIssues.length > 0) {
    requiredIssues.forEach(issue => error(issue));
    totalIssues += requiredIssues.length;
  } else {
    success('All required fields present');
  }

  if (!spec.machines) {
    process.exit(1);
  }

  const allMachineNames = new Set(Object.keys(spec.machines));
  info(
    `\nFound ${allMachineNames.size} machines: ${Array.from(allMachineNames).join(', ')}\n`,
  );

  // Validate each machine
  for (const [machineName, machine] of Object.entries(spec.machines)) {
    info(`Validating ${machineName}...`);

    if (!machine.states) continue;

    // Get all state names for this machine
    const stateNames = getAllStateNames(machine.states);

    // Validate transitions
    const transitionIssues = validateTransitions(
      machineName,
      machine.states,
      stateNames,
    );
    if (transitionIssues.length > 0) {
      transitionIssues.forEach(issue => error(issue));
      totalIssues += transitionIssues.length;
    } else {
      success(`  Transitions valid (${stateNames.size} states)`);
    }

    // Validate wayMachines references
    const wayMachineIssues = validateWayMachines(
      machineName,
      machine.states,
      allMachineNames,
    );
    if (wayMachineIssues.length > 0) {
      wayMachineIssues.forEach(issue => error(issue));
      totalIssues += wayMachineIssues.length;
    }

    // Check category
    if (machine.category && !['flow', 'step'].includes(machine.category)) {
      warn(
        `[${machineName}] Unknown category "${machine.category}" (expected "flow" or "step")`,
      );
    }
  }

  // Summary
  info('');
  info('='.repeat(50));
  if (totalIssues === 0) {
    success(
      `${colors.bold}✓ All checks passed! ${allMachineNames.size} machines validated.${colors.reset}`,
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
