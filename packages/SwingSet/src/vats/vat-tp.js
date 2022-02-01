import { assert, details as X } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';
import { Far } from '@endo/marshal';

// See ../../docs/delivery.md for a description of the architecture of the
// comms system.

// In order for a mailbox-using machine to glue together the three comms pieces
// (mailbox device, VatTP vat, comms vat) code like the following must be added
// to the bootstrap vat.
//
//   D(devices.mailbox).registerInboundHandler(vats.vattp);
//   E(vats.vattp).registerMailboxDevice(devices.mailbox);
//   const name = 'remote1';
//   const { transmitter, setReceiver } = await E(vats.vattp).addRemote(name);
//   const receiver = await E(vats.comms).addRemote(name, transmitter);
//   await E(setReceiver).setReceiver(receiver);
//   const receiver = await E(vats.comms).addRemote(name, transmitter);
//   await E(setReceiver).setReceiver(receiver);

function makeCounter(render, initialValue = 7) {
  let nextValue = initialValue;
  function get() {
    const n = nextValue;
    nextValue += 1;
    return render(n);
  }
  return harden(get);
}

export function buildRootObject(vatPowers) {
  const { D } = vatPowers;
  let mailbox; // mailbox device
  const remotes = new Map();
  // { outbound: { highestRemoved, highestAdded },
  //   inbound: { highestDelivered, receiver } }

  function getRemote(name) {
    if (!remotes.has(name)) {
      remotes.set(name, {
        outbound: { highestRemoved: 0, highestAdded: 0 },
        inbound: { highestDelivered: 0, receiver: null },
      });
    }
    return remotes.get(name);
  }

  const receivers = new WeakMap(); // connection -> receiver
  const connectionNames = new WeakMap(); // hostHandle -> name

  const makeConnectionName = makeCounter(n => `connection-${n}`);

  /*
  // A:
  E(agoric.ibcport[0]).addListener( { onAccept() => {
    const { host, handler } = await E(agoric.vattp).makeNetworkHost('ag-chain-B', comms);
    const helloAddress = await E(host).publish(hello);
    // helloAddress = '/alleged-chain/${chainID}/egress/${clistIndex}'
    return handler;
   });

   // B:
   const { host, handler } = await E(agoric.vattp).makeNetworkHost('ag-chain-A', comms, console);
   E(agoric.ibcport[1]).connect('/ibc-port/portADDR/ordered/vattp-1', handler);
   E(E(host).lookup(helloAddress)).hello()
  */

  function makeNetworkHost(allegedName, comms, cons = console) {
    const makeAddress = makeCounter(
      n => `/alleged-name/${allegedName}/egress/${n}`,
    );
    const exportedObjects = new Map(); // address -> object
    const locatorUnum = harden({
      lookup(address) {
        return exportedObjects.get(address);
      },
    });
    const {
      promise: theirLocatorUnum,
      resolve: gotTheirLocatorUnum,
    } = makePromiseKit();
    const name = makeConnectionName();
    let openCalled = false;
    assert(!connectionNames.has(name), X`already have host for ${name}`);
    const host = Far('host', {
      publish(obj) {
        const address = makeAddress();
        exportedObjects.set(address, obj);
        return address;
      },
      lookup(address) {
        return E(theirLocatorUnum).lookup(address);
      },
    });

    const handler = Far('host handler', {
      async onOpen(connection, ..._args) {
        // make a new Remote for this new connection
        assert(!openCalled, X`host ${name} already opened`);
        openCalled = true;

        // transmitter
        const transmitter = harden({
          transmit(msg) {
            // 'msg' will be a string (vats/comms/outbound.js deliverToRemote)
            E(connection).send(msg);
          },
        });
        // the comms 'addRemote' API is kind of weird because it's written to
        // deal with cycles, where vattp has a tx/rx pair that need to be
        // wired to comms's tx/rx pair. Somebody has to go first, so there's
        // a cycle. TODO: maybe change comms to be easier
        const receiverReceiver = harden({
          setReceiver(receiver) {
            receivers.set(connection, receiver);
          },
        });
        await E(comms).addRemote(name, transmitter, receiverReceiver);
        await E(comms).addEgress(name, 0, locatorUnum);
        gotTheirLocatorUnum(E(comms).addIngress(name, 0));
      },
      onReceive(connection, msg) {
        // setReceiver ought to be called before there's any chance of
        // onReceive being called
        E(receivers.get(connection)).receive(msg);
      },
      onClose(connection, ..._args) {
        receivers.delete(connection);
        console.warn(`deleting connection is not fully supported in comms`);
      },
      infoMessage(...args) {
        E(cons).log('VatTP connection info:', ...args);
      },
    });

    return harden({ host, handler });
  }

  const handler = Far('vat-tp handler', {
    registerMailboxDevice(mailboxDevnode) {
      mailbox = mailboxDevnode;
    },

    /*
     * 'name' is a string, and must match the name you pass to
     * deliverInboundMessages/deliverInboundAck
     */
    addRemote(name) {
      assert(!remotes.has(name), X`already have remote ${name}`);
      const r = getRemote(name);
      const transmitter = Far('transmitter', {
        transmit(msg) {
          const o = r.outbound;
          const num = o.highestAdded + 1;
          // console.debug(`transmit to ${name}[${num}]: ${msg}`);
          D(mailbox).add(name, num, msg);
          o.highestAdded = num;
        },
      });
      const setReceiver = Far('receiver setter', {
        setReceiver(newReceiver) {
          assert(!r.inbound.receiver, X`setReceiver is call-once`);
          r.inbound.receiver = newReceiver;
        },
      });
      return harden({ transmitter, setReceiver });
    },

    deliverInboundMessages(name, newMessages) {
      const i = getRemote(name).inbound;
      newMessages.forEach(m => {
        const [num, body] = m;
        if (num > i.highestDelivered) {
          // TODO: SO() / sendOnly()
          // console.debug(`receive from ${name}[${num}]: ${body}`);
          E(i.receiver).receive(body);
          i.highestDelivered = num;
          D(mailbox).ackInbound(name, num);
        }
      });
    },

    deliverInboundAck(name, ack) {
      const o = getRemote(name).outbound;
      let num = o.highestRemoved + 1;
      while (num <= o.highestAdded && num <= ack) {
        D(mailbox).remove(name, num);
        o.highestRemoved = num;
        num += 1;
      }
    },

    makeNetworkHost,
  });

  return handler;
}
