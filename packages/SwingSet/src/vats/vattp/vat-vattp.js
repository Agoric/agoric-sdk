import { assert, details as X } from '@agoric/assert';
import {
  makeScalarBigMapStore,
  defineDurableKindMulti,
  provideKindHandle,
} from '@agoric/vat-data';
import { E } from '@endo/eventual-send';
import { makePromiseKit } from '@endo/promise-kit';
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

export function buildRootObject(vatPowers, _vatParams, baggage) {
  const { D } = vatPowers;
  let mailbox; // mailbox device

  const mailboxKindHandle = provideKindHandle(baggage, 'Mailbox');
  const initMailboxState = () => ({
    outboundHighestAdded: 0,
    outboundHighestRemoved: 0,
    inboundHighestDelivered: 0,
    inboundReceiver: null,
  });
  const makeMailbox = defineDurableKindMulti(
    mailboxKindHandle,
    initMailboxState,
    {
      outbound: {
        getHighestAdded: ({ state }) => state.outboundHighestAdded,
        setHighestAdded: ({ state }, highestAdded) => {
          assert(highestAdded >= state.outboundHighestAdded);
          state.outboundHighestAdded = highestAdded;
        },
        getHighestRemoved: ({ state }) => state.outboundHighestRemoved,
        setHighestRemoved: ({ state }, highestRemoved) => {
          assert(highestRemoved >= state.outboundHighestRemoved);
          state.outboundHighestRemoved = highestRemoved;
        },
      },
      inbound: {
        getReceiver: ({ state }) => state.inboundReceiver,
        initReceiver: ({ state }, receiver) => {
          assert.equal(state.inboundReceiver, null);
          state.inboundReceiver = receiver;
        },
        getHighestDelivered: ({ state }) => state.inboundHighestDelivered,
        setHighestDelivered: ({ state }, highestDelivered) => {
          assert(highestDelivered >= state.inboundHighestDelivered);
          state.inboundHighestDelivered = highestDelivered;
        },
      },
    },
  );

  if (!baggage.has('mailboxes')) {
    baggage.init(
      'mailboxes',
      makeScalarBigMapStore('mailboxes', { durable: true }),
    );
  }
  const mailboxes = baggage.get('mailboxes');
  function provideMailbox(name) {
    if (!mailboxes.has(name)) {
      mailboxes.init(name, makeMailbox());
    }
    return mailboxes.get(name);
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
    const { promise: theirLocatorUnum, resolve: gotTheirLocatorUnum } =
      makePromiseKit();
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
        void E(cons).log('VatTP connection info:', ...args);
      },
    });

    return harden({ host, handler });
  }

  const handler = Far('vat-tp handler', {
    registerMailboxDevice(mailboxDevnode) {
      mailbox = mailboxDevnode;
    },

    /**
     * @param {string} name  Unique name identifying the remote for "deliverInbound" functions
     */
    addRemote(name) {
      assert(!mailboxes.has(name), X`already have remote ${name}`);
      const r = provideMailbox(name);
      const transmitter = Far('transmitter', {
        transmit(msg) {
          // Durability question: are these references to `r` and `name` safe?
          // If not, then what is the proper strategy?
          // Do we need to be durable all the way up, with "vat-tp handler" being
          // a durable singleton with state referencing `mailboxes` from baggage,
          // an addRemote function reaching into that state and returning a
          // durable object of its own, and deliverInboundMessages/deliverInboundAck
          // functions that also leverage that state?
          const num = r.outbound.getHighestAdded() + 1;
          D(mailbox).add(name, num, msg);
          r.outbound.setHighestAdded(num);
        },
      });
      const setReceiver = Far('receiver setter', {
        setReceiver(newReceiver) {
          assert(!r.inbound.getReceiver(), X`setReceiver is call-once`);
          r.inbound.initReceiver(newReceiver);
        },
      });
      return harden({ transmitter, setReceiver });
    },

    deliverInboundMessages(name, newMessages) {
      const i = provideMailbox(name).inbound;
      newMessages.forEach(m => {
        const [num, body] = m;
        if (num > i.getHighestDelivered()) {
          // TODO: SO() / sendOnly()
          E(i.getReceiver()).receive(body);
          i.setHighestDelivered(num);
          D(mailbox).ackInbound(name, num);
        }
      });
    },

    deliverInboundAck(name, ack) {
      const o = provideMailbox(name).outbound;
      let num = o.getHighestRemoved() + 1;
      while (num <= o.getHighestAdded() && num <= ack) {
        D(mailbox).remove(name, num);
        o.setHighestRemoved(num);
        num += 1;
      }
    },

    makeNetworkHost,
  });

  return handler;
}
