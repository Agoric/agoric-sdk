import { Fail } from '@endo/errors';
import {
  provide,
  defineDurableKindMulti,
  makeScalarBigMapStore,
  provideDurableMapStore,
  provideDurableSetStore,
  provideKindHandle,
} from '@agoric/vat-data';
import { Far, E } from '@endo/far';

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

  // Define all durable baggage keys and kind handles.
  const mailboxDeviceBaggageKey = 'mailboxDevice';
  const mailboxHandle = provideKindHandle(baggage, 'mailboxHandle');
  const mailboxMapBaggageKey = 'mailboxes';
  const networkHostHandle = provideKindHandle(baggage, 'networkHostHandle');
  const networkHostCounterBaggageKey = 'networkHostCounter';
  const networkHostNamesBaggageKey = 'networkHostNames';

  // Retain a durable reference to the mailbox device across upgrades.
  let mailboxDevice;
  if (baggage.has(mailboxDeviceBaggageKey)) {
    mailboxDevice = baggage.get(mailboxDeviceBaggageKey);
  }

  // Define the durable Mailbox kind.
  const initMailboxState = name => ({
    name,
    outboundHighestAdded: 0,
    outboundHighestRemoved: 0,
    inboundHighestDelivered: 0,
    inboundReceiver: null,
  });
  const makeMailbox = defineDurableKindMulti(mailboxHandle, initMailboxState, {
    // The transmitter facet is used to send outbound messages.
    transmitter: {
      transmit: ({ state }, msg) => {
        const num = state.outboundHighestAdded + 1;
        D(mailboxDevice).add(state.name, num, msg);
        state.outboundHighestAdded = num;
      },
    },
    // The setReceiver facet is used to initialize the receiver object.
    setReceiver: {
      setReceiver: ({ state }, receiver) => {
        !state.inboundReceiver || Fail`setReceiver is call-once`;
        receiver || Fail`receiver must not be empty`;
        state.inboundReceiver = receiver;
      },
    },
    // The inbound facet is used to deliver inbound messages to the receiver.
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
  });

  // Retain a durable map of name -> mailbox for routing inbound messages.
  /** @type {MapStore<string, ReturnType<typeof makeMailbox>>} */
  const mailboxes = provideDurableMapStore(baggage, mailboxMapBaggageKey);
  function provideMailbox(name) {
    if (!mailboxes.has(name)) {
      mailboxes.init(name, makeMailbox(name));
    }
    return mailboxes.get(name);
  }

  // Define the mailbox functions of our external interface.
  const serviceMailboxFunctions = {
    registerMailboxDevice: newMailboxDevice => {
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
    addRemote: name => {
      !mailboxes.has(name) || Fail`already have remote ${name}`;
      const { transmitter, setReceiver } = provideMailbox(name);
      return harden({ transmitter, setReceiver });
    },

    deliverInboundMessages: (name, newMessages) => {
      // TODO: Stop silently creating mailboxes.
      // https://github.com/Agoric/agoric-sdk/issues/5824
      const { inbound } = provideMailbox(name);
      inbound.deliverMessages(newMessages);
    },

    deliverInboundAck: (name, ack) => {
      // TODO: Stop silently creating mailboxes.
      // https://github.com/Agoric/agoric-sdk/issues/5824
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

  // Define the durable NetworkHost kind
  // and retain a durable monotonic connection number counter and set of names.
  // TODO: Should this collection be Weak (non-iterable)?
  /** @type {SetStore<string>} */
  const networkHostNames = provideDurableSetStore(
    baggage,
    networkHostNamesBaggageKey,
  );
  let networkHostCounter = provide(
    baggage,
    networkHostCounterBaggageKey,
    () => 0n,
  );
  const initNetworkHostState = (allegedName, comms, console) => {
    !networkHostNames.has(allegedName) ||
      Fail`already have host for ${allegedName}`;
    networkHostNames.add(allegedName);
    networkHostCounter += 1n;
    baggage.set(networkHostCounterBaggageKey, networkHostCounter);
    const connectionName = `connection-${networkHostCounter}`;
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
    networkHostHandle,
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
          !state.receiver || Fail`setReceiver is call-once`;
          receiver || Fail`receiver must not be empty`;
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
        onOpen: async ({ state, facets }, connection, ..._args) => {
          const name = state.connectionName;
          !state.connection || Fail`host ${name} already opened`;
          state.connection = connection;

          const comms = state.comms;
          // TODO: Can these calls be made in parallel?
          await E(comms).addRemote(
            name,
            facets.commsTransmitter,
            facets.commsSetReceiver,
          );
          await E(comms).addEgress(name, 0, facets.localLocatorUnum);
          state.remoteLocatorUnum = await E(comms).addIngress(name, 0);
        },
        onReceive: ({ state }, _connection, msg) => {
          // setReceiver ought to be called before there's any chance of
          // onReceive being called
          E(state.receiver).receive(msg);
        },
        onClose: ({ state }, _connection, ..._args) => {
          state.receiver = null;
          // TODO: What would it take to fully support this?
          console.warn(`deleting connection is not fully supported in comms`);
        },
        infoMessage: ({ state }, ...args) => {
          void E(state.console).log('VatTP connection info:', ...args);
        },
      },
    },
  );

  const serviceNetworkFunctions = {
    makeNetworkHost: (allegedName, comms, cons = console) => {
      const { host, handler } = makeNetworkHost(allegedName, comms, cons);
      return harden({ host, handler });
    },
  };

  // Expose the service
  return Far('vat-tp handler', {
    ...serviceMailboxFunctions,
    ...serviceNetworkFunctions,
  });
}
