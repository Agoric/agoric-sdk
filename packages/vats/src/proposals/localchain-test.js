// @ts-check
import { Far } from '@endo/far';
import { heapVowE as E } from '@agoric/vow/vat.js';
import { CodecHelper } from '@agoric/cosmic-proto';
import { QueryAllBalancesRequest as QueryAllBalancesRequestType } from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import { MsgSend as MsgSendType } from '@agoric/cosmic-proto/cosmos/bank/v1beta1/tx.js';

const MsgSend = CodecHelper(MsgSendType);
const QueryAllBalancesRequest = CodecHelper(QueryAllBalancesRequestType);

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     localchain: import('../localchain.js').LocalChain;
 *   };
 * }} powers
 * @param {object} options
 * @param {{ testResultPath: string }} options.options
 */
export const testLocalChain = async (
  { consume: { board, chainStorage, localchain } },
  { options: { testResultPath } },
) => {
  console.warn('=== localchain test started (result in', testResultPath, ')!');
  /** @type {null | ERef<StorageNode>} */
  let node = await chainStorage;
  if (!node) {
    console.error('testLocalChain no chainStorage');
    throw Error('no chainStorage');
  }

  for (const nodeName of testResultPath.split('.')) {
    node = E(node).makeChildNode(nodeName);
  }

  /** @type {PromiseSettledResult<any>} */
  let result;
  try {
    const lcaSender = await E(localchain).makeAccount();
    const lcaReceiver = await E(localchain).makeAccount();
    const senderAddress = await E(lcaSender).getAddress();
    const receiverAddress = await E(lcaReceiver).getAddress();
    console.info('created accounts', {
      lcaSender,
      lcaReceiver,
      senderAddress,
      receiverAddress,
    });

    const queryMsg = QueryAllBalancesRequest.typedJson({
      address: receiverAddress,
    });
    const balances = await E(localchain).query(queryMsg);
    console.info('balances', balances);

    await E(lcaReceiver)
      .executeTx([
        MsgSend.typedJson({
          fromAddress: receiverAddress,
          toAddress: receiverAddress,
          amount: [{ denom: 'ucosm', amount: '1' }],
        }),
      ])
      .then(
        res => console.info('unexpected executeTx result', res),
        e => {
          if (String(e).match(/insufficient funds/)) {
            console.info('insufficient funds as expected');
            return;
          }
          console.info('unexpected error', e);
        },
      );

    const emptyQuery = await E(localchain).queryMany([]);
    console.info('emptyQuery', emptyQuery);
    if (emptyQuery.length !== 0) {
      throw Error('emptyQuery results should be empty');
    }

    const tap = Far(
      'Localchain Tap',
      /** @type {import('../bridge-target.js').TargetApp} */ ({
        async receiveUpcall(obj) {
          console.info('=== localchain test tap received upcall', obj);
          await E(E(node).makeChildNode('tap')).setValue(JSON.stringify(obj));
        },
      }),
    );
    await E(lcaReceiver).monitorTransfers(tap);

    const testMore = Far('Localchain Test More', {
      async sendTo(toAddress, amount) {
        /** @type {PromiseSettledResult<any>} */
        let sendToResult;
        await null;
        try {
          console.info('=== localchain test sendTo called');
          const execResult = await E(lcaSender).executeTx([
            MsgSend.typedJson({
              fromAddress: senderAddress,
              toAddress,
              amount,
            }),
          ]);
          sendToResult = {
            status: 'fulfilled',
            value: { toAddress, amount, execResult },
          };
        } catch (e) {
          console.error('=== localchain test sendTo failed', e);
          sendToResult = {
            status: 'rejected',
            reason: { toAddress, amount, error: String(e) },
          };
        }
        console.info('== localchain sendTo result', sendToResult);
        await E(node).setValue(JSON.stringify(sendToResult));
      },
    });
    const testMoreBoardId = await E(board).getId(testMore);

    result = {
      status: 'fulfilled',
      value: { receiverAddress, senderAddress, testMoreBoardId },
    };
  } catch (e) {
    console.error('test failed with', e);
    result = { status: 'rejected', reason: String(e) };
  }

  console.warn('=== localchain test done, setting', { result });
  await E(node).setValue(JSON.stringify(result));
};

export const getManifestForLocalChainTest = (_powers, { testResultPath }) => ({
  manifest: {
    [testLocalChain.name]: {
      consume: {
        board: 'vats',
        chainStorage: 'bridge',
        localchain: 'localchain',
      },
      produce: {
        testLocalChain: 'localchain-test',
      },
    },
  },
  options: {
    testResultPath,
  },
});
