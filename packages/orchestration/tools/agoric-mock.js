import { ibcTransfer } from './cosmoverse-mock.js';

export const AgoricCalc = harden({
  virtualAddressFor: (base, dest) => `${base}+${dest}`,
  isVirtualAddress: addr => addr.includes('+'),
  virtualAddressParts: addr => addr.split('+'),
});

export const makeOrchestration = (t, chains) => {
  const { nextLabel: next } = t.context;
  return harden({
    makeLocalAccount: async () => {
      const addr = await chains.agoric.makeAccount();
      return harden({
        getAddress: () => addr,
        transfer: async ({ amount, dest }) => {
          t.log(next(), 'orch acct', addr, 'txfr', amount, 'to', dest);
          await ibcTransfer(chains, { amount, dest, from: addr, t });
        },
        send: async ({ amount, dest }) => {
          t.log(next(), 'orch acct', addr, 'send', amount, 'to', dest);
          await chains.agoric.send({ amount, dest, from: addr });
        },
        tap: async handler => {
          await chains.agoric.register({ addr, handler });
        },
      });
    },
  });
};

export const makeVStorage = () => {
  const data = new Map();
  const storageNode = harden({
    makeChildNode: path =>
      harden({
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
      void handler.onReceive({ amount, extra }).catch(err => {
        console.error('onRecieve rejected', err);
      });

      return result;
    },
  });
};
