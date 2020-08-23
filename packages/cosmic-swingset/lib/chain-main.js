import stringify from '@agoric/swingset-vat/src/kernel/json-stable-stringify';

import { launch } from './launch-chain';
import makeBlockManager from './block-manager';

const AG_COSMOS_INIT = 'AG_COSMOS_INIT';

export default async function main(progname, args, { path, env, agcc }) {
  const portNums = {};

  // TODO: use the 'basedir' pattern

  // Try to determine the cosmos chain home.
  function getFlagValue(flagName, deflt) {
    let flagValue = deflt;
    const envValue = env[`AG_CHAIN_COSMOS_${flagName.toUpperCase()}`];
    if (envValue !== undefined) {
      flagValue = envValue;
    }
    const flag = `--${flagName}`;
    const flagEquals = `--${flagName}=`;
    for (let i = 0; i < args.length; i += 1) {
      const arg = args[i];
      if (arg === flag) {
        i += 1;
        flagValue = args[i];
      } else if (arg.startsWith(flagEquals)) {
        flagValue = arg.substr(flagEquals.length);
      }
    }
    return flagValue;
  }

  // We try to find the actual cosmos state directory (default=~/.ag-chain-cosmos), which
  // is better than scribbling into the current directory.
  const cosmosHome = getFlagValue('home', `${env.HOME}/.ag-chain-cosmos`);
  const stateDBDir = `${cosmosHome}/data/ag-cosmos-chain-state`;

  // console.log('Have AG_COSMOS', agcc);

  const portHandlers = {};
  let lastPort = 0;
  function registerPortHandler(portHandler) {
    lastPort += 1;
    const port = lastPort;
    portHandlers[port] = portHandler;
    return port;
  }

  function fromGo(port, str, replier) {
    // console.error(`inbound ${port} ${str}`);
    const handler = portHandlers[port];
    if (!handler) {
      replier.reject(`invalid requested port ${port}`);
      return;
    }
    const action = JSON.parse(str);
    const p = Promise.resolve(handler(action));
    p.then(
      res => {
        // console.error(`Replying in Node to ${str} with`, res);
        replier.resolve(`${res}`);
      },
      rej => {
        // console.error(`Rejecting in Node to ${str} with`, rej);
        replier.reject(`${(rej && rej.stack) || rej}`);
      },
    );
  }

  // Actually run the main ag-chain-cosmos program.  Before we start the daemon,
  // there will be a call to nodePort/AG_COSMOS_INIT, otherwise exit.
  // eslint-disable-next-line no-use-before-define
  const nodePort = registerPortHandler(toSwingSet);

  // Need to keep the process alive until Go exits.
  setInterval(() => undefined, 30000);
  agcc.runAgCosmosDaemon(nodePort, fromGo, [progname, ...args]);

  let savedChainSends = [];

  // Send a chain downcall, recording what we sent and received.
  function chainSend(...sendArgs) {
    const ret = agcc.send(...sendArgs);
    savedChainSends.push([sendArgs, ret]);
    return ret;
  }

  // Flush the chain send queue.
  // If doReplay is truthy, replay each send and insist
  // it hase the same return result.
  function flushChainSends(doReplay) {
    // Remove our queue.
    const chainSends = savedChainSends;
    savedChainSends = [];

    if (!doReplay) {
      return;
    }

    // Just send all the things we saved.
    while (chainSends.length > 0) {
      const [sendArgs, expectedRet] = chainSends.shift();
      const actualRet = agcc.send(...sendArgs);

      // Enforce that we got back what we expected.
      if (actualRet !== expectedRet) {
        throw Error(
          `fatal: replaying chain send ${JSON.stringify(
            sendArgs,
          )} resulted in ${JSON.stringify(actualRet)}; expected ${expectedRet}`,
        );
      }
    }
  }

  // this storagePort changes for every single message. We define it out here
  // so the 'externalStorage' object can close over the single mutable
  // instance, and we update the 'portNums.storage' value each time toSwingSet is called
  async function launchAndInitializeSwingSet() {
    // this object is used to store the mailbox state. we only ever use
    // key='mailbox'
    const mailboxStorage = {
      has(key) {
        // x/swingset/storage.go returns "true" or "false"
        const retStr = chainSend(
          portNums.storage,
          stringify({ method: 'has', key }),
        );
        const ret = JSON.parse(retStr);
        if (Boolean(ret) !== ret) {
          throw new Error(`chainSend(has) returned ${ret} not Boolean`);
        }
        return ret;
      },
      set(key, value) {
        if (value !== `${value}`) {
          throw new Error(
            `golang storage API only takes string values, not '${JSON.stringify(
              value,
            )}'`,
          );
        }
        const encodedValue = stringify(value);
        chainSend(
          portNums.storage,
          stringify({ method: 'set', key, value: encodedValue }),
        );
      },
      get(key) {
        const retStr = chainSend(
          portNums.storage,
          stringify({ method: 'get', key }),
        );
        // console.log(`s.get(${key}) retstr=${retstr}`);
        const encodedValue = JSON.parse(retStr);
        // console.log(` encodedValue=${encodedValue}`);
        const value = JSON.parse(encodedValue);
        // console.log(` value=${value}`);
        return value;
      },
    };

    function doOutboundBridge(dstID, obj) {
      const portNum = portNums[dstID];
      if (portNum === undefined) {
        console.error(
          `warning: doOutboundBridge called before AG_COSMOS_INIT gave us ${dstID}`,
        );
        // it is dark, and your exception is likely to be eaten by a vat
        throw Error(
          `warning: doOutboundBridge called before AG_COSMOS_INIT gave us ${dstID}`,
        );
      }
      const retStr = chainSend(portNum, stringify(obj));
      try {
        return JSON.parse(retStr);
      } catch (e) {
        throw Error(`cannot JSON.parse(${JSON.stringify(retStr)}): ${e}`);
      }
    }

    const vatsdir = path.resolve(__dirname, '../lib/ag-solo/vats');
    const argv = [`--role=chain`];
    const s = await launch(
      stateDBDir,
      mailboxStorage,
      doOutboundBridge,
      flushChainSends,
      vatsdir,
      argv,
    );
    return s;
  }

  let blockManager;
  async function toSwingSet(action, _replier) {
    // console.log(`toSwingSet`, action);
    if (action.ibcPort) {
      portNums.dibc = action.ibcPort;
    }

    if (action.storagePort) {
      // Initialize the storage for this particular transaction.
      // console.log(` setting portNums.storage to`, action.storagePort);
      portNums.storage = action.storagePort;
    }

    if (!blockManager) {
      const fns = await launchAndInitializeSwingSet();
      blockManager = makeBlockManager(fns);
    }

    if (action.type === AG_COSMOS_INIT) {
      // console.error('got AG_COSMOS_INIT', action);
      return true;
    }

    return blockManager(action);
  }
}
