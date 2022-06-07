// @ts-check
import process from 'process';
import { Far } from '@endo/marshal';
import { decodeToJustin } from '@endo/marshal/src/marshal-justin.js';

import {
  delay,
  iterateLatest,
  makeFollower,
  makeLeader,
  makeCastingSpec,
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
      formatOutput = ({ body }) => {
        const encoded = JSON.parse(body);
        return decodeToJustin(encoded, pretty);
      };
      break;
    }
    case 'jsonlines':
    case 'json': {
      const spaces = output.endsWith('lines') ? undefined : 2;
      const bigintToStringReplacer = (_, arg) => {
        if (typeof arg === 'bigint') {
          return `${arg}`;
        }
        return arg;
      };
      formatOutput = obj => JSON.stringify(obj, bigintToStringReplacer, spaces);
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
    retryCallback: (e, _attempt) => {
      verbose && console.warn('Retrying due to:', e);
      return delay(1000 + Math.random() * 1000);
    },
    keepPolling: async () => {
      let toSleep = sleep * 1000;
      if (toSleep <= 0) {
        toSleep = (5 + Math.random()) * 1000;
      }
      await delay(toSleep);
      return true;
    },
  };

  const [_cmd, ...specs] = rawArgs;

  verbose && console.warn('Creating leader for', bootstrap);
  const leader = makeLeader(bootstrap, leaderOptions);
  await Promise.all(
    specs.map(async spec => {
      verbose && console.warn('Following', spec);
      const castingSpec = makeCastingSpec(spec);
      const follower = makeFollower(leader, castingSpec, followerOptions);
      for await (const { value } of iterateLatest(follower)) {
        process.stdout.write(`${formatOutput(value)}\n`);
      }
    }),
  );
  return 0;
}
