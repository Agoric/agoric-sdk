import { NobleCalc } from '@agoric/orchestration/src/utils/address.js';
import { ibcTransfer } from './cosmoverse-mock.js';

/**
 * @import {EthEvent} from './eth-mock.js';
 */

export const withForwarding = (chain, chains, t) => {
  const destOf = new Map();
  const { nextLabel: next } = t.context;
  return harden({
    ...chain,
    provideForwardingAccount: async dest => {
      const address = NobleCalc.fwdAddressFor(dest);
      destOf.set(address, dest);
      t.log('x/forwarding fwd', address, '->', dest);
      return address;
    },
    send: async ({ amount, from, dest, quiet = false }) => {
      await chain.send({ amount, from, dest, quiet });
      if (!destOf.has(dest)) return;
      const fwd = destOf.get(dest);
      t.log(next(), 'fwd', { amount, dest, fwd });
      await ibcTransfer(chains, { amount, from: dest, dest: fwd, t });
    },
  });
};

export const makeCCTP = ({ t, usdc, noble, events }) => {
  const { nextLabel: next } = t.context;
  return harden({
    bridge: (msg, { dest, amount: aNumeral }) => {
      t.regex(dest, /^noble/);

      const amount = BigInt(aNumeral);
      /** @type {Omit<EthEvent, 'transactionHash'>} */
      const event = {
        eventName: 'DepositForBurn',
        args: {
          amount,
          mintRecipient: dest, // TODO: hex
        },
        // caller adds txHash
      };

      t.log(next(), 'cctp.bridge:', { msg, dest });
      usdc.transfer(msg, '0x0000', amount); // burn
      const t0 = events.getCurrent();
      void (async () => {
        t.log('waiting 3 blocks (TODO: 20min) before minting on noble');
        for await (const te of events) {
          if (te - t0 > 3) break;
        }
        noble.send({ amount, from: 'noble1mint', dest });
      })();

      return [event];
    },
  });
};
