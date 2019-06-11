import { test } from 'tape-promise/tape';
import { makeCLists } from '../../../src/kernel/commsSlots/state/CLists';

test('Clists add and get', t => {
  const clists = makeCLists();
  const kernelToMeSlot = { type: 'export', id: 1 };
  const youToMeSlot = { type: 'your-ingress', id: 102 };
  const meToYouSlot = clists.changePerspective(youToMeSlot);
  clists.add('machine0', kernelToMeSlot, youToMeSlot, meToYouSlot);
  const actualKernelToMeSlot = clists.mapIncomingWireMessageToKernelSlot(
    'machine0',
    youToMeSlot,
  );
  t.deepEqual(actualKernelToMeSlot, kernelToMeSlot);
  const {
    meToYouSlot: actualMeToYouSlot,
  } = clists.mapKernelSlotToOutgoingWireMessage(kernelToMeSlot, 'machine0');
  t.equal(actualMeToYouSlot, meToYouSlot);
  t.end();
});

test('Add same object from multiple machines', t => {
  const clists = makeCLists();
  const kernelToMeSlot = { type: 'export', id: 1 };
  const youToMeSlot0 = { type: 'your-ingress', id: 102 };
  const meToYouSlot0 = clists.changePerspective(youToMeSlot0);

  const youToMeSlot3 = { type: 'your-ingress', id: 593 };
  const meToYouSlot3 = clists.changePerspective(youToMeSlot3);

  clists.add('machine0', kernelToMeSlot, youToMeSlot0, meToYouSlot0);
  clists.add('machine3', kernelToMeSlot, youToMeSlot3, meToYouSlot3);
  const actualKernelToMeSlot0 = clists.mapIncomingWireMessageToKernelSlot(
    'machine0',
    youToMeSlot0,
  );
  const actualKernelToMeSlot3 = clists.mapIncomingWireMessageToKernelSlot(
    'machine3',
    youToMeSlot3,
  );
  t.deepEqual(actualKernelToMeSlot0, actualKernelToMeSlot3);

  const outgoingWireMessage0 = clists.mapKernelSlotToOutgoingWireMessage(
    kernelToMeSlot,
    'machine0',
  );
  const outgoingWireMessage3 = clists.mapKernelSlotToOutgoingWireMessage(
    kernelToMeSlot,
    'machine3',
  );
  t.deepEqual(outgoingWireMessage0.meToYouSlot, meToYouSlot0);
  t.notDeepEqual(
    outgoingWireMessage3.meToYouSlot,
    outgoingWireMessage0.meToYouSlot,
  );

  const messageList = clists.mapKernelSlotToOutgoingWireMessageList(
    kernelToMeSlot,
  );
  t.deepEqual(messageList, [outgoingWireMessage0, outgoingWireMessage3]);
  t.end();
});
