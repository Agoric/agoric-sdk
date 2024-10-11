import { AgoricCalc } from '../src/utils/address.js';
import { ibcTransfer } from './cosmoverse-mock.js';

/**
 * @import {Remote} from '@agoric/vow';
 * @import {OrchestrationAccount} from '../src/orchestration-api.js';
 */

export const makeOrchestration = (t, chains) => {
  const { nextLabel: next } = t.context;
  /** @returns {Promise<OrchestrationAccount<any>>} */
  const makeAccount = async () => {
    const addr = await chains.agoric.makeAccount();
    return harden({
      getAddress: () => addr,
      getPublicTopics: async () => ({
        account: {
          subscriber: {
            subscribeAfter: async _ => ({
              value: addr,
              publishCount: 1n,
              head: /** @type {any} */ (null),
              tail: /** @type {any} */ (null),
            }),
            getUpdateSince: async _ => ({ value: addr, updateCount: 1n }),
          },
          storagePath: 'XXX',
        },
      }),
      transfer: async (dest, { value: amount }) => {
        t.log(next(), 'orch acct', addr, 'txfr', amount, 'to', dest);
        await ibcTransfer(chains, { amount, dest, from: addr, t });
      },
      send: async (dest, { value: amount }) => {
        t.log(next(), 'orch acct', addr, 'send', amount, 'to', dest);
        await chains.agoric.send({ amount, dest, from: addr });
      },
      monitorTransfers: async tap => {
        await chains.agoric.register({ addr, handler: tap });
      },
    });
  };
  const chainHub = harden({
    agoric: { makeAccount },
  });
  return harden({
    getChain: name => chainHub[name],
  });
};

export const makeVStorage = () => {
  const data = new Map();
  /** @type {Remote<StorageNode>} */
  const storageNode = harden({
    makeChildNode: path =>
      // @ts-expect-error mock
      harden({
        /** @param {string} value */
        setValue: value => data.set(path, value),
      }),
  });
  const rpc = harden({
    getData: async path => data.get(path),
  });

  return { storageNode, rpc };
};

export const withVTransfer = (chain, t) => {
  const addrToTap = new Map();
  return harden({
    ...chain,
    register: async ({ addr, handler }) => {
      t.log('vtransfer register', { addr, handler });
      !addrToTap.has(addr) || assert.fail('already registered');
      addrToTap.set(addr, handler);
    },
    send: async ({ amount, from, dest }) => {
      const [agAddr, extra] = AgoricCalc.isVirtualAddress(dest)
        ? AgoricCalc.virtualAddressParts(dest)
        : [dest, undefined];
      const quiet = true;
      const result = await chain.send({ amount, from, dest: agAddr, quiet });

      if (extra === undefined) return result;
      t.log('vtransfer to virtual address', { agAddr, extra });
      if (!addrToTap.has(agAddr)) return result;

      const handler = addrToTap.get(agAddr);
      void handler
        .receiveUpcall({
          packet: { data: JSON.stringify({ amount: Number(amount), extra }) },
        })
        .catch(err => {
          console.error('receiveUpcall rejected', err);
        });

      return result;
    },
  });
};
