import { Far, E } from '@endo/far';
import { Fail } from '@endo/errors';

export function buildRootObject(vatPowers, vatParameters) {
  const { D, testLog: log } = vatPowers;
  let numReceived = 0;
  return Far('root', {
    async bootstrap(vats, devices) {
      const { argv } = vatParameters;
      if (argv[0] === 'mailbox1') {
        D(devices.mailbox).add('peer1', 1, 'data1');
        D(devices.mailbox).add('peer1', 2, 'data2');
        D(devices.mailbox).add('peer1', 3, 'data3');
        D(devices.mailbox).ackInbound('peer1', 12);
        D(devices.mailbox).ackInbound('peer1', 13);
        D(devices.mailbox).add('peer2', 4, 'data4');
        D(devices.mailbox).add('peer3', 5, 'data5');
        D(devices.mailbox).remove('peer1', 1);
        D(devices.mailbox).remove('peer2', 4, 'data4');
        // should leave peer1: [data2,data3], peer2: [], peer3: [data5]
      } else if (argv[0] === 'mailbox2') {
        const handler = Far('mailbox', {
          deliverInboundMessages(peer, messages) {
            log(`dm-${peer}`);
            for (const m of messages) {
              log(`m-${m[0]}-${m[1]}`);
            }
          },
          deliverInboundAck(peer, ack) {
            log(`da-${peer}-${ack}`);
          },
        });
        D(devices.mailbox).registerInboundHandler(handler);
      } else if (argv[0] === 'mailbox-determinism') {
        D(devices.mailbox).registerInboundHandler(vats.vattp);
        await E(vats.vattp).registerMailboxDevice(devices.mailbox);
        const name = 'peer1';
        const { setReceiver } = await E(vats.vattp).addRemote(name);
        const receiver = Far('receiver', {
          receive(body) {
            numReceived += 1;
            log(`comms receive ${body}`);
          },
        });
        await E(setReceiver).setReceiver(receiver);
      } else {
        Fail`unknown argv mode '${argv[0]}'`;
      }
    },
    ping() {
      return true;
    },
    getNumReceived() {
      return numReceived;
    },
  });
}
