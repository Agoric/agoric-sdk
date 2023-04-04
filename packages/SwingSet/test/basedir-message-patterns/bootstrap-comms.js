import { Far, E } from '@endo/far';

// machine names, to link vattp messages and loopbox channels
const A = 'A';
const B = 'B';
const C = 'C';

export function buildRootObject(vatPowers, vatParameters) {
  const { D } = vatPowers;
  return Far('root', {
    async bootstrap(vats, devices) {
      const { loopbox } = devices;

      // machine A can send and receive through the loopbox
      const { vattpA, commsA } = vats;
      D(loopbox).registerInboundHandler(A, vattpA);
      await E(vattpA).registerMailboxDevice(D(loopbox).getSender(A));

      // machine B can send and receive through the loopbox
      const { vattpB, commsB } = vats;
      D(loopbox).registerInboundHandler(B, vattpB);
      await E(vattpB).registerMailboxDevice(D(loopbox).getSender(B));

      // machine C can send and receive through the loopbox
      const { vattpC, commsC } = vats;
      D(loopbox).registerInboundHandler(C, vattpC);
      await E(vattpC).registerMailboxDevice(D(loopbox).getSender(C));

      // A knows about B
      const AtoB = await E(vattpA).addRemote(B);
      await E(commsA).addRemote(B, AtoB.transmitter, AtoB.setReceiver);
      // B knows about A
      const BtoA = await E(vattpB).addRemote(A);
      await E(commsB).addRemote(A, BtoA.transmitter, BtoA.setReceiver);

      // A knows about C
      const AtoC = await E(vattpA).addRemote(C);
      await E(commsA).addRemote(C, AtoC.transmitter, AtoC.setReceiver);
      // C knows about A
      const CtoA = await E(vattpC).addRemote(A);
      await E(commsC).addRemote(A, CtoA.transmitter, CtoA.setReceiver);

      // initialize B, to get the object that we'll export to A
      const { bob, bert } = await E(vats.b).init();

      // export B's objects to A
      const BOB_INDEX = 12;
      const BERT_INDEX = 13;
      await E(commsB).addEgress(A, BOB_INDEX, bob);
      const aBob = await E(commsA).addIngress(B, BOB_INDEX, 'Alleged: bob');
      await E(commsB).addEgress(A, BERT_INDEX, bert);
      const aBert = await E(commsA).addIngress(B, BERT_INDEX, 'Alleged: bert');

      // initialize C, to get the object that we'll export to A
      const { carol } = await E(vats.c).init();

      // export C's objects to A
      const CAROL_INDEX = 25;
      await E(commsC).addEgress(A, CAROL_INDEX, carol);
      const aCarol = await E(commsA).addIngress(
        C,
        CAROL_INDEX,
        'Alleged: carol',
      );

      // initialize A, and give it objects from B and C
      await E(vats.a).init(aBob, aBert, aCarol);

      const which = vatParameters.argv[0];
      await E(vats.a).run(which);
    },
  });
}
