import { assert, details as X } from '@agoric/assert';
import { provide } from '@agoric/store';
import {
  defineDurableKindMulti,
  makeScalarBigMapStore,
  provideDurableMapStore,
  provideDurableSetStore,
  provideKindHandle,
  vivifySingleton,
} from '@agoric/vat-data';
import { E } from '@endo/eventual-send';

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

export function buildRootObject(vatPowers, _vatParams, baggage) {
  const { D } = vatPowers;

  let mailboxDevice;
  const mailboxDeviceBaggageKey = 'mailboxDevice';
  if (baggage.has(mailboxDeviceBaggageKey)) {
    mailboxDevice = baggage.get(mailboxDeviceBaggageKey);
  }

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
      if (baggage.has(mailboxDeviceBaggageKey)) {
        baggage.set(mailboxDeviceBaggageKey, newMailboxDevice);
      } else {
        baggage.init(mailboxDeviceBaggageKey, newMailboxDevice);
      }
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

  // Network comms pattern:
  //
  // A:
  //
  //   E(agoric.ibcport[0]).addListener({
  //     onAccept: () => {
  //       const { host, handler } = await E(agoric.vattp).makeNetworkHost('ag-chain-B', comms);
  //       const helloAddress = await E(host).publish(hello);
  //       // helloAddress = '/alleged-chain/${chainID}/egress/${clistIndex}'
  //       return handler;
  //     },
  //   });
  //
  // B:
  //
  //   const { host, handler } = await E(agoric.vattp).makeNetworkHost('ag-chain-A', comms);
  //   E(agoric.ibcport[1]).connect('/ibc-port/portADDR/ordered/vattp-1', handler);
  //   E(E(host).lookup(helloAddress)).hello();

  const nextConnectionNumberBaggageKey = 'networkHostNextConnectionNumber';
  let nextConnectionNumber = provide(
    baggage,
    nextConnectionNumberBaggageKey,
    () => 7n,
  );
  // TODO: Should this collection be Weak (non-iterable)?
  const networkHostNames = provideDurableSetStore(baggage, 'networkHostNames');
  const networkHostKindHandle = provideKindHandle(baggage, 'networkHost');
  const initNetworkHostState = (allegedName, comms, console) => {
    assert(
      !networkHostNames.has(allegedName),
      X`already have host for ${allegedName}`,
    );
    networkHostNames.add(allegedName);
    const connectionName = `connection-${nextConnectionNumber}`;
    nextConnectionNumber += 1n;
    baggage.set(nextConnectionNumberBaggageKey, nextConnectionNumber);
    return {
      comms,
      console,

      allegedName,
      connection: null,
      connectionName,
      exportedObjects: makeScalarBigMapStore(
        `network host exported objects by address: ${connectionName} as ${allegedName}`,
        { durable: true },
      ),
      nextAddressNumber: 1n,
      // This assumes one connection per host.
      // If that is not the case, receiver should instead be a
      // durable makeScalarBigWeakMapStore keyed by connection.
      receiver: null,
      remoteLocatorUnum: null,
    };
  };
  const makeNetworkHost = defineDurableKindMulti(
    networkHostKindHandle,
    initNetworkHostState,
    {
      host: {
        publish: ({ state }, obj) => {
          const address = `/alleged-name/${state.allegedName}/egress/${state.nextAddressNumber}`;
          state.nextAddressNumber += 1n;
          state.exportedObjects.init(address, obj);
          return address;
        },
        lookup: ({ state }, address) => {
          return E(state.remoteLocatorUnum).lookup(address);
        },
      },
      commsSetReceiver: {
        setReceiver: ({ state }, receiver) => {
          assert(!state.receiver, X`setReceiver is call-once`);
          state.receiver = receiver;
        },
      },
      commsTransmitter: {
        transmit: ({ state }, msg) => {
          // 'msg' will be a string (vats/comms/outbound.js deliverToRemote)
          E(state.connection).send(msg);
        },
      },
      localLocatorUnum: {
        lookup: ({ state }, address) => {
          return state.exportedObjects.get(address);
        },
      },
      handler: {
        onOpen: async ({ state, facets: self }, connection, ..._args) => {
          const name = state.connectionName;
          assert(!state.connection, X`host ${name} already opened`);
          state.connection = connection;

          const comms = state.comms;
          // TODO: Can these calls be made in parallel?
          await E(comms).addRemote(
            name,
            self.commsTransmitter,
            self.commsSetReceiver,
          );
          await E(comms).addEgress(name, 0, self.localLocatorUnum);
          state.remoteLocatorUnum = await E(comms).addIngress(name, 0);
        },
        onReceive: ({ state }, _connection, msg) => {
          // setReceiver ought to be called before there's any chance of
          // onReceive being called
          E(state.receiver).receive(msg);
        },
        onClose: ({ state }, _connection, ..._args) => {
          state.receiver = null;
          console.warn(`deleting connection is not fully supported in comms`);
        },
        infoMessage: ({ state }, ...args) => {
          void E(state.console).log('VatTP connection info:', ...args);
        },
      },
    },
  );

  const vatFacets = vivifySingleton(baggage, 'vat-tp handler', {
    ...mailboxMethods,
    makeNetworkHost: (allegedName, comms, cons = console) => {
      const { host, handler } = makeNetworkHost(allegedName, comms, cons);
      return { host, handler };
    },
  });
  return vatFacets;
}
