/* global setTimeout Buffer */
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { open as tempOpen } from 'temp';

import WebSocket from 'ws';

import anylogger from 'anylogger';
import { makeNotifierKit } from '@agoric/notifier';
import { makePromiseKit } from '@agoric/promise-kit';

import { assert, details as X } from '@agoric/assert';
import {
  DEFAULT_BATCH_TIMEOUT_MS,
  makeBatchedDeliver,
} from '@agoric/vats/src/batched-deliver.js';

const console = anylogger('chain-cosmos-sdk');

// the `ag-cosmos-helper` tool in our repo is built by 'cd golang/cosmos &&
// make'. It lives in the build tree along with `bin/ag-solo`, in case there are
// multiple checkouts of `agoric-sdk`.
export const HELPER = new URL(
  '../../../golang/cosmos/build/ag-cosmos-helper',
  import.meta.url,
).pathname;

const FAUCET_ADDRESS =
  'the appropriate faucet channel on Discord (https://agoric.com/discord)';

const adviseEgress = egressAddr =>
  `\


Send:

  !faucet client ${egressAddr}

to ${FAUCET_ADDRESS}`;

// Retry if our latest message failed.
const SEND_RETRY_DELAY_MS = 1_000;

const MAX_BUFFER_SIZE = 10 * 1024 * 1024;

// How much of each delay to leave to randomness.
const RANDOM_SCALE = 0.1;

// Tradeoff:
// true: clear out messages from mailbox when we are waiting for more activity.
// Costs an extra tx per string of messages.
//
// false: leave acknowledged messages in mailbox until we have something else to
// send.  Costs more mailbox space over time.
const SEND_EMPTY_ACKS = false;

const randomizeDelay = delay =>
  Math.ceil(delay + delay * RANDOM_SCALE * Math.random());

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

  const rpcHrefs = rpcAddresses.map(rpcAddr =>
    // Don't remove explicit port numbers from the URL, because the Cosmos
    // `--node=xxx` flag requires them (it doesn't just assume that
    // `--node=https://testnet.rpc.agoric.net` is the same as
    // `--node=https://testnet.rpc.agoric.net:443`)
    rpcAddr.includes('://') ? rpcAddr : `http://${rpcAddr}`,
  );

  // Shuffle our rpcHrefs, to help distribute load.
  // Modern version of Fisher-Yates shuffle algorithm (in-place).
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const x = a[i];
      a[i] = a[j];
      a[j] = x;
    }
  }
  shuffle(rpcHrefs);

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

  let lastGoodRpcHrefIndex = 0;
  async function retryRpcHref(tryOnce) {
    let rpcHrefIndex = lastGoodRpcHrefIndex;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const thisRpcHref = rpcHrefs[rpcHrefIndex];

      // tryOnce will either throw if cancelled (which rejects this promise),
      // eslint-disable-next-line no-await-in-loop
      const ret = await tryOnce(thisRpcHref);
      if (ret !== undefined) {
        // Or returns non-undefined, which we should resolve.
        lastGoodRpcHrefIndex = rpcHrefIndex;
        return ret;
      }

      // It was undefined, so wait, then retry.
      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, 5000));
      rpcHrefIndex = (rpcHrefIndex + 1) % rpcHrefs.length;
    }
  }

  let goodRpcHref = rpcHrefs[0];
  const runHelper = (args, stdin = undefined) => {
    const fullArgs = [
      ...args,
      `--chain-id=${chainID}`,
      `--node=${goodRpcHref}`,
      `--home=${helperDir}`,
    ];
    console.debug(HELPER, ...fullArgs);
    return new Promise(resolve => {
      const proc = execFile(
        HELPER,
        fullArgs,
        { maxBuffer: MAX_BUFFER_SIZE },
        (_error, stdout, stderr) => {
          resolve({ stdout, stderr });
        },
      );
      if (stdin) {
        proc.stdin.write(stdin);
        proc.stdin.end();
      }
    });
  };

  const captureHelperOutput = async (txArgs, dstFile) => {
    // Just run the helper as usual.
    const { stdout, stderr } = await runHelper(txArgs);
    if (stderr) {
      throw Error(`Error capturing helper output: ${stderr}`);
    }

    // This is a separate step in case the dstFile is used as input for the
    // runHelper command.
    await fs.promises.writeFile(dstFile, stdout);
  };

  // Validate that our chain egress exists.
  await retryRpcHref(async rpcHref => {
    const args = ['query', 'swingset', 'egress', clientAddr];
    const fullArgs = [
      ...args,
      `--chain-id=${chainID}`,
      '--output=json',
      `--node=${rpcHref}`,
      `--home=${helperDir}`,
    ];
    // log(HELPER, ...fullArgs);
    const r = await new Promise(resolve => {
      execFile(HELPER, fullArgs, (error, stdout, stderr) => {
        resolve({ error, stdout, stderr });
      });
    });

    if (r.stderr) {
      console.error(r.stderr.trimRight());
    }
    if (!r.stdout) {
      console.error(`
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
  const getMailboxNotifier = () => {
    const { notifier, updater } = makeNotifierKit();
    retryRpcHref(async rpcHref => {
      // Every time we enter this function, we are establishing a
      // new websocket to a potentially different RPC server.
      //
      // We use the same notifier, though... it's a stable identity.
      goodRpcHref = rpcHref;

      // This promise is for when we're ready to retry.
      const retryPK = makePromiseKit();

      // Find the websocket corresponding to the current RPC server.
      const rpcWsURL = new URL('/websocket', rpcHref);
      // We translate `https:` to `wss:` and `http:` to `ws:`.
      rpcWsURL.protocol = rpcWsURL.protocol.replace(/^http/, 'ws');

      // Open the WebSocket.
      const ws = new WebSocket(rpcWsURL.href);
      ws.addEventListener('error', e => {
        console.debug('WebSocket error', e);
      });

      // This magic identifier just distinguishes our subscription
      // from other noise on the Websocket, if there is any.
      const MAILBOX_SUBSCRIPTION_ID = 13254;
      const MAILBOX_QUERY_ID = 198772;
      const mailboxPath = `mailbox.${clientAddr}`;
      let firstUpdate = true;
      ws.addEventListener('open', _ => {
        // We send a message to subscribe to every
        // new block header.
        const obj = {
          // JSON-RPC version 2.0.
          jsonrpc: '2.0',
          id: MAILBOX_SUBSCRIPTION_ID,
          // We want to subscribe.
          method: 'subscribe',
          params: {
            // This is the minimal query for mailbox changes.
            query: `tm.event = 'NewBlockHeader' AND storage.path = '${mailboxPath}'`,
          },
        };
        // Send that message, and wait for the subscription.
        ws.send(JSON.stringify(obj));

        // Query for our initial mailbox.
        const obj2 = {
          jsonrpc: '2.0',
          id: MAILBOX_QUERY_ID,
          method: 'abci_query',
          params: {
            path: `/custom/swingset/storage/${mailboxPath}`,
          },
        };
        ws.send(JSON.stringify(obj2));
      });

      const handleMailboxQuery = obj => {
        // We received our initial mailbox query.
        // console.info('got mailbox query', obj);
        if (!firstUpdate) {
          return;
        }
        if (obj.result && obj.result.response && obj.result.response.value) {
          // Decode all the layers.
          const { value: b64JsonStorage } = obj.result.response;
          const jsonStorage = Buffer.from(b64JsonStorage, 'base64').toString(
            'utf8',
          );
          const { value: mailboxValue } = JSON.parse(jsonStorage);

          const mb = JSON.parse(mailboxValue);
          // console.info('got mailbox value', mb);
          updater.updateState(mb);
          firstUpdate = false;
        } else if (
          obj.result &&
          obj.result.response &&
          obj.result.response.code === 6
        ) {
          // No need to try again, just a missing mailbox that our subscription
          // will pick up.
        } else {
          console.error('Error from mailbox query', obj);
          ws.close();
        }
      };

      const handleEventSubscription = obj => {
        if (obj.error) {
          console.error(`Error subscribing to events`, obj.error);
          ws.close();
          return;
        }

        // It matches our subscription, so maybe notify the mailbox.
        const events = obj.result.events;
        if (!events) {
          return;
        }
        const paths = events['storage.path'];
        const values = events['storage.value'];

        // Find only the latest value in the events.
        let latestMailboxValue;
        paths.forEach((key, i) => {
          if (key === mailboxPath) {
            latestMailboxValue = values[i];
          }
        });
        if (latestMailboxValue === undefined) {
          // No matching events found.
          return;
        }

        const mb = JSON.parse(latestMailboxValue);

        // Update our notifier.
        // console.error('Updating in ws.message');
        updater.updateState(mb);
      };

      ws.addEventListener('message', ev => {
        // We received a message.
        // console.info('got message', ev.data);
        const obj = JSON.parse(ev.data);
        switch (obj.id) {
          case MAILBOX_SUBSCRIPTION_ID: {
            handleEventSubscription(obj);
            break;
          }
          case MAILBOX_QUERY_ID: {
            handleMailboxQuery(obj);
            break;
          }
          default: {
            console.error('Unknown JSON-RPC message ID', obj);
          }
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

  // Begin the mailbox notifier cycle.
  const mbNotifier = getMailboxNotifier();

  const { notifier: sendNotifier, updater: sendUpdater } = makeNotifierKit();

  /**
   * @typedef {bigint} SeqNum
   * @type {Array<[SeqNum, any]>}
   * Ordered by seqnum
   */
  let messagePool = [];

  // Atomically add to the message pool, ensuring the pool is sorted by unique
  // sequence number.
  const addToMessagePool = newMessages => {
    // Add the new messages.
    const bigPool = messagePool.concat(newMessages);

    // Sort the big pool by sequence number.
    const sortedPool = bigPool.sort((a, b) => a[0] - b[0]);

    // Only keep messages that have a unique sequence number.
    const uniquePool = sortedPool.filter(
      (a, i) =>
        // Index 0 is always kept.
        i === 0 ||
        // Others are only kept if not the same as the prior sequence.
        a[0] !== sortedPool[i - 1][0],
    );

    // Replace the old message pool.
    messagePool = uniquePool;
  };

  const removeAckedFromMessagePool = ack => {
    // Remove all messages sent at earlier acks.
    messagePool = messagePool.filter(m => m[0] > ack);
  };

  let totalDeliveries = 0;
  let highestAck = -1;
  let sequenceNumber = 0n;
  const sendFromMessagePool = async () => {
    let tmpInfo;

    const messages = messagePool;

    try {
      totalDeliveries += 1;
      console.log(
        `delivering to chain (trips=${totalDeliveries})`,
        GCI,
        messages,
        highestAck,
      );

      // TODO: remove this JSON.stringify: change 'deliverMailboxReq' to have
      // more structure than a single string, and have the CLI handle variable
      // args better
      tmpInfo = await makeTempFile(
        'ag-solo-cosmos-deliver.',
        JSON.stringify([messages, highestAck]),
      );

      // Deliver message over file, as it could be big.
      let txArgs = ['tx', 'swingset', 'deliver', `@${tmpInfo.path}`];

      // Is our helper different from the SwingSet client address?
      if (clientAddr !== helperAddr) {
        // Get the encoded message into our file.
        await captureHelperOutput(
          [...txArgs, '--generate-only', `--from=${clientAddr}`],
          tmpInfo.path,
        );

        // Indirect the transaction broadcasting through the `authz` module.
        txArgs = ['tx', 'authz', 'exec', tmpInfo.path];
      }

      // Now add the arguments to actually sign and broadcast the transaction.
      txArgs.push(
        '--keyring-backend=test',
        '--gas=auto',
        '--gas-adjustment=1.3',
        '--from=ag-solo',
        '--yes',
        '-ojson',
      );

      // Use the feeAccount for any fees.
      if (feeAccountAddr) {
        txArgs.push(`--fee-account=${feeAccountAddr}`);
      }

      // We just try a single delivery per block.
      let retry = true;
      while (retry) {
        retry = false;
        // eslint-disable-next-line no-await-in-loop
        const { stderr, stdout } = await runHelper([
          ...txArgs,
          `--sequence=${sequenceNumber}`,
        ]);

        const errMsg = stderr.trimRight();
        if (errMsg) {
          const seqMatch = errMsg.match(
            /account sequence mismatch, expected (\d+),/,
          );
          if (seqMatch) {
            // Try to resync our sequence number before sending more.
            console.info(
              `Resynchronizing ${GCI} sequence number from ${sequenceNumber} to ${seqMatch[1]}`,
            );
            sequenceNumber = BigInt(seqMatch[1]);
            retry = true;
          } else {
            console.error(errMsg);
          }
        }

        if (!retry) {
          console.debug(`helper said: ${stdout}`);
          const out = JSON.parse(stdout);

          assert.equal(
            parseInt(out.code, 10),
            0,
            X`Unexpected output: ${stdout.trimRight()}`,
          );

          // We submitted the transaction to the mempool successfully.
          // Preemptively increment our sequence number to avoid needing to
          // retry next time.
          sequenceNumber += 1n;
        }
      }
    } finally {
      if (tmpInfo) {
        await fs.promises.unlink(tmpInfo.path);
      }
    }
  };

  /**
   * This function is entered at most the same number of times as the
   * mailboxNotifier announces a new mailbox.
   *
   * It then delivers the mailbox to inbound.  There are no optimisations.
   *
   * @param {number=} lastMailboxUpdate
   */
  const recurseEachMailboxUpdate = async (lastMailboxUpdate = undefined) => {
    const { updateCount, value: mailbox } = await mbNotifier.getUpdateSince(
      lastMailboxUpdate,
    );
    assert(updateCount, X`${GCI} unexpectedly finished!`);
    const { outbox, ack } = mailbox;
    // console.info('have mailbox', mailbox);
    inbound(GCI, outbox, ack);
    removeAckedFromMessagePool(ack);

    recurseEachMailboxUpdate(updateCount).catch(e =>
      console.error(`Failed to fetch ${GCI} mailbox:`, e),
    );
  };

  // Begin the mailbox consumer.
  recurseEachMailboxUpdate().catch(e =>
    console.error(`Failed to fetch first ${GCI} mailbox:`, e),
  );

  // Retry sending, but no more than one pending retry at a time.
  let retryPending;
  const retrySend = (e = undefined) => {
    if (e) {
      console.error(`Error sending`, e);
    }
    if (retryPending !== undefined) {
      return;
    }

    retryPending = setTimeout(() => {
      retryPending = undefined;
      sendUpdater.updateState(true);
    }, randomizeDelay(SEND_RETRY_DELAY_MS));
  };

  // This function ensures we only have one outgoing send operation at a time.
  const recurseEachSend = async (lastSendUpdate = undefined) => {
    // See when there is another requested send since our last time.
    const { updateCount } = await sendNotifier.getUpdateSince(lastSendUpdate);
    assert(updateCount, X`Sending unexpectedly finished!`);

    await sendFromMessagePool().catch(retrySend);
    recurseEachSend(updateCount);
  };

  // Begin the sender.
  recurseEachSend();

  async function deliver(newMessages, acknum) {
    let doSend = false;
    if (acknum > highestAck) {
      highestAck = acknum;
      // We never send just an ack without messages.  But if we did, the
      // following line would do it:
      doSend = SEND_EMPTY_ACKS;
    }
    if (newMessages.length) {
      addToMessagePool(newMessages);
      doSend = true;
    }

    if (doSend) {
      sendUpdater.updateState(true);
    }
  }

  // Now that we've started consuming blocks, tell our caller how to deliver
  // messages.
  return makeBatchedDeliver(deliver, Math.min(DEFAULT_BATCH_TIMEOUT_MS, 2000));
}
