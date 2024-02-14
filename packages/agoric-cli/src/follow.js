// @ts-check
import process from 'process';
import {
  Far,
  getInterfaceOf,
  decodeToJustin,
  makeMarshal,
} from '@endo/marshal';

import {
  iterateLatest,
  makeCastingSpec,
  iterateEach,
  makeFollower,
  makeLeader,
} from '@agoric/casting';
import { makeLeaderOptions } from './lib/casting.js';

const makeCapDataToQclass = () => {
  const valToSlot = new WeakMap();
  const slotToVal = new Map();
  const convertValToSlot = val => {
    return valToSlot.get(val);
  };
  const convertSlotToVal = (slot, iface) => {
    if (slotToVal.has(slot)) {
      return slotToVal.get(slot);
    }
    const debugName = iface.startsWith('Alleged: ')
      ? iface.slice('Alleged: '.length)
      : iface;
    const remotable = Far(debugName, {});

    valToSlot.set(remotable, slot);
    slotToVal.set(slot, remotable);
    return remotable;
  };
  const { toCapData, fromCapData } = makeMarshal(
    convertValToSlot,
    convertSlotToVal,
  );
  const capDataToQclass = capdata => toCapData(fromCapData(capdata));
  return capDataToQclass;
};

export default async function followerMain(progname, rawArgs, powers, opts) {
  const { anylogger } = powers;
  const console = anylogger('agoric:follower');

  const {
    firstValueOnly,
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
      const capDataToQclass = makeCapDataToQclass();
      followerOptions.unserializer = null;
      const pretty = !output.endsWith('lines');
      formatOutput = capdata => {
        const { body, slots } = capDataToQclass(capdata);
        const encoded = JSON.parse(body);
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
      for await (const obj of iterate(follower)) {
        if ('error' in obj) {
          console.error('Error following:', obj.error);
          continue;
        }
        const { value, blockHeight, currentBlockHeight } = obj;
        const blockHeightPrefix = opts.blockHeight ? `${blockHeight}:` : '';
        const currentBlockHeightPrefix = opts.currentBlockHeight
          ? `${currentBlockHeight}:`
          : '';
        process.stdout.write(
          `${blockHeightPrefix}${currentBlockHeightPrefix}${formatOutput(
            value,
          )}\n`,
        );
        if (firstValueOnly) {
          return;
        }
      }
    }),
  );
  return 0;
}
