/* eslint-disable no-await-in-loop */
import harden from '@agoric/harden';
import { producePromise } from '@agoric/produce-promise';
import {
  base64ToBytes,
  dataToBase64,
} from '@agoric/swingset-vat/src/vats/network';

console.debug(`loading vat-relayer.js`);

// At any given moment, there is exactly one PacketHandler in place.

function buildRootObject(E) {
  let timerManager;
  const { promise: registry, resolve: setRegistry } = producePromise();
  const { promise: zoe, resolve: setZoe } = producePromise();

  // the default Policy+PacketHandler transparently forwards all packets

  function makeDefaultPacketHandler() {
    return harden({
      onPacket(_target, _packet) {
        return true;
      },
      onAck(_target, _ackPacket) {
        return true;
      },
      onHandshake(_target, _metaPacket) {
        return true;
      },
      retire() {
        return undefined;
      },
    });
  }

  const defaultPolicy = harden({
    // For any given Policy object, open() will only be called once per
    // channel. If this is not the first Policy to be used, and the
    // predecessor Policy had provided a PacketHandler for this channel, then
    // 'oldState' will contain the object which that old PacketHandler
    // provided from its 'shutdown()' method. "You have inherited this data
    // from your predecessor, use it wisely."
    open(src, dst, oldState = undefined) {
      return makeDefaultPacketHandler(oldState);
    },
  });

  let currentPolicy = defaultPolicy;
  const packetHandlers = new Map();

  const packetBatches = new Map();

  function makeSenders(bridgeSender, channelID, srcInfo, dstInfo) {
    // Construct the right kind of bridge message. We want the (golang) lib-relayer
    // code on the other side of the bridge to send this packet to the given
    // target.
    const packetToMsg = packetMsg => {
      switch (packetMsg.type) {
        case 'ibc/channel/MsgAcknowledgement':
        case 'ibc/channel/MsgPacket':
          break;
        default:
          throw TypeError(
            `Can only deliver one of MsgPacket or MsgAcknowledgement`,
          );
      }
      const {
        type,
        sequence,
        srcPort,
        srcChannel,
        dstPort,
        dstChannel,
        timeoutHeight,
        timeoutTimestamp,
        proof,
        proofHeight,
        signer,
        data,
        ack,
      } = packetMsg;
      const msg = {
        type,
        value: {
          packet: {
            sequence,
            source_port: srcPort,
            source_channel: srcChannel,
            destination_port: dstPort,
            destination_channel: dstChannel,
            timeout_height: timeoutHeight,
            timeout_timestamp: timeoutTimestamp,
            data: dataToBase64(data),
          },
          proof,
          proof_height: proofHeight,
          signer,
        },
      };
      if (type === 'ibc/channel/MsgAcknowledgement') {
        msg.value.acknowledgement = dataToBase64(ack);
      }
      return msg;
    };
    return harden({
      src: {
        packetToMsg,
        async deliver(packet) {
          const msg = packetToMsg(packet);
          const batch = packetBatches.get(channelID);
          if (batch) {
            batch.src_msgs.push(msg);
            return undefined;
          }
          const data = {
            type: 'RELAYER_SEND',
            src: srcInfo,
            src_msgs: [JSON.stringify(msg)],
            dst: dstInfo,
            dst_msgs: [],
          };
          return E(bridgeSender).send(data);
        },
      },
      dst: {
        packetToMsg,
        async deliver(packet) {
          const msg = packetToMsg(packet);
          const batch = packetBatches.get(channelID);
          if (batch) {
            batch.dst_msgs.push(msg);
            return undefined;
          }
          const data = {
            type: 'RELAYER_SEND',
            src: srcInfo,
            src_msgs: [],
            dst: dstInfo,
            dst_msgs: [JSON.stringify(msg)],
          };
          return E(bridgeSender).send(data);
        },
      },
    });
  }

  // TODO: write this properly
  function identifyChannel(srcInfo, dstInfo) {
    const { 'port-id': srcPort, 'channel-id': srcChannel } = srcInfo;
    const { 'port-id': dstPort, 'channel-id': dstChannel } = dstInfo;
    return `${srcPort}/${srcChannel}:${dstPort}/${dstChannel}`;
  }

  // All relay data comes through here.
  async function doHandle(bridgeSender, msgType, data, upcallID) {
    if (msgType !== 'RELAYER_SEND') {
      throw TypeError(`Unimplemented message type ${msgType}`);
    }

    // First, we must figure out which (putative) Channel the message is for.
    const { src: srcInfo, dst: dstInfo } = data;
    const channelID = identifyChannel(srcInfo, dstInfo);

    const currentPacketBatch = {
      ...data,
      src_msgs: [],
      dst_msgs: [],
    };
    packetBatches.set(channelID, currentPacketBatch);

    // If we don't already know about a PacketHandler for that Channel, ask
    // the Policy to make one.
    if (!packetHandlers.has(channelID)) {
      const { src, dst } = makeSenders(
        bridgeSender,
        channelID,
        srcInfo,
        dstInfo,
      );
      packetHandlers.set(channelID, {
        handler: currentPolicy.open(src, dst, undefined),
        src,
        dst,
      });
    }

    const h = packetHandlers.get(channelID);

    /*
    src: Object <[Object: null prototype] {}> {
      'chain-id': 'ibc1',
      'client-id': 'ibczeroclient',
      'connection-id': 'ibczerolink',
      'channel-id': 'channeltonfqji',
      'port-id': 'echo',
      order: 'ORDERED'
    },
    */

    const msgToPacketMsg = msg => {
      const {
        type,
        value: {
          packet: {
            sequence,
            source_port: srcPort,
            source_channel: srcChannel,
            destination_port: dstPort,
            destination_channel: dstChannel,
            timeout_height: timeoutHeight,
            timeout_timestamp: timeoutTimestamp,
            data: data64,
          },
          proof,
          proof_height: proofHeight,
          signer,
        },
      } = msg;
      return {
        type,
        sequence,
        srcPort,
        srcChannel,
        dstPort,
        dstChannel,
        timeoutHeight,
        timeoutTimestamp,
        proof,
        proofHeight,
        signer,
        data: base64ToBytes(data64),
      };
    };

    const handleMsgs = async (target, msgs, newMsgs) => {
      // We enqueue messages sent during this turn on our newMsgs.
      // After this, the behaviour will be to follow the realTarget.deliver
      // and send directly over the bridge, one-by-one.
      for (const msgJson of msgs) {
        let msg;
        try {
          msg = JSON.parse(msgJson);
          switch (msg.type) {
            case 'ibc/client/tendermint/MsgUpdateClient':
              // Pass back unchanged.
              newMsgs.push(msg);
              break;
            case 'ibc/channel/MsgPacket': {
              /* {"type":"ibc/channel/MsgPacket",
                  "value":{"packet":{"sequence":"1","source_port":"portbvmnfb","source_channel":"channeltokbmnfb","destination_port":"echo",
                                    "destination_channel":"channeltonfqji","data":"aGVsbG8sIHdvcmxk","timeout_height":"1087"},"proof":{"proof":{"o
              */
              const packetMsg = msgToPacketMsg(msg);
              if (await h.handler.onPacket(target, packetMsg)) {
                // Truthy, so forward the original message.
                newMsgs.push(msg);
              }
              break;
            }
            case 'ibc/channel/MsgAcknowledgement': {
              /* {"type":"ibc/channel/MsgAcknowledgement",
                  "value":{"packet":{"sequence":"1","source_port":"portbvmnfb","source_channel":"channeltokbmnfb","destination_port":"echo",
                                    "destination_channel":"channeltonfqji","data":"aGVsbG8sIHdvcmxk","timeout_height":"1087"},
                          "acknowledgement":"aGVsbG8sIHdvcmxk",
                          "proof":{"proof":{"ops":[{"type":"iavl:v","key":"YWNrcy9wb3J0cy9lY2hvL2NoYW5uZWxzL2NoYW5uZWx0b25mcWppL2Fja25vd2xlZGdlbWVudHMvMQ==","data":"twIKtAIKKAgKEBAYWSogx91dppbGI5jgmCuw7/CaJP0jwcg3BUfa
              */
              const ackMsg = msgToPacketMsg(msg);
              ackMsg.ack = base64ToBytes(msg.value.acknowledgement);

              if (await h.handler.onAck(target, ackMsg)) {
                // Truthy, so forward the original message.
                newMsgs.push(msg);
              }
              break;
            }
            default:
              if (await h.handler.onHandshake(target, msg)) {
                // Truthy, so forward the original message.
                newMsgs.push(msg);
              }
          }
        } catch (e) {
          console.error(`Error processing ${msg.type}:`, e);
        }
      }
      return newMsgs;
    };

    await handleMsgs(h.src, data.src_msgs, currentPacketBatch.src_msgs);
    await handleMsgs(h.dst, data.dst_msgs, currentPacketBatch.dst_msgs);
    const newBatch = currentPacketBatch;
    packetBatches.delete(channelID);
    if (newBatch.src_msgs.length + newBatch.dst_msgs.length > 0) {
      // Send the new messages down across the bridge.
      newBatch.src_msgs = newBatch.src_msgs.map(msg => JSON.stringify(msg));
      newBatch.dst_msgs = newBatch.dst_msgs.map(msg => JSON.stringify(msg));
      await E(bridgeSender).send(newBatch);
    }

    // Tell the Golang relayer that we handled the messages.
    E(bridgeSender).send({
      type: 'RESOLVE_UPCALL',
      id: upcallID,
      value: false,
    });
  }

  function doInstall(newPolicySrc, registryKey) {
    console.log(`installing new policy, src=`, newPolicySrc);
    console.log(`evaluating...`);
    // eslint-disable-next-line no-eval
    const makePolicy = (1, eval)(`(${newPolicySrc})`);
    console.log(`eval returned`, makePolicy);
    if (typeof makePolicy !== 'function') {
      console.log(
        `policy source did not evaluate to function, rather to:`,
        makePolicy,
      );
      return;
    }
    if (registryKey) {
      console.log(`commander = registry[${registryKey}]`);
    }
    const commander = registryKey ? E(registry).get(registryKey) : undefined;
    const endowments = { harden, E, console, timerManager, commander, zoe };
    const newPolicy = harden(makePolicy(endowments));
    if (!newPolicy.open) {
      console.log(
        `new Policy does not have .open, rather:`,
        Object.keys(newPolicy),
      );
      return;
    }

    // activate the new policy
    currentPolicy = newPolicy;
    // migrate all old PacketHandlers, by asking them to retire, and passing
    // the state object they emit to their successor
    for (const channelID of packetHandlers.keys()) {
      const { handler: oldHandler, src, dst } = packetHandlers.get(channelID);
      const oldState = oldHandler.retire();
      packetHandlers.set(channelID, {
        handler: currentPolicy.open(src, dst, oldState),
        src,
        dst,
      });
    }
  }

  const root = {
    setTimerManager(t) {
      timerManager = t;
    },
    addRegistry(GCI, r) {
      // this will be called once for each chain the smart-relayer has been
      // connected to
      console.log(`vat-relayer given registry for ${GCI}: ${registry}`);
      setRegistry(r); // used during install()
    },
    addZoe(GCI, z) {
      // this will be called once for each chain the smart-relayer has been
      // connected to
      console.log(`vat-relayer given zoe for ${GCI}: ${z}`);
      setZoe(z); // used during install()
    },
    async handle(...args) {
      console.log(`handle() invoked`);
      try {
        await doHandle(...args);
        console.log(`handle() successful`);
      } catch (e) {
        console.log(`error during handle()`);
        console.log(e);
        throw e;
      }
    },

    install(policySrc, registryKey) {
      try {
        doInstall(policySrc, registryKey);
        console.log(`install() successful`);
      } catch (e) {
        console.log(`error during install()`, e);
        throw e;
      }
    },
  };
  return harden(root);
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(syscall, state, buildRootObject, helpers.vatID);
}
