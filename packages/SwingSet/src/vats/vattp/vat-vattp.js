import { assert, details as X } from '@agoric/assert';
import { provide } from '@agoric/store';
import {
  makeScalarBigMapStore,
  defineDurableKindMulti,
  provideKindHandle,
  vivifySingleton,
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

  let mailboxDevice;
  // TODO: How can we persist a mailbox device reference across upgrades?
  // const mailboxDeviceBaggageKey = 'mailboxDevice';
  // if (baggage.has(mailboxDeviceBaggageKey)) {
  //   mailboxDevice = baggage.get(mailboxDeviceBaggageKey);
  // }

  // QUESTION: Is there a convention around capitalization here?
  const mailboxKindHandle = provideKindHandle(baggage, 'mailbox');
  const initMailboxState = name => ({
    name,
    outboundHighestAdded: 0,
    outboundHighestRemoved: 0,
    inboundHighestDelivered: 0,
    inboundReceiver: null,
  });
  const makeMailbox = defineDurableKindMulti(
    mailboxKindHandle,
    initMailboxState,
    {
      transmitter: {
        transmit: ({ state }, msg) => {
          const num = state.outboundHighestAdded + 1;
          D(mailboxDevice).add(state.name, num, msg);
          state.outboundHighestAdded = num;
        },
      },
      setReceiver: {
        setReceiver: ({ state }, newReceiver) => {
          assert(!state.inboundReceiver, X`setReceiver is call-once`);
          state.inboundReceiver = newReceiver;
        },
      },
      inbound: {
        deliverMessages: ({ state }, newMessages) => {
          // TODO: Minimize state interactions. `try..finally`?
          newMessages.forEach(m => {
            const [num, body] = m;
            if (num > state.inboundHighestDelivered) {
              // TODO: SO() / sendOnly()
              E(state.inboundReceiver).receive(body);
              state.inboundHighestDelivered = num;
              D(mailboxDevice).ackInbound(state.name, num);
            }
          });
        },
        deliverAck: ({ state }, ack) => {
          // TODO: Minimize state interactions. `try..finally`?
          let num = state.outboundHighestRemoved + 1;
          while (num <= state.outboundHighestAdded && num <= ack) {
            D(mailboxDevice).remove(state.name, num);
            state.outboundHighestRemoved = num;
            num += 1;
          }
        },
      },
    },
  );

  const mailboxCollectionBaggageKey = 'mailboxes';
  /** @type {MapStore<string, ReturnType<typeof makeMailbox>>} */
  const mailboxes = provide(baggage, mailboxCollectionBaggageKey, () =>
    makeScalarBigMapStore(mailboxCollectionBaggageKey, { durable: true }),
  );
  function provideMailbox(name) {
    if (!mailboxes.has(name)) {
      // TODO: Is there a way to avoid this duplication of `name`
      // as both a map key and internal mailbox state?
      mailboxes.init(name, makeMailbox(name));
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

  const handlerMethods = {
    registerMailboxDevice(newMailboxDevice) {
      // TODO: How can we persist a mailbox device reference across upgrades?
      // if (baggage.has(mailboxDeviceBaggageKey)) {
      //   baggage.set(mailboxDeviceBaggageKey, newMailboxDevice);
      // } else {
      //   baggage.init(mailboxDeviceBaggageKey, newMailboxDevice);
      // }
      mailboxDevice = newMailboxDevice;
    },

    /**
     * @param {string} name  Unique name identifying the remote for "deliverInbound" functions
     */
    addRemote(name) {
      assert(!mailboxes.has(name), X`already have remote ${name}`);
      const { transmitter, setReceiver } = provideMailbox(name);
      return harden({ transmitter, setReceiver });
    },

    deliverInboundMessages(name, newMessages) {
      // TODO: Stop silently creating mailboxes.
      const { inbound } = provideMailbox(name);
      inbound.deliverMessages(newMessages);
    },

    deliverInboundAck(name, ack) {
      // TODO: Stop silently creating mailboxes.
      const { inbound } = provideMailbox(name);
      inbound.deliverAck(ack);
    },

    makeNetworkHost,
  };

  const handler = vivifySingleton(baggage, 'vat-tp handler', handlerMethods);
  return handler;
}
