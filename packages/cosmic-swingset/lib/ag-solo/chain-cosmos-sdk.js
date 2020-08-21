import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import djson from 'deterministic-json';
import { createHash } from 'crypto';
import { open as tempOpen } from 'temp';
// FIXME: Use @agoric/tendermint until
// https://github.com/nomic-io/js-tendermint/issues/25
// is resolved.
import Tendermint from '@agoric/tendermint';

import anylogger from 'anylogger';

const log = anylogger('chain-cosmos-sdk');

const HELPER = 'ag-cosmos-helper';
const SUPPORT_ADDRESS =
  '@agoric.support#testnet on Keybase (https://keybase.io)';

const adviseProvision = myAddr =>
  `\


Send:

  !faucet provision ${myAddr}

to ${SUPPORT_ADDRESS}`;

const MAX_BUFFER_SIZE = 10 * 1024 * 1024;

const WAS_CANCELLED_EXCEPTION = {
  toString() {
    return 'WAS_CANCELLED_EXCEPTION';
  },
};

const CANCEL_USE_DEFAULT = {
  toString() {
    return 'CANCEL_USE_DEFAULT';
  },
};

export async function connectToChain(
  basedir,
  GCI,
  rpcAddresses,
  myAddr,
  inbound,
  chainID,
) {
  // Each time we read our mailbox from the chain's state, and each time we
  // send an outbound message to the chain, we shell out to a one-shot copy
  // of 'ag-cosmos-helper', the swingset-flavored cosmos-sdk CLI tool.

  // We originally thought we could use the tool's "rest-server" mode, leave
  // it running for the duration of our process, but it turns out that the
  // rest-server cannot sign transactions (that ability was removed as a
  // security concern in https://github.com/cosmos/cosmos-sdk/issues/3641)

  // A better approach I'm hopeful we can achieve is an FFI binding to the
  // same golang code that powers ag-cosmos-helper, so we can call the
  // query/tx functions directly without the overhead of spawning a
  // subprocess and encoding everything as strings over stdio.

  // the 'ag-cosmos-helper' tool in our repo is built by 'make install' and
  // put into the user's $GOPATH/bin . That's a bit intrusive, ideally it
  // would live in the build tree along with bin/ag-solo . But for now we
  // assume that 'ag-cosmos-helper' is on $PATH somewhere.

  // Shuffle our rpcAddresses, to help distribute load.
  // Modern version of Fisher-Yates shuffle algorithm (in-place).
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const x = a[i];
      a[i] = a[j];
      a[j] = x;
    }
  }
  shuffle(rpcAddresses);

  const helperDir = path.join(basedir, 'ag-cosmos-helper-statedir');

  const queued = {};

  async function retryRpcAddr(tryOnce) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const randomRpcAddr =
        rpcAddresses[Math.floor(Math.random() * rpcAddresses.length)];

      // tryOnce will either throw if cancelled (which rejects this promise),
      // eslint-disable-next-line no-await-in-loop
      const ret = await tryOnce(randomRpcAddr);
      if (ret !== undefined) {
        // Or returns non-undefined, which we should resolve.
        return ret;
      }

      // It was undefined, so wait, then retry.
      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  function retryHelper(
    args,
    parseReturn,
    stdin,
    throwIfCancelled = () => undefined,
    defaultIfCancelled = WAS_CANCELLED_EXCEPTION,
  ) {
    // eslint-disable-next-line consistent-return
    return retryRpcAddr(async rpcAddr => {
      await throwIfCancelled();

      const fullArgs = [
        ...args,
        `--chain-id=${chainID}`,
        '--output=json',
        `--node=tcp://${rpcAddr}`,
        `--home=${helperDir}`,
      ];
      log(HELPER, ...fullArgs);
      let ret;
      try {
        ret = await new Promise((resolve, reject) => {
          const proc = execFile(
            HELPER,
            fullArgs,
            { maxBuffer: MAX_BUFFER_SIZE },
            (error, stdout, stderr) => {
              if (error) {
                return reject(error);
              }
              return resolve({ stdout, stderr });
            },
          );
          if (stdin) {
            proc.stdin.write(stdin);
            proc.stdin.end();
          }
        });
      } catch (e) {
        log.error(`failed exec:`, e);
      }

      await throwIfCancelled();

      if (ret) {
        try {
          return await parseReturn(ret);
        } catch (e) {
          log.error(`Failed to parse return:`, e);
        }
      }
    }).catch(e => {
      if (
        e === CANCEL_USE_DEFAULT &&
        defaultIfCancelled !== WAS_CANCELLED_EXCEPTION
      ) {
        return defaultIfCancelled;
      }

      // Not silent, so rethrow.
      throw e;
    });
  }

  async function queuedHelper(
    name,
    maxQueued,
    args,
    parseReturn,
    stdin,
    defaultIfCancelled,
  ) {
    const queue = queued[name] || [];
    queued[name] = queue;
    if (maxQueued !== undefined) {
      while (queue.length > 0 && queue.length >= maxQueued) {
        // Cancel the excesses from most recent down to the currently-running.
        // eslint-disable-next-line no-unused-vars
        const [proceed, cancel] = queue.pop();
        log.debug(`cancelling ${queue.length}`);
        cancel();
      }
    }
    let cancelled = false;
    let resolveWait;
    const qentry = [
      () => {
        // console.debug('proceeding');
        resolveWait();
      },
      () => {
        // console.debug('cancelling');
        cancelled = true;
        resolveWait();
      },
    ];
    queue.push(qentry);
    const wait = new Promise(resolve => {
      resolveWait = resolve;
      if (queue[0] === qentry) {
        // Wake us immediately, since we're first in queue.
        // eslint-disable-next-line no-unused-vars
        const [proceed, cancel] = qentry;
        proceed();
      }
    });

    try {
      return await retryHelper(
        args,
        parseReturn,
        stdin,
        async () => {
          // console.debug(`Waiting for`, wait);
          await wait;
          // console.debug(`Wait done, cancelled`, cancelled);
          if (cancelled) {
            throw CANCEL_USE_DEFAULT;
          }
        },
        defaultIfCancelled,
      );
    } finally {
      // Remove us from the queue.
      const i = queue.indexOf(qentry);
      if (i >= 0) {
        queue.splice(i, 1);
      }
      if (queue[0] !== undefined) {
        // Wake the next in queue.
        // eslint-disable-next-line no-unused-vars
        const [proceed, cancel] = queue[0];
        proceed();
      }
    }
  }

  const getMailbox = _height =>
    queuedHelper(
      'getMailbox',
      1, // Only one helper running at a time.
      ['query', 'swingset', 'mailbox', myAddr],
      // eslint-disable-next-line consistent-return
      ret => {
        const { stdout, stderr } = ret;
        const errMsg = stderr.trimRight();
        if (errMsg) {
          log.error(errMsg);
        }
        log(`helper said: ${stdout}`);
        try {
          // Try to parse the stdout.
          return JSON.parse(JSON.parse(JSON.parse(stdout).value));
        } catch (e) {
          log(`failed to parse output:`, e);
        }
      },
      undefined,
      {}, // defaultIfCancelled
    );

  // The 'tendermint' package can perform light-client checks (instantiate
  // Tendermint() with a
  // known-valid starting state, containing {header,validators,commit}, which
  // can be fetched by RPC, that we compare against the GCI and chainID).
  //
  // TODO: decide when these parameters should be updated to something other
  // than genesis.  This is necessary to ensure we have a recent block
  // reference that probably isn't compromised.
  const LAST_KNOWN_BLOCKHEIGHT = 1;
  const LAST_KNOWN_COMMIT = null;
  const getClient = () =>
    retryRpcAddr(async rpcAddr => {
      const nodeAddr = `ws://${rpcAddr}`;
      const rpc = Tendermint.RpcClient(nodeAddr);
      const { genesis } = await rpc.genesis();
      const { validators } = await rpc.validators({
        height: LAST_KNOWN_BLOCKHEIGHT,
      });
      rpc.close();
      if (genesis.chain_id !== chainID) {
        throw Error(
          `downloaded chainID ${genesis.chain_id} does not match expected chainID ${chainID}`,
        );
      }
      const gci = createHash('sha256')
        .update(djson.stringify(genesis))
        .digest('hex');
      if (gci !== GCI) {
        throw Error(`computed GCI ${gci} does not match expected GCI ${GCI}`);
      }
      const clientState = {
        validators,
        commit: LAST_KNOWN_COMMIT,
        header: { height: LAST_KNOWN_BLOCKHEIGHT, chain_id: chainID },
      };
      const client = Tendermint(nodeAddr, clientState);
      client.on('error', e => log.error(e));
      return new Promise((resolve, reject) => {
        client.once('error', reject);
        client.once('synced', () => {
          client.removeListener('error', reject);
          resolve({ lightClient: client });
        });
      });
    });

  // Validate that our chain egress exists.
  await retryRpcAddr(async rpcAddr => {
    const args = ['query', 'swingset', 'egress', myAddr];
    const fullArgs = [
      ...args,
      `--chain-id=${chainID}`,
      '--output=json',
      `--node=tcp://${rpcAddr}`,
      `--home=${helperDir}`,
    ];
    // log(HELPER, ...fullArgs);
    const r = await new Promise(resolve => {
      execFile(HELPER, fullArgs, (error, stdout, stderr) => {
        resolve({ error, stdout, stderr });
      });
    });

    if (r.stderr.includes('not found: unknown request')) {
      console.error(`\
=============
${chainID} chain does not yet know of address ${myAddr}${adviseProvision(
        myAddr,
      )}
=============
`);
      return undefined;
    } else if (r.error) {
      console.error(`Error running`, HELPER, ...args);
      console.error(r.stderr);
      return undefined;
    }

    return r;
  });

  // We need one subscription-type thing
  // to tell us that a new block exists, then we can use a different
  // query-type tool to retrieve the outbox, but we want to know that the
  // outbox is correctly traced to the block header, and that the block
  // header is a legitimate descendant of our previously-validated state.

  const c = await getClient();

  // TODO: another way to make this cheaper would be to extract the apphash
  // from the received block, and only check the mailbox if it changes.
  // That's more coarse than checking for only our own slot, but better than
  // hitting the rest-server on every single block.

  c.lightClient.on('update', ({ height }) => {
    log(`new block on ${GCI}, fetching mailbox`);
    return getMailbox(height)
      .then(({ outbox, ack }) => {
        // console.debug('have outbox', outbox, ack);
        if (outbox) {
          inbound(GCI, outbox, ack);
        }
      })
      .catch(e => log.error(`Failed to fetch ${GCI} mailbox:`, e));
  });
  c.lightClient.on('close', e => log.error('closed', e));
  async function deliver(newMessages, acknum) {
    let tmpInfo;
    try {
      log(`delivering to chain`, GCI, newMessages, acknum);

      // Peer and submitter are combined in the message format (i.e. we removed
      // the extra 'myAddr' after 'tx swingset deliver'). All messages from
      // solo vats are "from" the signer, and messages relayed from another
      // chain will have other data to demonstrate which chain it comes from

      // TODO: remove this JSON.stringify([newMessages, acknum]): change
      // 'deliverMailboxReq' to have more structure than a single string, and
      // have the CLI handle variable args better

      tmpInfo = await new Promise((resolve, reject) => {
        tempOpen({ prefix: 'ag-solo-cosmos-deliver.' }, (err, info) => {
          if (err) {
            return reject(err);
          }
          return resolve(info);
        });
      });

      try {
        await new Promise((resolve, reject) => {
          fs.write(tmpInfo.fd, JSON.stringify([newMessages, acknum]), err => {
            if (err) {
              return reject(err);
            }
            return resolve();
          });
        });
      } finally {
        await new Promise((resolve, reject) => {
          fs.close(tmpInfo.fd, e => {
            if (e) {
              return reject(e);
            }
            return resolve();
          });
        });
      }

      const args = [
        'tx',
        'swingset',
        'deliver',
        '--keyring-backend=test',
        `@${tmpInfo.path}`, // Deliver message over file, as it could be big.
        '--gas=auto',
        '--gas-adjustment=1.05',
        '--from=ag-solo',
        '-ojson',
        '--broadcast-mode=block', // Don't return until committed.
        '--yes',
      ];

      // If we send two messages back-to-back too quickly, the second one
      // may use the same seqnum as the first, so it will be rejected by the
      // signature-checking auth/ante handler on the chain. Therefore, we need
      // to queue our deliver() calls and not allow one to proceed until the
      // others have finished.
      const qret = await queuedHelper(
        'deliver',
        undefined, // allow the queue to grow unbounded, and never cancel deliveries
        args,
        ret => {
          const { stderr, stdout } = ret;
          const errMsg = stderr.trimRight();
          if (errMsg) {
            log.error(errMsg);
          }
          log(`helper said: ${stdout}`);
          // TODO: parse the helper output (JSON), we want 'code' to be 0. If
          // not, look at .raw_log (also JSON) at .message.
          return {};
        },
        undefined,
        {}, // defaultIfCancelled
      );
      return qret;
    } finally {
      if (tmpInfo) {
        await fs.promises.unlink(tmpInfo.path);
      }
    }
  }

  return deliver;
}
