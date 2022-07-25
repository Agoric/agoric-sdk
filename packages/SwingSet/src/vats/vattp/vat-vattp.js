import { assert, details as X } from '@agoric/assert';
import {
  defineDurableKindMulti,
  provideDurableMapStore,
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
          // Minimize interactions with durable storage,
          // assuming state won't change underneath us
          // and remote methods won't synchronously throw.
          const { name, inboundReceiver, inboundHighestDelivered } = state;
          let newHighestDelivered = inboundHighestDelivered;
          for (const [num, body] of newMessages) {
            if (num > newHighestDelivered) {
              // TODO: SO() / sendOnly()
              E(inboundReceiver).receive(body);
              newHighestDelivered = num;
              D(mailboxDevice).ackInbound(name, num);
            }
          }
          if (newHighestDelivered > inboundHighestDelivered) {
            state.inboundHighestDelivered = newHighestDelivered;
          }
        },
        deliverAck: ({ state }, ack) => {
          // Minimize interactions with durable storage,
          // assuming state won't change underneath us
          // and remote methods won't synchronously throw.
          const { name, outboundHighestAdded, outboundHighestRemoved } = state;
          let newHighestRemoved = outboundHighestRemoved;
          while (
            newHighestRemoved < outboundHighestAdded &&
            newHighestRemoved < ack
          ) {
            newHighestRemoved += 1;
            D(mailboxDevice).remove(name, newHighestRemoved);
          }
          if (newHighestRemoved > outboundHighestRemoved) {
            state.outboundHighestRemoved = newHighestRemoved;
          }
        },
      },
    },
  );

  /** @type {MapStore<string, ReturnType<typeof makeMailbox>>} */
  const mailboxes = provideDurableMapStore(baggage, 'mailboxes');
  function provideMailbox(name) {
    if (!mailboxes.has(name)) {
      // TODO: Is there a way to avoid this duplication of `name`
      // as both a map key and internal mailbox state?
      mailboxes.init(name, makeMailbox(name));
    }
    return mailboxes.get(name);
  }
  const mailboxMethods = {
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
  };

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
    const name = makeConnectionName();
    assert(!connectionNames.has(name), X`already have host for ${name}`);

    const makeAddress = makeCounter(
      n => `/alleged-name/${allegedName}/egress/${n}`,
    );
    const exportedObjects = new Map(); // address -> object
    const localLocatorUnum = harden({
      lookup(address) {
        return exportedObjects.get(address);
      },
    });
    const { promise: remoteLocatorUnum, resolve: setRemoteLocatorUnum } =
      makePromiseKit();

    const host = Far('host', {
      publish(obj) {
        const address = makeAddress();
        exportedObjects.set(address, obj);
        return address;
      },
      lookup(address) {
        return E(remoteLocatorUnum).lookup(address);
      },
    });

    let openCalled = false;
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
        await E(comms).addEgress(name, 0, localLocatorUnum);
        setRemoteLocatorUnum(E(comms).addIngress(name, 0));
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

  const handler = vivifySingleton(baggage, 'vat-tp handler', {
    ...mailboxMethods,
    makeNetworkHost,
  });
  return handler;
}
