import makeScratchPad from '@agoric/internal/src/scratch.js';
import { makeScriptLoader } from './scripts.js';

export default async function runMain(progname, rawArgs, powers, opts) {
  const { anylogger, fs, now } = powers;
  const console = anylogger('agoric:run');

  const endowments = {
    now,
    scriptArgs: opts.scriptArgs,
  };
  const script = rawArgs[1];
  const runScript = makeScriptLoader(
    [script],
    { progname, rawArgs: [script, ...opts.scriptArgs], endowments },
    { fs, console },
  );
  const homeP = Promise.resolve({ scratch: Promise.resolve(makeScratchPad()) });
  return runScript({ home: homeP });
}
