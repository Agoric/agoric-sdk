/**
 * @file cosmic-swingset anylogger adapter.
 *
 * Use this module for cosmic-swingset/runtime logging, where output is consumed
 * as service logs rather than interactive CLI output.
 *
 * Runtime-focused behavior:
 * - Reads `DEBUG` selectors (`agoric`, `agoric:<level>`, `agoric:none`).
 * - Adds ISO timestamps and stable labels to emitted messages.
 * - Suppresses high-volume vat/liveslots logs unless explicitly selected.
 *
 * Why this file exists alongside `packages/agoric-cli/src/anylogger-agoric.js`:
 * - This adapter enforces production/runtime log policy.
 * - The CLI adapter is tuned for terminal UX (e.g., colored prefixes) and does
 *   not apply cosmic-swingset suppression semantics.
 */
/* eslint-env node */
import anylogger from '@agoric/internal/vendor/anylogger.js';
import { parseDebugEnv } from '@agoric/internal/src/debug-env.js';
import { defineName } from '@agoric/internal/src/js-utils.js';

/** @import {BaseLevels} from '@agoric/internal/vendor/anylogger.js'; */
/** @typedef {keyof BaseLevels} LogLevel; */

const { enabledFor, isSuppressedLogger } = parseDebugEnv(anylogger.levels);

const oldExt = anylogger.ext;
anylogger.ext = logger => {
  const extended = oldExt(logger);

  extended.enabledFor = enabledFor;

  const label = extended.name.replaceAll(':', ': ');
  const fallbackSink = console.log.bind(console);

  const suppressed = isSuppressedLogger(extended.name);

  const levels = /** @type {LogLevel[]} */ (Object.keys(anylogger.levels));
  for (const level of levels) {
    const impl =
      (typeof console[level] === 'function' && console[level].bind(console)) ||
      fallbackSink;
    const disabled = suppressed || !enabledFor(level);
    extended[level] = disabled
      ? defineName(`dummy ${level}`, () => {})
      : defineName(level, (...args) => {
          // Prepend a timestamp and label.
          const timestamp = new Date().toISOString();
          impl(`${timestamp} ${label}:`, ...args);
        });
  }
  return extended;
};
