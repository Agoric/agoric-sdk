import { E } from '@agoric/eventual-send';

// machine names, to link vattp messages and loopbox channels
const A = 'A';
const B = 'B';

export function buildRootObject(vatPowers, vatParameters) {
  const { D } = vatPowers;
  return harden({
    async bootstrap(vats, devices) {
      const { loopbox } = devices;

      // machine A can send and receive through the loopbox
      const { vattpA, commsA } = vats;
      D(loopbox).registerInboundHandler(A, vattpA);
      await E(vattpA).registerMailboxDevice(D(loopbox).makeSender(A));

      // machine B can send and receive through the loopbox
      const { vattpB, commsB } = vats;
      D(loopbox).registerInboundHandler(B, vattpB);
      await E(vattpB).registerMailboxDevice(D(loopbox).makeSender(B));

      // A knows about B
      const AtoB = await E(vattpA).addRemote(B);
      await E(commsA).addRemote(B, AtoB.transmitter, AtoB.setReceiver);
      // B knows about A
      const BtoA = await E(vattpB).addRemote(A);
      await E(commsB).addRemote(A, BtoA.transmitter, BtoA.setReceiver);

      // initialize B, to get the object that we'll export to A
      const { bob, bert } = await E(vats.b).init();

      // export B's objects to A
      const BOB_INDEX = 12;
      const BERT_INDEX = 13;
      await E(commsB).addEgress(A, BOB_INDEX, bob);
      const aBob = await E(commsA).addIngress(B, BOB_INDEX);
      await E(commsB).addEgress(A, BERT_INDEX, bert);
      const aBert = await E(commsA).addIngress(B, BERT_INDEX);

      // initialize A, and give it B's objects
      await E(vats.a).init(aBob, aBert);

      const which = vatParameters.argv[0];
      await E(vats.a).run(which);
    },
  });
}
