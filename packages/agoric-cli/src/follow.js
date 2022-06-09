// @ts-check
import process from 'process';
import { Far, getInterfaceOf } from '@endo/marshal';
import { decodeToJustin } from '@endo/marshal/src/marshal-justin.js';

import {
  delay,
  iterateLatest,
  makeFollower,
  makeLeader,
  makeCastingSpec,
  exponentialBackoff,
  randomBackoff,
} from '@agoric/casting';

export default async function followerMain(progname, rawArgs, powers, opts) {
  const { anylogger } = powers;
  const console = anylogger('agoric:follower');

  const {
    integrity,
    output,
    bootstrap = 'http://localhost:26657',
    verbose,
    sleep,
    jitter,
  } = opts;

  /** @type {import('@agoric/casting').FollowerOptions} */
  const followerOptions = {
    integrity,
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
      followerOptions.decode = buf => buf;
      followerOptions.unserializer = null;
      formatOutput = buf =>
        buf.reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), '');
      break;
    }
    case 'text': {
      followerOptions.decode = buf => new TextDecoder().decode(buf);
      followerOptions.unserializer = null;
      formatOutput = buf => buf;
      break;
    }
    default: {
      console.error(`Unknown output format: ${output}`);
      return 1;
    }
  }

  if (integrity !== 'none') {
    followerOptions.crasher = Far('follower crasher', {
      crash: (...args) => {
        console.error(...args);
        console.warn(`You are running with '--integrity=${integrity}'`);
        console.warn(
          `If you trust your RPC nodes, you can turn off proofs with '--integrity=none'`,
        );
        process.exit(1);
      },
    });
  }

  // TODO: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
  /** @type {import('@agoric/casting').LeaderOptions} */
  const leaderOptions = {
    retryCallback: (where, e, attempt) => {
      const backoff = Math.ceil(exponentialBackoff(attempt));
      verbose &&
        console.warn(
          `Retrying ${where} in ${backoff}ms due to:`,
          e,
          Error(`attempt #${attempt}`),
        );
      return delay(backoff);
    },
    keepPolling: async where => {
      if (!sleep) {
        return true;
      }
      const backoff = Math.ceil(sleep * 1_000);
      verbose && console.warn(`Repeating ${where} after ${backoff}ms`);
      await delay(backoff);
      return true;
    },
    jitter: async where => {
      if (!jitter) {
        return undefined;
      }
      const backoff = Math.ceil(randomBackoff(jitter * 1_000));
      verbose && console.warn(`Jittering ${where} for ${backoff}ms`);
      return delay(backoff);
    },
  };

  const [_cmd, ...specs] = rawArgs;

  verbose && console.warn('Creating leader for', bootstrap);
  const leader = makeLeader(bootstrap, leaderOptions);
  await Promise.all(
    specs.map(async spec => {
      verbose && console.warn('Following', spec);
      const castingSpec = makeCastingSpec(spec);
      const follower = makeFollower(castingSpec, leader, followerOptions);
      for await (const { value } of iterateLatest(follower)) {
        process.stdout.write(`${formatOutput(value)}\n`);
      }
    }),
  );
  return 0;
}
