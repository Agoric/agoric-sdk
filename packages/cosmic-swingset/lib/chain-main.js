import stringify from '@agoric/swingset-vat/src/kernel/json-stable-stringify';

import { launch } from './launch-chain';

const AG_COSMOS_INIT = 'AG_COSMOS_INIT';
const BEGIN_BLOCK = 'BEGIN_BLOCK';
const DELIVER_INBOUND = 'DELIVER_INBOUND';
const END_BLOCK = 'END_BLOCK';

export default async function main(progname, args, { path, env, agcc }) {
  const bootAddress = env.BOOT_ADDRESS;
  const role = env.ROLE || 'chain';

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
    const handler = portHandlers[port];
    if (!handler) {
      replier.reject(`invalid requested port ${port}`);
      return;
    }
    const action = JSON.parse(str);
    const p = Promise.resolve(handler(action));
    p.then(
      res => replier.resolve(`${res}`),
      rej => replier.reject(`rejection ${rej} ignored`),
    );
  }

  // Actually run the main ag-chain-cosmos program.  Before we start the daemon,
  // there will be a call to nodePort/AG_COSMOS_INIT, otherwise exit.
  // eslint-disable-next-line no-use-before-define
  const nodePort = registerPortHandler(toSwingSet);
  // Need to keep the process alive until Go exits.
  setInterval(() => undefined, 30000);
  agcc.runAgCosmosDaemon(nodePort, fromGo, [progname, ...args]);

  let deliverInbound;
  let deliverStartBlock;
  let deliveryFunctionsInitialized = false;

  // this storagePort changes for every single message. We define it out here
  // so the 'externalStorage' object can close over the single mutable
  // instance, and we update the 'sPort' value each time toSwingSet is called
  let sPort;

  function toSwingSet(action, replier) {
    // console.log(`toSwingSet`, action, replier);
    // eslint-disable-next-line no-use-before-define
    return blockManager(action, replier).then(
      ret => {
        // console.log(`blockManager returning:`, ret);
        return ret;
      },
      err => {
        console.log('blockManager threw error:', err);
        throw err;
      },
    );
  }

  async function launchAndInitializeDeliverInbound() {
    // this object is used to store the mailbox state. we only ever use
    // key='mailbox'
    const mailboxStorage = {
      has(key) {
        // x/swingset/storage.go returns "true" or "false"
        const retStr = agcc.send(sPort, stringify({ method: 'has', key }));
        const ret = JSON.parse(retStr);
        if (Boolean(ret) !== ret) {
          throw new Error(`agcc.send(has) returned ${ret} not Boolean`);
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
        agcc.send(
          sPort,
          stringify({ method: 'set', key, value: encodedValue }),
        );
      },
      get(key) {
        const retStr = agcc.send(sPort, stringify({ method: 'get', key }));
        // console.log(`s.get(${key}) retstr=${retstr}`);
        const encodedValue = JSON.parse(retStr);
        // console.log(` encodedValue=${encodedValue}`);
        const value = JSON.parse(encodedValue);
        // console.log(` value=${value}`);
        return value;
      },
    };

    const vatsdir = path.resolve(__dirname, '../lib/ag-solo/vats');
    const argv = [`--role=${role}`];
    if (bootAddress) {
      argv.push(...bootAddress.trim().split(/\s+/));
    }
    const s = await launch(stateDBDir, mailboxStorage, vatsdir, argv);
    return s;
  }

  async function blockManager(action, _replier) {
    if (action.type === AG_COSMOS_INIT) {
      return true;
    }

    if (action.storagePort) {
      // Initialize the storage for this particular transaction.
      // console.log(` setting sPort to`, action.storagePort);
      sPort = action.storagePort;
    }

    // launch the swingset once
    if (!deliveryFunctionsInitialized) {
      const deliveryFunctions = await launchAndInitializeDeliverInbound();
      deliverInbound = deliveryFunctions.deliverInbound;
      deliverStartBlock = deliveryFunctions.deliverStartBlock;
      deliveryFunctionsInitialized = true;
    }

    switch (action.type) {
      case BEGIN_BLOCK:
        return deliverStartBlock(action.blockHeight, action.blockTime);
      case DELIVER_INBOUND:
        return deliverInbound(
          action.peer,
          action.messages,
          action.ack,
          action.blockHeight,
          action.blockTime,
        );
      case END_BLOCK:
        return true;

      default:
        throw new Error(
          `${action.type} not recognized. must be BEGIN_BLOCK, DELIVER_INBOUND, or END_BLOCK`,
        );
    }
  }
}
