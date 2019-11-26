import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import djson from 'deterministic-json';
import { createHash } from 'crypto';
import { open as tempOpen } from 'temp';
import Tendermint from 'tendermint';

const HELPER = 'ag-cosmos-helper';

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
    while (true) {
      const randomRpcAddr =
        rpcAddresses[Math.floor(Math.random() * rpcAddresses.length)];

      // tryOnce will either throw if cancelled (which rejects this promise),
      const ret = await tryOnce(randomRpcAddr);
      if (ret !== undefined) {
        // Or returns non-undefined, which we should resolve.
        return ret;
      }

      // It was undefined, so wait, then retry.
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
    return retryRpcAddr(async rpcAddr => {
      await throwIfCancelled();

      const fullArgs = [
        ...args,
        '--chain-id',
        chainID,
        '--output',
        'json',
        '--node',
        `tcp://${rpcAddr}`,
        '--home',
        helperDir,
      ];
      console.log(HELPER, ...fullArgs);
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
        console.log(` failed exec:`, e);
      }

      await throwIfCancelled();

      if (ret) {
        try {
          return await parseReturn(ret);
        } catch (e) {
          console.log(`Failed to parse return:`, e);
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
        const [proceed, cancel] = queue.pop();
        // console.log(`cancelling ${queue.length}`);
        cancel();
      }
    }
    let cancelled = false;
    let resolveWait;
    const qentry = [
      () => {
        // console.log('proceeding');
        resolveWait();
      },
      () => {
        // console.log('cancelling');
        cancelled = true;
        resolveWait();
      },
    ];
    queue.push(qentry);
    const wait = new Promise(resolve => {
      resolveWait = resolve;
      if (queue[0] === qentry) {
        // Wake us immediately, since we're first in queue.
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
          // console.log(`Waiting for`, wait);
          await wait;
          // console.log(`Wait done, cancelled`, cancelled);
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
        const [proceed, cancel] = queue[0];
        proceed();
      }
    }
  }

  const getMailbox = () =>
    queuedHelper(
      'getMailbox',
      1, // Only one helper running at a time.
      ['query', 'swingset', 'mailbox', myAddr],
      ret => {
        const { stdout, stderr } = ret;
        console.error(stderr);
        console.log(` helper said: ${stdout}`);
        try {
          // Try to parse the stdout.
          return JSON.parse(JSON.parse(JSON.parse(stdout).value));
        } catch (e) {
          console.log(` failed to parse output:`, e);
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
      return new Promise((resolve, reject) => {
        client.once('synced', () => {
          client.removeListener('error', reject);
          resolve({ lightClient: client });
        });
        client.once('error', reject);
      });
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

  c.lightClient.on('update', _a => {
    console.log(`new block on ${GCI}, fetching mailbox`);
    return getMailbox()
      .then(({ outbox, ack }) => {
        if (outbox) {
          inbound(GCI, outbox, ack);
        }
      })
      .catch(e => console.log(`Failed to fetch ${GCI} mailbox:`, e));
  });
  async function deliver(newMessages, acknum) {
    let tmpInfo;
    try {
      console.log(`delivering to chain`, GCI, newMessages, acknum);

      // TODO: combine peer and submitter in the message format (i.e. remove
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
        myAddr,
        `@${tmpInfo.path}`, // Deliver message over file, as it could be big.
        '--from',
        'ag-solo',
        '-ojson',
        '--broadcast-mode',
        'block', // Don't return until committed.
        '--yes',
      ];
      const password = 'mmmmmmmm';

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
          console.error(stderr);
          console.log(` helper said: ${stdout}`);
          // TODO: parse the helper output (JSON), we want 'code' to be 0. If
          // not, look at .raw_log (also JSON) at .message.
          return {};
        },
        `${password}\n`,
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
