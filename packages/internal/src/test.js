/**
 * @file Executable example: convert legacy console output into JSON Lines.
 *
 * This demonstrates the least-invasive migration path for a Node.js program
 * that already writes human-oriented data to `console.*`:
 * 1. Import `patchConsole` before the program emits logs.
 * 2. Import the JSONL anylogger adapter and create a named logger.
 * 3. Replace `globalThis.console` with a wrapped console.
 * 4. Let Node's own console implementation render the original arguments.
 * 5. Intercept the written chunks, join them into one message string, and
 *    forward that message to `logger[level](message)`.
 * 6. Restore the original console when interception is no longer needed.
 *
 * This produces structured JSONL envelopes around rendered console messages.
 * It does not preserve the original argument structure as separate JSON
 * fields. If richer structured logs are required, prefer replacing call sites
 * with direct structured logger calls instead of relying on console capture.
 */
import patchConsole from './node/patch-console.js';
import '@endo/init';

// import anylogger from './anylogger-tracer.js';
import anylogger from './anylogger-jsonl.js';

const log = anylogger('test', { enable: 'verbose' });

const restoreConsole = patchConsole((level, written) => {
  if (!log.enabledFor(level)) {
    return;
  }
  const message = written.join('').trimEnd();
  log[level](message);
}, console);

console.info('hello,', 'world!', 'at:', Error('here'));
console.log('goodbye,', 'friend');
console.debug('Exiting...');
restoreConsole?.();
