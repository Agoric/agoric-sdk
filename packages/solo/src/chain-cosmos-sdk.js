/* global setTimeout */
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { open as tempOpen } from 'temp';

import WebSocket from 'ws';

import anylogger from 'anylogger';
import { makeNotifierKit } from '@agoric/notifier';
import { makePromiseKit } from '@agoric/promise-kit';

import { assert, details as X } from '@agoric/assert';

const log = anylogger('chain-cosmos-sdk');

const HELPER = 'ag-cosmos-helper';
const FAUCET_ADDRESS =
  'the appropriate faucet channel on Discord (https://agoric.com/discord)';

const adviseEgress = egressAddr =>
  `\


Send:

  !faucet client ${egressAddr}

to ${FAUCET_ADDRESS}`;

const MAX_BUFFER_SIZE = 10 * 1024 * 1024;
const WAIT_FOR_SWINGSET_DELAY_MS = 2 * 1000;

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

const makeTempFile = async (prefix, contents) => {
  const tmpInfo = await new Promise((resolve, reject) => {
    tempOpen({ prefix }, (err, info) => {
      if (err) {
        return reject(err);
      }
      return resolve(info);
    });
  });

  try {
    await new Promise((resolve, reject) => {
      fs.write(tmpInfo.fd, contents, err => {
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
  return tmpInfo;
};

export async function connectToChain(
  basedir,
  GCI,
  rpcAddresses,
  helperAddr,
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

  const readOrDefault = (file, dflt) =>
    fs.promises
      .readFile(file, { encoding: 'utf-8' })
      .catch(e => {
        if (e.code === 'ENOENT') {
          return dflt;
        }
        throw e;
      })
      .then(str => str.trim());

  // The helper account may only have the authority to send messages on behalf
  // of the client, which has been set up by the client with something like:
  //
  // ag-cosmos-helper tx authz grant $(cat ag-cosmos-helper-address) \
  // generic --msg-type=/agoric.swingset.MsgDeliverInbound \
  // --from=$(cat cosmos-client-account)
  const clientAddr = await readOrDefault(
    path.join(basedir, 'cosmos-client-account'),
    helperAddr,
  );

  // The helper address may not have a token balance, and instead uses a
  // separate fee account, set up with something like:
  //
  // ag-cosmos-helper tx feegrant grant --period=5 --period-limit=200000urun \
  // $(cat cosmos-fee-account) $(cat ag-cosmos-helper-address)
  const feeAccountAddr = await readOrDefault(
    path.join(basedir, 'cosmos-fee-account'),
    '',
  );

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
    return retryRpcAddr(async rpcAddr => {
      await throwIfCancelled();

      const fullArgs = [
        ...args,
        `--chain-id=${chainID}`,
        `--node=tcp://${rpcAddr}`,
        `--home=${helperDir}`,
      ];
      log.debug(HELPER, ...fullArgs);
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
      return undefined;
    }).catch(e => {
      if (
        e === CANCEL_USE_DEFAULT &&
        defaultIfCancelled !== WAS_CANCELLED_EXCEPTION
      ) {
        return defaultIfCancelled;
      }

      // Just retry.
      return undefined;
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

  const getMailbox = () =>
    queuedHelper(
      'getMailbox',
      1, // Only one helper running at a time.
      ['query', 'swingset', 'mailbox', clientAddr, '-ojson'],
      // eslint-disable-next-line consistent-return
      ret => {
        const { stdout, stderr } = ret;
        const errMsg = stderr.trimRight();
        if (errMsg) {
          log.error(errMsg);
        }
        if (stdout) {
          log.debug(`helper said: ${stdout}`);
          try {
            // Try to parse the stdout.
            return JSON.parse(JSON.parse(stdout).value);
          } catch (e) {
            log(`failed to parse output:`, e);
          }
        }
      },
      undefined,
      false, // defaultIfCancelled
    );

  // Validate that our chain egress exists.
  await retryRpcAddr(async rpcAddr => {
    const args = ['query', 'swingset', 'egress', clientAddr];
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

    if (r.stderr) {
      console.error(r.stderr);
    }
    if (!r.stdout) {
      console.error(`\
=============
${chainID} chain does not yet know of address ${clientAddr}${adviseEgress(
        clientAddr,
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

  // FIXME: We currently don't use the persistent light client functionality.
  // We hope to move to CosmJS with our own IBC implementation for all our light
  // client + transaction needs.  For now, it's simple enough to notice when
  // blocks happen an just to issue mailbox queries.

  /**
   * Get a notifier that announces every time a block lands.
   *
   * @returns {Notifier<any>}
   */
  const getBlockNotifier = () => {
    const { notifier, updater } = makeNotifierKit();
    retryRpcAddr(async rpcAddr => {
      // Every time we enter this function, we are establishing a
      // new websocket to a potentially different RPC server.
      //
      // We use the same notifier, though... it's a stable identity.

      // This promise is for when we're ready to retry.
      const retryPK = makePromiseKit();

      // Open the WebSocket.
      const ws = new WebSocket(`ws://${rpcAddr}/websocket`);
      ws.addEventListener('error', e => {
        log.debug('WebSocket error', e);
      });

      // This magic identifier just distinguishes our subscription
      // from other noise on the Websocket, if there is any.
      const MAGIC_ID = 13254;
      ws.addEventListener('open', _ => {
        // We send a message to subscribe to every
        // new block header.
        const obj = {
          // JSON-RPC version 2.0.
          jsonrpc: '2.0',
          id: MAGIC_ID,
          // We want to subscribe.
          method: 'subscribe',
          params: {
            // Here is the Tendermint event for new blocks.
            query: "tm.event = 'NewBlockHeader'",
          },
        };
        // Send that message, and wait for the subscription.
        ws.send(JSON.stringify(obj));
      });
      ws.addEventListener('message', ev => {
        // We received a message.
        const obj = JSON.parse(ev.data);
        if (obj.id === MAGIC_ID) {
          // It matches our subscription, so notify.
          updater.updateState(obj);
        }
      });
      ws.addEventListener('close', _ => {
        // The value `undefined` as the resolution of this retry
        // tells the caller to retry again with a different RPC server.
        retryPK.resolve(undefined);
      });
      // Return an unresolved promise that resolves to `undefined`
      // when the WebSocket is closed.
      return retryPK.promise;
    });

    return notifier;
  };

  // Begin the block notifier cycle.
  const blockNotifier = getBlockNotifier();

  let currentMessages = [];
  let currentAck = -1;
  let lastAck = -1;

  /**
   * This function is entered at most the same number of times
   * as the blockNotifier announces a new block.
   *
   * It then gets the mailbox.  There are no optimisations.
   *
   * @param {number=} lastBlockUpdate
   */
  let totalDeliveries = 0;
  const recurseEachNewBlock = (lastBlockUpdate = undefined) => {
    blockNotifier
      .getUpdateSince(lastBlockUpdate)
      .then(({ updateCount, value }) => {
        assert(value, X`${GCI} unexpectedly finished!`);
        log.debug(`new block on ${GCI}, fetching mailbox`);
        getMailbox()
          .then(ret => {
            if (!ret) {
              // The getMailbox was cancelled.
              return;
            }

            const { outbox, ack } = ret;
            // console.debug('have outbox', outbox, ack);
            inbound(GCI, outbox, ack);
          })
          .catch(e => log.error(`Failed to fetch ${GCI} mailbox:`, e))
          .then(
            () =>
              new Promise(resolve =>
                setTimeout(resolve, WAIT_FOR_SWINGSET_DELAY_MS),
              ),
          )
          .then(async () => {
            const messages = currentMessages;
            currentMessages = [];
            const ack = currentAck;
            if (ack <= lastAck && !messages.length) {
              return undefined;
            }

            let tmpInfo;
            try {
              totalDeliveries += 1;
              log(
                `delivering to chain (trips=${totalDeliveries})`,
                GCI,
                messages,
                ack,
              );

              // TODO: remove this JSON.stringify([currentMessages, currentAck]): change
              // 'deliverMailboxReq' to have more structure than a single string, and
              // have the CLI handle variable args better
              tmpInfo = await makeTempFile(
                'ag-solo-cosmos-deliver.',
                JSON.stringify([messages, ack]),
              );

              // Deliver message over file, as it could be big.
              let args = ['tx', 'swingset', 'deliver', `@${tmpInfo.path}`];
              if (clientAddr !== helperAddr) {
                const genDone = makePromiseKit();
                execFile(
                  HELPER,
                  [
                    'tx',
                    'swingset',
                    'deliver',
                    '--generate-only',
                    `--chain-id=${chainID}`,
                    `--from=${clientAddr}`,
                    `@${tmpInfo.path}`,
                  ],
                  { maxBuffer: MAX_BUFFER_SIZE },
                  (error, stdout, stderr) => {
                    if (error) {
                      return genDone.reject(error);
                    }
                    return genDone.resolve({ stdout, stderr });
                  },
                );

                // Reuse the file to send the constructed transaction.
                const { stdout, stderr } = await genDone.promise;
                if (stderr) {
                  throw Error(`Error creating swingset delivery tx; ${stderr}`);
                }
                await fs.promises.writeFile(tmpInfo.path, stdout);

                args = ['tx', 'authz', 'exec', tmpInfo.path];
              }

              args.push(
                '--keyring-backend=test',
                '--gas=auto',
                '--gas-adjustment=1.3',
                '--broadcast-mode=block',
                '--from=ag-solo',
                '--yes',
              );

              // Use the feeAccount for any fees.
              if (feeAccountAddr) {
                args.push(`--fee-account=${feeAccountAddr}`);
              }

              // We just try a single delivery per block.
              const qret = await queuedHelper(
                'deliver',
                1, // one delivery running at a time
                args,
                ret => {
                  const { stderr, stdout } = ret;
                  const errMsg = stderr.trimRight();
                  if (errMsg) {
                    log.error(errMsg);
                  }
                  log.debug(`helper said: ${stdout}`);
                  const out = JSON.parse(stdout);
                  if (Number(out.code) === 0) {
                    // We submitted the transaction successfully.
                    if (ack > lastAck) {
                      lastAck = ack;
                    }
                    return {};
                  }
                  // Put back the deliveries we tried to make.
                  currentMessages = messages.concat(currentMessages);
                  assert.fail(X`Unexpected output: ${stdout.trimRight()}`);
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
          });
        recurseEachNewBlock(updateCount);
      });
  };

  // Begin the block consumer.
  recurseEachNewBlock();

  async function deliver(newMessages, acknum) {
    if (acknum > currentAck) {
      currentAck = acknum;
    }
    if (newMessages.length) {
      currentMessages = currentMessages.concat(newMessages);
    }
  }

  // Now that we've started consuming blocks, tell our caller how to deliver
  // messages.
  return deliver;
}
