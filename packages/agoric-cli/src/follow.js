// @ts-check
import process from 'process';
import { Far, getInterfaceOf } from '@endo/marshal';
import { decodeToJustin } from '@endo/marshal/src/marshal-justin.js';
import { assert, details as X } from '@agoric/assert';

import {
  DEFAULT_KEEP_POLLING_SECONDS,
  DEFAULT_JITTER_SECONDS,
  iterateLatest,
  makeCastingSpec,
  iterateEach,
  makeFollower,
  makeLeader,
} from '@agoric/casting';
import { Command } from 'commander';
import { makeLeaderOptions } from './lib/casting.js';

export const createFollowCommand = () =>
  new Command('follow')
    .description('follow an Agoric Casting leader')
    .arguments('<path-spec...>')
    .option(
      '--proof <strict | optimistic | none>',
      'set proof mode',
      value => {
        assert(
          ['strict', 'optimistic', 'none'].includes(value),
          X`--proof must be one of 'strict', 'optimistic', or 'none'`,
          TypeError,
        );
        return value;
      },
      'optimistic',
    )
    .option(
      '--sleep <seconds>',
      'sleep <seconds> between polling (may be fractional)',
      value => {
        const num = Number(value);
        assert.equal(`${num}`, value, X`--sleep must be a number`, TypeError);
        return num;
      },
      DEFAULT_KEEP_POLLING_SECONDS,
    )
    .option(
      '--jitter <max-seconds>',
      'jitter up to <max-seconds> (may be fractional)',
      value => {
        const num = Number(value);
        assert.equal(`${num}`, value, X`--jitter must be a number`, TypeError);
        return num;
      },
      DEFAULT_JITTER_SECONDS,
    )
    .option(
      '-o, --output <format>',
      'value output format',
      value => {
        assert(
          [
            'hex',
            'justin',
            'justinlines',
            'json',
            'jsonlines',
            'text',
          ].includes(value),
          X`--output must be one of 'hex', 'justin', 'justinlines', 'json', 'jsonlines', or 'text'`,
          TypeError,
        );
        return value;
      },
      'justin',
    )
    .option(
      '-l, --lossy',
      'show only the most recent value for each sample interval',
    )
    .option(
      '-b, --block-height',
      'show first block height when each value was stored',
    )
    .option(
      '-c, --current-block-height',
      'show current block height when each value is reported',
    )
    .option('-B, --bootstrap <config>', 'network bootstrap configuration');

export default async function followerMain(progname, rawArgs, powers, opts) {
  const { anylogger } = powers;
  const console = anylogger('agoric:follower');

  const {
    proof,
    output,
    bootstrap = 'http://localhost:26657',
    verbose,
    sleep,
    jitter,
  } = opts;

  /** @type {import('@agoric/casting').FollowerOptions} */
  const followerOptions = {
    proof,
  };

  /** @type {(buf: any) => any} */
  let formatOutput;
  switch (output) {
    case 'justinlines':
    case 'justin': {
      followerOptions.unserializer = null;
      const pretty = !output.endsWith('lines');
      formatOutput = ({ body, slots }) => {
        const encoded = JSON.parse(body);
        // @ts-expect-error Expected 1-2 arguments, but got 3.
        return decodeToJustin(encoded, pretty, slots);
      };
      break;
    }
    case 'jsonlines':
    case 'json': {
      const spaces = output.endsWith('lines') ? undefined : 2;
      const replacer = (_, arg) => {
        if (typeof arg === 'bigint') {
          return `${arg}`;
        }
        const iface = getInterfaceOf(arg);
        if (iface) {
          return `[${iface} ${JSON.stringify({ ...arg }, replacer)}]`;
        }
        return arg;
      };
      formatOutput = obj => JSON.stringify(obj, replacer, spaces);
      break;
    }
    case 'hex': {
      // Dump as hex strings.
      followerOptions.decode = str => new TextEncoder().encode(str);
      followerOptions.unserializer = null;
      formatOutput = buf =>
        buf.reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), '');
      break;
    }
    case 'text': {
      followerOptions.decode = str => str;
      followerOptions.unserializer = null;
      formatOutput = buf => buf;
      break;
    }
    default: {
      console.error(`Unknown output format: ${output}`);
      return 1;
    }
  }

  if (proof !== 'none') {
    followerOptions.crasher = Far('follower crasher', {
      crash: (...args) => {
        console.error(...args);
        console.warn(`You are running with '--proof=${proof}'`);
        console.warn(
          `If you trust your RPC nodes, you can turn off proofs with '--proof=none'`,
        );
        process.exit(1);
      },
    });
  }

  const leaderOptions = makeLeaderOptions({
    sleep,
    jitter,
    log: verbose ? console.warn : () => undefined,
  });

  const [_cmd, ...specs] = rawArgs;

  verbose && console.warn('Creating leader for', bootstrap);
  const leader = makeLeader(bootstrap, leaderOptions);
  const iterate = opts.lossy ? iterateLatest : iterateEach;
  await Promise.all(
    specs.map(async spec => {
      verbose && console.warn('Following', spec);
      const castingSpec = makeCastingSpec(spec);
      const follower = makeFollower(castingSpec, leader, followerOptions);
      for await (const { value, blockHeight, currentBlockHeight } of iterate(
        follower,
      )) {
        const blockHeightPrefix = opts.blockHeight ? `${blockHeight}:` : '';
        const currentBlockHeightPrefix = opts.currentBlockHeight
          ? `${currentBlockHeight}:`
          : '';
        process.stdout.write(
          `${blockHeightPrefix}${currentBlockHeightPrefix}${formatOutput(
            value,
          )}\n`,
        );
      }
    }),
  );
  return 0;
}
