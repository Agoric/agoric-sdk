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
import {
  DEFAULT_BATCH_TIMEOUT_MS,
  makeBatchedDeliver,
} from '@agoric/vats/src/batched-deliver.js';

const console = anylogger('chain-cosmos-sdk');

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

const SEND_RETRY_DELAY_MS = Math.min(DEFAULT_BATCH_TIMEOUT_MS, 500);

const MAX_BUFFER_SIZE = 10 * 1024 * 1024;

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

  const rpcHrefs = rpcAddresses.map(
    rpcAddr =>
      new URL(rpcAddr.includes('://') ? rpcAddr : `http://${rpcAddr}`).href,
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
          return resolve({ stdout, stderr });
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

  const getMailbox = async () => {
    const { stdout, stderr } = await runHelper([
      'query',
      'swingset',
      'mailbox',
      clientAddr,
      '-ojson',
    ]);

    const errMsg = stderr.trimRight();
    if (errMsg) {
      console.error(errMsg);
    }
    if (stdout) {
      console.debug(`helper said: ${stdout}`);
      try {
        // Try to parse the stdout.
        return JSON.parse(JSON.parse(stdout).value);
      } catch (e) {
        assert.fail(X`failed to parse output: ${e}`);
      }
    }
    return undefined;
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
  const getBlockNotifier = () => {
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

  const { notifier: sendNotifier, updater: sendUpdater } = makeNotifierKit();

  // An array of [seqnum, message] ordered by unique seqnum.
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

  let totalDeliveries = 0;
  let highestAck = -1;
  let sequenceNumber = 0n;
  const sendFromMessagePool = async () => {
    let tmpInfo;

    // We atomically drain the message pool.
    const messages = messagePool;
    messagePool = [];

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

          // We submitted the transaction successfully.
          sequenceNumber += 1n;
        }
      }
    } catch (e) {
      // Put back the deliveries we tried to make.
      messagePool = messages.concat(messagePool);
      messagePool.sort((a, b) => a[0] - b[0]);
      throw e;
    } finally {
      if (tmpInfo) {
        await fs.promises.unlink(tmpInfo.path);
      }
    }
  };

  /**
   * This function is entered at most the same number of times
   * as the blockNotifier announces a new block.
   *
   * It then gets the mailbox.  There are no optimisations.
   *
   * @param {number=} lastBlockUpdate
   */
  const recurseEachNewBlock = async (lastBlockUpdate = undefined) => {
    const { updateCount, value } = await blockNotifier.getUpdateSince(
      lastBlockUpdate,
    );
    assert(value, X`${GCI} unexpectedly finished!`);
    console.debug(`new block on ${GCI}, fetching mailbox`);
    await getMailbox()
      .then(ret => {
        if (!ret) {
          return;
        }
        const { outbox, ack } = ret;
        // console.debug('have outbox', outbox, ack);
        inbound(GCI, outbox, ack);
      })
      .catch(e => console.error(`Failed to fetch ${GCI} mailbox:`, e));
    recurseEachNewBlock(updateCount);
  };

  // Begin the block consumer.
  recurseEachNewBlock();

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
    }, SEND_RETRY_DELAY_MS);
  };

  // This function ensures we only have one outgoing send operation at a time.
  const recurseEachSend = async (lastSendUpdate = undefined) => {
    // See when there is another requested send since our last time.
    const { updateCount, value } = await sendNotifier.getUpdateSince(
      lastSendUpdate,
    );
    assert(value, X`Sending unexpectedly finished!`);

    await sendFromMessagePool().catch(retrySend);
    recurseEachSend(updateCount);
  };

  // Begin the sender.
  recurseEachSend();

  async function deliver(newMessages, acknum) {
    let doSend = false;
    if (acknum > highestAck) {
      highestAck = acknum;
      doSend = true;
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
  return makeBatchedDeliver(deliver, SEND_RETRY_DELAY_MS);
}
